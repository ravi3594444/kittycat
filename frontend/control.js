(() => {
  const TOKEN_KEY = "freedom_fusion.studio_token.v1";
  const $ = id => document.getElementById(id);
  const toastEl = $("toast");
  let toastTimer;
  let lastStatus = null;

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 4000);
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }

  // Support one-tap #token=... share link without leaking token in server logs
  if (location.hash.startsWith("#token=")) {
    const hashToken = decodeURIComponent(location.hash.slice("#token=".length)).trim();
    if (hashToken) {
      try { localStorage.setItem(TOKEN_KEY, hashToken); } catch {}
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
    return data;
  }

  function escapeHtml(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function renderStatus(st) {
    lastStatus = st;
    const badge = $("state-badge");
    badge.textContent = st.state || "standby";
    badge.className = `badge ${st.state === "live" ? "live" : "standby"}`;

    $("st-host").textContent = st.ai_host || "professor_whiskers";
    $("st-computer").textContent = st.avatar_connected
      ? `Connected (${st.connected_clients} window)`
      : "Server Online (open /live)";
    $("st-tiktok").textContent = st.tiktok_handle ? `@${st.tiktok_handle}` : "Not set";
    $("st-knowledge").textContent = `Network+ / ${(st.knowledge_source || "file").toUpperCase()}`;
    const relayTxt = st.relay?.running ? `Relay ON (@${st.relay.handle})` : "Relay Idle";
    const obsTxt = st.obs?.connected ? `OBS: ${st.obs.scene || "Connected"}` : "OBS Standby";
    $("st-services").textContent = `${relayTxt} · ${obsTxt}`;

    if (st.tiktok_links?.universal_url) {
      $("join-tiktok-link").href = st.tiktok_links.universal_url;
    }
    const sel = $("personality-select");
    if (st.ai_host && Array.from(sel.options).some(o => o.value === st.ai_host)) {
      sel.value = st.ai_host;
    }

    const autoBtn = $("toggle-auto");
    autoBtn.textContent = `Auto-Speak: ${st.auto_speak ? "ON" : "OFF"}`;
    autoBtn.classList.toggle("active", Boolean(st.auto_speak));

    const wakeBtn = $("toggle-wake");
    wakeBtn.textContent = `Wake Phrase: ${st.wake_phrase_only ? "ON" : "OFF"}`;
    wakeBtn.classList.toggle("active", Boolean(st.wake_phrase_only));

    const holdBtn = $("toggle-hold");
    holdBtn.textContent = st.hold ? "Resume Whiskers" : "Mute / Hold";
    holdBtn.classList.toggle("active", Boolean(st.hold));

    renderTopics(st.topic_queue || []);
  }

  function renderTopics(topics) {
    const el = $("topic-list");
    if (!topics.length) {
      el.innerHTML = `<div class="item"><small>No topics queued yet. Paste a briefing above or use !queue.</small></div>`;
      return;
    }
    el.innerHTML = topics.map(t => `
      <div class="item">
        <strong>${escapeHtml(t.status === "active" ? "▶ " : "")}${escapeHtml(t.title)}</strong>
        ${t.notes ? `<small>${escapeHtml(t.notes)}</small>` : ""}
      </div>
    `).join("");
  }

  function renderAnalytics(data) {
    const ov = data.overview || {};
    $("analytics-overview").innerHTML = `
      <span>Total Interactions</span><strong>${ov.total_interactions ?? 0}</strong>
      <span>Questions Answered / Unanswered</span><strong>${ov.answered ?? 0} / ${ov.unanswered ?? 0}</strong>
      <span>Gifts / Host Commands</span><strong>${ov.gifts ?? 0} / ${ov.host_commands ?? 0}</strong>
      <span>Avg Response Latency</span><strong>${ov.avg_latency_ms != null ? `${(ov.avg_latency_ms / 1000).toFixed(1)}s` : "—"}</strong>
    `;

    const participants = data.top_participants || [];
    $("top-participants-list").innerHTML = participants.length
      ? participants.map(p => `
        <div class="item">
          <strong>${escapeHtml(p.viewer_name || p.viewer_handle)} (Score ${p.meaningful_score})</strong>
          <small>${p.question_count} Qs · ${p.visit_count} visits · Interests: ${escapeHtml((p.interests || []).join(", ") || "General")}</small>
        </div>
      `).join("")
      : `<div class="item"><small>No viewer data recorded yet.</small></div>`;

    const topics = data.popular_topics || [];
    $("popular-topics-list").innerHTML = topics.length
      ? topics.map(t => `<div class="item"><strong>${escapeHtml(t.topic)}</strong><small>Engagement score: ${t.score}</small></div>`).join("")
      : `<div class="item"><small>No popular topics yet.</small></div>`;

    const clips = data.clip_suggestions || [];
    $("clips-list").innerHTML = clips.length
      ? clips.map(c => `
        <div class="item">
          <strong>[${c.score}/100] ${escapeHtml(c.prompt)}</strong>
          ${c.reply ? `<span>${escapeHtml(c.reply)}</span>` : ""}
          <small>${escapeHtml(c.reason)}</small>
        </div>
      `).join("")
      : `<div class="item"><small>No clip moments scored yet.</small></div>`;

    const unanswered = data.unanswered_questions || [];
    $("unanswered-list").innerHTML = unanswered.length
      ? unanswered.map(q => `
        <div class="item">
          <strong>${escapeHtml(q.viewer_name)}: ${escapeHtml(q.text)}</strong>
          <small>${escapeHtml(q.topic || "General")}</small>
        </div>
      `).join("")
      : `<div class="item"><small>All viewer questions answered.</small></div>`;

    const sessions = data.recent_sessions || [];
    $("sessions-list").innerHTML = sessions.length
      ? sessions.map(s => `
        <div class="item">
          <strong>@${escapeHtml(s.tiktok_handle)} · ${escapeHtml(s.status)}</strong>
          <small>${escapeHtml(s.summary || s.initial_topic || "Session in progress")}</small>
        </div>
      `).join("")
      : `<div class="item"><small>No saved LIVE sessions yet.</small></div>`;

    const notes = data.voice_notes || [];
    $("notes-list").innerHTML = notes.length
      ? notes.map(n => `
        <div class="item">
          <span>${escapeHtml(n.text)}</span>
          <small>${escapeHtml(n.category)}${n.promoted_to_memory ? " · Promoted to memory" : ""}</small>
        </div>
      `).join("")
      : `<div class="item"><small>No voice notes saved yet.</small></div>`;
  }

  async function refreshStatus(checkObs = false) {
    try {
      const st = await api(`/api/studio/status?check_obs=${checkObs}`);
      renderStatus(st);
    } catch (err) {
      showToast(`Status error: ${err.message}`);
    }
  }

  async function refreshAnalytics() {
    try {
      const data = await api("/api/studio/analytics");
      renderAnalytics(data);
    } catch (err) {
      showToast(`Analytics error: ${err.message}`);
    }
  }

  // Tabs
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`.pane[data-pane="${btn.dataset.tab}"]`)?.classList.add("active");
      if (btn.dataset.tab === "analytics" || btn.dataset.tab === "knowledge") refreshAnalytics();
    });
  });

  $("go-live-btn").addEventListener("click", async () => {
    try {
      const res = await api("/api/studio/go-live", {
        method: "POST",
        body: JSON.stringify({
          topic: $("topic-input").value.trim(),
          personality: $("personality-select").value,
          auto_speak: $("opt-auto").checked,
          start_obs: $("opt-obs").checked,
          start_recording: $("opt-record").checked,
          speak_intro: $("opt-intro").checked,
          notify_pushcut: true,
        }),
      });
      renderStatus(res.status);
      showToast(`LIVE Studio active (session ${res.session_id}).`);
    } catch (err) {
      showToast(`GO LIVE failed: ${err.message}`);
    }
  });

  $("stop-live-btn").addEventListener("click", async () => {
    try {
      const res = await api("/api/studio/stop", { method: "POST", body: JSON.stringify({ generate_summary: true }) });
      showToast(res.summary || "LIVE stopped.");
      refreshStatus();
      refreshAnalytics();
    } catch (err) {
      showToast(`Stop failed: ${err.message}`);
    }
  });

  $("restart-btn").addEventListener("click", async () => {
    try {
      await api("/api/studio/restart", {
        method: "POST",
        body: JSON.stringify({
          topic: $("topic-input").value.trim(),
          personality: $("personality-select").value,
          auto_speak: $("opt-auto").checked,
        }),
      });
      showToast("Studio session restarted.");
      refreshStatus();
    } catch (err) {
      showToast(`Restart failed: ${err.message}`);
    }
  });

  $("personality-select").addEventListener("change", async () => {
    try {
      await api("/api/studio/settings", {
        method: "POST",
        body: JSON.stringify({ personality: $("personality-select").value }),
      });
      showToast(`Switched AI host to ${$("personality-select").value}.`);
      refreshStatus();
    } catch (err) {
      showToast(err.message);
    }
  });

  $("toggle-auto").addEventListener("click", async () => {
    try {
      await api("/api/studio/settings", {
        method: "POST",
        body: JSON.stringify({ auto_speak: !lastStatus?.auto_speak }),
      });
      refreshStatus();
    } catch (err) { showToast(err.message); }
  });

  $("toggle-wake").addEventListener("click", async () => {
    try {
      await api("/api/studio/settings", {
        method: "POST",
        body: JSON.stringify({ wake_phrase_only: !lastStatus?.wake_phrase_only }),
      });
      refreshStatus();
    } catch (err) { showToast(err.message); }
  });

  $("toggle-hold").addEventListener("click", async () => {
    try {
      await api("/api/studio/settings", {
        method: "POST",
        body: JSON.stringify({ hold: !lastStatus?.hold }),
      });
      refreshStatus();
    } catch (err) { showToast(err.message); }
  });

  $("pushcut-test").addEventListener("click", async () => {
    try {
      const res = await api("/api/studio/notify", {
        method: "POST",
        body: JSON.stringify({
          title: "Freedom Fusion Studio Ping",
          text: "Your streaming PC is connected and Professor Whiskers is ready.",
        }),
      });
      showToast(res.sent ? "Pushcut notification sent to iPhone!" : (res.reason || "Pushcut not configured yet."));
    } catch (err) { showToast(err.message); }
  });

  async function sendHostCommand(command) {
    if (!command) return;
    try {
      const res = await api("/api/studio/command", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
      showToast(`Host command result: ${res.result}`);
      refreshStatus();
    } catch (err) { showToast(err.message); }
  }

  $("send-cmd-btn").addEventListener("click", () => {
    const input = $("host-cmd-input");
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = "";
    sendHostCommand(cmd);
  });
  $("intro-btn").addEventListener("click", () => sendHostCommand("!intro"));
  $("next-topic-btn").addEventListener("click", () => sendHostCommand("!next"));

  // iPhone / browser speech-to-text dictation for Host Commands
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  $("mic-dictate-btn").addEventListener("click", () => {
    if (!SpeechRec) {
      showToast("Use iPhone keyboard dictation in the input field.");
      $("host-cmd-input").focus();
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.onresult = evt => {
      const transcript = evt.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        $("host-cmd-input").value = transcript;
        showToast(`Heard: "${transcript}"`);
      }
    };
    rec.onerror = () => showToast("Voice dictation unavailable; use iPhone keyboard mic.");
    rec.start();
    showToast("Listening for host command…");
  });

  $("build-briefing-btn").addEventListener("click", async () => {
    const text = $("briefing-input").value.trim();
    if (text.length < 5) return showToast("Enter a briefing first.");
    try {
      const res = await api("/api/studio/briefing", {
        method: "POST",
        body: JSON.stringify({ text, replace_queue: false }),
      });
      renderTopics(res.topic_queue || []);
      showToast(`Added ${res.added_topics?.length || 0} topics from briefing.`);
    } catch (err) { showToast(err.message); }
  });

  $("clear-topics-btn").addEventListener("click", async () => {
    try {
      await api("/api/studio/topics", { method: "DELETE" });
      renderTopics([]);
      showToast("Topic queue cleared.");
    } catch (err) { showToast(err.message); }
  });

  $("save-note-btn").addEventListener("click", async () => {
    const input = $("note-input");
    const text = input.value.trim();
    if (!text) return;
    try {
      await api("/api/studio/notes", { method: "POST", body: JSON.stringify({ text }) });
      input.value = "";
      showToast("Voice note saved.");
      refreshAnalytics();
    } catch (err) { showToast(err.message); }
  });

  $("save-know-btn").addEventListener("click", async () => {
    const title = $("know-title").value.trim();
    const text = $("know-text").value.trim();
    const kind = $("know-kind").value;
    if (!title || !text) return showToast("Enter both title and insight text.");
    try {
      const res = await api("/api/studio/knowledge", {
        method: "POST",
        body: JSON.stringify({ title, text, kind, sync_notion: true }),
      });
      $("know-title").value = "";
      $("know-text").value = "";
      showToast(res.notion?.synced ? "Saved locally + synced to Notion!" : "Saved to local long-term memory!");
    } catch (err) { showToast(err.message); }
  });

  $("refresh-analytics-btn").addEventListener("click", refreshAnalytics);

  $("studio-token-input").value = getToken();
  $("save-token-btn").addEventListener("click", () => {
    try { localStorage.setItem(TOKEN_KEY, $("studio-token-input").value.trim()); } catch {}
    showToast("Access token saved.");
    refreshStatus(true);
  });

  refreshStatus(true);
  setInterval(() => refreshStatus(false), 12000);
})();
