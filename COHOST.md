# Little Cat co-host

## Run locally

Clone this repository and open a terminal in its root. For a first run, copy `conf.example.yaml` to `conf.yaml`. The active configuration is ignored by Git. This build uses the bundled frontend. With [uv](https://docs.astral.sh/uv/getting-started/installation/) installed, run:

```sh
test -f conf.yaml || cp conf.example.yaml conf.yaml
uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python run_server.py
```

Open [http://localhost:12393](http://localhost:12393) in Chromium or Chrome. The browser may ask for microphone access. The avatar and test comment animations work before you add API keys.

Set `FISH_AUDIO_API_KEY` in the server's environment for microphone transcription and speech. Set `COHOST_LLM_API_KEY` for the configured OpenAI-compatible chat provider. You can also set `FISH_AUDIO_VOICE_ID` and `FISH_AUDIO_TTS_MODEL` to select the voice and speech model. The included configuration uses Fish Audio's turn-based `transcribe-1-pro` ASR and `s2.1-pro-free` synthesis. The browser detects speech turns and the server transcribes each completed turn. Fish Audio accepts the key only on the server.

With the default `unconfigured` chat key, you can type `hi` in the main chat to try a built-in greeting. General replies need a valid [Inception API key](https://docs.inceptionlabs.ai/get-started/authentication) when using the default `mercury-3` model. Set `COHOST_LLM_API_KEY` in the service's environment and restart the service. For a public preview with no login, keep the provider key in a privately accessible instance.

Kittycat automatically uses realtime mode and low reasoning effort for `mercury-3` on Inception's API. The first complete sentence or substantial clause can go to Fish Audio while Mercury is still generating. The server keeps Fish Audio connections open between spoken turns when the provider supports it. [Inception voice tuning](https://docs.inceptionlabs.ai/usecases/voice)

## Try the voice on the live page

Generate the sample once from the co-host's checkout. The script prompts for your Fish Audio API key when the shell and config have no key set.

```sh
uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python -m scripts.generate_voice_demo
```

Refresh the site and choose **Play voice demo** under **Co-host controls**. The sample plays through the avatar's speech animation and lip sync. The browser replays the generated recording, and each click uses that recording.

Little Cat uses [Sarah](https://fish.audio/m/933563129e564b19a115bedd57b7406a/) by default. Existing Little Cat configs that use the former default get Sarah when the server restarts. The delivery requests 4 dB of volume reduction and uses gentle curiosity for questions, soft emphasis for exclamations, and a warm conversational tone for other lines. Fish S2 accepts [inline emotion cues](https://docs.fish.audio/developer-guide/core-features/emotions) at the start of a line to direct it explicitly. Set `style: neutral` in `fish_api_tts` for the voice preset's own delivery. To audition another voice such as [Calm Young Female](https://fish.audio/m/6a76d481ddb54aa5ab587fb35adfd49b/), set `FISH_AUDIO_VOICE_ID` in the shell and run the sample command again. Regenerate the recording to hear changes in **Play voice demo**.

## Use the co-host

Open **Co-host controls**.

- Enter `!wave`, `!dance`, `!meow`, or `!nod` under **Test a viewer comment**. PawsRig also supports `!jump`, `!spin`, `!clap`, `!heart`, and `!pet`. Phrases like `can you wave your paw?` also work. Animations go straight to the rig, with a short cooldown between commands. `!meow` is a silent facial animation.
- Save lesson notes. Little Cat tilts its head when a comment enters review. Greetings, thanks, and confirmations get a short acknowledgment you can edit. Viewer questions appear for review after filtering and deduplication. Select **Draft** to generate a short answer from the notes, edit the draft as needed, then select **Approve and speak**. The browser displays the caption and moves the cat's mouth during audio playback. The caption remains available if synthesis fails.
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

Use the platform comment ID as `event_id` when available. Pass `viewer_name` to include the viewer’s display name in review and occasional spoken acknowledgments. The bundled optional BiliBili bridge sends the same viewer-comment event through `/proxy-ws`. Enable `system_config.enable_proxy`, configure the BiliBili bridge and room, then connect the operator browser to the same proxy using its WebSocket settings. TikTok Live comments need an authorized relay that forwards them to the HTTP endpoint.

Keep the operator page on localhost or behind your private access layer. The relay token protects HTTP intake. The existing operator WebSocket is for trusted local clients.

## Replace models

- **AI model** — Set `COHOST_LLM_MODEL`. When changing to a different OpenAI-compatible provider, set `COHOST_LLM_BASE_URL` and `COHOST_LLM_API_KEY` as well. Restart the server. You can also set these in the `openai_compatible_llm` section of `conf.yaml`.
- **Avatar** — Select **Little Cat (PawsRig)** or **Little Cat (Classic)** in the character menu. PawsRig is the default on new installs. In an existing `conf.yaml`, set `character_config.live2d_model_name` to `pawsrig` and `avatar` to `pawsrig.png` to launch with the new model. To install another Live2D avatar, put its assets in `live2d-models/`, register it in `model_dict.json`, and select its name in `character_config.live2d_model_name`. Map supported commands to manifest motion groups in `motionMap`, and set up `Idle`, `Talk`, and `LipSync` for idle and voice animation.

## Update PawsRig

The uploaded PawsRig canvas rig lives in `frontend/pawsrig/`. The built viewer still loads the classic Live2D model for its existing audio playback path. PawsRig renders in the same viewport and reads the `cohost:voice` event from the bundled viewer to sync its mouth using the current audio time and volume.

After editing the TypeScript rig, rebuild its browser module from the repository root with `npx --yes esbuild@0.25.12 frontend/pawsrig/stage.ts --bundle --format=esm --target=es2022 --outfile=frontend/pawsrig/stage.js`. The Python server serves this bundle directly.

Little Cat was created by Ezri. The model and its attribution terms are bundled under `live2d-models/little_cat/`.
