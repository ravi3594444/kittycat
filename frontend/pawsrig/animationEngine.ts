import {
  ANIMATION_BY_ID,
  ANIMATION_CATALOG,
  createNeutralPose,
  sampleAnimationPose,
} from './animations';
import { KeywordOverrideMap, parseCommentToAction } from './commandParser';
import {
  AnimationId,
  CatPose,
  EngineConfig,
  EngineSnapshot,
} from './types';

function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

const WALK_BOUNDS = 0.58;
const WALK_SPEED_PER_SEC = 0.38;
const POSED_ROUNDNESS = { closed: 0.5, small: 0.55, open_a: 0.45, wide_e: 0.12, round_o: 0.9 };

/**
 * Pure, framework-agnostic 2D Cat animation state machine and pose interpolator.
 * Manages action queues, smooth pose blending, blinking, ear twitches, and walk bounds.
 */
export class CatAnimationEngine {
  private currentAction: AnimationId = 'idle';
  private queue: AnimationId[] = [];
  private elapsed = 0;
  private globalTime = 0;
  private rootX = 0;
  private facingDir: 1 | -1 = 1;
  private pose: CatPose;
  private config: EngineConfig;

  private blinkTimer = 2.4;
  private blinkProgress = 0;
  private twitchTimer = 4.2;
  private twitchProgress = 0;

  /** Layered continuous talking toggle (e.g. while user's TTS script speaks) */
  private talkingOverlay = false;
  private talkingTimeRemaining: number | null = null;
  private speech: { volume: number; roundness: number } | null = null;

  constructor(config?: Partial<EngineConfig>) {
    this.config = {
      queueMode: config?.queueMode ?? 'interrupt',
      maxQueueSize: config?.maxQueueSize ?? 8,
      speed: config?.speed ?? 1,
    };
    this.pose = createNeutralPose(0, 1);
  }

  public getSnapshot(): EngineSnapshot {
    return {
      currentAction: this.currentAction,
      queue: [...this.queue],
      rootX: this.rootX,
      facingDir: this.facingDir,
      elapsed: this.elapsed,
      isTalking:
        this.talkingOverlay ||
        this.currentAction === 'talk' ||
        this.currentAction === 'explain' ||
        this.currentAction === 'sing' ||
        this.currentAction === 'laugh' ||
        this.currentAction === 'meow',
    };
  }

  public setTalking(speaking: boolean, durationSeconds?: number): void {
    this.talkingOverlay = speaking;
    if (speaking && typeof durationSeconds === 'number' && durationSeconds > 0) {
      this.talkingTimeRemaining = durationSeconds;
    } else {
      this.talkingTimeRemaining = null;
    }
  }

  public setExternalSpeech(speech: { volume: number; roundness: number } | null): void {
    this.speech = speech;
  }

  public getPose(): CatPose {
    return this.pose;
  }

  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<EngineConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      speed: Math.min(2, Math.max(0.4, partial.speed ?? this.config.speed)),
      maxQueueSize: Math.max(
        1,
        Math.min(20, partial.maxQueueSize ?? this.config.maxQueueSize)
      ),
    };
  }

  public trigger(action: AnimationId): {
    accepted: boolean;
    startedImmediately: boolean;
  } {
    if (!ANIMATION_BY_ID[action]) {
      return { accepted: false, startedImmediately: false };
    }

    // Idle/reset always clears queue and returns immediately
    if (action === 'idle') {
      this.queue = [];
      this.startAction('idle');
      return { accepted: true, startedImmediately: true };
    }

    const currentDef = ANIMATION_BY_ID[this.currentAction];
    const isCurrentPersistent = currentDef.duration === null;

    if (this.config.queueMode === 'interrupt' || isCurrentPersistent) {
      if (this.config.queueMode === 'interrupt') {
        this.queue = [];
      }
      this.startAction(action);
      return { accepted: true, startedImmediately: true };
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      return { accepted: false, startedImmediately: false };
    }

    this.queue.push(action);
    return { accepted: true, startedImmediately: false };
  }

  public triggerFromComment(
    rawComment: string,
    customKeywords?: KeywordOverrideMap
  ): { matchedAction: AnimationId | null; matchedKeyword: string | null } {
    const parsed = parseCommentToAction(
      rawComment,
      ANIMATION_CATALOG,
      customKeywords
    );
    if (!parsed) {
      return { matchedAction: null, matchedKeyword: null };
    }
    this.trigger(parsed.action);
    return {
      matchedAction: parsed.action,
      matchedKeyword: parsed.matchedKeyword,
    };
  }

  public clearQueue(): void {
    this.queue = [];
  }

  public recenter(): void {
    this.rootX = 0;
    this.facingDir = 1;
  }

  private startAction(action: AnimationId): void {
    this.currentAction = action;
    this.elapsed = 0;
    if (action === 'walk_left') {
      this.facingDir = -1;
    } else if (action === 'walk_right') {
      this.facingDir = 1;
    }
  }

  /**
   * Advances simulation by `dtSeconds`. Returns true if the active action changed.
   */
  public step(dtSeconds: number): boolean {
    const frameTime = Math.max(0, dtSeconds);
    const clampedDt = Math.min(0.05, frameTime);
    const dt = frameTime * this.config.speed;
    let actionChanged = false;

    this.globalTime += frameTime;
    this.elapsed += dt;

    // Crisp, snappy anime eye blink (~140ms full blink cycle, never sluggish)
    this.blinkTimer -= clampedDt;
    if (this.blinkTimer <= 0) {
      this.blinkProgress += clampedDt * 22;
      if (this.blinkProgress >= Math.PI) {
        this.blinkProgress = 0;
        // Deterministic pseudo-variation based on globalTime
        this.blinkTimer = 2.6 + ((Math.sin(this.globalTime * 13.7) + 1) * 1.4);
      }
    }
    const blinkAmount =
      this.blinkProgress > 0 ? Math.pow(Math.sin(this.blinkProgress), 0.75) : 0;

    // Subtle ear twitch timing
    this.twitchTimer -= clampedDt;
    if (this.twitchTimer <= 0) {
      this.twitchProgress += clampedDt * 11;
      if (this.twitchProgress >= Math.PI) {
        this.twitchProgress = 0;
        this.twitchTimer = 3.8 + ((Math.cos(this.globalTime * 7.3) + 1) * 1.9);
      }
    }
    const earTwitch =
      this.twitchProgress > 0 ? Math.sin(this.twitchProgress) : 0;

    // Horizontal movement for walk actions
    if (this.currentAction === 'walk_left') {
      this.rootX = Math.max(-WALK_BOUNDS, this.rootX - WALK_SPEED_PER_SEC * dt);
    } else if (this.currentAction === 'walk_right') {
      this.rootX = Math.min(WALK_BOUNDS, this.rootX + WALK_SPEED_PER_SEC * dt);
    }

    // Check finite animation completion
    const activeDef = ANIMATION_BY_ID[this.currentAction];
    if (activeDef.duration !== null && this.elapsed >= activeDef.duration) {
      const next = this.queue.shift() ?? 'idle';
      this.startAction(next);
      actionChanged = true;
    }

    // Auto-expire timed talking overlay if configured
    if (this.talkingOverlay && this.talkingTimeRemaining !== null) {
      this.talkingTimeRemaining -= frameTime;
      if (this.talkingTimeRemaining <= 0) {
        this.talkingOverlay = false;
        this.talkingTimeRemaining = null;
        actionChanged = true;
      }
    }

    const target = sampleAnimationPose(this.currentAction, this.elapsed, {
      rootX: this.rootX,
      facingDir: this.facingDir,
      globalTime: this.globalTime,
      blink: blinkAmount,
      earTwitch,
    });

    // Layer actual speech over compatible movements, including quiet pauses.
    if (
      (this.talkingOverlay || this.speech) &&
      this.currentAction !== 'sleep' &&
      this.currentAction !== 'eat'
    ) {
      let openness = 0;
      let phoneme: CatPose['talkPhoneme'] = 'closed';
      if (this.speech) {
        const volume = Math.max(0, Math.min(1, (this.speech.volume - 0.055) / 0.945));
        openness = 0.86 * Math.pow(volume, 0.78);
      } else {
        const s1 = Math.sin(this.globalTime * 13.5);
        const s2 = Math.sin(this.globalTime * 21.3 + 0.9);
        const cadence = Math.sin(this.globalTime * 2.8) > -0.82 ? 1 : 0.14;
        openness = Math.max(
          0,
          Math.min(1, (0.56 + s1 * 0.34 + s2 * 0.22) * cadence)
        );
        phoneme =
          openness < 0.15
            ? 'closed'
            : openness < 0.36
            ? 'small'
            : s2 > 0.35
            ? 'round_o'
            : s1 > 0.12
            ? 'open_a'
            : 'wide_e';
      }
      target.mouthStyle = 'talk';
      target.mouthOpen = openness;
      target.talkPhoneme = phoneme;
      target.isSpeaking = openness > 0.15;
      // Add subtle live conversational head nod if idle/sitting
      if (this.currentAction === 'idle' || this.currentAction === 'sit') {
        target.headY += Math.sin(this.globalTime * 6.4) * 3.5 * openness;
        target.headRot += Math.sin(this.globalTime * 3.2) * 0.06;
      }
    }

    // Smooth exponential pose blending so transitions never snap harshly
    const blend = 1 - Math.exp(-14 * clampedDt);
    const fastBlend = 1 - Math.exp(-22 * clampedDt);
    const tailBlend = 1 - Math.exp(-9 * clampedDt);

    const p = this.pose;
    p.rootX = lerp(p.rootX, target.rootX, fastBlend);
    p.rootY = lerp(p.rootY, target.rootY, fastBlend);
    p.facing =
      this.currentAction === 'spin' || this.currentAction === 'zoomies'
        ? target.facing
        : lerp(p.facing, target.facing, blend);
    p.bodyRot =
      this.currentAction === 'backflip'
        ? target.bodyRot
        : lerp(p.bodyRot, target.bodyRot, fastBlend);
    p.scaleX = lerp(p.scaleX, target.scaleX, fastBlend);
    p.scaleY = lerp(p.scaleY, target.scaleY, fastBlend);
    p.torsoBend = lerp(p.torsoBend, target.torsoBend, blend);
    p.breath = target.breath;
    p.headX = lerp(p.headX, target.headX, blend);
    p.headY = lerp(p.headY, target.headY, blend);
    p.headRot = lerp(p.headRot, target.headRot, blend);
    p.earLeftRot = lerp(p.earLeftRot, target.earLeftRot, fastBlend);
    p.earRightRot = lerp(p.earRightRot, target.earRightRot, fastBlend);
    p.tailLift = lerp(p.tailLift, target.tailLift, tailBlend);
    p.tailWag = lerp(p.tailWag, target.tailWag, tailBlend);
    p.tailCurl = lerp(p.tailCurl, target.tailCurl, tailBlend);
    p.tailPuff = lerp(p.tailPuff, target.tailPuff, blend);
    p.armLeftAngle = lerp(p.armLeftAngle, target.armLeftAngle, fastBlend);
    p.armLeftLift = lerp(p.armLeftLift, target.armLeftLift, fastBlend);
    p.armRightAngle = lerp(p.armRightAngle, target.armRightAngle, fastBlend);
    p.armRightLift = lerp(p.armRightLift, target.armRightLift, fastBlend);
    p.legLeftAngle = lerp(p.legLeftAngle, target.legLeftAngle, fastBlend);
    p.legLeftTuck = lerp(p.legLeftTuck, target.legLeftTuck, blend);
    p.legRightAngle = lerp(p.legRightAngle, target.legRightAngle, fastBlend);
    p.legRightTuck = lerp(p.legRightTuck, target.legRightTuck, blend);
    p.pupilX = lerp(p.pupilX, target.pupilX, blend);
    p.pupilY = lerp(p.pupilY, target.pupilY, blend);
    p.blush = lerp(p.blush, target.blush, blend);

    // Discrete expression & prop channels follow active target immediately
    p.eyeStyle = target.eyeStyle;
    const mouthRate = target.mouthOpen > p.mouthOpen ? 40 : 29;
    p.mouthOpen = lerp(p.mouthOpen, target.mouthOpen, 1 - Math.exp(-mouthRate * clampedDt));
    if (p.mouthOpen < 0.012) p.mouthOpen = 0;
    if (p.mouthStyle !== 'talk' || target.mouthStyle !== 'smile' || p.mouthOpen === 0) {
      p.mouthStyle = target.mouthStyle;
    }
    const roundness = this.speech?.roundness ?? POSED_ROUNDNESS[target.talkPhoneme];
    p.mouthRoundness = lerp(p.mouthRoundness, roundness, fastBlend);
    p.talkPhoneme = target.talkPhoneme;
    p.isSpeaking = p.mouthStyle === 'talk' ? p.mouthOpen > 0.09 : target.isSpeaking;
    p.blink = target.blink;
    p.prop = target.prop;
    p.fx = target.fx;
    p.fxTime = target.fxTime;

    return actionChanged;
  }
}
