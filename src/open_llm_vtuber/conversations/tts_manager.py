import asyncio
import base64
import json
import re
import uuid
from datetime import datetime
from typing import List, Optional
from loguru import logger

from ..agent.output_types import DisplayText, Actions
from ..live2d_model import Live2dModel
from ..tts.fish_api_tts import PCM_SAMPLE_RATE, PCMUnsupportedError, TTSEngine as FishTTSEngine
from ..tts.tts_interface import TTSInterface
from ..utils.stream_audio import prepare_audio_payload
from .types import WebSocketSend


Utterance = asyncio.Queue[dict | None]


class TTSTaskManager:
    """Manages TTS tasks and ensures ordered delivery to frontend while allowing parallel TTS generation"""

    def __init__(self, stream_pcm: bool = False) -> None:
        self.task_list: List[asyncio.Task] = []
        self.stream_pcm = stream_pcm
        self._utterances: asyncio.Queue[Utterance] = asyncio.Queue()
        self._sender_task: Optional[asyncio.Task] = None

    async def speak(
        self,
        tts_text: str,
        display_text: DisplayText,
        actions: Optional[Actions],
        live2d_model: Live2dModel,
        tts_engine: TTSInterface,
        websocket_send: WebSocketSend,
    ) -> None:
        """
        Queue a TTS task while maintaining order of delivery.

        Args:
            tts_text: Text to synthesize
            display_text: Text to display in UI
            actions: Live2D model actions
            live2d_model: Live2D model instance
            tts_engine: TTS engine instance
            websocket_send: WebSocket send function
        """
        utterance = self._reserve_utterance(websocket_send)
        if len(re.sub(r'[\s.,!?，。！？\'"』」）】\s]+', "", tts_text)) == 0:
            self._queue_caption(utterance, display_text, actions)
            utterance.put_nowait(None)
            return

        logger.debug(f"Queuing TTS task for: {tts_text!r}")

        # Create and queue the TTS task
        task = asyncio.create_task(
            self._process_tts(
                tts_text=tts_text,
                display_text=display_text,
                actions=actions,
                tts_engine=tts_engine,
                utterance=utterance,
            )
        )
        self.task_list.append(task)

    async def queue_audio_payload(self, payload: dict, websocket_send: WebSocketSend) -> None:
        """Queue an already prepared audio payload for ordered playback."""
        utterance = self._reserve_utterance(websocket_send)
        utterance.put_nowait(payload)
        utterance.put_nowait(None)

    def _reserve_utterance(self, websocket_send: WebSocketSend) -> Utterance:
        utterance = asyncio.Queue()
        self._utterances.put_nowait(utterance)
        if not self._sender_task or self._sender_task.done():
            self._sender_task = asyncio.create_task(
                self._send_utterances(self._utterances, websocket_send)
            )
        return utterance

    async def _send_utterances(
        self, utterances: asyncio.Queue[Utterance], websocket_send: WebSocketSend
    ) -> None:
        """Send each utterance in order while synthesis can run in parallel."""
        while True:
            utterance = await utterances.get()
            try:
                while (payload := await utterance.get()) is not None:
                    try:
                        await websocket_send(json.dumps(payload))
                    except Exception as exc:
                        logger.warning("Audio delivery failed ({})", type(exc).__name__)
            finally:
                utterances.task_done()

    async def drain(self) -> bool:
        """Wait for synthesis and ordered delivery, returning whether any payload was sent."""
        if self.task_list:
            await asyncio.gather(*self.task_list)
        if self._sender_task is None:
            return False
        await asyncio.wait_for(self._utterances.join(), timeout=5)
        return True

    def _queue_caption(
        self,
        utterance: Utterance,
        display_text: DisplayText,
        actions: Optional[Actions],
    ) -> None:
        """Queue a silent audio payload"""
        audio_payload = prepare_audio_payload(
            audio_path=None,
            display_text=display_text,
            actions=actions,
        )
        utterance.put_nowait(audio_payload)

    async def _process_tts(
        self,
        tts_text: str,
        display_text: DisplayText,
        actions: Optional[Actions],
        tts_engine: TTSInterface,
        utterance: Utterance,
    ) -> None:
        """Process TTS generation and queue the result for ordered delivery"""
        audio_file_path = None
        try:
            if self.stream_pcm and isinstance(tts_engine, FishTTSEngine):
                try:
                    await self._stream_tts(utterance, tts_engine, tts_text, display_text, actions)
                    return
                except PCMUnsupportedError:
                    logger.info("Fish Audio PCM is unavailable. Falling back to WAV.")
            audio_file_path = await self._generate_audio(tts_engine, tts_text)
            payload = await asyncio.to_thread(
                prepare_audio_payload,
                audio_path=audio_file_path,
                display_text=display_text,
                actions=actions,
            )
            utterance.put_nowait(payload)

        except Exception as e:
            logger.error(f"Error preparing audio payload: {e}")
            self._queue_caption(utterance, display_text, actions)

        finally:
            utterance.put_nowait(None)
            if audio_file_path:
                tts_engine.remove_file(audio_file_path)
                logger.debug("Audio cache file cleaned.")

    async def _stream_tts(
        self,
        utterance: Utterance,
        engine: FishTTSEngine,
        text: str,
        display: DisplayText,
        actions: Optional[Actions] = None,
    ) -> None:
        stream_id = uuid.uuid4().hex
        started = False
        try:
            async for chunk in engine.stream_pcm(text):
                if not started:
                    start_msg = {
                        "type": "audio-stream-start",
                        "stream_id": stream_id,
                        "sample_rate": PCM_SAMPLE_RATE,
                        "display_text": display.to_dict(),
                    }
                    if actions:
                        start_msg["actions"] = actions.to_dict()
                    utterance.put_nowait(start_msg)
                    started = True
                utterance.put_nowait({
                    "type": "audio-stream-chunk",
                    "stream_id": stream_id,
                    "audio": base64.b64encode(chunk).decode("ascii"),
                })
        except Exception as exc:
            if not started:
                raise
            logger.warning("Fish Audio stream stopped early ({})", type(exc).__name__)
        utterance.put_nowait({"type": "audio-stream-end", "stream_id": stream_id})

    async def _generate_audio(self, tts_engine: TTSInterface, text: str) -> str:
        """Generate audio file from text"""
        logger.debug(f"🏃Generating audio for '''{text}'''...")
        return await tts_engine.async_generate_audio(
            text=text,
            file_name_no_ext=f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}",
        )

    def clear(self) -> None:
        """Clear all pending tasks and reset state"""
        for task in self.task_list:
            if not task.done():
                task.cancel()
        self.task_list.clear()
        if self._sender_task:
            self._sender_task.cancel()
        self._sender_task = None
        self._utterances = asyncio.Queue()
