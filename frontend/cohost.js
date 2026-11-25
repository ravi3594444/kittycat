/* Operator controls for the backend's co-host session. */
(() => {
  const liveMode = location.pathname === "/live";
  const liveStage = liveMode ? document.createElement("main") : undefined;
  let liveSubtitles;
  let subtitleTimer;
  if (liveStage) {
    document.title = "Kittycat Live";
    document.documentElement.classList.add("kittycat-live");
    liveStage.className = "kittycat-live-stage";
    document.body.prepend(liveStage);
    liveSubtitles = document.createElement("div");
    liveSubtitles.className = "kittycat-live-subtitles";
    liveSubtitles.hidden = true;
    document.body.append(liveSubtitles);
  }

  function showLiveSubtitle(displayText) {
    if (!liveSubtitles || !displayText?.text) return;
    const clean = String(displayText.text).replace(/\[[^\]]+\]/g, "").trim();
    if (!clean) return;
    const speaker = displayText.name || "Professor Whiskers";
    liveSubtitles.innerHTML = "";
    const tag = document.createElement("span");
    tag.className = "speaker";
    tag.textContent = `${speaker}:`;
    liveSubtitles.append(tag, document.createTextNode(clean));
    liveSubtitles.hidden = false;
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => { liveSubtitles.hidden = true; }, 9000);
  }

  const panel = document.createElement("details");
  panel.className = "cohost-panel";
  panel.innerHTML = `
    <summary>Co-host controls</summary>
    <section>
      <p class="cohost-status" role="status">Connecting…</p>
      <div class="cohost-row">
        <button type="button" data-control="hold">Mute and hold</button>
        <button type="button" data-control="auto-speak" aria-pressed="false">Auto-speak: OFF</button>
        <button type="button" data-control="wake-phrase" aria-pressed="false">Wake phrase: OFF</button>
      </div>
      <div class="cohost-row" style="margin-top:6px;">
        <button type="button" data-control="intro">Speak intro</button>
        <button type="button" data-control="next-topic">Next topic</button>
        <button type="button" data-control="suggest">Suggest transition</button>
        <a href="/control" target="_blank" rel="noopener" style="color:#9ec5ff;font-size:12px;align-self:center;margin-left:auto;">iPhone Control ↗</a>
      </div>
      <div class="cohost-row" style="margin-top:6px;">
        <button type="button" data-control="voice-demo" hidden>Play voice demo</button>
        <button type="button" data-control="forget-motions" hidden>Forget learned commands</button>
        <button type="button" data-control="reset-live-memory" hidden>Clear live memory</button>
      </div>
      <label>AI Host Personality
        <select name="personality">
          <option value="professor_whiskers">Professor Whiskers (Teacher / Network+)</option>
          <option value="whiskers_comedian">Whiskers (Comedian)</option>
          <option value="whiskers_tech_expert">Whiskers (Tech Expert)</option>
          <option value="whiskers_cohost">Whiskers (Co-Host)</option>
          <option value="pawsrig">Little Cat (Default)</option>
        </select>
      </label>
      <div class="cohost-voice-samples" hidden>
        <label for="cohost-voice-sample">Voice emotion</label>
        <select id="cohost-voice-sample" name="voice_sample"></select>
        <button type="button" data-control="voice-sample">Play emotion sample</button>
      </div>
      <label>Lesson notes <textarea name="lesson" rows="3" maxlength="4000"></textarea></label>
      <button type="button" data-control="lesson">Save notes</button>
      <form>
        <label>Viewer name (optional) <input name="viewer_name" maxlength="60"></label>
        <label>Test a viewer comment <input name="comment" maxlength="500" placeholder="!wave or a lesson question" required></label>
        <button type="submit">Send test comment</button>
      </form>
      <div class="cohost-review"></div>
      <small class="cohost-metrics"></small>
    </section>`;
  document.body.append(panel);
  if (liveMode) {
    let controlsWindow;
    panel.hidden = !new URLSearchParams(location.search).has("controls");
    panel.open = !panel.hidden;
    window.addEventListener("keydown", event => {
      if (!event.altKey || event.code !== "KeyC" || event.repeat) return;
      event.preventDefault();
      if (controlsWindow && !controlsWindow.closed) {
        controlsWindow.focus();
        return;
      }
      controlsWindow = window.open("", "kittycat-controls", "popup,width=430,height=630");
      if (controlsWindow) {
        const controlsDocument = controlsWindow.document;
        controlsDocument.title = "Kittycat controls";
        const css = controlsDocument.createElement("link");
        css.rel = "stylesheet";
        css.href = new URL("./cohost.css", document.baseURI).href;
        controlsDocument.head.append(css);
        controlsDocument.body.classList.add("kittycat-controls-window");
        controlsDocument.body.append(panel);
      } else if (!panel.isConnected) {
        document.body.append(panel);
      }
      panel.hidden = false;
      panel.open = true;
    });
    window.addEventListener("pagehide", () => controlsWindow?.close());
  }

  const status = panel.querySelector(".cohost-status");
  const lesson = panel.querySelector("[name=lesson]");
  const list = panel.querySelector(".cohost-review");
  const metrics = panel.querySelector(".cohost-metrics");
  const holdButton = panel.querySelector("[data-control=hold]");
  const autoSpeakButton = panel.querySelector("[data-control=auto-speak]");
  const wakePhraseButton = panel.querySelector("[data-control=wake-phrase]");
  const personalitySelect = panel.querySelector("[name=personality]");
  const demoButton = panel.querySelector("[data-control=voice-demo]");
  const forgetButton = panel.querySelector("[data-control=forget-motions]");
  const clearLiveMemoryButton = panel.querySelector("[data-control=reset-live-memory]");
  const samplePanel = panel.querySelector(".cohost-voice-samples");
  const sampleSelect = panel.querySelector("[name=voice_sample]");
  const sampleButton = panel.querySelector("[data-control=voice-sample]");
  const edits = new Map();
  let socket;
  let modelName;
  let clientId;
  let hold = false;
  let autoSpeak = false;
  let wakePhraseOnly = false;
  let stopOutput;
  let pendingMotion;
  let motionTimer;
  let savedLesson = "";
  let usePawsRig = false;
  let pawsRig;
  let latestSpeech;
  let streamAnalyser;
  let pawsRigLoad;
  let announcedPCM;
  let announcedMotionMemory = false;
  const motionMemoryKey = "kittycat.learned-motions.v1";
  let motionMemory = [];
  try {
    const saved = JSON.parse(localStorage.getItem(motionMemoryKey) || "[]");
    if (Array.isArray(saved)) {
      motionMemory = saved.filter(entry => Array.isArray(entry) && entry.length === 2 &&
        entry.every(part => typeof part === "string")).slice(-64);
    }
  } catch { /* Learning still works for this session if storage is unavailable. */ }

  function saveMotionMemory(entries) {
    motionMemory = entries;
    forgetButton.hidden = !entries.length;
    try { localStorage.setItem(motionMemoryKey, JSON.stringify(entries)); } catch { /* Session only. */ }
  }

  function send(message) {
    if (socket?.readyState !== WebSocket.OPEN) {
      status.textContent = "The co-host is disconnected.";
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  }

  function control(action, values = {}) {
    return send({ type: "cohost-control", action, ...values });
  }

  function announcePCM() {
    if (socket?.readyState !== WebSocket.OPEN || !modelName) return;
    const ready = usePawsRig && Boolean(window.kittycatStreamAudio?.ready);
    if (announcedPCM === ready) return;
    if (control("streaming-audio", { enabled: ready })) announcedPCM = ready;
  }

  function unlockPCM() {
    if (usePawsRig && !window.kittycatStreamAudio?.ready) window.kittycatStreamAudio?.unlock();
  }

  function selectRenderer(renderer) {
    const enabled = renderer === "pawsrig";
    if (liveMode) document.documentElement.dataset.liveRenderer = enabled ? "pawsrig" : "live2d";
    if (enabled === usePawsRig) return;
    usePawsRig = enabled;
    window.kittycatStreamAudio?.enable(enabled);
    if (!enabled) {
      pawsRig?.destroy();
      pawsRig = undefined;
      return;
    }

    pawsRigLoad ??= import("./pawsrig/stage.js");
    pawsRigLoad.then(({ mountPawsRig }) => {
      if (!usePawsRig || pawsRig) return;
      pawsRig = mountPawsRig(liveStage);
      if (latestSpeech) pawsRig.useSpeech(latestSpeech);
      if (streamAnalyser) pawsRig.useAnalyser(streamAnalyser);
    }).catch(() => {
      pawsRigLoad = undefined;
      if (usePawsRig) status.textContent = "The PawsRig avatar could not load.";
    });
  }

  function playMotion(event) {
    if (event.model !== modelName) return;
    clearTimeout(motionTimer);
    pendingMotion = event;
    const deadline = performance.now() + 5000;

    const tryPlay = () => {
      if (pendingMotion !== event || event.model !== modelName) return;
      let playing;
      if (usePawsRig) {
        playing = pawsRig?.play(event.group);
      } else {
        const model = window.getLive2DManager?.()?.getModel(0);
        if (model?._initialized && model._modelSetting?.getMotionCount(event.group) &&
            model._modelHomeDir?.endsWith(event.modelPath)) {
          model.startRandomMotion(event.group, 3);
          playing = true;
        }
      }
      if (playing) {
        status.textContent = event.action === "listen"
          ? "Little Cat noticed the comment."
          : `Playing ${event.action}.`;
        pendingMotion = null;
      } else if (performance.now() < deadline) {
        motionTimer = setTimeout(tryPlay, 70);
      } else {
        status.textContent = "This animation could not load.";
        pendingMotion = null;
      }
    };
    tryPlay();
  }

  function stopMotion() {
    clearTimeout(motionTimer);
    pendingMotion = null;
    pawsRig?.play("idle");
  }

  function reviewButton(label, action, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.control = action;
    button.dataset.id = id;
    return button;
  }

  function renderReview(items) {
    const currentIds = new Set(items.map(item => item.id));
    for (const id of edits.keys()) if (!currentIds.has(id)) edits.delete(id);
    for (const card of Array.from(list.children)) {
      if (!currentIds.has(card.dataset.id)) card.remove();
    }

    for (const item of items) {
      let card = list.querySelector(`[data-id="${item.id}"]`);
      if (!card) {
        card = document.createElement("article");
        card.dataset.id = item.id;
        const question = document.createElement("p");
        question.textContent = item.viewer_name ? `${item.viewer_name} · ${item.text}` : item.text;
        const reply = document.createElement("textarea");
        reply.rows = 2;
        reply.maxLength = 450;
        reply.placeholder = "Review or enter a reply";
        reply.setAttribute("aria-label", "Reply");
        reply.addEventListener("input", () => edits.set(item.id, reply.value));
        const sources = document.createElement("p");
        sources.className = "cohost-sources";
        const actions = document.createElement("div");
        actions.className = "cohost-row";
        if (item.kind !== "acknowledgment") {
          actions.append(reviewButton("Draft", "draft", item.id));
        }
        actions.append(
          reviewButton("Approve and speak", "speak", item.id),
          reviewButton("Dismiss", "dismiss", item.id),
        );
        card.append(question, reply, sources, actions);
        list.append(card);
      }
      const reply = card.querySelector("textarea");
      if (!edits.has(item.id) && reply.value !== item.answer) reply.value = item.answer;
      const sources = card.querySelector(".cohost-sources");
      sources.hidden = !item.sources?.length;
      sources.textContent = sources.hidden ? "" : `Records found · ${item.sources.join(" · ")}`;
      card.querySelector("[data-control=speak]").disabled = hold;
    }
  }

  function update(message) {
    if (message.type === "set-model-and-conf") {
      modelName = message.model_info?.name;
      selectRenderer(message.model_info?.renderer);
      announcePCM();
      if (!announcedMotionMemory) {
        announcedMotionMemory = true;
        forgetButton.hidden = !motionMemory.length;
        if (motionMemory.length) control("restore-motion-memory", { commands: motionMemory });
      }
      clientId = message.client_uid ?? clientId;
      pendingMotion = null;
    } else if (message.type === "control" && message.text === "conversation-chain-start") {
      stopMotion();
    } else if (message.type === "audio" || message.type === "audio-stream-start") {
      if (message.display_text) showLiveSubtitle(message.display_text);
      if (
        usePawsRig &&
        Array.isArray(message.actions?.expressions) &&
        message.actions.expressions.length
      ) {
        const expr = message.actions.expressions[0];
        const current = pawsRig?.currentAction?.() || "idle";
        const passiveActions = new Set(["idle", "listen", "nod", "talk"]);
        if (typeof expr === "string" && expr !== "idle" && expr !== current && passiveActions.has(current)) {
          pawsRig?.play(expr);
        }
      }
    } else if (message.type === "avatar-motion") {
      if (Array.isArray(message.learned_command) && message.learned_command.length === 2 &&
          message.learned_command.every(part => typeof part === "string")) {
        const [phrase] = message.learned_command;
        saveMotionMemory([...motionMemory.filter(([known]) => known !== phrase), message.learned_command].slice(-64));
      }
      playMotion(message);
    } else if (message.type === "cohost-status") {
      if (message.hold && !hold) stopOutput?.();
      hold = message.hold;
      clearLiveMemoryButton.hidden = !message.has_live_memory;
      demoButton.hidden = !message.voice_demo;
      demoButton.disabled = hold;
      if (message.voice_samples && !sampleSelect.options.length) {
        for (const [id, label] of Object.entries(message.voice_samples)) {
          sampleSelect.add(new Option(label, id));
        }
      }
      samplePanel.hidden = !message.voice_samples || !sampleSelect.options.length;
      sampleButton.disabled = hold;
      holdButton.textContent = hold ? "Resume co-host" : "Mute and hold";
      holdButton.setAttribute("aria-pressed", String(hold));
      autoSpeak = Boolean(message.auto_speak);
      autoSpeakButton.textContent = autoSpeak ? "Auto-speak: ON" : "Auto-speak: OFF";
      autoSpeakButton.setAttribute("aria-pressed", String(autoSpeak));
      wakePhraseOnly = Boolean(message.wake_phrase_only);
      wakePhraseButton.textContent = wakePhraseOnly ? "Wake phrase: ON" : "Wake phrase: OFF";
      wakePhraseButton.setAttribute("aria-pressed", String(wakePhraseOnly));
      if (message.active_personality && personalitySelect.value !== message.active_personality) {
        const hasOption = Array.from(personalitySelect.options).some(o => o.value === message.active_personality);
        if (hasOption) personalitySelect.value = message.active_personality;
      }
      if (message.message || ["Connecting…", "The co-host is disconnected."].includes(status.textContent)) {
        status.textContent = message.message || "Co-host ready.";
      }
      if (lesson.value === savedLesson || message.lesson === lesson.value) {
        lesson.value = message.lesson;
      }
      savedLesson = message.lesson;
      renderReview(message.review);
      const counts = message.metrics;
      metrics.textContent = [
        `${counts.received || 0} comments`,
        `${counts.motions || 0} animations`,
        `${counts.approved || 0} approved`,
        `${counts.caption_fallback || 0} captions only`,
        ...(message.last_response_ms == null ? [] : [
          `last response ${(message.last_response_ms / 1000).toFixed(1)} s since intake`,
        ]),
      ].join(" · ");
      metrics.title = clientId ? `Session ID ${clientId}` : "";
    } else if (message.type === "error" && message.message) {
      status.textContent = String(message.message);
    }
  }

  panel.addEventListener("click", event => {
    const button = event.target.closest("button[data-control]");
    if (!button) return;
    const { control: action, id } = button.dataset;
    if (action === "hold") {
      if (!hold) stopOutput?.();
      control("hold", { hold: !hold });
    } else if (action === "auto-speak") {
      control("auto-speak", { enabled: !autoSpeak });
    } else if (action === "wake-phrase") {
      control("wake-phrase", { enabled: !wakePhraseOnly });
    } else if (action === "lesson") {
      savedLesson = lesson.value;
      control("lesson", { lesson: lesson.value });
    } else if (action === "speak") {
      control("speak", { id, answer: button.closest("article").querySelector("textarea").value });
    } else if (action === "voice-sample") {
      control(action, { sample: sampleSelect.value });
    } else if (action === "forget-motions") {
      if (control("restore-motion-memory", { commands: [] })) {
        saveMotionMemory([]);
        status.textContent = "Learned commands cleared.";
      }
    } else {
      if (action === "draft") edits.delete(id);
      control(action, { id });
    }
  });

  personalitySelect.addEventListener("change", () => {
    control("personality", { personality: personalitySelect.value });
  });

  panel.querySelector("form").addEventListener("submit", event => {
    event.preventDefault();
    const input = event.target.elements.comment;
    if (send({
      type: "viewer-comment",
      text: input.value,
      viewer_name: event.target.elements.viewer_name.value.trim() || undefined,
      source: "operator-test",
    })) {
      input.value = "";
    }
  });

  window.addEventListener("cohost:voice", event => {
    latestSpeech = event.detail;
    pawsRig?.useSpeech(latestSpeech);
    const { audio } = latestSpeech;
    function releaseSpeech() {
      if (latestSpeech?.audio === audio) latestSpeech = undefined;
    }
    audio.addEventListener("pause", releaseSpeech, { once: true });
    audio.addEventListener("ended", releaseSpeech, { once: true });
  });

  window.addEventListener("cohost:stream-voice", event => {
    streamAnalyser = event.detail;
    pawsRig?.useAnalyser(streamAnalyser);
  });
  window.addEventListener("cohost:pcm-state", announcePCM);
  window.addEventListener("pointerup", unlockPCM, true);
  window.addEventListener("keydown", unlockPCM, true);

  window.addEventListener("cohost:socket", event => {
    window.kittycatStreamAudio?.stop();
    modelName = undefined;
    announcedPCM = undefined;
    announcedMotionMemory = false;
    socket = event.detail.socket;
    stopOutput = event.detail.stopOutput;
    const active = socket;
    active.addEventListener("message", event => {
      if (active !== socket) return;
      try { update(JSON.parse(event.data)); } catch { /* handled by the main client */ }
    });
    active.addEventListener("close", () => {
      if (active !== socket) return;
      window.kittycatStreamAudio?.stop();
      status.textContent = "The co-host is disconnected.";
      list.replaceChildren();
      edits.clear();
      lesson.value = savedLesson = "";
      pendingMotion = null;
      demoButton.hidden = true;
      forgetButton.hidden = true;
      clearLiveMemoryButton.hidden = true;
      samplePanel.hidden = true;
      hold = false;
      holdButton.textContent = "Mute and hold";
    });
  });
  window.addEventListener("cohost:floor", event => {
    if (event.detail) stopMotion();
    control("floor", { speaking: event.detail });
  });
})();
