/* Queue Fish PCM on the Web Audio clock with adaptive WAN jitter buffering and coalesced playback. */
(() => {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  const IS_LOCAL = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  const INITIAL_LEAD_S = IS_LOCAL ? 0.065 : 0.16;
  const BASE_UNDERRUN_LEAD_S = IS_LOCAL ? 0.04 : 0.11;
  const MAX_UNDERRUN_LEAD_S = 0.24;
  const streams = new Map();
  let context;
  let analyser;
  let active;
  let enabled = false;

  function announceState() {
    if (context?.state !== "running") stop();
    window.dispatchEvent(new Event("cohost:pcm-state"));
  }

  async function unlock() {
    if (!enabled || !AudioContextType) return;
    try {
      if (!context) {
        context = new AudioContextType({ latencyHint: "interactive" });
        analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.45;
        analyser.connect(context.destination);
        context.addEventListener("statechange", announceState);
      }
      if (context.state !== "running") await context.resume();
      announceState();
    } catch { /* The server can still send WAV audio. */ }
  }

  function release(stream) {
    streams.delete(stream.id);
    if (active === stream) {
      active = undefined;
      window.dispatchEvent(new CustomEvent("cohost:stream-voice", { detail: null }));
    }
    stream.resolve?.();
  }

  function discard(id) {
    const stream = streams.get(id);
    if (!stream) return;
    for (const source of stream.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    release(stream);
  }

  function stop() {
    for (const id of streams.keys()) discard(id);
  }

  function enable(value) {
    enabled = value;
    if (!enabled) stop();
  }

  function decodePCM(encoded) {
    const bytes = atob(encoded);
    const count = bytes.length >> 1;
    const samples = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const value = bytes.charCodeAt(i << 1) | (bytes.charCodeAt((i << 1) | 1) << 8);
      samples[i] = (value >= 32768 ? value - 65536 : value) * (1 / 32768);
    }
    return samples;
  }

  function concatFrames(frames) {
    if (frames.length === 1) return frames[0];
    let total = 0;
    for (const f of frames) total += f.length;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const f of frames) {
      merged.set(f, offset);
      offset += f.length;
    }
    return merged;
  }

  function finishWhenPlayed(stream) {
    if (stream.ended && !stream.frames.length && !stream.sources.size) release(stream);
  }

  function schedule(stream) {
    if (active !== stream) return;
    if (stream.frames.length) {
      // Coalesce all queued frames into one contiguous AudioBuffer to prevent micro-gaps & node churn.
      const samples = concatFrames(stream.frames.splice(0));
      const buffer = context.createBuffer(1, samples.length, stream.sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      const now = context.currentTime;
      if (!stream.nextTime) {
        stream.nextTime = now + INITIAL_LEAD_S;
        window.dispatchEvent(new CustomEvent("cohost:stream-voice", { detail: analyser }));
      } else if (stream.nextTime <= now + 0.008) {
        stream.underruns += 1;
        const cushion = Math.min(
          MAX_UNDERRUN_LEAD_S,
          BASE_UNDERRUN_LEAD_S + stream.underruns * 0.03
        );
        stream.nextTime = now + cushion;
      }
      stream.sources.add(source);
      source.onended = () => {
        source.disconnect();
        stream.sources.delete(source);
        finishWhenPlayed(stream);
      };
      source.start(stream.nextTime);
      stream.nextTime += buffer.duration;
    }
    finishWhenPlayed(stream);
  }

  function receive(message) {
    const id = message.stream_id;
    if (message.type === "audio-stream-start") {
      if (!enabled || context?.state !== "running") return;
      streams.set(id, {
        id,
        sampleRate: message.sample_rate,
        frames: [],
        sources: new Set(),
        nextTime: 0,
        underruns: 0,
        ended: false,
      });
      return;
    }
    const stream = streams.get(id);
    if (!stream) return;
    if (message.type === "audio-stream-end") {
      stream.ended = true;
    } else if (message.audio) {
      stream.frames.push(decodePCM(message.audio));
    }
    schedule(stream);
  }

  async function play(id) {
    const stream = streams.get(id);
    if (!stream) return;
    if (!enabled || context?.state !== "running") {
      discard(id);
      return;
    }
    active = stream;
    await new Promise(resolve => {
      stream.resolve = resolve;
      schedule(stream);
    });
  }

  window.kittycatStreamAudio = {
    enable,
    unlock,
    receive,
    play,
    discard,
    stop,
    get ready() { return enabled && context?.state === "running"; },
  };
})();
