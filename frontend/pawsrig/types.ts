export type AnimationId =
  | 'idle'
  | 'wave'
  | 'listen'
  | 'nod'
  | 'jump'
  | 'dance'
  | 'spin'
  | 'backflip'
  | 'sit'
  | 'sleep'
  | 'eat'
  | 'stretch'
  | 'meow'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'shock'
  | 'pet'
  | 'clap'
  | 'groom'
  | 'zoomies'
  | 'gaming'
  | 'heart'
  | 'shy'
  | 'talk'
  | 'explain'
  | 'sing'
  | 'laugh'
  | 'walk_left'
  | 'walk_right';

export type AnimationCategory = 'body' | 'emotes' | 'tricks' | 'move';

export interface AnimationDef {
  id: AnimationId;
  label: string;
  category: AnimationCategory;
  description: string;
  /** Duration in seconds. Null means persistent/looping posture until next command. */
  duration: number | null;
  /** Default chat keywords that trigger this animation. */
  keywords: string[];
}

export type EyeStyle =
  | 'normal'
  | 'happy'
  | 'wide'
  | 'sleep'
  | 'angry'
  | 'sad'
  | 'wink'
  | 'sparkle';

export type MouthStyle =
  | 'smile'
  | 'open'
  | 'meow'
  | 'talk'
  | 'chew'
  | 'frown'
  | 'o'
  | 'tongue'
  | 'yawn';

export type TalkPhoneme = 'closed' | 'small' | 'open_a' | 'wide_e' | 'round_o';

export interface SpeechSample {
  volume: number;
  roundness: number;
  jaw: number;
}

export type PropType = 'none' | 'fish' | 'petHand';

export type FxType =
  | 'none'
  | 'hearts'
  | 'notes'
  | 'zzz'
  | 'anger'
  | 'sparkles'
  | 'soundwaves'
  | 'exclamation'
  | 'tears';

export interface CatPose {
  /** Horizontal stage offset in normalized units (-1 to +1). */
  rootX: number;
  /** Vertical lift in pixels (negative = upward jump). */
  rootY: number;
  /** Facing direction scalar (-1 left, +1 right; passes through 0 for spin flip). */
  facing: number;
  /** Whole-body rotation in radians. */
  bodyRot: number;
  /** Squash & stretch scale factors. */
  scaleX: number;
  scaleY: number;
  /** Spine bend: positive arches back / bows, negative leans back. */
  torsoBend: number;
  /** Breathing expansion (0..1). */
  breath: number;
  /** Head position offset and tilt. */
  headX: number;
  headY: number;
  headRot: number;
  /** Ear angles in radians (0 = neutral, positive = outward/flat, negative = perked). */
  earLeftRot: number;
  earRightRot: number;
  /** Tail control parameters. */
  tailLift: number;
  tailWag: number;
  tailCurl: number;
  tailPuff: number;
  /** Front paws: angle in radians & vertical lift (0..1). */
  armLeftAngle: number;
  armLeftLift: number;
  armRightAngle: number;
  armRightLift: number;
  /** Hind legs: swing angle in radians & tuck (0..1). */
  legLeftAngle: number;
  legLeftTuck: number;
  legRightAngle: number;
  legRightTuck: number;
  /** Facial expression & secondary overlays. */
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  /** Lip-sync jaw openness (0..1) and active anime speech phoneme. */
  mouthOpen: number;
  mouthRoundness: number;
  talkPhoneme: TalkPhoneme;
  isSpeaking: boolean;
  blink: number;
  pupilX: number;
  pupilY: number;
  blush: number;
  prop: PropType;
  fx: FxType;
  /** Normalized progress within current animation (0..1) for FX timing. */
  fxTime: number;
}

export type CoatId =
  | 'ginger'
  | 'tuxedo'
  | 'calico'
  | 'siamese'
  | 'snowball'
  | 'midnight'
  | 'sakura'
  | 'russian'
  | 'matcha';

export type EyeColorId =
  | 'anime'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'hazel'
  | 'violet';

export type AccessoryId =
  | 'none'
  | 'headphones'
  | 'collar'
  | 'bowtie'
  | 'crown'
  | 'bandana';

export type StageBackground =
  | 'gamer'
  | 'transparent'
  | 'green'
  | 'blue'
  | 'studio'
  | 'dark';

export type StageAspect = '9:16' | '1:1' | '16:9';

export interface CatAppearance {
  coat: CoatId;
  eyeColor: EyeColorId;
  accessory: AccessoryId;
  scale: number;
  showDeskSetup: boolean;
  showShadow: boolean;
  showFx: boolean;
  showActionLabel: boolean;
}

export interface TriggerEvent {
  id: string;
  action: AnimationId;
  rawComment?: string;
  user?: string;
  source: 'studio' | 'comment' | 'api' | 'window' | 'broadcast';
  timestamp: number;
}

export interface EngineConfig {
  queueMode: 'interrupt' | 'queue';
  maxQueueSize: number;
  speed: number;
}

export interface EngineSnapshot {
  currentAction: AnimationId;
  queue: AnimationId[];
  rootX: number;
  facingDir: 1 | -1;
  elapsed: number;
  isTalking: boolean;
}
