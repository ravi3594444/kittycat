import base64

import numpy as np
from pydub import AudioSegment
from pydub.utils import make_chunks
from ..agent.output_types import Actions
from ..agent.output_types import DisplayText


def _get_volume_by_chunks(audio: AudioSegment, chunk_length_ms: int) -> list:
    """
    Calculate the normalized volume (RMS) for each chunk of the audio.

    Parameters:
        audio (AudioSegment): The audio segment to process.
        chunk_length_ms (int): The length of each audio chunk in milliseconds.

    Returns:
        list: Normalized volumes for each chunk.
    """
    chunks = make_chunks(audio, chunk_length_ms)
    volumes = [chunk.rms for chunk in chunks]
    max_volume = max(volumes)
    if max_volume == 0:
        raise ValueError("Audio is empty or all zero.")
    return [volume / max_volume for volume in volumes]


def _get_mouth_roundness(audio: AudioSegment, chunk_ms: int, frame_count: int) -> list[float]:
    """Estimate rounded versus spread mouth shapes from speech resonance."""
    mono = np.asarray(audio.get_array_of_samples(), dtype=np.float32)
    mono = mono.reshape(-1, audio.channels).mean(axis=1)
    frame_size = max(1, round(audio.frame_rate * chunk_ms / 1000))
    length = frame_size * frame_count
    frames = np.pad(mono[:length], (0, max(0, length - len(mono))))
    frames = frames.reshape(frame_count, frame_size) * np.hanning(frame_size)
    power = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    hz = np.fft.rfftfreq(frame_size, 1 / audio.frame_rate)
    low = power[:, (350 <= hz) & (hz < 1300)].sum(axis=1)
    high = power[:, (1500 <= hz) & (hz < 3600)].sum(axis=1)
    ratio = np.divide(low, low + high, out=np.full_like(low, 0.5), where=(low + high) > 0)
    return np.round(np.clip((ratio - 0.35) * 1.8 + 0.25, 0, 1), 3).tolist()


def prepare_audio_payload(
    audio_path: str | None,
    chunk_length_ms: int = 20,
    display_text: DisplayText = None,
    actions: Actions = None,
    forwarded: bool = False,
) -> dict[str, any]:
    """
    Prepares the audio payload for sending to a broadcast endpoint.
    If audio_path is None, returns a payload with audio=None for silent display.

    Parameters:
        audio_path (str | None): The path to the audio file to be processed, or None for silent display
        chunk_length_ms (int): The length of each audio chunk in milliseconds
        display_text (DisplayText, optional): Text to be displayed with the audio
        actions (Actions, optional): Actions associated with the audio

    Returns:
        dict: The audio payload to be sent
    """
    if isinstance(display_text, DisplayText):
        display_text = display_text.to_dict()

    if not audio_path:
        # Return payload for silent display
        return {
            "type": "audio",
            "audio": None,
            "volumes": [],
            "mouth_roundness": [],
            "slice_length": chunk_length_ms,
            "display_text": display_text,
            "actions": actions.to_dict() if actions else None,
            "forwarded": forwarded,
        }

    try:
        audio = AudioSegment.from_file(audio_path)
        audio_bytes = audio.export(format="wav").read()
    except Exception as e:
        raise ValueError(
            f"Error loading or converting generated audio file to wav file '{audio_path}': {e}"
        )
    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    volumes = _get_volume_by_chunks(audio, chunk_length_ms)

    payload = {
        "type": "audio",
        "audio": audio_base64,
        "volumes": volumes,
        "mouth_roundness": _get_mouth_roundness(audio, chunk_length_ms, len(volumes)),
        "slice_length": chunk_length_ms,
        "display_text": display_text,
        "actions": actions.to_dict() if actions else None,
        "forwarded": forwarded,
    }

    return payload


# Example usage:
# payload, duration = prepare_audio_payload("path/to/audio.mp3", display_text="Hello", expression_list=[0,1,2])
