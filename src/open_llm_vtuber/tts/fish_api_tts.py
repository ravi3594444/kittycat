import io
import os
import re
import uuid
import wave
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack
from pathlib import Path
from typing import Literal

import httpx

from .tts_interface import TTSInterface


HANNAH_VOICE_ID = "9a9cf47702da476aa4629e2506d4a857"
LEGACY_LITTLE_CAT_VOICE_IDS = frozenset({
    "7f92f8afb8ec43bf81429cc1c9199cb1",
    "933563129e564b19a115bedd57b7406a",
})
LAUGH_START = re.compile(r"\s*ha[\s,-]*ha\b", re.IGNORECASE)
PCM_SAMPLE_RATE = 24000
PCM_CHUNK_BYTES = PCM_SAMPLE_RATE * 2 * 100 // 1000


class PCMUnsupportedError(RuntimeError):
    """The configured Fish Audio endpoint did not accept raw PCM output."""


class TTSEngine(TTSInterface):
    """Synthesize WAV files and stream PCM from the Fish Audio HTTP API."""

    def __init__(
        self,
        api_key: str = "",
        reference_id: str = HANNAH_VOICE_ID,
        latency: Literal["normal", "balanced", "low"] = "balanced",
        base_url: str = "https://api.fish.audio",
        model: str = "s2.1-pro-free",
        style: Literal["little_cat", "neutral"] = "little_cat",
        http_client: httpx.AsyncClient | None = None,
    ):
        self.api_key = os.getenv("FISH_AUDIO_API_KEY") or api_key
        if style == "little_cat" and reference_id in LEGACY_LITTLE_CAT_VOICE_IDS:
            reference_id = HANNAH_VOICE_ID
        self.reference_id = os.getenv("FISH_AUDIO_VOICE_ID") or reference_id
        self.latency = latency
        self.url = f"{base_url.rstrip('/')}/v1/tts"
        self.model = os.getenv("FISH_AUDIO_TTS_MODEL") or model
        self.style = style
        self.http_client = http_client

    @property
    def supports_emotion_cues(self) -> bool:
        return self.model in {"s2-pro", "s2.1-pro", "s2.1-pro-free"}

    def _request_options(self, text: str) -> dict:
        if not self.api_key:
            raise RuntimeError("Speech synthesis needs FISH_AUDIO_API_KEY.")
        body = {
            "text": text,
            "reference_id": self.reference_id,
            "format": "wav",
            "latency": self.latency,
        }
        if self.style == "little_cat":
            body["prosody"] = {"volume": -4, "normalize_loudness": True}
            if self.supports_emotion_cues and LAUGH_START.match(text):
                body["text"] = f"[laughing softly] {text}"
        return {
            "headers": {
                "Authorization": f"Bearer {self.api_key}",
                "model": self.model,
            },
            "json": body,
            "timeout": 20,
        }

    def _save_audio(self, response: httpx.Response, file_name_no_ext: str | None) -> str:
        if not response.is_success:
            raise RuntimeError(
                f"Fish Audio synthesis returned HTTP {response.status_code}."
            )
        try:
            with wave.open(io.BytesIO(response.content), "rb") as wav:
                if not wav.getnframes():
                    raise wave.Error("Empty WAV response")
        except (wave.Error, EOFError):
            raise RuntimeError("Fish Audio returned invalid WAV audio.") from None

        path = Path(self.generate_cache_file_name(file_name_no_ext or uuid.uuid4().hex))
        path.write_bytes(response.content)
        return str(path)

    async def stream_pcm(self, text: str) -> AsyncIterator[bytes]:
        """Yield 40 ms blocks of mono signed 16-bit PCM as Fish sends them."""
        options = self._request_options(text)
        options["json"].update(format="pcm", sample_rate=PCM_SAMPLE_RATE)
        try:
            async with AsyncExitStack() as stack:
                client = self.http_client or await stack.enter_async_context(httpx.AsyncClient())
                async with client.stream("POST", self.url, **options) as response:
                    if response.status_code in {400, 415, 422}:
                        raise PCMUnsupportedError("Fish Audio rejected PCM output.")
                    if not response.is_success:
                        raise RuntimeError(f"Fish Audio synthesis returned HTTP {response.status_code}.")
                    content_type = response.headers.get("content-type", "").lower()
                    if "json" in content_type or content_type.startswith("text/"):
                        raise RuntimeError("Fish Audio returned text instead of audio.")
                    first = True
                    async for chunk in response.aiter_bytes(chunk_size=PCM_CHUNK_BYTES):
                        if first and chunk.startswith((b"RIFF", b"ID3", b"OggS")):
                            raise PCMUnsupportedError("Fish Audio returned encoded audio instead of PCM.")
                        if len(chunk) % 2:
                            raise RuntimeError("Fish Audio returned an incomplete PCM sample.")
                        first = False
                        yield chunk
                    if first:
                        raise RuntimeError("Fish Audio returned an empty PCM stream.")
        except httpx.RequestError:
            raise RuntimeError("Fish Audio synthesis is unavailable.") from None

    def generate_audio(self, text: str, file_name_no_ext: str | None = None) -> str:
        try:
            response = httpx.post(self.url, **self._request_options(text))
            return self._save_audio(response, file_name_no_ext)
        except httpx.RequestError:
            raise RuntimeError("Fish Audio synthesis is unavailable.") from None

    async def async_generate_audio(
        self, text: str, file_name_no_ext: str | None = None
    ) -> str:
        try:
            options = self._request_options(text)
            if self.http_client is not None:
                response = await self.http_client.post(self.url, **options)
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.url, **options)
            return self._save_audio(response, file_name_no_ext)
        except httpx.RequestError:
            raise RuntimeError("Fish Audio synthesis is unavailable.") from None
