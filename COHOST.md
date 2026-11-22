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

PawsRig plays [16-bit Fish Audio PCM](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech) as chunks arrive on the existing WebSocket. A browser interaction unlocks Web Audio. The browser's analyser reads the playback signal for the mouth animation. The WAV path handles browsers that have yet to unlock Web Audio, the Classic avatar, group chat, and prerecorded clips.

## Try the voice on the live page

Generate the sample once from the co-host's checkout. The script prompts for your Fish Audio API key when the shell and config have no key set.

```sh
uv run --no-project --python 3.12 --with-requirements requirements-cohost.txt python -m scripts.generate_voice_demo
```

Refresh the site and choose **Play voice demo** under **Co-host controls**. The sample plays through the avatar's speech animation and lip sync. The browser replays the generated recording, and each click uses that recording.

Little Cat uses [Fish Official Hannah](https://fish.audio/m/9a9cf47702da476aa4629e2506d4a857/) by default. The server requests 4 dB of volume reduction and sends everyday speech in the voice's natural delivery. The agent can start a genuinely funny line with `Ha ha,` to cue a soft laugh. Fish S2 accepts [inline emotion cues](https://docs.fish.audio/developer-guide/core-features/emotions) when directing an approved reply or demo. To try Fish's faster synthesis mode, set `latency: low` under `fish_api_tts` in `conf.yaml` and restart the service. To audition another voice, set `FISH_AUDIO_VOICE_ID` in the shell and run the demo command again.

In **Co-host controls**, choose a **Voice emotion** and select **Play emotion sample**. These prerecorded samples from the earlier voice use the same line in ten deliveries, including a soft laugh. Run the demo command above to generate a recording in the configured voice with two emotion cues. The earlier recordings are in the [voice samples folder](frontend/voice-samples).

## Use the co-host

Open **Co-host controls**.

- Enter `!wave`, `!dance`, `!meow`, or `!nod` under **Test a viewer comment** to try a shortcut. PawsRig also supports `!jump`, `!spin`, `!clap`, `!heart`, and `!pet`. Animations have a short cooldown between commands. `!meow` is a silent facial animation.
- Mercury can choose an animation for a clear request like `Hey Kitty, ek baar kood ke dikhao`. In main chat or over the microphone, Kitty acknowledges the move aloud. When you take the mic again, Kitty returns to idle and responds to your new request. Kittycat remembers successful viewer comment phrases in the operator's browser. Select **Forget learned commands** to clear them.
- Save lesson notes. Little Cat tilts its head when a comment enters review. Greetings, thanks, and confirmations get a short acknowledgment you can edit. Viewer questions appear for review after filtering and deduplication. Select **Draft**, edit the draft as needed, then select **Approve and speak**. The browser displays the caption and moves the cat's mouth during audio playback. The caption remains available if synthesis fails.
- **Suggest transition** queues a proactive prompt. A viewer's `!lesson` comment queues a read-only lookup of the current lesson notes. The operator approves the spoken result.
- **Mute and hold** interrupts playback and pauses new spoken turns. A live mic interruption also yields the floor. The session panel shows comment, motion, approval, caption fallback, and response timing counts.

Each browser session has its own review queue, lesson notes, and counters. They reset when the session disconnects. Configured `COHOST_BLOCKED_TERMS` can contain a comma-separated list of phrases to match in viewer comments. The filter is a keyword check. The operator reviews drafts before approving them.

### Stream memory and company knowledge

When you approve a viewer answer, Kitty retains up to six approved question-and-answer pairs for 20 minutes in that session. **Draft** can use these to answer follow-ups. Select **Clear live memory** when starting a different topic or Live.

Mercury can call a read-only lookup when drafting an answer. Matching records appear under the draft. Publish only details you are comfortable saying publicly on TikTok. Choose a knowledge source in the server environment. Notion and CRM refresh at most once per minute.

- **Notion** uses `COHOST_KNOWLEDGE_PROVIDER=notion`, `COHOST_NOTION_DATA_SOURCE_ID`, and `COHOST_NOTION_TOKEN`. Give the integration read access to a dedicated data source. Add these properties. Use **Name** for the title, **Answer** for rich text, **Public** for a checkbox, and **Kind** for a select with **Company** and **Memory** options. **Keywords** (multi-select) and **Source** (URL) are optional. Kitty reads rows with **Public** checked. [Notion data source documentation](https://developers.notion.com/reference/query-a-data-source)
- **CRM** uses `COHOST_KNOWLEDGE_PROVIDER=crm` and `COHOST_CRM_KNOWLEDGE_URL`. Point it at an HTTPS GET endpoint that returns the approved records in the JSON format below. Set `COHOST_CRM_API_TOKEN` if the feed requires bearer authentication.
- **Local file** uses `knowledge_base/kittycat-public.json` by default. Set `COHOST_KNOWLEDGE_FILE` to use another server-side path. Git ignores the default location. Kitty picks up saved edits on the next draft.

Use `company` for current public facts and `memory` for details to carry into future Lives.

```json
{
  "company": [
    {
      "title": "Product shipping",
      "text": "Replace with your published shipping policy.",
      "source": "Your public shipping FAQ",
      "keywords": ["delivery", "shipping"]
    }
  ],
  "memory": [
    {
      "title": "Project from the previous Live",
      "text": "Replace with a detail you want Kitty to carry into future Lives.",
      "source": "Host recap",
      "keywords": ["project", "previous live"]
    }
  ]
}
```

## Connect live comments

Open `/live` for a portrait window with just Kittycat. Click the Kittycat window once to enable audio, then capture that window in TikTok LIVE Studio. Press **Alt+C** to open the co-host controls in a separate window. Use `/live?controls=1` if pop-ups are unavailable. Close any extra Kittycat tabs to keep one relay destination.

For TikTok, the included relay uses the unofficial open-source Python **TikTokLive** project. It reads public chat from the creator's LIVE and sends those comments to Kittycat. Clear movement requests can animate automatically. Viewer answer drafts still go through **Approve and speak**. [TikTokLive source](https://github.com/isaackogan/TikTokLive)

On the VM, use the relay token that Kittycat already has in its environment and your TikTok creator handle. If Kittycat uses a different port, pass its comment endpoint with `--url`.

```sh
cd ~/kittycat-next
read -rsp 'Kittycat relay token: ' COHOST_COMMENT_TOKEN
printf '\n'
export COHOST_COMMENT_TOKEN
uv run --script scripts/tiktok_live_relay.py @yourhandle
```

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

The PawsRig canvas rig lives in `frontend/pawsrig/`. It reads the live audio spectrum to blend rounded and spread mouth shapes, keep consonant movements small, and close the mouth in pauses. WAV recordings use the volume and roundness estimates from the server. The eyelids meet briefly during a blink and reopen more slowly than they close.

After editing the TypeScript rig, rebuild its browser module from the repository root with `npx --yes esbuild@0.25.12 frontend/pawsrig/stage.ts --bundle --format=esm --target=es2022 --outfile=frontend/pawsrig/stage.js`. The Python server serves this bundle directly.

Little Cat was created by Ezri. The model and its attribution terms are bundled under `live2d-models/little_cat/`.
