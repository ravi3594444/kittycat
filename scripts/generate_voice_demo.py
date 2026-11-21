"""Generate the prerecorded sample used by the co-host's live voice demo."""

import os
from getpass import getpass
from pathlib import Path
from tempfile import TemporaryDirectory

from src.open_llm_vtuber.cohost import VOICE_DEMO_PATH, VOICE_DEMO_TEXT
from src.open_llm_vtuber.config_manager import read_yaml, validate_config
from src.open_llm_vtuber.tts.fish_api_tts import TTSEngine


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    settings = validate_config(read_yaml(str(root / "conf.yaml"))).character_config
    options = settings.tts_config.fish_api_tts.model_dump()
    if not os.environ.get("FISH_AUDIO_API_KEY") and not options["api_key"]:
        options["api_key"] = getpass("Fish Audio API key: ").strip()
    engine = TTSEngine(**options)

    original_directory = Path.cwd()
    try:
        with TemporaryDirectory(dir=root) as scratch:
            os.chdir(scratch)
            try:
                generated = engine.generate_audio(VOICE_DEMO_TEXT)
                Path(generated).replace(root / VOICE_DEMO_PATH)
            finally:
                os.chdir(original_directory)
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from None

    print("Voice demo is ready. Refresh the co-host page.")


if __name__ == "__main__":
    main()
