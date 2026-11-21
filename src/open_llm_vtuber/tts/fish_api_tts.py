import io
import os
import uuid
import wave
from pathlib import Path
from typing import Literal

import httpx

from .tts_interface import TTSInterface


class TTSEngine(TTSInterface):
    """Synthesize a WAV file through the Fish Audio HTTP API."""

    def __init__(
        self,
        api_key: str = "",
        reference_id: str = "7f92f8afb8ec43bf81429cc1c9199cb1",
        latency: Literal["normal", "balanced"] = "balanced",
        base_url: str = "https://api.fish.audio",
        model: str = "s2.1-pro-free",
        style: Literal["little_cat", "neutral"] = "little_cat",
    ):
        self.api_key = os.getenv("FISH_AUDIO_API_KEY") or api_key
        self.reference_id = os.getenv("FISH_AUDIO_VOICE_ID") or reference_id
        self.latency = latency
        self.url = f"{base_url.rstrip('/')}/v1/tts"
        self.model = os.getenv("FISH_AUDIO_TTS_MODEL") or model
        self.style = style

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
            body["prosody"] = {"speed": 1.04, "normalize_loudness": True}
            if self.model in {"s2-pro", "s2.1-pro", "s2.1-pro-free"}:
                body["text"] = (
                    "[bright, warmly playful, lightly expressive, with natural pauses] "
                    + text
                )
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
            async with httpx.AsyncClient() as client:
                response = await client.post(self.url, **self._request_options(text))
                return self._save_audio(response, file_name_no_ext)
        except httpx.RequestError:
            raise RuntimeError("Fish Audio synthesis is unavailable.") from None
