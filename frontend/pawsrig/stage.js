// frontend/pawsrig/animations.ts
var ANIMATION_CATALOG = [
  {
    id: "idle",
    label: "Idle",
    category: "body",
    description: "Relaxed standing stance with gentle breathing and tail sway.",
    duration: null,
    keywords: ["idle", "stop", "stand", "reset", "calm", "chill"]
  },
  {
    id: "wave",
    label: "Wave",
    category: "body",
    description: "Friendly front-paw wave with head tilt and cheerful eyes.",
    duration: 2.6,
    keywords: ["wave", "hi", "hello", "hey", "bye", "greet"]
  },
  {
    id: "listen",
    label: "Listen",
    category: "emotes",
    description: "Tilts her head and perks her ears to acknowledge a comment.",
    duration: 1.6,
    keywords: []
  },
  {
    id: "nod",
    label: "Nod",
    category: "emotes",
    description: "Gives two small, affirmative nods.",
    duration: 1.45,
    keywords: ["nod"]
  },
  {
    id: "jump",
    label: "Jump",
    category: "tricks",
    description: "Crouch anticipation, energetic spring leap, and soft landing squash.",
    duration: 1.5,
    keywords: ["jump", "hop", "leap", "bounce", "boing"]
  },
  {
    id: "dance",
    label: "Dance",
    category: "tricks",
    description: "Rhythmic side-to-side groove with alternating paws and music notes.",
    duration: 4,
    keywords: ["dance", "vibe", "groove", "party", "boogie", "music"]
  },
  {
    id: "spin",
    label: "Spin",
    category: "tricks",
    description: "Playful 360-degree twirl with whipping tail and flourish.",
    duration: 1.8,
    keywords: ["spin", "twirl", "turn", "rotate", "circle"]
  },
  {
    id: "backflip",
    label: "Backflip",
    category: "tricks",
    description: "Deep crouch into an airborne somersault and superhero landing.",
    duration: 1.9,
    keywords: ["backflip", "flip", "somersault", "acrobat", "parkour"]
  },
  {
    id: "sit",
    label: "Sit",
    category: "body",
    description: "Tucks hind paws neatly and curls tail around the body.",
    duration: null,
    keywords: ["sit", "loaf", "stay", "down", "rest"]
  },
  {
    id: "sleep",
    label: "Sleep",
    category: "body",
    description: "Drowsy curled nap with slow belly breaths and floating Zzz.",
    duration: null,
    keywords: ["sleep", "nap", "sleepy", "tired", "bed", "zzz", "goodnight"]
  },
  {
    id: "eat",
    label: "Eat Fish",
    category: "body",
    description: "Holds a fish treat and munches happily with bobbing head.",
    duration: 3.4,
    keywords: ["eat", "feed", "fish", "food", "treat", "snack", "nom", "hungry"]
  },
  {
    id: "stretch",
    label: "Stretch",
    category: "body",
    description: "Classic big cat front-bow stretch, tall tail, and wide yawn.",
    duration: 2.8,
    keywords: ["stretch", "yawn", "big stretch", "yoga"]
  },
  {
    id: "clap",
    label: "Clap",
    category: "tricks",
    description: "Bounces joyfully while clapping both front paws together.",
    duration: 2.8,
    keywords: ["clap", "applause", "bravo", "yay", "gg", "cheers"]
  },
  {
    id: "meow",
    label: "Meow",
    category: "emotes",
    description: "Lifts chin and calls out with rhythmic sound waves.",
    duration: 2.2,
    keywords: ["meow", "talk", "speak", "say", "purr", "nya", "miau"]
  },
  {
    id: "happy",
    label: "Happy",
    category: "emotes",
    description: "Excited mini hops, sparkly eyes, rosy cheeks, and hearts.",
    duration: 3,
    keywords: ["happy", "love", "heart", "cute", "aww", "smile", "joy"]
  },
  {
    id: "pet",
    label: "Pet",
    category: "emotes",
    description: "Leans into gentle head scritches with blissful purr wiggle.",
    duration: 3,
    keywords: ["pet", "pat", "scritch", "rub", "headpat", "cuddle", "hug"]
  },
  {
    id: "angry",
    label: "Angry",
    category: "emotes",
    description: "Arched back, flattened airplane ears, puffed tail, and stomp.",
    duration: 2.8,
    keywords: ["angry", "mad", "hiss", "grumpy", "rage", "bite", "bonk"]
  },
  {
    id: "sad",
    label: "Sad",
    category: "emotes",
    description: "Droopy ears, slumped posture, slow low tail, and teardrop.",
    duration: 3.2,
    keywords: ["sad", "cry", "rip", "sorry", "lonely", "nooo"]
  },
  {
    id: "shock",
    label: "Shock",
    category: "emotes",
    description: "Sudden vertical startle hop with wide eyes and trembling fur.",
    duration: 2,
    keywords: ["shock", "scare", "boo", "surprise", "omg", "what", "wow"]
  },
  {
    id: "groom",
    label: "Groom",
    category: "body",
    description: "Lifts a front paw and licks it neatly with happy eyes.",
    duration: 3,
    keywords: ["groom", "lick", "clean", "wash", "bath"]
  },
  {
    id: "zoomies",
    label: "Zoomies",
    category: "move",
    description: "Hyper zig-zag dash back and forth across the stage.",
    duration: 2.6,
    keywords: ["zoomies", "zoom", "run", "fast", "crazy", "hyper"]
  },
  {
    id: "gaming",
    label: "Gaming",
    category: "body",
    description: "Rapidly taps the RGB keyboard with hyped gamer focus.",
    duration: 3.4,
    keywords: ["gaming", "game", "play", "type", "keyboard", "clutch"]
  },
  {
    id: "heart",
    label: "Heart Hands",
    category: "emotes",
    description: "Brings both paws together to send a glowing heart to chat.",
    duration: 2.8,
    keywords: ["heart", "gift", "rose", "galaxy", "thanks", "ty"]
  },
  {
    id: "shy",
    label: "Shy",
    category: "emotes",
    description: "Lifts hoodie cuffs near rosy cheeks with bashful eyes.",
    duration: 2.8,
    keywords: ["shy", "blush", "uwu", "oops", "embarrassed"]
  },
  {
    id: "talk",
    label: "Talk",
    category: "emotes",
    description: "Lively multi-syllable lip-sync into the mic with conversational nods.",
    duration: 4,
    keywords: ["talk", "speak", "say", "chat", "read", "reply", "hello chat"]
  },
  {
    id: "explain",
    label: "Explain",
    category: "emotes",
    description: "Expressive explaining hand gestures, attentive nods, and full lip-sync.",
    duration: 4.4,
    keywords: ["explain", "teach", "tell", "story", "tutorial", "why", "how", "answer", "guide"]
  },
  {
    id: "sing",
    label: "Sing",
    category: "tricks",
    description: "Melodic singing into the RGB mic with swaying shoulders and music notes.",
    duration: 4.2,
    keywords: ["sing", "song", "karaoke", "music", "lalala", "hum"]
  },
  {
    id: "laugh",
    label: "Laugh",
    category: "emotes",
    description: "Giggling bounce with happy closed eyes and open fang-laugh lip-sync.",
    duration: 2.8,
    keywords: ["laugh", "lol", "lmao", "haha", "hehe", "funny", "giggle"]
  },
  {
    id: "walk_left",
    label: "Walk Left",
    category: "move",
    description: "Four-paw stroll toward the left side of the live frame.",
    duration: 2,
    keywords: ["walk left", "left", "go left", "move left"]
  },
  {
    id: "walk_right",
    label: "Walk Right",
    category: "move",
    description: "Four-paw stroll toward the right side of the live frame.",
    duration: 2,
    keywords: ["walk right", "right", "go right", "move right"]
  }
];
var ANIMATION_BY_ID = ANIMATION_CATALOG.reduce((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {});
function createNeutralPose(rootX = 0, facingDir = 1) {
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
    eyeStyle: "normal",
    mouthStyle: "smile",
    mouthOpen: 0,
    talkPhoneme: "closed",
    isSpeaking: false,
    blink: 0,
    pupilX: 0,
    pupilY: 0,
    blush: 0.18,
    prop: "none",
    fx: "none",
    fxTime: 0
  };
}
function sampleAnimationPose(action, t, ctx) {
  const pose = createNeutralPose(ctx.rootX, ctx.facingDir);
  const def = ANIMATION_BY_ID[action];
  const dur = def.duration ?? 2.4;
  const p = Math.min(1, Math.max(0, t / dur));
  const gt = ctx.globalTime;
  const slowBreath = Math.sin(gt * 2.2) * 0.5 + 0.5;
  pose.breath = slowBreath;
  pose.blink = ctx.blink;
  pose.fxTime = t;
  switch (action) {
    case "idle": {
      pose.scaleX = 1 + Math.sin(gt * 2.2) * 0.015;
      pose.scaleY = 1 - Math.sin(gt * 2.2) * 0.015;
      pose.headY = Math.sin(gt * 2.2 - 0.5) * 2.5;
      pose.headRot = Math.sin(gt * 0.9) * 0.045;
      pose.tailLift = 0.25 + Math.sin(gt * 1.4) * 0.1;
      pose.tailWag = Math.sin(gt * 2) * 0.35;
      pose.tailCurl = 0.45 + Math.cos(gt * 1.6) * 0.12;
      pose.earRightRot = ctx.earTwitch * 0.26;
      pose.pupilX = Math.sin(gt * 0.65) * 0.28;
      pose.pupilY = Math.cos(gt * 0.45) * 0.12;
      break;
    }
    case "wave": {
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
      pose.eyeStyle = activeLift > 0.3 ? "happy" : "normal";
      pose.mouthStyle = "open";
      pose.blush = 0.45 * Math.max(0.4, liftEnvelope);
      pose.fx = "sparkles";
      break;
    }
    case "listen": {
      const focus = Math.sin(p * Math.PI);
      pose.headRot = focus * 0.15;
      pose.headY = -4 * focus;
      pose.earLeftRot = -0.13 * focus;
      pose.pupilX = -0.18 * focus;
      break;
    }
    case "nod": {
      const nod = (1 - Math.cos(p * 4 * Math.PI)) * 0.5 * Math.sin(p * Math.PI);
      pose.headY = 15 * nod;
      pose.headRot = 0.08 * nod;
      break;
    }
    case "jump": {
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
        const arc = Math.sin(k * Math.PI);
        const vel = Math.cos(k * Math.PI);
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
        pose.eyeStyle = "sparkle";
        pose.mouthStyle = "open";
        pose.fx = "sparkles";
      } else {
        const k = (p - 0.76) / 0.24;
        const bounce = Math.sin(k * Math.PI);
        pose.rootY = 15 * bounce;
        pose.scaleX = 1 + 0.2 * bounce;
        pose.scaleY = 1 - 0.18 * bounce;
        pose.headY = 8 * bounce;
        pose.tailLift = 0.55;
        pose.eyeStyle = "happy";
        pose.mouthStyle = "smile";
      }
      break;
    }
    case "dance": {
      const beat = t * 7.8;
      const sway = Math.sin(beat);
      const bounce = Math.abs(Math.sin(beat));
      const env = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
      pose.rootY = -20 * bounce * env;
      pose.bodyRot = sway * 0.15 * env;
      pose.scaleX = 1 + (1 - bounce) * 0.08 * env;
      pose.scaleY = 1 + (bounce * 0.06 - (1 - bounce) * 0.07) * env;
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
      pose.eyeStyle = Math.floor(t * 0.75) % 2 === 0 ? "happy" : "wink";
      pose.mouthStyle = "open";
      pose.blush = 0.55;
      pose.fx = "notes";
      break;
    }
    case "spin": {
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const angle = ease * Math.PI * 2;
      const hop = Math.sin(p * Math.PI);
      pose.facing = Math.cos(angle) * ctx.facingDir;
      pose.rootY = -42 * hop;
      pose.scaleY = 1 + 0.08 * hop;
      pose.bodyRot = Math.sin(angle) * 0.1;
      pose.armLeftLift = 0.65 * hop;
      pose.armRightLift = 0.65 * hop;
      pose.armLeftAngle = -0.85 * hop;
      pose.armRightAngle = -0.85 * hop;
      pose.tailLift = 0.6;
      pose.tailWag = Math.sin(angle * 2) * 1.1;
      pose.eyeStyle = hop > 0.3 ? "happy" : "sparkle";
      pose.mouthStyle = "open";
      pose.fx = "sparkles";
      break;
    }
    case "backflip": {
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
        pose.eyeStyle = "wide";
        pose.mouthStyle = "o";
        pose.fx = "sparkles";
      } else {
        const k = (p - 0.82) / 0.18;
        const land = Math.sin(k * Math.PI);
        pose.rootY = 18 * land;
        pose.scaleX = 1 + 0.24 * land;
        pose.scaleY = 1 - 0.2 * land;
        pose.armLeftLift = 0.5 * (1 - k);
        pose.armRightLift = 0.5 * (1 - k);
        pose.eyeStyle = "sparkle";
        pose.mouthStyle = "open";
        pose.fx = "sparkles";
      }
      break;
    }
    case "sit": {
      pose.rootY = 24;
      pose.scaleX = 1.09 + Math.sin(gt * 2) * 0.015;
      pose.scaleY = 0.87 - Math.sin(gt * 2) * 0.015;
      pose.torsoBend = 0.18;
      pose.headY = 6 + Math.sin(gt * 2 - 0.4) * 2;
      pose.headRot = Math.sin(gt * 0.8) * 0.04;
      pose.legLeftTuck = 0.92;
      pose.legRightTuck = 0.92;
      pose.armLeftAngle = 0.15;
      pose.armRightAngle = -0.15;
      pose.tailLift = -0.15;
      pose.tailCurl = 0.95;
      pose.tailWag = Math.sin(gt * 1.2) * 0.18;
      pose.eyeStyle = "normal";
      pose.mouthStyle = "smile";
      pose.blush = 0.25;
      break;
    }
    case "sleep": {
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
      pose.tailCurl = 1;
      pose.tailWag = snore * 0.08;
      pose.eyeStyle = "sleep";
      pose.mouthStyle = snore > 0.35 ? "o" : "smile";
      pose.blush = 0.35;
      pose.fx = "zzz";
      break;
    }
    case "eat": {
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
      pose.eyeStyle = "happy";
      pose.mouthStyle = chew > 0 ? "chew" : "open";
      pose.blush = 0.48;
      pose.prop = "fish";
      pose.fx = "hearts";
      break;
    }
    case "stretch": {
      const env = p < 0.22 ? p / 0.22 : p > 0.78 ? (1 - p) / 0.22 : 1;
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
      pose.eyeStyle = ease > 0.4 ? "sleep" : "normal";
      pose.mouthStyle = ease > 0.45 ? "yawn" : "smile";
      pose.blush = 0.3;
      break;
    }
    case "clap": {
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
      pose.eyeStyle = env > 0.35 ? "happy" : "normal";
      pose.mouthStyle = "open";
      pose.blush = 0.45;
      pose.fx = "sparkles";
      break;
    }
    case "meow": {
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
      pose.eyeStyle = "normal";
      pose.mouthStyle = talk > 0.25 ? "meow" : "smile";
      pose.blush = 0.35;
      pose.fx = "soundwaves";
      break;
    }
    case "happy": {
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
      pose.eyeStyle = "sparkle";
      pose.mouthStyle = "open";
      pose.blush = 0.65;
      pose.fx = "hearts";
      break;
    }
    case "pet": {
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
      pose.eyeStyle = "happy";
      pose.mouthStyle = "smile";
      pose.blush = 0.72;
      pose.prop = "petHand";
      pose.fx = "hearts";
      break;
    }
    case "angry": {
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
      pose.eyeStyle = "angry";
      pose.mouthStyle = "frown";
      pose.blush = 0;
      pose.fx = "anger";
      break;
    }
    case "sad": {
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
      pose.eyeStyle = "sad";
      pose.mouthStyle = "frown";
      pose.blush = 0.22;
      pose.fx = "tears";
      break;
    }
    case "shock": {
      const pop = p < 0.35 ? Math.sin(p / 0.35 * Math.PI) : 0;
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
      pose.eyeStyle = "wide";
      pose.mouthStyle = "o";
      pose.blush = 0;
      pose.fx = "exclamation";
      break;
    }
    case "groom": {
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
      pose.eyeStyle = "happy";
      pose.mouthStyle = lick > 0.15 ? "tongue" : "smile";
      pose.blush = 0.4;
      break;
    }
    case "zoomies": {
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
      pose.eyeStyle = "wide";
      pose.mouthStyle = "open";
      pose.fx = "sparkles";
      break;
    }
    case "gaming": {
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
      pose.eyeStyle = "sparkle";
      pose.mouthStyle = "open";
      pose.pupilX = 0.35;
      pose.pupilY = 0.2;
      pose.blush = 0.35;
      pose.fx = "sparkles";
      break;
    }
    case "heart": {
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
      pose.eyeStyle = "happy";
      pose.mouthStyle = "open";
      pose.blush = 0.7;
      pose.fx = "hearts";
      break;
    }
    case "shy": {
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
      pose.eyeStyle = "normal";
      pose.pupilX = -0.45;
      pose.pupilY = 0.15;
      pose.mouthStyle = "smile";
      pose.blush = 0.92 * env;
      pose.fx = "hearts";
      break;
    }
    case "talk": {
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
      pose.eyeStyle = "normal";
      pose.mouthStyle = "talk";
      pose.mouthOpen = openness;
      pose.talkPhoneme = openness < 0.15 ? "closed" : openness < 0.36 ? "small" : s2 > 0.32 ? "round_o" : s1 > 0.14 ? "open_a" : "wide_e";
      pose.isSpeaking = openness > 0.16;
      pose.blush = 0.3;
      pose.fx = "soundwaves";
      break;
    }
    case "explain": {
      const s1 = Math.sin(t * 14.2);
      const s2 = Math.sin(t * 22.1 + 1.1);
      const pause = Math.sin(t * 2.4) > -0.82 ? 1 : 0.14;
      const openness = Math.max(0, Math.min(1, (0.54 + s1 * 0.34 + s2 * 0.22) * pause));
      const gesturePulse = Math.sin(t * 5.2);
      const env = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
      pose.rootY = -4 * Math.abs(Math.sin(t * 3)) * env;
      pose.bodyRot = Math.sin(t * 2.2) * 0.04 * env;
      pose.headY = (-3 + Math.sin(t * 5.4) * 3.5) * env;
      pose.headRot = Math.sin(t * 2.4) * 0.095 * env;
      pose.armLeftLift = (0.86 + Math.sin(t * 2.6 + 0.8) * 0.12) * env;
      pose.armRightLift = (0.86 + Math.sin(t * 2.6 - 0.8) * 0.12) * env;
      pose.armLeftAngle = (-0.18 + gesturePulse * 0.28) * env;
      pose.armRightAngle = (-0.18 - gesturePulse * 0.28) * env;
      pose.tailLift = 0.58;
      pose.tailWag = Math.sin(t * 5.2) * 0.55;
      pose.eyeStyle = "sparkle";
      pose.mouthStyle = "talk";
      pose.mouthOpen = openness;
      pose.talkPhoneme = openness < 0.15 ? "closed" : openness < 0.36 ? "small" : s2 > 0.32 ? "round_o" : s1 > 0.14 ? "open_a" : "wide_e";
      pose.isSpeaking = openness > 0.16;
      pose.blush = 0.34;
      pose.fx = "sparkles";
      break;
    }
    case "sing": {
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
      pose.eyeStyle = "sparkle";
      pose.mouthStyle = "talk";
      pose.mouthOpen = openness;
      pose.talkPhoneme = phrase > 0.65 ? "round_o" : phrase > 0.3 ? "open_a" : "small";
      pose.isSpeaking = true;
      pose.blush = 0.48;
      pose.fx = "notes";
      break;
    }
    case "laugh": {
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
      pose.eyeStyle = env > 0.3 ? "happy" : "normal";
      pose.mouthStyle = "talk";
      pose.mouthOpen = 0.35 + chuckle * 0.62;
      pose.talkPhoneme = chuckle > 0.5 ? "open_a" : "wide_e";
      pose.isSpeaking = true;
      pose.blush = 0.6;
      pose.fx = "sparkles";
      break;
    }
    case "walk_left":
    case "walk_right": {
      const stride = t * 9.5;
      const step = Math.sin(stride);
      const bob = Math.abs(Math.sin(stride));
      pose.facing = action === "walk_left" ? -1 : 1;
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
      pose.eyeStyle = "normal";
      pose.mouthStyle = "smile";
      pose.pupilX = 0.25;
      break;
    }
  }
  return pose;
}

// frontend/pawsrig/commandParser.ts
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeComment(raw) {
  return raw.toLowerCase().trim().replace(/^[!/.\s]+/, "").replace(/[^\p{L}\p{N}\s_-]+/gu, " ").replace(/\s+/g, " ").trim();
}
function parseCommentToAction(rawComment, catalog, customKeywords) {
  const normalized = normalizeComment(rawComment);
  if (!normalized) return null;
  const entries = [];
  for (const def of catalog) {
    entries.push({ action: def.id, keyword: def.id.replace(/_/g, " ") });
    entries.push({ action: def.id, keyword: def.id });
    const keywords = customKeywords?.[def.id] ?? def.keywords;
    for (const kw of keywords) {
      const cleanKw = normalizeComment(kw);
      if (cleanKw) {
        entries.push({ action: def.id, keyword: cleanKw });
      }
    }
  }
  for (const entry of entries) {
    if (normalized === entry.keyword) {
      return { action: entry.action, matchedKeyword: entry.keyword };
    }
  }
  const sortedByLength = [...entries].sort(
    (a, b) => b.keyword.length - a.keyword.length
  );
  for (const entry of sortedByLength) {
    const pattern = new RegExp(
      `(?:^|\\s)${escapeRegExp(entry.keyword)}(?:$|\\s)`,
      "i"
    );
    if (pattern.test(normalized)) {
      return { action: entry.action, matchedKeyword: entry.keyword };
    }
  }
  return null;
}

// frontend/pawsrig/animationEngine.ts
function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}
var WALK_BOUNDS = 0.58;
var WALK_SPEED_PER_SEC = 0.38;
var CatAnimationEngine = class {
  currentAction = "idle";
  queue = [];
  elapsed = 0;
  globalTime = 0;
  rootX = 0;
  facingDir = 1;
  pose;
  config;
  blinkTimer = 2.4;
  blinkProgress = 0;
  twitchTimer = 4.2;
  twitchProgress = 0;
  /** Layered continuous talking toggle (e.g. while user's TTS script speaks) */
  talkingOverlay = false;
  talkingTimeRemaining = null;
  /** Optional external audio amplitude (0..1) */
  externalAudioLevel = null;
  constructor(config) {
    this.config = {
      queueMode: config?.queueMode ?? "interrupt",
      maxQueueSize: config?.maxQueueSize ?? 8,
      speed: config?.speed ?? 1
    };
    this.pose = createNeutralPose(0, 1);
  }
  getSnapshot() {
    return {
      currentAction: this.currentAction,
      queue: [...this.queue],
      rootX: this.rootX,
      facingDir: this.facingDir,
      elapsed: this.elapsed,
      isTalking: this.talkingOverlay || this.currentAction === "talk" || this.currentAction === "explain" || this.currentAction === "sing" || this.currentAction === "laugh" || this.currentAction === "meow"
    };
  }
  setTalking(speaking, durationSeconds) {
    this.talkingOverlay = speaking;
    if (speaking && typeof durationSeconds === "number" && durationSeconds > 0) {
      this.talkingTimeRemaining = durationSeconds;
    } else {
      this.talkingTimeRemaining = null;
    }
  }
  setExternalAudioLevel(level) {
    this.externalAudioLevel = level === null ? null : Math.max(0, Math.min(1, level));
  }
  getPose() {
    return this.pose;
  }
  getConfig() {
    return { ...this.config };
  }
  updateConfig(partial) {
    this.config = {
      ...this.config,
      ...partial,
      speed: Math.min(2, Math.max(0.4, partial.speed ?? this.config.speed)),
      maxQueueSize: Math.max(
        1,
        Math.min(20, partial.maxQueueSize ?? this.config.maxQueueSize)
      )
    };
  }
  trigger(action) {
    if (!ANIMATION_BY_ID[action]) {
      return { accepted: false, startedImmediately: false };
    }
    if (action === "idle") {
      this.queue = [];
      this.startAction("idle");
      return { accepted: true, startedImmediately: true };
    }
    const currentDef = ANIMATION_BY_ID[this.currentAction];
    const isCurrentPersistent = currentDef.duration === null;
    if (this.config.queueMode === "interrupt" || isCurrentPersistent) {
      if (this.config.queueMode === "interrupt") {
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
  triggerFromComment(rawComment, customKeywords) {
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
      matchedKeyword: parsed.matchedKeyword
    };
  }
  clearQueue() {
    this.queue = [];
  }
  recenter() {
    this.rootX = 0;
    this.facingDir = 1;
  }
  startAction(action) {
    this.currentAction = action;
    this.elapsed = 0;
    if (action === "walk_left") {
      this.facingDir = -1;
    } else if (action === "walk_right") {
      this.facingDir = 1;
    }
  }
  /**
   * Advances simulation by `dtSeconds`. Returns true if the active action changed.
   */
  step(dtSeconds) {
    const frameTime = Math.max(0, dtSeconds);
    const clampedDt = Math.min(0.05, frameTime);
    const dt = frameTime * this.config.speed;
    let actionChanged = false;
    this.globalTime += frameTime;
    this.elapsed += dt;
    this.blinkTimer -= clampedDt;
    if (this.blinkTimer <= 0) {
      this.blinkProgress += clampedDt * 22;
      if (this.blinkProgress >= Math.PI) {
        this.blinkProgress = 0;
        this.blinkTimer = 2.6 + (Math.sin(this.globalTime * 13.7) + 1) * 1.4;
      }
    }
    const blinkAmount = this.blinkProgress > 0 ? Math.pow(Math.sin(this.blinkProgress), 0.75) : 0;
    this.twitchTimer -= clampedDt;
    if (this.twitchTimer <= 0) {
      this.twitchProgress += clampedDt * 11;
      if (this.twitchProgress >= Math.PI) {
        this.twitchProgress = 0;
        this.twitchTimer = 3.8 + (Math.cos(this.globalTime * 7.3) + 1) * 1.9;
      }
    }
    const earTwitch = this.twitchProgress > 0 ? Math.sin(this.twitchProgress) : 0;
    if (this.currentAction === "walk_left") {
      this.rootX = Math.max(-WALK_BOUNDS, this.rootX - WALK_SPEED_PER_SEC * dt);
    } else if (this.currentAction === "walk_right") {
      this.rootX = Math.min(WALK_BOUNDS, this.rootX + WALK_SPEED_PER_SEC * dt);
    }
    const activeDef = ANIMATION_BY_ID[this.currentAction];
    if (activeDef.duration !== null && this.elapsed >= activeDef.duration) {
      const next = this.queue.shift() ?? "idle";
      this.startAction(next);
      actionChanged = true;
    }
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
      earTwitch
    });
    const audioLevel = this.externalAudioLevel;
    const hasAudibleSpeech = audioLevel !== null && audioLevel > 0.07;
    if ((this.talkingOverlay || hasAudibleSpeech) && this.currentAction !== "sleep" && this.currentAction !== "eat") {
      let openness = 0;
      let phoneme = "closed";
      if (audioLevel !== null) {
        openness = hasAudibleSpeech ? Math.min(1, audioLevel * 1.35) : 0;
        const mod = Math.sin(this.globalTime * 11);
        phoneme = openness < 0.14 ? "closed" : openness < 0.22 ? "small" : mod > 0.45 ? "round_o" : openness > 0.65 ? "open_a" : "wide_e";
      } else {
        const s1 = Math.sin(this.globalTime * 13.5);
        const s2 = Math.sin(this.globalTime * 21.3 + 0.9);
        const cadence = Math.sin(this.globalTime * 2.8) > -0.82 ? 1 : 0.14;
        openness = Math.max(
          0,
          Math.min(1, (0.56 + s1 * 0.34 + s2 * 0.22) * cadence)
        );
        phoneme = openness < 0.15 ? "closed" : openness < 0.36 ? "small" : s2 > 0.35 ? "round_o" : s1 > 0.12 ? "open_a" : "wide_e";
      }
      target.mouthStyle = "talk";
      target.mouthOpen = openness;
      target.talkPhoneme = phoneme;
      target.isSpeaking = openness > 0.15;
      if (this.currentAction === "idle" || this.currentAction === "sit") {
        target.headY += Math.sin(this.globalTime * 6.4) * 3.5 * openness;
        target.headRot += Math.sin(this.globalTime * 3.2) * 0.06;
      }
    }
    const blend = 1 - Math.exp(-14 * clampedDt);
    const fastBlend = 1 - Math.exp(-22 * clampedDt);
    const tailBlend = 1 - Math.exp(-9 * clampedDt);
    const p = this.pose;
    p.rootX = lerp(p.rootX, target.rootX, fastBlend);
    p.rootY = lerp(p.rootY, target.rootY, fastBlend);
    p.facing = this.currentAction === "spin" || this.currentAction === "zoomies" ? target.facing : lerp(p.facing, target.facing, blend);
    p.bodyRot = this.currentAction === "backflip" ? target.bodyRot : lerp(p.bodyRot, target.bodyRot, fastBlend);
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
    p.eyeStyle = target.eyeStyle;
    p.mouthStyle = target.mouthStyle;
    p.mouthOpen = lerp(p.mouthOpen, target.mouthOpen, fastBlend);
    p.talkPhoneme = target.talkPhoneme;
    p.isSpeaking = target.isSpeaking;
    p.blink = target.blink;
    p.prop = target.prop;
    p.fx = target.fx;
    p.fxTime = target.fxTime;
    return actionChanged;
  }
};

// frontend/pawsrig/photoRig.ts
var REF_W = 536;
var REF_H = 960;
var PHOTO_URL = new URL("./kitty.png", import.meta.url).href;
var cachedAssets = null;
var loadingStarted = false;
function makeCanvas(w = REF_W, h = REF_H) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function traceSmoothClosed(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  const last = pts[n - 1];
  const first = pts[0];
  ctx.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);
  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const mx = (curr[0] + next[0]) * 0.5;
    const my = (curr[1] + next[1]) * 0.5;
    ctx.quadraticCurveTo(curr[0], curr[1], mx, my);
  }
  ctx.closePath();
}
var HEAD_OUTLINE = [
  [114, 198],
  [144, 202],
  [174, 218],
  [198, 232],
  [234, 221],
  [274, 216],
  [314, 221],
  [346, 232],
  [376, 214],
  [408, 198],
  [424, 198],
  [436, 230],
  [438, 274],
  [432, 304],
  [444, 338],
  [456, 368],
  [470, 404],
  [474, 442],
  [466, 474],
  [446, 494],
  [418, 498],
  [426, 510],
  [410, 524],
  [402, 536],
  [386, 546],
  [358, 558],
  [312, 566],
  [262, 566],
  [212, 558],
  [170, 544],
  [128, 535],
  [110, 524],
  [124, 510],
  [112, 504],
  [94, 506],
  [74, 478],
  [68, 438],
  [74, 392],
  [88, 354],
  [98, 326],
  [96, 268],
  [104, 224]
];
var TAIL_OUTLINE = [
  [102, 796],
  [66, 784],
  [38, 756],
  [26, 718],
  [24, 672],
  [26, 636],
  [10, 608],
  [-4, 588],
  [-4, 538],
  [24, 524],
  [58, 534],
  [86, 558],
  [104, 588],
  [112, 624],
  [106, 668],
  [92, 718],
  [102, 766],
  [110, 794]
];
var BODY_OUTLINE = [
  [132, 536],
  [124, 564],
  [114, 598],
  [122, 622],
  [106, 654],
  [84, 714],
  [78, 756],
  [92, 788],
  [126, 810],
  [172, 820],
  [212, 814],
  [236, 820],
  [266, 816],
  [288, 804],
  [318, 804],
  [350, 798],
  [376, 792],
  [422, 786],
  [460, 774],
  [474, 748],
  [472, 704],
  [452, 662],
  [424, 620],
  [400, 578],
  [390, 550],
  [378, 534],
  [276, 526]
];
function traceDeskMonitorRegion(ctx) {
  ctx.beginPath();
  ctx.moveTo(-4, 782);
  ctx.lineTo(74, 794);
  ctx.lineTo(126, 812);
  ctx.lineTo(176, 822);
  ctx.lineTo(212, 815);
  ctx.lineTo(234, 822);
  ctx.lineTo(266, 818);
  ctx.lineTo(288, 806);
  ctx.lineTo(356, 796);
  ctx.lineTo(466, 772);
  ctx.lineTo(476, 756);
  ctx.lineTo(484, 608);
  ctx.lineTo(540, 598);
  ctx.lineTo(540, 964);
  ctx.lineTo(-4, 964);
  ctx.closePath();
}
function traceMicBoomRegion(ctx) {
  ctx.beginPath();
  ctx.moveTo(540, 502);
  ctx.lineTo(436, 602);
  ctx.lineTo(418, 588);
  ctx.quadraticCurveTo(372, 560, 326, 594);
  ctx.quadraticCurveTo(304, 636, 326, 678);
  ctx.quadraticCurveTo(348, 704, 372, 718);
  ctx.quadraticCurveTo(408, 754, 456, 728);
  ctx.quadraticCurveTo(468, 712, 462, 690);
  ctx.lineTo(454, 668);
  ctx.lineTo(468, 630);
  ctx.lineTo(484, 616);
  ctx.lineTo(540, 562);
  ctx.closePath();
}
function paintCleanMicAreaOnBody(ctx) {
  ctx.save();
  traceSmoothClosed(ctx, BODY_OUTLINE);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(374, 622, 68, 0, Math.PI * 2);
  ctx.ellipse(418, 686, 58, 66, -0.18, 0, Math.PI * 2);
  ctx.closePath();
  const hGrad = ctx.createLinearGradient(312, 558, 460, 764);
  hGrad.addColorStop(0, "#D8BCF6");
  hGrad.addColorStop(0.28, "#F6C2E5");
  hGrad.addColorStop(0.68, "#E3C8FA");
  hGrad.addColorStop(1, "#BCE2FF");
  ctx.fillStyle = hGrad;
  ctx.fill();
  const blendLeft = ctx.createLinearGradient(304, 630, 344, 630);
  blendLeft.addColorStop(0, "rgba(246, 194, 229, 0)");
  blendLeft.addColorStop(1, "rgba(246, 194, 229, 0.35)");
  ctx.fillStyle = blendLeft;
  ctx.fillRect(304, 560, 40, 140);
  ctx.strokeStyle = "rgba(72, 46, 82, 0.42)";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(324, 652);
  ctx.quadraticCurveTo(368, 664, 406, 696);
  ctx.stroke();
  ctx.strokeStyle = "#3A2639";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(394, 574);
  ctx.bezierCurveTo(426, 620, 452, 666, 470, 712);
  ctx.stroke();
  ctx.restore();
}
function paintCleanArmRemoval(ctx, side) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  if (side === 1) {
    ctx.moveTo(278, 728);
    ctx.lineTo(352, 720);
    ctx.lineTo(396, 646);
    ctx.lineTo(486, 646);
    ctx.lineTo(486, 840);
    ctx.lineTo(278, 840);
  } else {
    ctx.moveTo(278, 728);
    ctx.lineTo(196, 720);
    ctx.lineTo(150, 646);
    ctx.lineTo(64, 646);
    ctx.lineTo(64, 840);
    ctx.lineTo(278, 840);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  if (side === 1) {
    ctx.moveTo(274, 644);
    ctx.lineTo(396, 642);
    ctx.bezierCurveTo(426, 688, 434, 756, 424, 818);
    ctx.quadraticCurveTo(356, 840, 274, 836);
  } else {
    ctx.moveTo(282, 644);
    ctx.lineTo(148, 642);
    ctx.bezierCurveTo(114, 688, 104, 756, 118, 818);
    ctx.quadraticCurveTo(194, 840, 282, 836);
  }
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 644, 0, 836);
  fillGrad.addColorStop(0, "rgba(246, 195, 228, 0)");
  fillGrad.addColorStop(0.14, "#F5C2E4");
  fillGrad.addColorStop(0.55, "#DFC4FA");
  fillGrad.addColorStop(1, "#BDE0FF");
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(72, 46, 82, 0.34)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (side === 1) {
    ctx.moveTo(318, 764);
    ctx.quadraticCurveTo(366, 754, 404, 768);
  } else {
    ctx.moveTo(246, 766);
    ctx.quadraticCurveTo(192, 754, 144, 770);
  }
  ctx.stroke();
  ctx.strokeStyle = "#3B2538";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (side === 1) {
    ctx.moveTo(404, 668);
    ctx.bezierCurveTo(428, 712, 434, 768, 424, 818);
    ctx.quadraticCurveTo(356, 840, 276, 836);
  } else {
    ctx.moveTo(142, 668);
    ctx.bezierCurveTo(114, 712, 104, 768, 118, 818);
    ctx.quadraticCurveTo(194, 840, 280, 836);
  }
  ctx.stroke();
  ctx.restore();
}
function buildBackgroundCanvas(img) {
  const bg = makeCanvas();
  const ctx = bg.getContext("2d");
  ctx.drawImage(img, 0, 0, REF_W, REF_H);
  ctx.save();
  ctx.save();
  traceSmoothClosed(ctx, TAIL_OUTLINE);
  ctx.clip();
  const tailBgGrad = ctx.createLinearGradient(0, 520, 0, 810);
  tailBgGrad.addColorStop(0, "#8E79C2");
  tailBgGrad.addColorStop(0.45, "#7262AB");
  tailBgGrad.addColorStop(1, "#4C437A");
  ctx.fillStyle = tailBgGrad;
  ctx.fillRect(-4, 515, 134, 305);
  ctx.restore();
  ctx.save();
  traceSmoothClosed(ctx, HEAD_OUTLINE);
  ctx.clip();
  ctx.drawImage(img, 140, 148, 110, 48, 66, 190, 184, 386);
  ctx.drawImage(img, 252, 168, 142, 34, 250, 190, 228, 386);
  const wallFade = ctx.createLinearGradient(0, 190, 0, 565);
  wallFade.addColorStop(0, "rgba(98, 92, 174, 0.14)");
  wallFade.addColorStop(0.55, "rgba(116, 102, 182, 0.28)");
  wallFade.addColorStop(1, "rgba(92, 82, 152, 0.42)");
  ctx.fillStyle = wallFade;
  ctx.fillRect(66, 190, 412, 386);
  ctx.strokeStyle = "rgba(42, 32, 76, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, 190);
  ctx.lineTo(250, 565);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(156, 296);
  ctx.quadraticCurveTo(274, 274, 388, 298);
  ctx.bezierCurveTo(408, 384, 416, 474, 412, 558);
  ctx.bezierCurveTo(426, 636, 466, 704, 474, 832);
  ctx.lineTo(74, 832);
  ctx.bezierCurveTo(80, 712, 92, 618, 98, 538);
  ctx.bezierCurveTo(100, 464, 114, 388, 156, 296);
  ctx.closePath();
  const chairGrad = ctx.createLinearGradient(0, 282, 0, 832);
  chairGrad.addColorStop(0, "#494466");
  chairGrad.addColorStop(0.45, "#383452");
  chairGrad.addColorStop(1, "#26233A");
  ctx.fillStyle = chairGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(168, 330);
  ctx.bezierCurveTo(122, 444, 116, 578, 124, 810);
  ctx.moveTo(374, 330);
  ctx.bezierCurveTo(402, 444, 404, 578, 396, 810);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  return bg;
}
function buildMaskedLayer(img, traceFn) {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  ctx.save();
  traceFn(ctx);
  ctx.clip();
  ctx.drawImage(img, 0, 0, REF_W, REF_H);
  ctx.restore();
  return c;
}
function buildAssetsFromImage(img) {
  const bgCanvas = buildBackgroundCanvas(img);
  const tailCanvas = buildMaskedLayer(
    img,
    (ctx) => traceSmoothClosed(ctx, TAIL_OUTLINE)
  );
  const headCanvas = buildMaskedLayer(
    img,
    (ctx) => traceSmoothClosed(ctx, HEAD_OUTLINE)
  );
  const bodyFullCanvas = buildMaskedLayer(
    img,
    (ctx) => traceSmoothClosed(ctx, BODY_OUTLINE)
  );
  paintCleanMicAreaOnBody(bodyFullCanvas.getContext("2d"));
  const bodyNoRightArmCanvas = makeCanvas();
  bodyNoRightArmCanvas.getContext("2d").drawImage(bodyFullCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoRightArmCanvas.getContext("2d"), 1);
  const bodyNoLeftArmCanvas = makeCanvas();
  bodyNoLeftArmCanvas.getContext("2d").drawImage(bodyFullCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoLeftArmCanvas.getContext("2d"), -1);
  const bodyNoArmsCanvas = makeCanvas();
  bodyNoArmsCanvas.getContext("2d").drawImage(bodyNoRightArmCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoArmsCanvas.getContext("2d"), -1);
  const fgCanvas = makeCanvas();
  const fgCtx = fgCanvas.getContext("2d");
  fgCtx.save();
  traceDeskMonitorRegion(fgCtx);
  fgCtx.clip();
  fgCtx.drawImage(img, 0, 0, REF_W, REF_H);
  fgCtx.restore();
  fgCtx.save();
  traceMicBoomRegion(fgCtx);
  fgCtx.clip();
  fgCtx.drawImage(img, 0, 0, REF_W, REF_H);
  fgCtx.restore();
  const buildEyePatchCanvas = (side) => {
    const c = makeCanvas(104, 92);
    const ectx = c.getContext("2d");
    ectx.translate(52, 46);
    const baseGrad = ectx.createRadialGradient(side * 3, 2, 27, side * 3, 2, 47);
    baseGrad.addColorStop(0, "#FBF1E8");
    baseGrad.addColorStop(0.76, "#FAF0E6");
    baseGrad.addColorStop(1, "rgba(250, 240, 230, 0)");
    ectx.fillStyle = baseGrad;
    ectx.beginPath();
    ectx.ellipse(side * 3, 2, 47, 40, 0, 0, Math.PI * 2);
    ectx.fill();
    const apricotGrad = ectx.createRadialGradient(side * 24, -24, 4, side * 22, -22, 36);
    apricotGrad.addColorStop(0, "#F6BE84");
    apricotGrad.addColorStop(0.6, "rgba(246, 190, 132, 0.75)");
    apricotGrad.addColorStop(1, "rgba(246, 190, 132, 0)");
    ectx.fillStyle = apricotGrad;
    ectx.beginPath();
    ectx.ellipse(side * 14, -18, 34, 24, 0, 0, Math.PI * 2);
    ectx.fill();
    return c;
  };
  const leftEyePatchCanvas = buildEyePatchCanvas(-1);
  const rightEyePatchCanvas = buildEyePatchCanvas(1);
  return {
    loaded: true,
    failed: false,
    bgCanvas,
    tailCanvas,
    bodyFullCanvas,
    bodyNoRightArmCanvas,
    bodyNoLeftArmCanvas,
    bodyNoArmsCanvas,
    headCanvas,
    fgCanvas,
    leftEyePatchCanvas,
    rightEyePatchCanvas
  };
}
function ensurePhotoRigLoaded() {
  if (cachedAssets?.loaded) return cachedAssets;
  if (typeof window === "undefined" || typeof Image === "undefined") return null;
  if (!loadingStarted) {
    loadingStarted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        cachedAssets = buildAssetsFromImage(img);
      } catch {
        cachedAssets = {
          loaded: false,
          failed: true,
          bgCanvas: makeCanvas(1, 1),
          tailCanvas: makeCanvas(1, 1),
          bodyFullCanvas: makeCanvas(1, 1),
          bodyNoRightArmCanvas: makeCanvas(1, 1),
          bodyNoLeftArmCanvas: makeCanvas(1, 1),
          bodyNoArmsCanvas: makeCanvas(1, 1),
          headCanvas: makeCanvas(1, 1),
          fgCanvas: makeCanvas(1, 1),
          leftEyePatchCanvas: makeCanvas(1, 1),
          rightEyePatchCanvas: makeCanvas(1, 1)
        };
      }
    };
    img.onerror = () => {
      cachedAssets = {
        loaded: false,
        failed: true,
        bgCanvas: makeCanvas(1, 1),
        tailCanvas: makeCanvas(1, 1),
        bodyFullCanvas: makeCanvas(1, 1),
        bodyNoRightArmCanvas: makeCanvas(1, 1),
        bodyNoLeftArmCanvas: makeCanvas(1, 1),
        bodyNoArmsCanvas: makeCanvas(1, 1),
        headCanvas: makeCanvas(1, 1),
        fgCanvas: makeCanvas(1, 1),
        leftEyePatchCanvas: makeCanvas(1, 1),
        rightEyePatchCanvas: makeCanvas(1, 1)
      };
    };
    img.src = PHOTO_URL;
  }
  return cachedAssets?.loaded ? cachedAssets : null;
}
function getCoatFilter(coat) {
  switch (coat) {
    case "ginger":
      return "none";
    case "matcha":
      return "hue-rotate(64deg) saturate(0.75) brightness(1.04)";
    case "sakura":
      return "hue-rotate(-36deg) saturate(1.18) brightness(1.04)";
    case "russian":
      return "saturate(0.18) brightness(0.98)";
    case "midnight":
      return "saturate(0.25) brightness(0.72) contrast(1.14)";
    case "snowball":
      return "saturate(0.12) brightness(1.14)";
    case "tuxedo":
      return "saturate(0.22) brightness(0.84) contrast(1.12)";
    case "siamese":
      return "hue-rotate(-8deg) saturate(0.65) contrast(1.08)";
    case "calico":
      return "saturate(1.22) contrast(1.05)";
    default:
      return "none";
  }
}
function drawAnimeHeart(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.45);
  ctx.bezierCurveTo(
    x - size,
    y - size * 0.25,
    x - size * 0.85,
    y - size * 1.05,
    x,
    y - size * 0.45
  );
  ctx.bezierCurveTo(
    x + size * 0.85,
    y - size * 1.05,
    x + size,
    y - size * 0.25,
    x,
    y + size * 0.45
  );
  ctx.closePath();
}
function lerpNum(a, b, t) {
  return a + (b - a) * t;
}
function drawOversizedBentHoodieArm(ctx, side, angle, lift, actionLabel, fxTime = 0) {
  const rawRaise = Math.min(1, Math.max(0, (lift - 0.14) / 0.86));
  const raise = rawRaise * rawRaise * (3 - 2 * rawRaise);
  const sx = side === 1 ? 378 : 162;
  const sy = side === 1 ? 654 : 656;
  const restEx = side === 1 ? 434 : 114;
  const restEy = side === 1 ? 748 : 750;
  const restWx = side === 1 ? 336 : 216;
  const restWy = side === 1 ? 772 : 774;
  const swing = angle * 24;
  let targetEx = side === 1 ? 452 : 96;
  let targetEy = 706;
  let targetWx = side === 1 ? 446 + swing : 102 + swing;
  let targetWy = 562 + Math.abs(swing) * 0.1;
  let pawExtraRot = side * -0.06 + angle * 0.12;
  if (actionLabel === "Wave") {
    const waveDx = Math.sin(fxTime * 11) * 24 + angle * 10;
    targetEx = side === 1 ? 454 : 94;
    targetEy = 702;
    targetWx = side === 1 ? 448 + waveDx : 100 + waveDx;
    targetWy = 556 + Math.abs(waveDx) * 0.12;
    pawExtraRot = waveDx * 0.01;
  } else if (actionLabel === "Explain") {
    const gX = Math.sin(fxTime * 5.2 + (side === 1 ? 0 : Math.PI)) * 18 + angle * 12;
    const gY = Math.cos(fxTime * 4.4 + (side === 1 ? 0 : Math.PI)) * 14;
    targetEx = side === 1 ? 448 : 100;
    targetEy = 716;
    targetWx = side === 1 ? 434 + gX : 114 + gX;
    targetWy = 594 + gY;
    pawExtraRot = side * 0.1 + gX * 8e-3;
  } else if (actionLabel === "Heart Hands") {
    const pulse = Math.sin(fxTime * 7) * 5;
    targetEx = side === 1 ? 430 : 118;
    targetEy = 736;
    targetWx = side === 1 ? 324 + pulse : 224 - pulse;
    targetWy = 636;
    pawExtraRot = side * -0.22;
  } else if (actionLabel === "Clap") {
    const clapIn = Math.max(0, Math.sin(fxTime * 15));
    targetEx = side === 1 ? 426 : 122;
    targetEy = 738;
    targetWx = side === 1 ? 344 - clapIn * 36 : 204 + clapIn * 36;
    targetWy = 640;
    pawExtraRot = side * (-0.16 - clapIn * 0.16);
  } else if (actionLabel === "Shy" || actionLabel === "Laugh") {
    const wig = Math.sin(fxTime * 8.5 + side) * 6;
    targetEx = side === 1 ? 424 : 124;
    targetEy = 734;
    targetWx = side === 1 ? 348 + wig : 200 - wig;
    targetWy = 612 + Math.abs(wig) * 0.4;
    pawExtraRot = side * -0.18;
  } else if (actionLabel === "Sad") {
    const dab = Math.sin(fxTime * 6.5) * 14;
    targetEx = side === 1 ? 422 : 126;
    targetEy = 732;
    targetWx = side === 1 ? 346 : 202;
    targetWy = 602 + dab;
    pawExtraRot = side * -0.14;
  } else if (actionLabel === "Groom") {
    const lick = Math.sin(fxTime * 7.5) * 10;
    targetEx = side === 1 ? 424 : 124;
    targetEy = 732;
    targetWx = side === 1 ? 334 : 214;
    targetWy = 602 + lick;
    pawExtraRot = side * -0.18;
  } else if (actionLabel === "Eat Fish") {
    const chew = Math.sin(fxTime * 11) * 5;
    targetEx = side === 1 ? 426 : 122;
    targetEy = 736;
    targetWx = side === 1 ? 332 : 216;
    targetWy = 636 + chew;
    pawExtraRot = side * -0.18;
  }
  const ex = lerpNum(restEx, targetEx, raise);
  const ey = lerpNum(restEy, targetEy, raise);
  const wx = lerpNum(restWx, targetWx, raise);
  const wy = lerpNum(restWy, targetWy, raise);
  const ink = "#3A2538";
  const forearmAngle = Math.atan2(wy - ey, wx - ex);
  ctx.save();
  const traceSleeveCurve = () => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(ex, ey, wx, wy);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  ctx.lineWidth = 78;
  traceSleeveCurve();
  ctx.stroke();
  const sleeveGrad = ctx.createLinearGradient(sx, sy - 24, wx, wy + 24);
  sleeveGrad.addColorStop(0, "#F5C2E4");
  sleeveGrad.addColorStop(0.5, "#E4C7FA");
  sleeveGrad.addColorStop(1, "#BEE2FF");
  ctx.strokeStyle = sleeveGrad;
  ctx.lineWidth = 71;
  traceSleeveCurve();
  ctx.stroke();
  ctx.strokeStyle = "rgba(146, 118, 202, 0.2)";
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(sx + side * 6, sy + 16);
  ctx.quadraticCurveTo(ex + side * 10, ey + 14, wx + side * 4, wy + 12);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 244, 252, 0.34)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(sx - side * 8, sy - 10);
  ctx.quadraticCurveTo(ex - side * 8, ey - 10, wx - side * 6, wy - 8);
  ctx.stroke();
  const blendGrad = ctx.createRadialGradient(sx, sy, 14, sx, sy, 46);
  blendGrad.addColorStop(0, "#F5C2E4");
  blendGrad.addColorStop(0.7, "#F2C3E6");
  blendGrad.addColorStop(1, "rgba(242, 195, 230, 0)");
  ctx.fillStyle = blendGrad;
  ctx.beginPath();
  ctx.arc(sx - side * 6, sy - 2, 46, 0, Math.PI * 2);
  ctx.fill();
  const midX = 0.25 * sx + 0.5 * ex + 0.25 * wx;
  const midY = 0.25 * sy + 0.5 * ey + 0.25 * wy;
  ctx.strokeStyle = "rgba(64, 40, 74, 0.5)";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(midX - side * 14, midY - 12);
  ctx.quadraticCurveTo(midX - side * 2, midY - 2, midX + side * 12, midY + 4);
  ctx.stroke();
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(forearmAngle - Math.PI * 0.5);
  const cuffW = 74;
  const cuffH = 30;
  ctx.beginPath();
  ctx.roundRect(-cuffW * 0.5, -14, cuffW, cuffH, 10);
  const cuffGrad = ctx.createLinearGradient(0, -14, 0, 16);
  cuffGrad.addColorStop(0, "#DFC4FA");
  cuffGrad.addColorStop(1, "#C2D9FD");
  ctx.fillStyle = cuffGrad;
  ctx.fill();
  ctx.lineWidth = 3.1;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.beginPath();
  for (const rx of [-22, -11, 0, 11, 22]) {
    ctx.moveTo(rx, -11);
    ctx.lineTo(rx, 13);
  }
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = "rgba(58, 37, 56, 0.48)";
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(pawExtraRot * raise);
  ctx.beginPath();
  ctx.ellipse(0, 22, 38, 31, 0, 0, Math.PI * 2);
  const pawGrad = ctx.createRadialGradient(-8, 16, 5, 0, 24, 40);
  pawGrad.addColorStop(0, "#FFFDF9");
  pawGrad.addColorStop(0.74, "#FFF1E4");
  pawGrad.addColorStop(1, "#F4DBC4");
  ctx.fillStyle = pawGrad;
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.strokeStyle = "rgba(58, 37, 56, 0.55)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-12, 44);
  ctx.lineTo(-10, 51);
  ctx.moveTo(12, 44);
  ctx.lineTo(10, 51);
  ctx.stroke();
  if (raise > 0.22) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (raise - 0.22) / 0.35);
    ctx.fillStyle = "#F79EB6";
    ctx.beginPath();
    ctx.ellipse(0, 18, 14.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [bx, by] of [
      [-15, 34],
      [0, 38],
      [15, 34]
    ]) {
      ctx.beginPath();
      ctx.arc(bx, by, 6.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}
function drawPhotoMatchedEyes(ctx, pose, assets) {
  const ink = "#3A2334";
  const eyes = [
    { x: 222, y: 448, side: -1, patch: assets.leftEyePatchCanvas },
    { x: 364, y: 444, side: 1, patch: assets.rightEyePatchCanvas }
  ];
  if (pose.blush > 0.36) {
    const extra = Math.min(0.55, (pose.blush - 0.34) * 0.9);
    ctx.save();
    ctx.fillStyle = `rgba(255, 134, 174, ${extra})`;
    ctx.beginPath();
    ctx.ellipse(180, 496, 28, 14, -0.06, 0, Math.PI * 2);
    ctx.ellipse(398, 492, 28, 14, 0.06, 0, Math.PI * 2);
    ctx.fill();
    if (pose.blush > 0.65) {
      ctx.strokeStyle = `rgba(235, 88, 138, ${extra + 0.15})`;
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      for (const cx of [180, 398]) {
        for (const dx of [-10, 0, 10]) {
          ctx.beginPath();
          ctx.moveTo(cx + dx - 3, 502);
          ctx.lineTo(cx + dx + 3, 490);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  for (const eye of eyes) {
    const effectiveStyle = pose.eyeStyle === "wink" && eye.side === 1 ? "happy" : pose.eyeStyle;
    const isBlinking = effectiveStyle === "normal" && pose.blink > 0.05;
    if (effectiveStyle === "normal" && !isBlinking) {
      continue;
    }
    if (effectiveStyle === "sparkle") {
      ctx.save();
      ctx.translate(eye.x + 14, eye.y - 16);
      const pulse = 0.85 + Math.sin(pose.fxTime * 10) * 0.2;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(2.8, -2.8);
      ctx.lineTo(11, 0);
      ctx.lineTo(2.8, 2.8);
      ctx.lineTo(0, 11);
      ctx.lineTo(-2.8, 2.8);
      ctx.lineTo(-11, 0);
      ctx.lineTo(-2.8, -2.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      continue;
    }
    const maskEyePatch = () => {
      ctx.drawImage(eye.patch, eye.x - 52, eye.y - 46);
    };
    if (isBlinking) {
      const lidH = Math.min(1, pose.blink);
      const lidY = eye.y - 38 + lidH * 52;
      const archCtrlY = lidY + (1 - lidH) * -14 + lidH * 10;
      ctx.save();
      ctx.beginPath();
      if (lidH > 0.92) {
        ctx.rect(eye.x - 52, eye.y - 46, 104, 92);
      } else {
        ctx.moveTo(eye.x - 52, eye.y - 46);
        ctx.lineTo(eye.x + 52, eye.y - 46);
        ctx.lineTo(eye.x + 52, lidY + 2);
        ctx.quadraticCurveTo(eye.x, archCtrlY + 2, eye.x - 52, lidY + 2);
        ctx.closePath();
      }
      ctx.clip();
      maskEyePatch();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(eye.x - 36, lidY);
      ctx.quadraticCurveTo(eye.x, archCtrlY, eye.x + 36, lidY);
      ctx.stroke();
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(eye.x + eye.side * 33, lidY - 1);
      ctx.lineTo(eye.x + eye.side * 42, lidY - 6);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (effectiveStyle === "happy") {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y + 8);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 6, 30, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eye.side * 27, -6);
      ctx.lineTo(eye.side * 40, -14);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (effectiveStyle === "sleep") {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y + 4);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, -6, 26, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (effectiveStyle === "wide") {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y);
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 40, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#4B2F52";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#1D1026";
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-4.5, -4.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (effectiveStyle === "angry") {
      ctx.save();
      ctx.translate(eye.x, eye.y);
      ctx.fillStyle = "#F7BE84";
      ctx.beginPath();
      ctx.moveTo(-eye.side * 44, -42);
      ctx.lineTo(eye.side * 42, -48);
      ctx.lineTo(eye.side * 42, -24);
      ctx.lineTo(-eye.side * 44, -10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-eye.side * 38, -14);
      ctx.lineTo(eye.side * 34, -32);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (effectiveStyle === "sad") {
      ctx.save();
      ctx.translate(eye.x, eye.y);
      const poolGrad = ctx.createLinearGradient(0, 14, 0, 38);
      poolGrad.addColorStop(0, "rgba(170, 234, 255, 0.35)");
      poolGrad.addColorStop(0.6, "rgba(140, 224, 255, 0.85)");
      poolGrad.addColorStop(1, "rgba(195, 245, 255, 0.92)");
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(0, 25, 31, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      const streamPulse = Math.sin(pose.fxTime * 8 + eye.side) * 2.5;
      const streamGrad = ctx.createLinearGradient(0, 26, 0, 96);
      streamGrad.addColorStop(0, "rgba(155, 232, 255, 0.82)");
      streamGrad.addColorStop(0.65, "rgba(145, 226, 255, 0.55)");
      streamGrad.addColorStop(1, "rgba(145, 226, 255, 0)");
      ctx.fillStyle = streamGrad;
      ctx.beginPath();
      ctx.moveTo(eye.side * 8 - 7, 28);
      ctx.quadraticCurveTo(eye.side * 10 - 9 + streamPulse, 62, eye.side * 12 - 5, 96);
      ctx.lineTo(eye.side * 12 + 7, 96);
      ctx.quadraticCurveTo(eye.side * 10 + 9 + streamPulse, 62, eye.side * 8 + 7, 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-11, 24, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(13, 26, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eye.side * 10, 48 + pose.fxTime * 54 % 34, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-eye.side * 30, -54);
      ctx.quadraticCurveTo(0, -48, eye.side * 28, -36);
      ctx.stroke();
      ctx.restore();
    }
  }
}
function drawPhotoMatchedMouth(ctx, pose) {
  if (pose.mouthStyle === "smile") return;
  const mx = 301;
  const my = 507;
  const ink = "#3A2334";
  ctx.save();
  ctx.translate(mx, my);
  const patchGrad = ctx.createRadialGradient(0, 10, 32, 0, 10, 50);
  patchGrad.addColorStop(0, "#FCF2E9");
  patchGrad.addColorStop(0.76, "#FCF1E8");
  patchGrad.addColorStop(1, "rgba(252, 241, 232, 0)");
  ctx.fillStyle = patchGrad;
  ctx.beginPath();
  ctx.ellipse(0, 10, 50, 31, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const drawFangedMouth = (openDepth, halfWidth = 24) => {
    ctx.beginPath();
    ctx.moveTo(-halfWidth, 3);
    ctx.quadraticCurveTo(-halfWidth * 0.42, 11, 0, 1);
    ctx.quadraticCurveTo(halfWidth * 0.42, 11, halfWidth, 3);
    ctx.bezierCurveTo(
      halfWidth * 0.9,
      openDepth,
      -halfWidth * 0.9,
      openDepth,
      -halfWidth,
      3
    );
    ctx.closePath();
    const mGrad = ctx.createLinearGradient(0, 2, 0, openDepth);
    mGrad.addColorStop(0, "#6E263D");
    mGrad.addColorStop(1, "#A43B57");
    ctx.fillStyle = mGrad;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#F68AA6";
    ctx.beginPath();
    ctx.ellipse(0, openDepth * 0.78, halfWidth * 0.7, openDepth * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 210, 224, 0.55)";
    ctx.beginPath();
    ctx.ellipse(0, openDepth * 0.66, halfWidth * 0.36, openDepth * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(-halfWidth * 0.74, 4);
    ctx.lineTo(-halfWidth * 0.5, 14);
    ctx.lineTo(-halfWidth * 0.28, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(halfWidth * 0.74, 4);
    ctx.lineTo(halfWidth * 0.5, 14);
    ctx.lineTo(halfWidth * 0.28, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 1);
    ctx.moveTo(-halfWidth - 4, 0);
    ctx.quadraticCurveTo(-halfWidth * 0.45, 12, 0, 1);
    ctx.quadraticCurveTo(halfWidth * 0.45, 12, halfWidth + 4, 0);
    ctx.stroke();
  };
  switch (pose.mouthStyle) {
    case "open": {
      drawFangedMouth(38, 25);
      break;
    }
    case "talk": {
      const open = pose.mouthOpen;
      if (pose.talkPhoneme === "closed" || open < 0.14) {
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 1);
        ctx.moveTo(-26, 2);
        ctx.quadraticCurveTo(-11, 13, 0, 1);
        ctx.quadraticCurveTo(11, 13, 26, 2);
        ctx.stroke();
      } else if (pose.talkPhoneme === "round_o") {
        const rx = 11 + open * 7;
        const ry = 13 + open * 13;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, -1);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 13 + open * 3, rx, ry, 0, 0, Math.PI * 2);
        const oGrad = ctx.createLinearGradient(0, 2, 0, 28 + open * 8);
        oGrad.addColorStop(0, "#6E263D");
        oGrad.addColorStop(1, "#A43B57");
        ctx.fillStyle = oGrad;
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = "#F68AA6";
        ctx.beginPath();
        ctx.ellipse(0, 21 + open * 5, rx * 0.74, ry * 0.46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.stroke();
      } else if (pose.talkPhoneme === "wide_e") {
        const h = 15 + open * 16;
        ctx.beginPath();
        ctx.moveTo(-28, 3);
        ctx.quadraticCurveTo(0, 8, 28, 3);
        ctx.bezierCurveTo(26, h, -26, h, -28, 3);
        ctx.closePath();
        ctx.fillStyle = "#8F324D";
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = "#F68AA6";
        ctx.beginPath();
        ctx.ellipse(0, h * 0.85, 19, h * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.moveTo(-20, 4);
        ctx.lineTo(-14, 13);
        ctx.lineTo(-9, 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, 4);
        ctx.lineTo(14, 13);
        ctx.lineTo(9, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, 4);
        ctx.stroke();
      } else {
        drawFangedMouth(14 + open * 28, 22 + open * 4);
      }
      break;
    }
    case "meow": {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(0, -1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 14, 16, 19, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8C324C";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 24, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F68AA6";
      ctx.fill();
      break;
    }
    case "yawn": {
      ctx.beginPath();
      ctx.ellipse(0, 16, 21, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#822B45";
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 29, 13, 8.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#F68AA6";
      ctx.fill();
      break;
    }
    case "chew": {
      ctx.beginPath();
      ctx.moveTo(-20, 8);
      ctx.quadraticCurveTo(-9, 0, 0, 8);
      ctx.quadraticCurveTo(9, 0, 20, 8);
      ctx.stroke();
      break;
    }
    case "o": {
      ctx.beginPath();
      ctx.ellipse(0, 13, 11, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#8C324C";
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "frown": {
      ctx.beginPath();
      ctx.moveTo(-22, 16);
      ctx.quadraticCurveTo(0, 0, 22, 16);
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(-13, 10);
      ctx.lineTo(-9, 19);
      ctx.lineTo(-5, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "tongue": {
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.quadraticCurveTo(0, 15, 22, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-10, 9, 20, 21, 10);
      ctx.fillStyle = "#F68AA6";
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
function drawPhotoExtraAccessory(ctx, appearance2) {
  const ink = "#3A2334";
  if (appearance2.accessory === "crown") {
    ctx.save();
    ctx.translate(274, 210);
    ctx.beginPath();
    ctx.moveTo(-42, 12);
    ctx.lineTo(-48, -38);
    ctx.lineTo(-18, -12);
    ctx.lineTo(0, -52);
    ctx.lineTo(18, -12);
    ctx.lineTo(48, -38);
    ctx.lineTo(42, 12);
    ctx.closePath();
    ctx.fillStyle = "#FCD34D";
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ink;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -10, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = "#F43F5E";
    ctx.fill();
    ctx.restore();
  } else if (appearance2.accessory === "bowtie") {
    ctx.save();
    ctx.translate(274, 594);
    ctx.fillStyle = "#F43F5E";
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-3, 6);
    ctx.lineTo(-34, -12);
    ctx.lineTo(-34, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 6);
    ctx.lineTo(34, -12);
    ctx.lineTo(34, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-9, -4, 18, 18, 5);
    ctx.fillStyle = "#BE123C";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (appearance2.accessory === "collar") {
    ctx.save();
    ctx.translate(274, 596);
    ctx.beginPath();
    ctx.arc(0, 12, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#FACC15";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 15, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.restore();
  } else if (appearance2.accessory === "bandana") {
    ctx.save();
    ctx.translate(274, 586);
    ctx.beginPath();
    ctx.moveTo(-54, 0);
    ctx.quadraticCurveTo(0, 14, 54, 0);
    ctx.lineTo(6, 52);
    ctx.quadraticCurveTo(0, 58, -6, 52);
    ctx.closePath();
    ctx.fillStyle = "#38BDF8";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }
}
function drawPhotoFx(ctx, pose) {
  const t = pose.fxTime;
  if (pose.prop === "fish") {
    const wobble = Math.sin(t * 14) * 0.1;
    ctx.save();
    ctx.translate(300, 560 + Math.abs(Math.sin(t * 7)) * 8);
    ctx.rotate(-0.12 + wobble);
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-56, -18);
    ctx.lineTo(-50, 0);
    ctx.lineTo(-56, 18);
    ctx.closePath();
    ctx.fillStyle = "#7DD3FC";
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "#3A2334";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4, 0, 42, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#BAE6FD";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(22, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#3A2334";
    ctx.fill();
    ctx.restore();
  }
  if (pose.prop === "petHand") {
    const strokeX = Math.sin(t * 6.5) * 24;
    ctx.save();
    ctx.translate(274 + strokeX, 206 + pose.headY * 1.4);
    ctx.rotate(Math.sin(t * 6.5) * 0.08);
    ctx.beginPath();
    ctx.roundRect(-42, -18, 84, 34, 16);
    ctx.fillStyle = "#FDE0C6";
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "#3A2334";
    ctx.stroke();
    ctx.restore();
  }
  if (pose.fx === "none") return;
  switch (pose.fx) {
    case "hearts": {
      for (let i = 0; i < 4; i++) {
        const cycle = (t * 0.85 + i * 0.25) % 1;
        const x = 274 + (i - 1.5) * 86 + Math.sin(cycle * Math.PI * 2 + i) * 18;
        const y = 320 - cycle * 150;
        const alpha = Math.sin(cycle * Math.PI);
        const s = 14 + Math.sin(cycle * Math.PI) * 8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = i % 2 === 0 ? "#FF8CC6" : "#9BF4FF";
        drawAnimeHeart(ctx, x, y, s);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "notes": {
      for (let i = 0; i < 3; i++) {
        const cycle = (t * 1.1 + i * 0.34) % 1;
        const side = i % 2 === 0 ? 1 : -1;
        const x = 274 + side * (162 + cycle * 38) + Math.sin(cycle * 6) * 12;
        const y = 360 - cycle * 140;
        const alpha = Math.sin(cycle * Math.PI);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(cycle * Math.PI * 2) * 0.18);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = i === 1 ? "#FF8CD8" : "#8CF4FF";
        ctx.strokeStyle = i === 1 ? "#FF8CD8" : "#8CF4FF";
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(-6, 9, 11, 8, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, 8);
        ctx.lineTo(3, -26);
        ctx.lineTo(22, -18);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "zzz": {
      ctx.font = '700 38px "Bricolage Grotesque", sans-serif';
      ctx.textAlign = "center";
      for (let i = 0; i < 3; i++) {
        const cycle = (t * 0.45 + i * 0.33) % 1;
        const x = 365 + cycle * 66;
        const y = 350 - cycle * 150;
        const s = 0.65 + cycle * 0.65;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.globalAlpha = Math.sin(cycle * Math.PI) * 0.95;
        ctx.fillStyle = "#E0D7FF";
        ctx.strokeStyle = "#3A2334";
        ctx.lineWidth = 4;
        ctx.strokeText("Z", 0, 0);
        ctx.fillText("Z", 0, 0);
        ctx.restore();
      }
      break;
    }
    case "anger": {
      const pulse = 1 + Math.sin(t * 16) * 0.12;
      ctx.save();
      ctx.translate(392, 316);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = "#FB7185";
      ctx.lineWidth = 6.5;
      ctx.lineCap = "round";
      for (let a = 0; a < 4; a++) {
        ctx.save();
        ctx.rotate(a * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(6, -20);
        ctx.quadraticCurveTo(6, -6, 20, -6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case "sparkles": {
      for (let i = 0; i < 4; i++) {
        const cycle = (t * 1.4 + i * 0.25) % 1;
        const angle = i * 1.65 + 0.4;
        const dist = 178 + cycle * 44;
        const x = 274 + Math.cos(angle) * dist;
        const y = 370 + Math.sin(angle) * dist * 0.72;
        const s = Math.sin(cycle * Math.PI) * 1.35;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.fillStyle = i % 2 === 0 ? "#FFE680" : "#99F6FF";
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(4.2, -4.2);
        ctx.lineTo(16, 0);
        ctx.lineTo(4.2, 4.2);
        ctx.lineTo(0, 16);
        ctx.lineTo(-4.2, 4.2);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-4.2, -4.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "soundwaves": {
      const dir = pose.facing >= 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const cycle = (t * 1.8 + i * 0.33) % 1;
        ctx.save();
        ctx.translate(274 + dir * (162 + cycle * 48), 464);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 1 - cycle;
        ctx.strokeStyle = i % 2 === 0 ? "#98F5FF" : "#FFA6E0";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, 18 + cycle * 28, -0.65, 0.65);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "exclamation": {
      const pop = Math.min(1, t * 5);
      ctx.save();
      ctx.translate(274, 175 - Math.sin(pop * Math.PI) * 20);
      ctx.scale(pop, pop);
      ctx.fillStyle = "#FB7185";
      ctx.strokeStyle = "#3A2334";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-9, -52, 18, 38, 7);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "tears": {
      for (const tx of [214, 368]) {
        const cycle = (t * 1.3 + (tx > 300 ? 0.5 : 0)) % 1;
        const y = 478 + cycle * 74;
        ctx.save();
        ctx.translate(tx, y);
        ctx.globalAlpha = 1 - cycle * 0.65;
        ctx.fillStyle = "#8BE4FF";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.bezierCurveTo(10, 0, 10, 13, 0, 13);
        ctx.bezierCurveTo(-10, 13, -10, 0, 0, -12);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }
}
function renderPhotoRigScene(ctx, pose, appearance2, opts) {
  const assets = ensurePhotoRigLoaded();
  if (!assets || !assets.loaded) return false;
  const { width, height, background, isOverlay, actionLabel } = opts;
  ctx.clearRect(0, 0, width, height);
  if (background === "studio" && !isOverlay) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#F5F7FA");
    grad.addColorStop(0.76, "#ECEFF4");
    grad.addColorStop(1, "#E2E7EF");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (background === "green") {
    ctx.fillStyle = "#00FF00";
    ctx.fillRect(0, 0, width, height);
  } else if (background === "blue") {
    ctx.fillStyle = "#0000FF";
    ctx.fillRect(0, 0, width, height);
  } else if (background === "dark") {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#1B192B");
    grad.addColorStop(1, "#100E1B");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  const fitScale = background === "gamer" ? Math.max(width / REF_W, height / REF_H) : Math.min(width / REF_W, height / REF_H);
  const offsetX = (width - REF_W * fitScale) * 0.5;
  const offsetY = (height - REF_H * fitScale) * 0.5;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(fitScale, fitScale);
  if (background === "gamer") {
    ctx.drawImage(assets.bgCanvas, 0, 0);
    const twinkle = 0.25 + Math.sin(pose.fxTime * 3.2) * 0.14;
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 185, ${twinkle})`;
    for (const [fx, fy] of [
      [34, 134],
      [78, 152],
      [126, 160],
      [428, 136],
      [476, 152],
      [518, 156]
    ]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const rootTx = pose.rootX * 150;
  const rootTy = pose.rootY * 0.92;
  const userScale = appearance2.scale;
  const pivotX = 274;
  const pivotY = 748;
  const breathScaleY = 1 + pose.breath * 0.012;
  const breathScaleX = 1 - pose.breath * 8e-3;
  const safeFacing = Math.abs(pose.facing) < 0.14 ? pose.facing >= 0 ? 0.14 : -0.14 : pose.facing;
  const coatFilter = getCoatFilter(appearance2.coat);
  const leftRaised = pose.armLeftLift > 0.14;
  const rightRaised = pose.armRightLift > 0.14;
  const bodyImg = leftRaised && rightRaised ? assets.bodyNoArmsCanvas : rightRaised ? assets.bodyNoRightArmCanvas : leftRaised ? assets.bodyNoLeftArmCanvas : assets.bodyFullCanvas;
  const applyRootTransform = () => {
    ctx.translate(pivotX + rootTx, pivotY + rootTy);
    ctx.rotate(pose.bodyRot);
    ctx.scale(
      safeFacing * userScale * pose.scaleX * breathScaleX,
      userScale * pose.scaleY * breathScaleY
    );
    ctx.translate(-pivotX, -pivotY);
  };
  ctx.save();
  applyRootTransform();
  ctx.save();
  const tailPivotX = 96;
  const tailPivotY = 766;
  const tailPuff = 1 + pose.tailPuff * 0.14;
  ctx.translate(tailPivotX, tailPivotY);
  ctx.rotate(pose.tailWag * 0.14 - pose.tailLift * 0.07);
  ctx.scale(tailPuff, tailPuff);
  ctx.translate(-tailPivotX, -tailPivotY);
  if (coatFilter !== "none") ctx.filter = coatFilter;
  ctx.drawImage(assets.tailCanvas, 0, 0);
  ctx.filter = "none";
  ctx.restore();
  const gamingBounce = actionLabel === "Gaming" ? Math.sin(pose.fxTime * 24) * 3 : 0;
  ctx.save();
  ctx.translate(0, gamingBounce);
  ctx.drawImage(bodyImg, 0, 0);
  ctx.restore();
  if (appearance2.accessory === "bowtie" || appearance2.accessory === "collar" || appearance2.accessory === "bandana") {
    drawPhotoExtraAccessory(ctx, appearance2);
  }
  ctx.save();
  const headPivotX = 278;
  const headPivotY = 552;
  ctx.translate(headPivotX + pose.headX * 1.45, headPivotY + pose.headY * 1.45);
  ctx.rotate(pose.headRot);
  ctx.translate(-headPivotX, -headPivotY);
  if (coatFilter !== "none") ctx.filter = coatFilter;
  ctx.drawImage(assets.headCanvas, 0, 0);
  ctx.filter = "none";
  drawPhotoMatchedEyes(ctx, pose, assets);
  drawPhotoMatchedMouth(ctx, pose);
  if (appearance2.accessory === "crown") {
    drawPhotoExtraAccessory(ctx, appearance2);
  }
  ctx.restore();
  if (leftRaised || rightRaised) {
    if (leftRaised) {
      drawOversizedBentHoodieArm(
        ctx,
        -1,
        pose.armLeftAngle,
        pose.armLeftLift,
        actionLabel,
        pose.fxTime
      );
    }
    if (rightRaised) {
      drawOversizedBentHoodieArm(
        ctx,
        1,
        pose.armRightAngle,
        pose.armRightLift,
        actionLabel,
        pose.fxTime
      );
    }
    if (actionLabel === "Heart Hands" && leftRaised && rightRaised) {
      const heartAlpha = Math.min(1, Math.max(0, (pose.armLeftLift - 0.35) / 0.45));
      const pulse = 1 + Math.sin(pose.fxTime * 9) * 0.12;
      ctx.save();
      ctx.globalAlpha = heartAlpha;
      ctx.translate(274, 586);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(255, 140, 200, 0.35)";
      drawAnimeHeart(ctx, 0, 0, 32);
      ctx.fill();
      ctx.fillStyle = "#FF7EB9";
      drawAnimeHeart(ctx, 0, 0, 22);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }
    if (actionLabel === "Clap" && Math.sin(pose.fxTime * 15) > 0.65) {
      ctx.save();
      ctx.translate(274, 598);
      ctx.strokeStyle = "#FFF5B8";
      ctx.lineWidth = 4.2;
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
  if (appearance2.showDeskSetup) {
    ctx.drawImage(assets.fgCanvas, 0, 0);
    const isSpeakingNow = pose.isSpeaking || actionLabel === "Meow" || actionLabel === "Talk" || actionLabel === "Explain" || actionLabel === "Sing";
    if (isSpeakingNow) {
      const micPulse = 0.22 + Math.sin(pose.fxTime * 18) * 0.12;
      ctx.save();
      ctx.strokeStyle = `rgba(155, 245, 255, ${micPulse + 0.25})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(372, 634, 54, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (actionLabel === "Gaming") {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const kx = 264 + (i * 53 + Math.floor(pose.fxTime * 18) * 19) % 180;
        const ky = 824 + i * 29 % 44 - (kx - 264) * 0.14;
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.beginPath();
        ctx.roundRect(kx, ky, 15, 11, 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  if (appearance2.showFx) {
    drawPhotoFx(ctx, pose);
  }
  ctx.restore();
  if (appearance2.showActionLabel && actionLabel && (!isOverlay || actionLabel !== "Idle")) {
    ctx.save();
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = "center";
    const textY = height - 18;
    const metrics = ctx.measureText(actionLabel);
    const boxW = metrics.width + 26;
    const boxH = 26;
    ctx.fillStyle = "rgba(20, 17, 34, 0.82)";
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - boxW / 2, textY - 18, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(actionLabel, width * 0.5, textY);
    ctx.restore();
  }
  return true;
}

// frontend/pawsrig/stage.ts
var appearance = {
  coat: "ginger",
  eyeColor: "anime",
  accessory: "headphones",
  scale: 1,
  showDeskSetup: true,
  showShadow: true,
  showFx: true,
  showActionLabel: false
};
function mountPawsRig() {
  const engine = new CatAnimationEngine();
  const stage = document.createElement("div");
  stage.className = "pawsrig-stage";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Animated Little Cat at her streaming desk");
  stage.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  const ctx = context;
  let legacyCanvas = null;
  let width = 0;
  let height = 0;
  let lastFrame = performance.now();
  let frameId = 0;
  let speech = null;
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
    legacyCanvas?.classList.remove("pawsrig-fallback");
    legacyCanvas = null;
    width = height = 0;
    stage.remove();
  }
  function frame(now) {
    frameId = requestAnimationFrame(frame);
    const elapsed = (now - lastFrame) / 1e3;
    lastFrame = now;
    if (!legacyCanvas?.isConnected) {
      detach();
      const previous = document.querySelector("#live2d-internal-wrapper > #canvas");
      if (!previous?.parentElement) return;
      legacyCanvas = previous;
      previous.parentElement.append(stage);
      observer.observe(stage);
    }
    if (!width || !height) return;
    if (speech?.audio.paused || speech?.audio.ended || speech?.audio.error) speech = null;
    const volume = speech?.sliceLength ? speech.volumes[Math.floor(speech.audio.currentTime * 1e3 / speech.sliceLength)] ?? 0 : 0;
    engine.setTalking(Boolean(speech));
    engine.setExternalAudioLevel(speech ? volume : null);
    engine.step(elapsed);
    const action = engine.getSnapshot().currentAction;
    const pose = engine.getPose();
    if (renderPhotoRigScene(ctx, pose, appearance, {
      width,
      height,
      background: "gamer",
      isOverlay: false,
      actionLabel: ANIMATION_BY_ID[action].label
    })) {
      if (!legacyCanvas.classList.contains("pawsrig-fallback")) {
        legacyCanvas.classList.add("pawsrig-fallback");
      }
      stage.dataset.action = action;
      stage.dataset.speaking = String(pose.isSpeaking);
    }
  }
  frameId = requestAnimationFrame(frame);
  return {
    play(action) {
      return engine.trigger(action).accepted;
    },
    useSpeech(playback) {
      speech = playback;
    },
    destroy() {
      cancelAnimationFrame(frameId);
      detach();
    }
  };
}
export {
  mountPawsRig
};
