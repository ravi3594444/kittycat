# Little Cat co-host

## Run locally

Clone this repository and open a terminal in its root. For a first run, copy `conf.example.yaml` to `conf.yaml`. The active configuration is ignored by Git. This build uses the bundled frontend. With [uv](https://docs.astral.sh/uv/getting-started/installation/) installed, run:

```sh
test -f conf.yaml || cp conf.example.yaml conf.yaml
uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python run_server.py
```

Open [http://localhost:12393](http://localhost:12393) in Chromium or Chrome. The browser may ask for microphone access. The avatar and test comment animations work before you add API keys.

Set `FISH_AUDIO_API_KEY` in the server's environment for microphone transcription and speech. Set `COHOST_LLM_API_KEY` for the configured OpenAI-compatible chat provider. You can also set `FISH_AUDIO_VOICE_ID` and `FISH_AUDIO_TTS_MODEL` to select the voice and speech model. The included configuration uses Fish Audio's turn-based `transcribe-1-pro` ASR and `s2.1-pro-free` synthesis. The browser detects speech turns and the server transcribes each completed turn. Fish Audio accepts the key only on the server.

## Use the co-host

Open **Co-host controls**.

- Enter `!wave`, `!dance`, `!meow`, or `!nod` under **Test a viewer comment**. Phrases like `can you wave your paw?` also work. Animations go straight to the rig, with a short cooldown between commands. `!meow` is a silent facial animation.
- Save lesson notes. Viewer questions appear for review after filtering and deduplication. Select **Draft** to generate a short answer from the notes, edit the draft as needed, then select **Approve and speak**. The browser displays the caption and moves the cat's mouth during audio playback. The caption remains available if synthesis fails.
- **Suggest transition** queues a proactive prompt. A viewer's `!lesson` comment queues a read-only lookup of the current lesson notes. The operator approves the spoken result. The viewer draft path has no external tool access.
- **Mute and hold** interrupts playback and pauses new spoken turns. A live mic interruption also yields the floor. The session panel shows comment, motion, approval, caption fallback, and response timing counts.

Each browser session has its own review queue, lesson notes, and counters. They reset when the session disconnects. Configured `COHOST_BLOCKED_TERMS` can contain a comma-separated list of phrases to match in viewer comments. The filter is a keyword check. The operator reviews drafts before approving them.

## Connect live comments

Set `COHOST_COMMENT_TOKEN` on the server. A trusted relay for an authorized live platform can then POST to `/api/cohost/comments`. The single connected operator session is selected automatically. If there are multiple sessions, include the destination `client_uid` from its WebSocket init message. The session ID is also available by hovering over the counters in Co-host controls.

```sh
curl http://localhost:12393/api/cohost/comments \
  -H "Authorization: Bearer $COHOST_COMMENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"source":"live-relay","event_id":"comment-123","text":"!wave"}'
```

Use the platform comment ID as `event_id` when available. The bundled optional BiliBili bridge sends the same viewer-comment event through `/proxy-ws`. Enable `system_config.enable_proxy`, configure the BiliBili bridge and room, then connect the operator browser to the same proxy using its WebSocket settings. TikTok Live comments need an authorized relay that forwards them to the HTTP endpoint.

Keep the operator page on localhost or behind your private access layer. The relay token protects HTTP intake. The existing operator WebSocket is for trusted local clients.

## Replace models

- **AI model** — Set `COHOST_LLM_MODEL`. When changing to a different OpenAI-compatible provider, set `COHOST_LLM_BASE_URL` and `COHOST_LLM_API_KEY` as well. Restart the server. You can also set these in the `openai_compatible_llm` section of `conf.yaml`.
- **Avatar** — Add the new model folder to `live2d-models/`, add an entry in `model_dict.json`, and select its name in `character_config.live2d_model_name`. For each command you want to support, map `wave`, `dance`, `meow`, or `nod` in the entry's `motionMap` to a motion group in the model manifest. Set up `Idle`, `Talk`, and the model's `LipSync` parameter group for the corresponding behaviors. Character overrides in `characters/` can also switch avatars in the running app.

Little Cat was created by Ezri. The model and its attribution terms are bundled under `live2d-models/little_cat/`.
