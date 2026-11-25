"""Real-time AssemblyAI Streaming v3 ASR (u3-rt-pro / universal-streaming-english)."""

from __future__ import annotations

import asyncio
import json
import os
import time
from contextlib import suppress
from urllib.parse import urlencode

import numpy as np
import websockets
from loguru import logger

from .asr_interface import ASRInterface

DEFAULT_WS_URL = "wss://streaming.assemblyai.com/v3/ws"
DEFAULT_MODEL = "u3-rt-pro"
DEFAULT_FALLBACK_MODEL = "universal-streaming-english"
# AssemblyAI v3 requires binary PCM16 chunks between 50ms and 1000ms (1600..32000 bytes @ 16kHz)
MIN_CHUNK_BYTES = 1600   # 50 ms @ 16 kHz mono 16-bit PCM
SEND_CHUNK_BYTES = 3200  # 100 ms @ 16 kHz mono 16-bit PCM
DEFAULT_IDLE_TIMEOUT = 45.0  # Auto-close idle sockets so no streaming minutes are wasted


def float32_to_pcm16(audio: np.ndarray) -> bytes:
    if audio.size == 0:
        return b""
    clipped = np.clip(np.nan_to_num(audio.astype(np.float32, copy=False)), -1.0, 1.0)
    return (clipped * 32767.0).astype("<i2").tobytes()


class AssemblyAIStreamSession:
    """Persistent AssemblyAI v3 WebSocket stream that transcribes mic turns with sub-400ms latency."""

    def __init__(
        self,
        *,
        api_key: str,
        speech_model: str = DEFAULT_MODEL,
        fallback_model: str = DEFAULT_FALLBACK_MODEL,
        format_turns: bool = True,
        ws_url: str = DEFAULT_WS_URL,
        sample_rate: int = 16000,
        idle_timeout: float = DEFAULT_IDLE_TIMEOUT,
    ) -> None:
        self.api_key = api_key
        self.speech_model = speech_model
        self.fallback_model = fallback_model
        self.format_turns = format_turns
        self.ws_url = ws_url
        self.sample_rate = sample_rate
        self.idle_timeout = idle_timeout

        self._ws = None
        self._recv_task: asyncio.Task | None = None
        self._idle_task: asyncio.Task | None = None
        self._connect_lock = asyncio.Lock()
        self._pcm_pending = bytearray()
        self._turn_transcripts: dict[int, tuple[str, bool]] = {}
        self._partial_text: str = ""
        self._partial_order: int = -1
        self._high_water_order: int = -1
        self._active_min_order: int = 0
        self._accepting_turn: bool = False
        self._turn_done_event = asyncio.Event()
        self._last_turn_at = 0.0
        self._active_model = speech_model
        self._closed = False

    def _build_url(self, model: str) -> str:
        params = {
            "sample_rate": str(self.sample_rate),
            "speech_model": model,
            "format_turns": "true" if self.format_turns else "false",
        }
        sep = "&" if "?" in self.ws_url else "?"
        return f"{self.ws_url}{sep}{urlencode(params)}"

    @property
    def connected(self) -> bool:
        if self._ws is None or self._closed:
            return False
        state = getattr(self._ws, "state", None)
        if state is not None:
            return getattr(state, "name", str(state)) == "OPEN"
        return bool(getattr(self._ws, "open", False))

    def _cancel_idle_timer(self) -> None:
        if self._idle_task and not self._idle_task.done():
            self._idle_task.cancel()
        self._idle_task = None

    def _schedule_idle_close(self) -> None:
        self._cancel_idle_timer()
        if self._closed or self.idle_timeout <= 0 or not self.connected:
            return
        self._idle_task = asyncio.create_task(self._idle_watchdog())

    async def _idle_watchdog(self) -> None:
        try:
            await asyncio.sleep(self.idle_timeout)
            if not self._accepting_turn and self.connected:
                logger.debug("Closing idle AssemblyAI v3 stream after {:.0f}s", self.idle_timeout)
                await self._disconnect_socket()
        except asyncio.CancelledError:
            pass

    async def _disconnect_socket(self) -> None:
        ws = self._ws
        self._ws = None
        if ws is not None:
            with suppress(Exception):
                await ws.send(json.dumps({"type": "Terminate"}))
            with suppress(Exception):
                await ws.close()
        if self._recv_task and not self._recv_task.done():
            self._recv_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._recv_task
        self._recv_task = None

    async def ensure_connected(self) -> bool:
        if self.connected:
            return True
        if not self.api_key or self._closed:
            return False
        async with self._connect_lock:
            if self.connected:
                return True
            if self._recv_task and not self._recv_task.done():
                self._recv_task.cancel()
                with suppress(asyncio.CancelledError):
                    await self._recv_task
                self._recv_task = None

            models = [self.speech_model]
            if self.fallback_model and self.fallback_model != self.speech_model:
                models.append(self.fallback_model)
            for model in models:
                try:
                    url = self._build_url(model)
                    ws = await websockets.connect(
                        url,
                        additional_headers={"Authorization": self.api_key},
                        open_timeout=6,
                        close_timeout=2,
                        ping_interval=15,
                        ping_timeout=10,
                    )
                    begin_raw = await asyncio.wait_for(ws.recv(), timeout=5)
                    begin = json.loads(begin_raw)
                    if begin.get("type") != "Begin":
                        await ws.close()
                        continue
                    self._ws = ws
                    self._active_model = model
                    self._high_water_order = -1
                    self._active_min_order = 0
                    self._recv_task = asyncio.create_task(self._receive_loop(ws))
                    logger.info(
                        "AssemblyAI v3 live stream connected (model={}, session={})",
                        model,
                        begin.get("id", ""),
                    )
                    return True
                except Exception as exc:
                    logger.warning("AssemblyAI v3 connect failed for {} ({})", model, type(exc).__name__)
            return False

    async def prewarm(self) -> None:
        """Open the AssemblyAI v3 socket early (e.g. when speech starts) with idle cleanup."""
        try:
            if await self.ensure_connected() and not self._accepting_turn:
                self._schedule_idle_close()
        except Exception:
            pass

    async def _receive_loop(self, ws) -> None:
        try:
            async for raw in ws:
                if not isinstance(raw, str):
                    continue
                try:
                    msg = json.loads(raw)
                except ValueError:
                    continue
                mtype = msg.get("type")
                if mtype == "Turn":
                    transcript = (msg.get("transcript") or "").strip()
                    end_of_turn = bool(msg.get("end_of_turn"))
                    formatted = bool(msg.get("turn_is_formatted"))
                    order = int(msg.get("turn_order", 0))
                    if order > self._high_water_order:
                        self._high_water_order = order
                    if not self._accepting_turn or order < self._active_min_order:
                        continue
                    if transcript:
                        self._partial_text = transcript
                        self._partial_order = order
                        self._last_turn_at = time.monotonic()
                        if end_of_turn:
                            prev = self._turn_transcripts.get(order)
                            if prev is None or formatted or not prev[1]:
                                self._turn_transcripts[order] = (transcript, formatted)
                            if formatted or not self.format_turns:
                                self._turn_done_event.set()
                    elif end_of_turn:
                        self._turn_done_event.set()
                elif mtype == "Termination":
                    break
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.debug("AssemblyAI v3 receive loop ended ({})", type(exc).__name__)
        finally:
            if self._ws is ws:
                self._ws = None
            self._turn_done_event.set()

    def reset_turn(self) -> None:
        self._pcm_pending.clear()
        self._turn_transcripts.clear()
        self._partial_text = ""
        self._partial_order = -1
        self._accepting_turn = False
        if self._high_water_order >= 0:
            self._active_min_order = max(self._active_min_order, self._high_water_order + 1)
        self._turn_done_event.clear()
        self._last_turn_at = 0.0

    async def feed_audio(self, samples: np.ndarray) -> None:
        pcm = float32_to_pcm16(samples)
        if not pcm:
            return
        self._cancel_idle_timer()
        if not self._accepting_turn:
            if self._high_water_order >= 0:
                self._active_min_order = max(self._active_min_order, self._high_water_order + 1)
            self._accepting_turn = True
        if not await self.ensure_connected():
            return
        self._pcm_pending.extend(pcm)
        ws = self._ws
        if ws is None:
            return
        while len(self._pcm_pending) >= SEND_CHUNK_BYTES:
            chunk = bytes(self._pcm_pending[:SEND_CHUNK_BYTES])
            try:
                await ws.send(chunk)
                del self._pcm_pending[:SEND_CHUNK_BYTES]
            except Exception:
                self._ws = None
                # Retry once on a fresh connection if the idle socket dropped mid-send
                if not await self.ensure_connected() or self._ws is None:
                    return
                ws = self._ws
                try:
                    await ws.send(chunk)
                    del self._pcm_pending[:SEND_CHUNK_BYTES]
                except Exception:
                    self._ws = None
                    return

    async def finish_turn(self, *, wait_timeout: float = 2.0) -> str:
        """Flush buffered audio, send ForceEndpoint, and return the finalized transcript."""
        self._cancel_idle_timer()
        ws = self._ws
        if ws is None:
            text = self._collect_transcript()
            self.reset_turn()
            return text

        # Pad any remaining sub-50ms audio tail so AssemblyAI accepts the final frame
        if self._pcm_pending:
            if len(self._pcm_pending) < MIN_CHUNK_BYTES:
                self._pcm_pending.extend(b"\x00" * (MIN_CHUNK_BYTES - len(self._pcm_pending)))
            chunk = bytes(self._pcm_pending)
            self._pcm_pending.clear()
            with suppress(Exception):
                await ws.send(chunk)

        # Brief silence pad + ForceEndpoint tells v3 to finalize immediately
        self._turn_done_event.clear()
        try:
            await ws.send(b"\x00" * SEND_CHUNK_BYTES)
            await ws.send(json.dumps({"type": "ForceEndpoint"}))
        except Exception:
            self._ws = None
            text = self._collect_transcript()
            self.reset_turn()
            return text

        deadline = time.monotonic() + wait_timeout
        while time.monotonic() < deadline:
            already_formatted = bool(self._turn_transcripts) and (
                not self.format_turns or all(fmt for _, fmt in self._turn_transcripts.values())
            ) and (self._partial_order < 0 or self._partial_order in self._turn_transcripts)
            step_wait = 0.20 if already_formatted else 0.55
            remaining = max(0.05, deadline - time.monotonic())
            try:
                await asyncio.wait_for(self._turn_done_event.wait(), timeout=min(remaining, step_wait))
                if self._turn_transcripts:
                    if not self.format_turns or all(fmt for _, fmt in self._turn_transcripts.values()):
                        break
                    self._turn_done_event.clear()
                    await asyncio.sleep(0.12)
                    break
            except asyncio.TimeoutError:
                if self._turn_transcripts or (self._partial_text and time.monotonic() - self._last_turn_at > 0.45):
                    break

        text = self._collect_transcript()
        self.reset_turn()
        self._schedule_idle_close()
        return text

    def _collect_transcript(self) -> str:
        if self._turn_transcripts:
            parts = [
                text for _, (text, _) in sorted(self._turn_transcripts.items(), key=lambda kv: kv[0])
                if text
            ]
            combined = " ".join(parts).strip()
            if combined:
                return combined
        return self._partial_text.strip()

    async def close(self) -> None:
        self._closed = True
        self._cancel_idle_timer()
        await self._disconnect_socket()


class VoiceRecognition(ASRInterface):
    """AssemblyAI Streaming v3 ASR supporting both live streaming mic turns and batch numpy fallback."""

    supports_streaming = True

    def __init__(
        self,
        api_key: str = "",
        speech_model: str = DEFAULT_MODEL,
        fallback_model: str = DEFAULT_FALLBACK_MODEL,
        format_turns: bool = True,
        ws_url: str = DEFAULT_WS_URL,
    ) -> None:
        self.api_key = os.getenv("ASSEMBLYAI_API_KEY") or api_key
        self.speech_model = os.getenv("ASSEMBLYAI_SPEECH_MODEL") or speech_model or DEFAULT_MODEL
        self.fallback_model = os.getenv("ASSEMBLYAI_FALLBACK_MODEL") or fallback_model or DEFAULT_FALLBACK_MODEL
        self.format_turns = format_turns
        self.ws_url = ws_url or DEFAULT_WS_URL

    def create_stream_session(self) -> AssemblyAIStreamSession:
        return AssemblyAIStreamSession(
            api_key=self.api_key,
            speech_model=self.speech_model,
            fallback_model=self.fallback_model,
            format_turns=self.format_turns,
            ws_url=self.ws_url,
            sample_rate=self.SAMPLE_RATE,
        )

    async def async_transcribe_np(self, audio: np.ndarray) -> str:
        if not audio.size:
            return ""
        if not self.api_key:
            raise RuntimeError("AssemblyAI transcription needs ASSEMBLYAI_API_KEY.")

        session = self.create_stream_session()
        try:
            session._accepting_turn = True
            if not await session.ensure_connected():
                raise RuntimeError("Could not connect to AssemblyAI Streaming v3.")
            pcm = float32_to_pcm16(audio)
            ws = session._ws
            if ws is None:
                raise RuntimeError("AssemblyAI stream disconnected before audio upload.")
            for idx in range(0, len(pcm), SEND_CHUNK_BYTES):
                chunk = pcm[idx : idx + SEND_CHUNK_BYTES]
                if len(chunk) < MIN_CHUNK_BYTES:
                    chunk = chunk + b"\x00" * (MIN_CHUNK_BYTES - len(chunk))
                await ws.send(chunk)
                # Pace lightly so AssemblyAI's real-time decoder processes cleanly without drops
                await asyncio.sleep(0.015)
            return await session.finish_turn(wait_timeout=3.0)
        finally:
            await session.close()

    def transcribe_np(self, audio: np.ndarray) -> str:
        return asyncio.run(self.async_transcribe_np(audio))
