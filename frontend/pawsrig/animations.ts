import { AnimationDef, AnimationId, CatPose } from './types';

export const ANIMATION_CATALOG: AnimationDef[] = [
  {
    id: 'idle',
    label: 'Idle',
    category: 'body',
    description: 'Relaxed standing stance with gentle breathing and tail sway.',
    duration: null,
    keywords: ['idle', 'stop', 'stand', 'reset', 'calm', 'chill'],
  },
  {
    id: 'wave',
    label: 'Wave',
    category: 'body',
    description: 'Friendly front-paw wave with head tilt and cheerful eyes.',
    duration: 2.6,
    keywords: ['wave', 'hi', 'hello', 'hey', 'bye', 'greet'],
  },
  {
    id: 'listen',
    label: 'Listen',
    category: 'emotes',
    description: 'Tilts her head and perks her ears to acknowledge a comment.',
    duration: 1.6,
    keywords: [],
  },
  {
    id: 'nod',
    label: 'Nod',
    category: 'emotes',
    description: 'Gives two small, affirmative nods.',
    duration: 1.45,
    keywords: ['nod'],
  },
  {
    id: 'jump',
    label: 'Jump',
    category: 'tricks',
    description: 'Crouch anticipation, energetic spring leap, and soft landing squash.',
    duration: 1.5,
    keywords: ['jump', 'hop', 'leap', 'bounce', 'boing'],
  },
  {
    id: 'dance',
    label: 'Dance',
    category: 'tricks',
    description: 'Rhythmic side-to-side groove with alternating paws and music notes.',
    duration: 4.0,
    keywords: ['dance', 'vibe', 'groove', 'party', 'boogie', 'music'],
  },
  {
    id: 'spin',
    label: 'Spin',
    category: 'tricks',
    description: 'Playful 360-degree twirl with whipping tail and flourish.',
    duration: 1.8,
    keywords: ['spin', 'twirl', 'turn', 'rotate', 'circle'],
  },
  {
    id: 'backflip',
    label: 'Backflip',
    category: 'tricks',
    description: 'Deep crouch into an airborne somersault and superhero landing.',
    duration: 1.9,
    keywords: ['backflip', 'flip', 'somersault', 'acrobat', 'parkour'],
  },
  {
    id: 'sit',
    label: 'Sit',
    category: 'body',
    description: 'Tucks hind paws neatly and curls tail around the body.',
    duration: null,
    keywords: ['sit', 'loaf', 'stay', 'down', 'rest'],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    category: 'body',
    description: 'Drowsy curled nap with slow belly breaths and floating Zzz.',
    duration: null,
    keywords: ['sleep', 'nap', 'sleepy', 'tired', 'bed', 'zzz', 'goodnight'],
  },
  {
    id: 'eat',
    label: 'Eat Fish',
    category: 'body',
    description: 'Holds a fish treat and munches happily with bobbing head.',
    duration: 3.4,
    keywords: ['eat', 'feed', 'fish', 'food', 'treat', 'snack', 'nom', 'hungry'],
  },
  {
    id: 'stretch',
    label: 'Stretch',
    category: 'body',
    description: 'Classic big cat front-bow stretch, tall tail, and wide yawn.',
    duration: 2.8,
    keywords: ['stretch', 'yawn', 'big stretch', 'yoga'],
  },
  {
    id: 'clap',
    label: 'Clap',
    category: 'tricks',
    description: 'Bounces joyfully while clapping both front paws together.',
    duration: 2.8,
    keywords: ['clap', 'applause', 'bravo', 'yay', 'gg', 'cheers'],
  },
  {
    id: 'meow',
    label: 'Meow',
    category: 'emotes',
    description: 'Lifts chin and calls out with rhythmic sound waves.',
    duration: 2.2,
    keywords: ['meow', 'talk', 'speak', 'say', 'purr', 'nya', 'miau'],
  },
  {
    id: 'happy',
    label: 'Happy',
    category: 'emotes',
    description: 'Excited mini hops, sparkly eyes, rosy cheeks, and hearts.',
    duration: 3.0,
    keywords: ['happy', 'love', 'heart', 'cute', 'aww', 'smile', 'joy'],
  },
  {
    id: 'pet',
    label: 'Pet',
    category: 'emotes',
    description: 'Leans into gentle head scritches with blissful purr wiggle.',
    duration: 3.0,
    keywords: ['pet', 'pat', 'scritch', 'rub', 'headpat', 'cuddle', 'hug'],
  },
  {
    id: 'angry',
    label: 'Angry',
    category: 'emotes',
    description: 'Arched back, flattened airplane ears, puffed tail, and stomp.',
    duration: 2.8,
    keywords: ['angry', 'mad', 'hiss', 'grumpy', 'rage', 'bite', 'bonk'],
  },
  {
    id: 'sad',
    label: 'Sad',
    category: 'emotes',
    description: 'Droopy ears, slumped posture, slow low tail, and teardrop.',
    duration: 3.2,
    keywords: ['sad', 'cry', 'rip', 'sorry', 'lonely', 'nooo'],
  },
  {
    id: 'shock',
    label: 'Shock',
    category: 'emotes',
    description: 'Sudden vertical startle hop with wide eyes and trembling fur.',
    duration: 2.0,
    keywords: ['shock', 'scare', 'boo', 'surprise', 'omg', 'what', 'wow'],
  },
  {
    id: 'groom',
    label: 'Groom',
    category: 'body',
    description: 'Lifts a front paw and licks it neatly with happy eyes.',
    duration: 3.0,
    keywords: ['groom', 'lick', 'clean', 'wash', 'bath'],
  },
  {
    id: 'zoomies',
    label: 'Zoomies',
    category: 'move',
    description: 'Hyper zig-zag dash back and forth across the stage.',
    duration: 2.6,
    keywords: ['zoomies', 'zoom', 'run', 'fast', 'crazy', 'hyper'],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    category: 'body',
    description: 'Rapidly taps the RGB keyboard with hyped gamer focus.',
    duration: 3.4,
    keywords: ['gaming', 'game', 'play', 'type', 'keyboard', 'clutch'],
  },
  {
    id: 'heart',
    label: 'Heart Hands',
    category: 'emotes',
    description: 'Brings both paws together to send a glowing heart to chat.',
    duration: 2.8,
    keywords: ['heart', 'gift', 'rose', 'galaxy', 'thanks', 'ty'],
  },
  {
    id: 'shy',
    label: 'Shy',
    category: 'emotes',
    description: 'Lifts hoodie cuffs near rosy cheeks with bashful eyes.',
    duration: 2.8,
    keywords: ['shy', 'blush', 'uwu', 'oops', 'embarrassed'],
  },
  {
    id: 'talk',
    label: 'Talk',
    category: 'emotes',
    description: 'Lively multi-syllable lip-sync into the mic with conversational nods.',
    duration: 4.0,
    keywords: ['talk', 'speak', 'say', 'chat', 'read', 'reply', 'hello chat'],
  },
  {
    id: 'explain',
    label: 'Explain',
    category: 'emotes',
    description: 'Expressive explaining hand gestures, attentive nods, and full lip-sync.',
    duration: 4.4,
    keywords: ['explain', 'teach', 'tell', 'story', 'tutorial', 'why', 'how', 'answer', 'guide'],
  },
  {
    id: 'sing',
    label: 'Sing',
    category: 'tricks',
    description: 'Melodic singing into the RGB mic with swaying shoulders and music notes.',
    duration: 4.2,
    keywords: ['sing', 'song', 'karaoke', 'music', 'lalala', 'hum'],
  },
  {
    id: 'laugh',
    label: 'Laugh',
    category: 'emotes',
    description: 'Giggling bounce with happy closed eyes and open fang-laugh lip-sync.',
    duration: 2.8,
    keywords: ['laugh', 'lol', 'lmao', 'haha', 'hehe', 'funny', 'giggle'],
  },
  {
    id: 'walk_left',
    label: 'Walk Left',
    category: 'move',
    description: 'Four-paw stroll toward the left side of the live frame.',
    duration: 2.0,
    keywords: ['walk left', 'left', 'go left', 'move left'],
  },
  {
    id: 'walk_right',
    label: 'Walk Right',
    category: 'move',
    description: 'Four-paw stroll toward the right side of the live frame.',
    duration: 2.0,
    keywords: ['walk right', 'right', 'go right', 'move right'],
  },
];

export const ANIMATION_BY_ID: Record<AnimationId, AnimationDef> =
  ANIMATION_CATALOG.reduce((acc, def) => {
    acc[def.id] = def;
    return acc;
  }, {} as Record<AnimationId, AnimationDef>);

export function createNeutralPose(rootX = 0, facingDir: 1 | -1 = 1): CatPose {
  return {
    rootX,
    rootY: 0,
    facing: facingDir,
    bodyRot: 0,
    scaleX: 1,
    scaleY: 1,
    torsoBend: 0,
    breath: 0,
    headX: 0,
    headY: 0,
    headRot: 0,
    earLeftRot: 0,
    earRightRot: 0,
    tailLift: 0.25,
    tailWag: 0,
    tailCurl: 0.4,
    tailPuff: 0,
    armLeftAngle: 0,
    armLeftLift: 0,
    armRightAngle: 0,
    armRightLift: 0,
    legLeftAngle: 0,
    legLeftTuck: 0,
    legRightAngle: 0,
    legRightTuck: 0,
    eyeStyle: 'normal',
    mouthStyle: 'smile',
    mouthOpen: 0,
    mouthRoundness: 0.5,
    talkPhoneme: 'closed',
    isSpeaking: false,
    blink: 0,
    pupilX: 0,
    pupilY: 0,
    blush: 0.18,
    prop: 'none',
    fx: 'none',
    fxTime: 0,
  };
}

export interface SampleContext {
  rootX: number;
  facingDir: 1 | -1;
  globalTime: number;
  blink: number;
  earTwitch: number;
}

/**
 * Pure procedural keyframe solver for every animation in the catalog.
 * Returns a complete target CatPose at elapsed time `t` (in seconds).
 */
export function sampleAnimationPose(
  action: AnimationId,
  t: number,
  ctx: SampleContext
): CatPose {
  const pose = createNeutralPose(ctx.rootX, ctx.facingDir);
  const def = ANIMATION_BY_ID[action];
  const dur = def.duration ?? 2.4;
  const p = Math.min(1, Math.max(0, t / dur));
  const gt = ctx.globalTime;

  // Baseline gentle living motion
  const slowBreath = Math.sin(gt * 2.2) * 0.5 + 0.5;
  pose.breath = slowBreath;
  pose.blink = ctx.blink;
  pose.fxTime = t;

  switch (action) {
    case 'idle': {
      pose.scaleX = 1 + Math.sin(gt * 2.2) * 0.015;
      pose.scaleY = 1 - Math.sin(gt * 2.2) * 0.015;
      pose.headY = Math.sin(gt * 2.2 - 0.5) * 2.5;
      pose.headRot = Math.sin(gt * 0.9) * 0.045;
      pose.tailLift = 0.25 + Math.sin(gt * 1.4) * 0.1;
      pose.tailWag = Math.sin(gt * 2.0) * 0.35;
      pose.tailCurl = 0.45 + Math.cos(gt * 1.6) * 0.12;
      pose.earRightRot = ctx.earTwitch * 0.26;
      pose.pupilX = Math.sin(gt * 0.65) * 0.28;
      pose.pupilY = Math.cos(gt * 0.45) * 0.12;
      break;
    }

    case 'wave': {
      const waveOsc = Math.sin(t * 11.5);
      const liftEnvelope = Math.sin(Math.min(1, p * 1.15) * Math.PI);
      const activeLift = p < 0.12 ? p / 0.12 : p > 0.85 ? (1 - p) / 0.15 : 1;
      pose.headRot = -0.14 * activeLift + Math.sin(t * 5.75) * 0.04;
      pose.headY = -4 * activeLift;
      pose.bodyRot = -0.05 * activeLift;
      pose.scaleY = 1 + 0.03 * activeLift;
      pose.armRightLift = 0.95 * activeLift;
      pose.armRightAngle = (-1.15 + waveOsc * 0.42) * activeLift;
      pose.armLeftAngle = 0.12 * activeLift;
      pose.tailLift = 0.55;
      pose.tailWag = Math.sin(t * 7) * 0.5;
      pose.eyeStyle = activeLift > 0.3 ? 'happy' : 'normal';
      pose.mouthStyle = 'open';
      pose.blush = 0.45 * Math.max(0.4, liftEnvelope);
      pose.fx = 'sparkles';
      break;
    }

    case 'listen': {
      const focus = Math.sin(p * Math.PI);
      pose.headRot = focus * 0.15;
      pose.headY = -4 * focus;
      pose.earLeftRot = -0.13 * focus;
      pose.pupilX = -0.18 * focus;
      break;
    }

    case 'nod': {
      const nod = (1 - Math.cos(p * 4 * Math.PI)) * 0.5 * Math.sin(p * Math.PI);
      pose.headY = 15 * nod;
      pose.headRot = 0.08 * nod;
      break;
    }

    case 'jump': {
      // 0..0.22 anticipation crouch, 0.22..0.76 airborne arc, 0.76..1.0 landing squash
      if (p < 0.22) {
        const k = p / 0.22;
        const ease = Math.sin(k * Math.PI * 0.5);
        pose.rootY = 18 * ease;
        pose.scaleX = 1 + 0.18 * ease;
        pose.scaleY = 1 - 0.2 * ease;
        pose.headY = 10 * ease;
        pose.earLeftRot = 0.22 * ease;
        pose.earRightRot = 0.22 * ease;
        pose.legLeftTuck = 0.5 * ease;
        pose.legRightTuck = 0.5 * ease;
        pose.tailLift = 0.05;
      } else if (p < 0.76) {
        const k = (p - 0.22) / 0.54;
        const arc = Math.sin(k * Math.PI); // 0 -> 1 -> 0
        const vel = Math.cos(k * Math.PI); // +1 up, -1 down
        pose.rootY = -96 * arc;
        pose.scaleX = 1 - 0.12 * Math.abs(vel);
        pose.scaleY = 1 + 0.16 * Math.abs(vel);
        pose.headY = -8 * arc;
        pose.headRot = -0.08 * vel;
        pose.armLeftLift = 0.85 * arc;
        pose.armRightLift = 0.85 * arc;
        pose.armLeftAngle = -0.8 * arc;
        pose.armRightAngle = -0.8 * arc;
        pose.legLeftAngle = 0.45 * arc;
        pose.legRightAngle = 0.45 * arc;
        pose.legLeftTuck = 0.35 * arc;
        pose.legRightTuck = 0.35 * arc;
        pose.earLeftRot = -0.18 * arc;
        pose.earRightRot = -0.18 * arc;
        pose.tailLift = -0.2 + 0.4 * (1 - arc);
        pose.tailWag = Math.sin(t * 14) * 0.3;
        pose.eyeStyle = 'sparkle';
        pose.mouthStyle = 'open';
        pose.fx = 'sparkles';
      } else {
        const k = (p - 0.76) / 0.24;
        const bounce = Math.sin(k * Math.PI);
        pose.rootY = 15 * bounce;
        pose.scaleX = 1 + 0.2 * bounce;
        pose.scaleY = 1 - 0.18 * bounce;
        pose.headY = 8 * bounce;
        pose.tailLift = 0.55;
        pose.eyeStyle = 'happy';
        pose.mouthStyle = 'smile';
      }
      break;
    }

    case 'dance': {
      const beat = t * 7.8;
      const sway = Math.sin(beat);
      const bounce = Math.abs(Math.sin(beat));
      const env = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
      pose.rootY = -20 * bounce * env;
      pose.bodyRot = sway * 0.15 * env;
      pose.scaleX = 1 + (1 - bounce) * 0.08 * env;
      pose.scaleY = 1 + ((bounce * 0.06) - (1 - bounce) * 0.07) * env;
      pose.headX = sway * 10 * env;
      pose.headY = -6 * bounce * env;
      pose.headRot = -sway * 0.18 * env;
      pose.earLeftRot = sway * 0.15 * env;
      pose.earRightRot = -sway * 0.15 * env;
      pose.armLeftLift = (0.62 + Math.max(0, sway) * 0.36) * env;
      pose.armRightLift = (0.62 + Math.max(0, -sway) * 0.36) * env;
      pose.armLeftAngle = (-0.5 - Math.max(0, sway) * 0.45) * env;
      pose.armRightAngle = (-0.5 - Math.max(0, -sway) * 0.45) * env;
      pose.legLeftAngle = sway * 0.28 * env;
      pose.legRightAngle = -sway * 0.28 * env;
      pose.tailLift = 0.65;
      pose.tailWag = Math.sin(beat * 1.5) * 0.95;
      pose.eyeStyle = Math.floor(t * 0.75) % 2 === 0 ? 'happy' : 'wink';
      pose.mouthStyle = 'open';
      pose.blush = 0.55;
      pose.fx = 'notes';
      break;
    }

    case 'spin': {
      // Smooth 360 degree horizontal turn using cosine facing + gentle hop
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const angle = ease * Math.PI * 2;
      const hop = Math.sin(p * Math.PI);
      pose.facing = Math.cos(angle) * ctx.facingDir;
      // Avoid zero-width disappearance by clamping minimal scale in renderer
      pose.rootY = -42 * hop;
      pose.scaleY = 1 + 0.08 * hop;
      pose.bodyRot = Math.sin(angle) * 0.1;
      pose.armLeftLift = 0.65 * hop;
      pose.armRightLift = 0.65 * hop;
      pose.armLeftAngle = -0.85 * hop;
      pose.armRightAngle = -0.85 * hop;
      pose.tailLift = 0.6;
      pose.tailWag = Math.sin(angle * 2) * 1.1;
      pose.eyeStyle = hop > 0.3 ? 'happy' : 'sparkle';
      pose.mouthStyle = 'open';
      pose.fx = 'sparkles';
      break;
    }

    case 'backflip': {
      if (p < 0.18) {
        const k = p / 0.18;
        pose.rootY = 20 * k;
        pose.scaleX = 1 + 0.2 * k;
        pose.scaleY = 1 - 0.22 * k;
        pose.headY = 10 * k;
        pose.torsoBend = 0.35 * k;
      } else if (p < 0.82) {
        const k = (p - 0.18) / 0.64;
        const arc = Math.sin(k * Math.PI);
        pose.rootY = -165 * arc;
        pose.bodyRot = -ctx.facingDir * k * Math.PI * 2;
        pose.scaleX = 0.92;
        pose.scaleY = 1.08;
        pose.armLeftLift = 0.85;
        pose.armRightLift = 0.85;
        pose.armLeftAngle = -0.9;
        pose.armRightAngle = -0.9;
        pose.legLeftTuck = 0.8;
        pose.legRightTuck = 0.8;
        pose.tailCurl = 0.9;
        pose.eyeStyle = 'wide';
        pose.mouthStyle = 'o';
        pose.fx = 'sparkles';
      } else {
        const k = (p - 0.82) / 0.18;
        const land = Math.sin(k * Math.PI);
        pose.rootY = 18 * land;
        pose.scaleX = 1 + 0.24 * land;
        pose.scaleY = 1 - 0.2 * land;
        pose.armLeftLift = 0.5 * (1 - k);
        pose.armRightLift = 0.5 * (1 - k);
        pose.eyeStyle = 'sparkle';
        pose.mouthStyle = 'open';
        pose.fx = 'sparkles';
      }
      break;
    }

    case 'sit': {
      pose.rootY = 24;
      pose.scaleX = 1.09 + Math.sin(gt * 2.0) * 0.015;
      pose.scaleY = 0.87 - Math.sin(gt * 2.0) * 0.015;
      pose.torsoBend = 0.18;
      pose.headY = 6 + Math.sin(gt * 2.0 - 0.4) * 2;
      pose.headRot = Math.sin(gt * 0.8) * 0.04;
      pose.legLeftTuck = 0.92;
      pose.legRightTuck = 0.92;
      pose.armLeftAngle = 0.15;
      pose.armRightAngle = -0.15;
      pose.tailLift = -0.15;
      pose.tailCurl = 0.95;
      pose.tailWag = Math.sin(gt * 1.2) * 0.18;
      pose.eyeStyle = 'normal';
      pose.mouthStyle = 'smile';
      pose.blush = 0.25;
      break;
    }

    case 'sleep': {
      const snore = Math.sin(gt * 1.45);
      pose.rootY = 38;
      pose.scaleX = 1.2 + snore * 0.035;
      pose.scaleY = 0.72 - snore * 0.03;
      pose.torsoBend = 0.42;
      pose.headX = 10;
      pose.headY = 26 + snore * 2.5;
      pose.headRot = 0.22 + snore * 0.03;
      pose.earLeftRot = 0.32;
      pose.earRightRot = 0.36;
      pose.legLeftTuck = 1;
      pose.legRightTuck = 1;
      pose.armLeftAngle = 0.5;
      pose.armRightAngle = 0.5;
      pose.tailLift = -0.35;
      pose.tailCurl = 1.0;
      pose.tailWag = snore * 0.08;
      pose.eyeStyle = 'sleep';
      pose.mouthStyle = snore > 0.35 ? 'o' : 'smile';
      pose.blush = 0.35;
      pose.fx = 'zzz';
      break;
    }

    case 'eat': {
      const chew = Math.sin(t * 14);
      const bob = Math.abs(Math.sin(t * 7));
      const env = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
      pose.rootY = 10 * env;
      pose.scaleX = 1 + (0.04 + bob * 0.03) * env;
      pose.scaleY = 1 - (0.05 + bob * 0.03) * env;
      pose.headY = (8 + bob * 7) * env;
      pose.headRot = (0.12 + chew * 0.05) * env;
      pose.earLeftRot = (-0.05 + bob * 0.08) * env;
      pose.earRightRot = (-0.05 + bob * 0.08) * env;
      pose.armLeftLift = (0.86 + bob * 0.08) * env;
      pose.armRightLift = (0.86 + bob * 0.08) * env;
      pose.armLeftAngle = -0.35 * env;
      pose.armRightAngle = -0.35 * env;
      pose.legLeftTuck = 0.5 * env;
      pose.legRightTuck = 0.5 * env;
      pose.tailLift = 0.45;
      pose.tailWag = Math.sin(t * 8) * 0.55;
      pose.eyeStyle = 'happy';
      pose.mouthStyle = chew > 0 ? 'chew' : 'open';
      pose.blush = 0.48;
      pose.prop = 'fish';
      pose.fx = 'hearts';
      break;
    }

    case 'stretch': {
      // Smooth hold in the middle of the big cat stretch
      const env =
        p < 0.22
          ? p / 0.22
          : p > 0.78
          ? (1 - p) / 0.22
          : 1;
      const ease = Math.sin(env * Math.PI * 0.5);
      pose.rootY = 18 * ease;
      pose.scaleX = 1 + 0.26 * ease;
      pose.scaleY = 1 - 0.18 * ease;
      pose.torsoBend = 0.65 * ease;
      pose.headX = 18 * ease;
      pose.headY = 22 * ease;
      pose.headRot = -0.18 * ease;
      pose.earLeftRot = 0.18 * ease;
      pose.earRightRot = 0.18 * ease;
      pose.armLeftAngle = 0.95 * ease;
      pose.armRightAngle = 0.85 * ease;
      pose.armLeftLift = 0;
      pose.armRightLift = 0;
      pose.tailLift = 0.95 * ease + 0.2;
      pose.tailCurl = 0.25;
      pose.tailWag = Math.sin(t * 4) * 0.12;
      pose.eyeStyle = ease > 0.4 ? 'sleep' : 'normal';
      pose.mouthStyle = ease > 0.45 ? 'yawn' : 'smile';
      pose.blush = 0.3;
      break;
    }

    case 'clap': {
      const beat = Math.sin(t * 15);
      const clapIn = Math.max(0, beat);
      const env = p < 0.12 ? p / 0.12 : p > 0.86 ? (1 - p) / 0.14 : 1;
      pose.rootY = -14 * Math.abs(Math.sin(t * 7.5)) * env;
      pose.scaleY = 1 + 0.06 * clapIn * env;
      pose.scaleX = 1 - 0.04 * clapIn * env;
      pose.headY = -4 * clapIn * env;
      pose.headRot = Math.sin(t * 7.5) * 0.09 * env;
      pose.armLeftLift = 0.92 * env;
      pose.armRightLift = 0.92 * env;
      pose.armLeftAngle = (-0.45 + clapIn * 0.55) * env;
      pose.armRightAngle = (-0.45 + clapIn * 0.55) * env;
      pose.tailLift = 0.65;
      pose.tailWag = Math.sin(t * 10) * 0.7;
      pose.eyeStyle = env > 0.35 ? 'happy' : 'normal';
      pose.mouthStyle = 'open';
      pose.blush = 0.45;
      pose.fx = 'sparkles';
      break;
    }

    case 'meow': {
      const talk = Math.abs(Math.sin(t * 6.5));
      pose.headY = -6 * talk;
      pose.headRot = -0.1 * talk;
      pose.scaleY = 1 + 0.05 * talk;
      pose.scaleX = 1 - 0.03 * talk;
      pose.earLeftRot = -0.18 * talk;
      pose.earRightRot = -0.18 * talk;
      pose.armRightLift = 0;
      pose.armRightAngle = 0;
      pose.tailLift = 0.75;
      pose.tailWag = Math.sin(t * 6) * 0.4;
      pose.eyeStyle = 'normal';
      pose.mouthStyle = talk > 0.25 ? 'meow' : 'smile';
      pose.blush = 0.35;
      pose.fx = 'soundwaves';
      break;
    }

    case 'happy': {
      const hop = Math.abs(Math.sin(t * 8.5));
      const env = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
      pose.rootY = -34 * hop * env;
      pose.scaleX = 1 + ((1 - hop) * 0.12 - hop * 0.07) * env;
      pose.scaleY = 1 + (hop * 0.1 - (1 - hop) * 0.1) * env;
      pose.headY = -6 * hop * env;
      pose.headRot = Math.sin(t * 4.25) * 0.14 * env;
      pose.armLeftLift = (0.68 + 0.28 * hop) * env;
      pose.armRightLift = (0.68 + 0.28 * hop) * env;
      pose.armLeftAngle = (-0.55 * hop - 0.15) * env;
      pose.armRightAngle = (-0.55 * hop - 0.15) * env;
      pose.tailLift = 0.85;
      pose.tailWag = Math.sin(t * 14) * 0.9;
      pose.eyeStyle = 'sparkle';
      pose.mouthStyle = 'open';
      pose.blush = 0.65;
      pose.fx = 'hearts';
      break;
    }

    case 'pet': {
      const purr = Math.sin(t * 24) * 1.5;
      const lean = Math.sin(t * 3.5);
      pose.rootY = 14;
      pose.scaleX = 1.07;
      pose.scaleY = 0.91;
      pose.headX = lean * 5 + purr * 0.4;
      pose.headY = 8 + Math.abs(lean) * 3;
      pose.headRot = lean * 0.14;
      pose.earLeftRot = 0.24;
      pose.earRightRot = 0.24;
      pose.legLeftTuck = 0.7;
      pose.legRightTuck = 0.7;
      pose.tailLift = 0.5;
      pose.tailWag = Math.sin(t * 5) * 0.55;
      pose.eyeStyle = 'happy';
      pose.mouthStyle = 'smile';
      pose.blush = 0.72;
      pose.prop = 'petHand';
      pose.fx = 'hearts';
      break;
    }

    case 'angry': {
      const stomp = Math.sin(t * 14);
      const jitter = Math.sin(t * 34) * 0.025;
      pose.rootY = -6 * Math.max(0, stomp);
      pose.torsoBend = -0.55;
      pose.scaleX = 1.12;
      pose.scaleY = 0.94;
      pose.headY = 6;
      pose.headRot = 0.08 + jitter;
      pose.earLeftRot = 0.68;
      pose.earRightRot = 0.68;
      pose.armLeftAngle = -0.25 + Math.max(0, stomp) * 0.45;
      pose.armRightAngle = -0.25 + Math.max(0, -stomp) * 0.45;
      pose.armLeftLift = 0;
      pose.armRightLift = 0;
      pose.tailLift = 0.9;
      pose.tailCurl = 0.15;
      pose.tailPuff = 1;
      pose.tailWag = Math.sin(t * 16) * 0.45;
      pose.eyeStyle = 'angry';
      pose.mouthStyle = 'frown';
      pose.blush = 0;
      pose.fx = 'anger';
      break;
    }

    case 'sad': {
      const sniff = Math.sin(t * 5.2);
      const dab = Math.sin(t * 6.4);
      const lift = p < 0.14 ? p / 0.14 : p > 0.88 ? (1 - p) / 0.12 : 1;
      pose.rootY = 18 + Math.abs(sniff) * 4;
      pose.scaleX = 1.03;
      pose.scaleY = 0.91 + sniff * 0.02;
      pose.torsoBend = 0.28;
      pose.headY = 12 + sniff * 3;
      pose.headRot = 0.14 + Math.sin(t * 2.6) * 0.04;
      pose.earLeftRot = 0.58;
      pose.earRightRot = 0.58;
      pose.armLeftLift = 0.78 * lift;
      pose.armLeftAngle = (-0.2 + dab * 0.16) * lift;
      pose.armRightAngle = 0.2;
      pose.legLeftTuck = 0.65;
      pose.legRightTuck = 0.65;
      pose.tailLift = -0.4;
      pose.tailCurl = 0.6;
      pose.tailWag = Math.sin(t * 1.5) * 0.12;
      pose.eyeStyle = 'sad';
      pose.mouthStyle = 'frown';
      pose.blush = 0.22;
      pose.fx = 'tears';
      break;
    }

    case 'shock': {
      const pop = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) : 0;
      const shake = Math.sin(t * 44) * (1 - p) * 0.08;
      const env = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
      pose.rootY = -72 * pop;
      pose.scaleX = 0.88 + (1 - pop) * 0.12;
      pose.scaleY = 1.18 - (1 - pop) * 0.12;
      pose.bodyRot = shake;
      pose.headY = -10 * pop;
      pose.earLeftRot = -0.3;
      pose.earRightRot = -0.3;
      pose.armLeftLift = 0.95 * env;
      pose.armRightLift = 0.95 * env;
      pose.armLeftAngle = -0.65 * env;
      pose.armRightAngle = -0.65 * env;
      pose.tailLift = 0.95;
      pose.tailPuff = 0.85;
      pose.tailCurl = 0.1;
      pose.eyeStyle = 'wide';
      pose.mouthStyle = 'o';
      pose.blush = 0;
      pose.fx = 'exclamation';
      break;
    }

    case 'groom': {
      const lick = Math.sin(t * 7.5);
      const lift = p < 0.14 ? p / 0.14 : p > 0.86 ? (1 - p) / 0.14 : 1;
      pose.rootY = 18 * lift;
      pose.scaleX = 1.06;
      pose.scaleY = 0.92;
      pose.headX = 6 * lift;
      pose.headY = 10 * lift + Math.max(0, lick) * 5;
      pose.headRot = 0.18 * lift + lick * 0.08;
      pose.armRightLift = 0.88 * lift;
      pose.armRightAngle = (-0.55 + lick * 0.18) * lift;
      pose.legLeftTuck = 0.78 * lift;
      pose.legRightTuck = 0.78 * lift;
      pose.tailLift = 0.15;
      pose.tailCurl = 0.85;
      pose.tailWag = Math.sin(t * 2.5) * 0.25;
      pose.eyeStyle = 'happy';
      pose.mouthStyle = lick > 0.15 ? 'tongue' : 'smile';
      pose.blush = 0.4;
      break;
    }

    case 'zoomies': {
      const dash = Math.sin(t * 6.4);
      const dir = Math.cos(t * 6.4) >= 0 ? 1 : -1;
      const stride = t * 18;
      const step = Math.sin(stride);
      const hop = Math.abs(Math.sin(stride));
      pose.rootX = Math.max(-0.56, Math.min(0.56, dash * 0.54));
      pose.facing = dir;
      pose.rootY = -22 * hop;
      pose.bodyRot = 0.18;
      pose.scaleX = 1.12;
      pose.scaleY = 0.9;
      pose.headY = -4 * hop;
      pose.earLeftRot = 0.48;
      pose.earRightRot = 0.48;
      pose.armLeftAngle = step * 0.85;
      pose.armRightAngle = -step * 0.85;
      pose.armLeftLift = 0;
      pose.armRightLift = 0;
      pose.legLeftAngle = -step * 0.85;
      pose.legRightAngle = step * 0.85;
      pose.tailLift = 0.9;
      pose.tailPuff = 0.55;
      pose.tailWag = Math.sin(t * 20) * 0.8;
      pose.eyeStyle = 'wide';
      pose.mouthStyle = 'open';
      pose.fx = 'sparkles';
      break;
    }

    case 'gaming': {
      const tap = Math.sin(t * 24);
      const bob = Math.abs(Math.sin(t * 12));
      pose.rootY = 6 - bob * 5;
      pose.headX = 6;
      pose.headY = 8 + bob * 3;
      pose.headRot = 0.08 + Math.sin(t * 6) * 0.04;
      pose.armLeftLift = 0;
      pose.armRightLift = 0;
      pose.armLeftAngle = 0.25 + tap * 0.22;
      pose.armRightAngle = -0.25 - tap * 0.22;
      pose.tailLift = 0.65;
      pose.tailWag = Math.sin(t * 11) * 0.65;
      pose.eyeStyle = 'sparkle';
      pose.mouthStyle = 'open';
      pose.pupilX = 0.35;
      pose.pupilY = 0.2;
      pose.blush = 0.35;
      pose.fx = 'sparkles';
      break;
    }

    case 'heart': {
      const pulse = Math.sin(t * 7);
      const lift = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
      pose.rootY = -6 * Math.abs(pulse) * lift;
      pose.headRot = -0.1 * lift + Math.sin(t * 3.5) * 0.04;
      pose.headY = -4 * lift;
      pose.armLeftLift = 0.72 * lift;
      pose.armRightLift = 0.72 * lift;
      pose.armLeftAngle = -0.58 * lift;
      pose.armRightAngle = -0.58 * lift;
      pose.tailLift = 0.75;
      pose.tailWag = Math.sin(t * 9) * 0.7;
      pose.eyeStyle = 'happy';
      pose.mouthStyle = 'open';
      pose.blush = 0.7;
      pose.fx = 'hearts';
      break;
    }

    case 'shy': {
      const fidget = Math.sin(t * 8);
      const env = p < 0.14 ? p / 0.14 : p > 0.86 ? (1 - p) / 0.14 : 1;
      pose.rootY = 10 * env;
      pose.scaleX = 1 - 0.04 * env;
      pose.scaleY = 1 - 0.04 * env;
      pose.headX = -6 * env;
      pose.headY = 8 * env;
      pose.headRot = (-0.14 + fidget * 0.03) * env;
      pose.earLeftRot = 0.32 * env;
      pose.earRightRot = 0.32 * env;
      pose.armLeftLift = 0.92 * env;
      pose.armRightLift = 0.92 * env;
      pose.armLeftAngle = (-0.45 + fidget * 0.08) * env;
      pose.armRightAngle = (-0.45 - fidget * 0.08) * env;
      pose.tailLift = 0.15;
      pose.tailCurl = 0.85;
      pose.tailWag = Math.sin(t * 4) * 0.35;
      pose.eyeStyle = 'normal';
      pose.pupilX = -0.45;
      pose.pupilY = 0.15;
      pose.mouthStyle = 'smile';
      pose.blush = 0.92 * env;
      pose.fx = 'hearts';
      break;
    }

    case 'talk': {
      // Multi-harmonic syllable envelope so anime lip-sync feels organic, not robotic
      const s1 = Math.sin(t * 13.5);
      const s2 = Math.sin(t * 21.3 + 0.7);
      const pause = Math.sin(t * 2.8) > -0.78 ? 1 : 0.12;
      const openness = Math.max(0, Math.min(1, (0.52 + s1 * 0.34 + s2 * 0.22) * pause));
      const nod = Math.sin(t * 5.2);
      pose.headY = -3 + nod * 3.5;
      pose.headRot = Math.sin(t * 2.6) * 0.075;
      pose.bodyRot = Math.sin(t * 2.6) * 0.025;
      pose.armRightLift = 0;
      pose.armLeftLift = 0;
      pose.tailLift = 0.45;
      pose.tailWag = Math.sin(t * 4.2) * 0.45;
      // Keep eyes steady & natural (blinking smoothly via blink channel, zero flicker!)
      pose.eyeStyle = 'normal';
      pose.mouthStyle = 'talk';
      pose.mouthOpen = openness;
      pose.talkPhoneme =
        openness < 0.15
          ? 'closed'
          : openness < 0.36
          ? 'small'
          : s2 > 0.32
          ? 'round_o'
          : s1 > 0.14
          ? 'open_a'
          : 'wide_e';
      pose.isSpeaking = openness > 0.16;
      pose.blush = 0.3;
      pose.fx = 'soundwaves';
      break;
    }

    case 'explain': {
      // Expressive VTuber "explaining things" with smooth fluid presenting hands, nods, and lively lip-sync!
      const s1 = Math.sin(t * 14.2);
      const s2 = Math.sin(t * 22.1 + 1.1);
      const pause = Math.sin(t * 2.4) > -0.82 ? 1 : 0.14;
      const openness = Math.max(0, Math.min(1, (0.54 + s1 * 0.34 + s2 * 0.22) * pause));
      const gesturePulse = Math.sin(t * 5.2);
      const env = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;

      pose.rootY = -4 * Math.abs(Math.sin(t * 3.0)) * env;
      pose.bodyRot = Math.sin(t * 2.2) * 0.04 * env;
      pose.headY = (-3 + Math.sin(t * 5.4) * 3.5) * env;
      pose.headRot = Math.sin(t * 2.4) * 0.095 * env;

      // Both oversized hoodie arms lift smoothly & alternate gently while explaining (zero abrupt jumps!)
      pose.armLeftLift = (0.86 + Math.sin(t * 2.6 + 0.8) * 0.12) * env;
      pose.armRightLift = (0.86 + Math.sin(t * 2.6 - 0.8) * 0.12) * env;
      pose.armLeftAngle = (-0.18 + gesturePulse * 0.28) * env;
      pose.armRightAngle = (-0.18 - gesturePulse * 0.28) * env;

      pose.tailLift = 0.58;
      pose.tailWag = Math.sin(t * 5.2) * 0.55;
      pose.eyeStyle = 'sparkle';
      pose.mouthStyle = 'talk';
      pose.mouthOpen = openness;
      pose.talkPhoneme =
        openness < 0.15
          ? 'closed'
          : openness < 0.36
          ? 'small'
          : s2 > 0.32
          ? 'round_o'
          : s1 > 0.14
          ? 'open_a'
          : 'wide_e';
      pose.isSpeaking = openness > 0.16;
      pose.blush = 0.34;
      pose.fx = 'sparkles';
      break;
    }

    case 'sing': {
      const sway = Math.sin(t * 3.8);
      const vibrato = Math.sin(t * 16) * 0.12;
      const phrase = Math.sin(t * 5.4) * 0.5 + 0.5;
      const openness = Math.min(1, 0.25 + phrase * 0.72 + vibrato);
      const env = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
      pose.rootY = -10 * Math.abs(sway) * env;
      pose.bodyRot = sway * 0.11 * env;
      pose.headRot = -sway * 0.13 * env;
      pose.headY = (-4 - phrase * 4) * env;
      pose.armLeftLift = (0.72 + Math.max(0, sway) * 0.22) * env;
      pose.armRightLift = (0.72 + Math.max(0, -sway) * 0.22) * env;
      pose.armLeftAngle = (-0.4 - Math.max(0, sway) * 0.35) * env;
      pose.armRightAngle = (-0.4 - Math.max(0, -sway) * 0.35) * env;
      pose.tailLift = 0.65;
      pose.tailWag = Math.sin(t * 7.6) * 0.75;
      pose.eyeStyle = 'sparkle';
      pose.mouthStyle = 'talk';
      pose.mouthOpen = openness;
      pose.talkPhoneme =
        phrase > 0.65 ? 'round_o' : phrase > 0.3 ? 'open_a' : 'small';
      pose.isSpeaking = true;
      pose.blush = 0.48;
      pose.fx = 'notes';
      break;
    }

    case 'laugh': {
      const chuckle = Math.abs(Math.sin(t * 14.5));
      const env = p < 0.12 ? p / 0.12 : p > 0.86 ? (1 - p) / 0.14 : 1;
      pose.rootY = -10 * chuckle * env;
      pose.scaleX = 1 + (1 - chuckle) * 0.05 * env;
      pose.scaleY = 1 - (1 - chuckle) * 0.04 * env + chuckle * 0.05 * env;
      pose.headY = -4 * chuckle * env;
      pose.headRot = Math.sin(t * 7.25) * 0.1 * env;
      pose.armLeftLift = (0.78 + chuckle * 0.14) * env;
      pose.armRightLift = (0.78 + chuckle * 0.14) * env;
      pose.armLeftAngle = -0.35 * env;
      pose.armRightAngle = -0.35 * env;
      pose.tailLift = 0.7;
      pose.tailWag = Math.sin(t * 14) * 0.8;
      pose.eyeStyle = env > 0.3 ? 'happy' : 'normal';
      pose.mouthStyle = 'talk';
      pose.mouthOpen = 0.35 + chuckle * 0.62;
      pose.talkPhoneme = chuckle > 0.5 ? 'open_a' : 'wide_e';
      pose.isSpeaking = true;
      pose.blush = 0.6;
      pose.fx = 'sparkles';
      break;
    }

    case 'walk_left':
    case 'walk_right': {
      const stride = t * 9.5;
      const step = Math.sin(stride);
      const bob = Math.abs(Math.sin(stride));
      pose.facing = action === 'walk_left' ? -1 : 1;
      pose.rootY = -11 * bob;
      pose.bodyRot = 0.05;
      pose.headY = -3 * bob;
      pose.headRot = Math.sin(stride * 0.5) * 0.05;
      pose.armLeftAngle = step * 0.55;
      pose.armRightAngle = -step * 0.55;
      pose.armLeftLift = 0;
      pose.armRightLift = 0;
      pose.legLeftAngle = -step * 0.55;
      pose.legRightAngle = step * 0.55;
      pose.tailLift = 0.55;
      pose.tailWag = Math.sin(stride * 0.8) * 0.45;
      pose.eyeStyle = 'normal';
      pose.mouthStyle = 'smile';
      pose.pupilX = 0.25;
      break;
    }
  }

  return pose;
}
