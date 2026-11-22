import { CatAnimationEngine } from './animationEngine';
import { ANIMATION_BY_ID } from './animations';
import { renderPhotoRigScene } from './photoRig';
import type { AnimationId, CatAppearance, SpeechSample } from './types';

interface SpeechPlayback {
  audio: HTMLAudioElement;
  volumes: number[];
  sliceLength: number;
  mouthRoundness?: number[];
}

function analyseMouth(analyser: AnalyserNode) {
  const wave = new Float32Array(analyser.fftSize);
  const spectrum = new Float32Array(analyser.frequencyBinCount);
  const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
  const first = Math.ceil(280 / hzPerBin);
  const front = Math.ceil(1350 / hzPerBin);
  const sibilance = Math.ceil(3650 / hzPerBin);
  const last = Math.min(spectrum.length, Math.ceil(8000 / hzPerBin));
  let peak = 0.12;

  return (elapsed: number): SpeechSample => {
    analyser.getFloatTimeDomainData(wave);
    let squares = 0;
    for (const value of wave) squares += value * value;
    const rms = Math.sqrt(squares / wave.length);
    peak = Math.max(rms, 0.075, peak * Math.exp(-1.3 * elapsed));
    if (rms < Math.max(0.004, peak * 0.048)) return { volume: 0, roundness: 0.5, jaw: 0 };

    analyser.getFloatFrequencyData(spectrum);
    let low = 0;
    let mid = 0;
    let bright = 0;
    for (let i = first; i < front; i++) low += 10 ** (spectrum[i] / 10);
    for (let i = front; i < sibilance; i++) mid += 10 ** (spectrum[i] / 10);
    for (let i = sibilance; i < last; i++) bright += 10 ** (spectrum[i] / 10);
    const vowels = low + mid;
    const ratio = vowels > 0 ? low / vowels : 0.5;
    const consonant = bright / (vowels + bright || 1);
    return {
      volume: rms / peak,
      roundness: Math.min(1, Math.max(0, (ratio - 0.25) * 1.6)),
      jaw: 0.92 - 0.74 * consonant,
    };
  };
}

function sample(values: number[] | undefined, position: number, fallback: number): number {
  const frame = Math.floor(position);
  const start = values?.[frame] ?? fallback;
  const end = values?.[frame + 1] ?? fallback;
  return start + (end - start) * (position - frame);
}

const appearance: CatAppearance = {
  coat: 'ginger',
  eyeColor: 'anime',
  accessory: 'headphones',
  scale: 1,
  showDeskSetup: true,
  showShadow: true,
  showFx: true,
  showActionLabel: false,
};

export function mountPawsRig(target?: HTMLElement) {
  const engine = new CatAnimationEngine();
  const stage = document.createElement('div');
  stage.className = 'pawsrig-stage';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Animated Little Cat at her streaming desk');
  stage.append(canvas);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  const ctx = context;

  let legacyCanvas: HTMLElement | null = null;
  let width = 0;
  let height = 0;
  let lastFrame = performance.now();
  let frameId = 0;
  let speech: SpeechPlayback | null = null;
  let sampleLiveMouth: ReturnType<typeof analyseMouth> | null = null;

  const observer = new ResizeObserver(([{ contentRect }]) => {
    const scale = Math.min(contentRect.width / 536, contentRect.height / 960);
    width = Math.floor(536 * scale);
    height = Math.floor(960 * scale);
    if (!width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2, 960 / height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });

  function detach() {
    observer.disconnect();
    legacyCanvas?.classList.remove('pawsrig-fallback');
    legacyCanvas = null;
    width = height = 0;
    stage.remove();
  }

  function frame(now: number) {
    frameId = requestAnimationFrame(frame);
    const elapsed = (now - lastFrame) / 1000;
    lastFrame = now;
    if (!target && !legacyCanvas?.isConnected) {
      detach();
      const previous = document.querySelector<HTMLElement>('#live2d-internal-wrapper > #canvas');
      if (!previous?.parentElement) return;
      legacyCanvas = previous;
      previous.parentElement.append(stage);
      observer.observe(stage);
    }
    if (!width || !height) return;

    if (speech?.audio.paused || speech?.audio.ended || speech?.audio.error) speech = null;
    const position = speech?.sliceLength
      ? Math.max(0, speech.audio.currentTime * 1000 / speech.sliceLength - 0.5)
      : 0;
    const recordingMouth = speech ? {
      volume: sample(speech.volumes, position, 0),
      roundness: sample(speech.mouthRoundness, position, 0.5),
      jaw: 0.87,
    } : null;
    engine.setExternalSpeech(sampleLiveMouth?.(elapsed) ?? recordingMouth);
    engine.step(elapsed);

    const action = engine.getSnapshot().currentAction;
    const pose = engine.getPose();
    if (renderPhotoRigScene(ctx, pose, appearance, {
      width,
      height,
      background: 'gamer',
      isOverlay: false,
      actionLabel: ANIMATION_BY_ID[action].label,
    })) {
      if (legacyCanvas && !legacyCanvas.classList.contains('pawsrig-fallback')) {
        legacyCanvas.classList.add('pawsrig-fallback');
      }
      stage.dataset.action = action;
      stage.dataset.speaking = String(pose.isSpeaking);
    }
  }

  if (target) {
    target.append(stage);
    observer.observe(stage);
  }
  frameId = requestAnimationFrame(frame);
  return {
    play(action: AnimationId) {
      return engine.trigger(action).accepted;
    },
    useSpeech(playback: SpeechPlayback) {
      speech = playback;
    },
    useAnalyser(analyser: AnalyserNode | null) {
      sampleLiveMouth = analyser ? analyseMouth(analyser) : null;
    },
    destroy() {
      cancelAnimationFrame(frameId);
      detach();
    },
  };
}
