import io
import os
import wave

import httpx
import numpy as np

from .asr_interface import ASRInterface


class VoiceRecognition(ASRInterface):
    """Transcribe a completed microphone turn through Fish Audio."""

    def __init__(
        self,
        api_key: str = "",
        model: str = "transcribe-1-pro",
        language: str = "",
        base_url: str = "https://api.fish.audio",
    ):
        self.api_key = os.getenv("FISH_AUDIO_API_KEY") or api_key
        self.model = model
        self.language = language
        self.url = f"{base_url.rstrip('/')}/v1/asr"

    def transcribe_np(self, audio: np.ndarray) -> str:
        if not audio.size:
            return ""
        if not self.api_key:
            raise RuntimeError("Microphone transcription needs FISH_AUDIO_API_KEY.")

        pcm = (np.clip(np.nan_to_num(audio), -1, 1) * 32767).astype("<i2")
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(self.NUM_CHANNELS)
            wav.setsampwidth(self.SAMPLE_WIDTH)
            wav.setframerate(self.SAMPLE_RATE)
            wav.writeframes(pcm.tobytes())

        options = {"ignore_timestamps": "true"}
        if self.language:
            options["language"] = self.language
        if self.model == "transcribe-1-pro":
            options.update(diarize="false", tag_audio_events="false")

        try:
            response = httpx.post(
                self.url,
                headers={"Authorization": f"Bearer {self.api_key}", "model": self.model},
                files={"audio": ("turn.wav", buffer.getvalue(), "audio/wav")},
                data=options,
                timeout=20,
            )
            response.raise_for_status()
            text = response.json()["text"]
            if not isinstance(text, str):
                raise ValueError("invalid transcript")
            return text.strip()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Fish Audio transcription returned HTTP {exc.response.status_code}."
            ) from None
        except (httpx.RequestError, ValueError, KeyError, TypeError):
            raise RuntimeError("Fish Audio transcription is unavailable.") from None
