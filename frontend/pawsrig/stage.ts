import { CatAnimationEngine } from './animationEngine';
import { ANIMATION_BY_ID } from './animations';
import { renderPhotoRigScene } from './photoRig';
import type { AnimationId, CatAppearance } from './types';

interface SpeechPlayback {
  audio: HTMLAudioElement;
  volumes: number[];
  sliceLength: number;
  mouthRoundness?: number[];
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

export function mountPawsRig() {
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
    if (!legacyCanvas?.isConnected) {
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
    engine.setExternalSpeech(speech ? {
      volume: sample(speech.volumes, position, 0),
      roundness: sample(speech.mouthRoundness, position, 0.5),
    } : null);
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
      if (!legacyCanvas.classList.contains('pawsrig-fallback')) {
        legacyCanvas.classList.add('pawsrig-fallback');
      }
      stage.dataset.action = action;
      stage.dataset.speaking = String(pose.isSpeaking);
    }
  }

  frameId = requestAnimationFrame(frame);
  return {
    play(action: AnimationId) {
      return engine.trigger(action).accepted;
    },
    useSpeech(playback: SpeechPlayback) {
      speech = playback;
    },
    destroy() {
      cancelAnimationFrame(frameId);
      detach();
    },
  };
}
