/* Queue Fish PCM on the Web Audio clock and analyze the signal sent to the speakers. */
(() => {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
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
    const samples = new Float32Array(bytes.length / 2);
    for (let i = 0; i < samples.length; i++) {
      const value = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
      samples[i] = (value >= 32768 ? value - 65536 : value) / 32768;
    }
    return samples;
  }

  function finishWhenPlayed(stream) {
    if (stream.ended && !stream.frames.length && !stream.sources.size) release(stream);
  }

  function schedule(stream) {
    if (active !== stream) return;
    for (const samples of stream.frames.splice(0)) {
      const buffer = context.createBuffer(1, samples.length, stream.sampleRate);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      if (!stream.nextTime) {
        // Give the next packet time to arrive without making the opening feel slow.
        stream.nextTime = context.currentTime + 0.055;
        window.dispatchEvent(new CustomEvent("cohost:stream-voice", { detail: analyser }));
      } else if (stream.nextTime <= context.currentTime) {
        stream.nextTime = context.currentTime + 0.02;
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
        id, sampleRate: message.sample_rate, frames: [], sources: new Set(), nextTime: 0, ended: false,
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
