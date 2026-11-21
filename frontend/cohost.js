/* Operator controls for the backend's co-host session. */
(() => {
  const panel = document.createElement("details");
  panel.className = "cohost-panel";
  panel.innerHTML = `
    <summary>Co-host controls</summary>
    <section>
      <p class="cohost-status" role="status">Connecting…</p>
      <div class="cohost-row">
        <button type="button" data-control="hold">Mute and hold</button>
        <button type="button" data-control="suggest">Suggest transition</button>
      </div>
      <label>Lesson notes <textarea name="lesson" rows="3" maxlength="4000"></textarea></label>
      <button type="button" data-control="lesson">Save notes</button>
      <form>
        <label>Test a viewer comment <input name="comment" maxlength="500" placeholder="!wave or a lesson question" required></label>
        <button type="submit">Send test comment</button>
      </form>
      <div class="cohost-review"></div>
      <small class="cohost-metrics"></small>
    </section>`;
  document.body.append(panel);

  const status = panel.querySelector(".cohost-status");
  const lesson = panel.querySelector("[name=lesson]");
  const list = panel.querySelector(".cohost-review");
  const metrics = panel.querySelector(".cohost-metrics");
  const holdButton = panel.querySelector("[data-control=hold]");
  const edits = new Map();
  let socket;
  let modelName;
  let clientId;
  let hold = false;
  let stopOutput;
  let pendingMotion;
  let motionTimer;
  let savedLesson = "";

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

  function playMotion(event) {
    if (event.model !== modelName) return;
    clearTimeout(motionTimer);
    pendingMotion = event;
    const deadline = performance.now() + 5000;

    const tryPlay = () => {
      if (pendingMotion !== event || event.model !== modelName) return;
      const model = window.getLive2DManager?.()?.getModel(0);
      if (model?._initialized && model._modelSetting?.getMotionCount(event.group) &&
          model._modelHomeDir?.endsWith(event.modelPath)) {
        model.startRandomMotion(event.group, 3);
        status.textContent = `Playing ${event.action}.`;
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
        question.textContent = item.text;
        const reply = document.createElement("textarea");
        reply.rows = 2;
        reply.maxLength = 450;
        reply.placeholder = "Review or enter a reply";
        reply.setAttribute("aria-label", "Reply");
        reply.addEventListener("input", () => edits.set(item.id, reply.value));
        const actions = document.createElement("div");
        actions.className = "cohost-row";
        actions.append(
          reviewButton("Draft", "draft", item.id),
          reviewButton("Approve and speak", "speak", item.id),
          reviewButton("Dismiss", "dismiss", item.id),
        );
        card.append(question, reply, actions);
        list.append(card);
      }
      const reply = card.querySelector("textarea");
      if (!edits.has(item.id) && reply.value !== item.answer) reply.value = item.answer;
      card.querySelector("[data-control=speak]").disabled = hold;
    }
  }

  function update(message) {
    if (message.type === "set-model-and-conf") {
      modelName = message.model_info?.name;
      clientId = message.client_uid ?? clientId;
      pendingMotion = null;
    } else if (message.type === "avatar-motion") {
      playMotion(message);
    } else if (message.type === "cohost-status") {
      if (message.hold && !hold) stopOutput?.();
      hold = message.hold;
      holdButton.textContent = hold ? "Resume co-host" : "Mute and hold";
      holdButton.setAttribute("aria-pressed", String(hold));
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
    } else if (action === "lesson") {
      savedLesson = lesson.value;
      control("lesson", { lesson: lesson.value });
    } else if (action === "speak") {
      control("speak", { id, answer: button.closest("article").querySelector("textarea").value });
    } else {
      if (action === "draft") edits.delete(id);
      control(action, { id });
    }
  });

  panel.querySelector("form").addEventListener("submit", event => {
    event.preventDefault();
    const input = event.target.elements.comment;
    if (send({ type: "viewer-comment", text: input.value, source: "operator-test" })) {
      input.value = "";
    }
  });

  window.addEventListener("cohost:socket", event => {
    socket = event.detail.socket;
    stopOutput = event.detail.stopOutput;
    const active = socket;
    active.addEventListener("message", event => {
      if (active !== socket) return;
      try { update(JSON.parse(event.data)); } catch { /* handled by the main client */ }
    });
    active.addEventListener("close", () => {
      if (active !== socket) return;
      status.textContent = "The co-host is disconnected.";
      list.replaceChildren();
      edits.clear();
      lesson.value = savedLesson = "";
      pendingMotion = null;
      hold = false;
      holdButton.textContent = "Mute and hold";
    });
  });
  window.addEventListener("cohost:floor", event => {
    control("floor", { speaking: event.detail });
  });
})();
