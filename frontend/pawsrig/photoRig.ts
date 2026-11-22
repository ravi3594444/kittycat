import { CatAppearance, CatPose, StageBackground } from './types';

const REF_W = 536;
const REF_H = 960;
const PHOTO_URL = new URL('./kitty.png', import.meta.url).href;

interface PhotoRigAssets {
  loaded: boolean;
  failed: boolean;
  bgCanvas: HTMLCanvasElement;
  tailCanvas: HTMLCanvasElement;
  bodyFullCanvas: HTMLCanvasElement;
  bodyNoRightArmCanvas: HTMLCanvasElement;
  bodyNoLeftArmCanvas: HTMLCanvasElement;
  bodyNoArmsCanvas: HTMLCanvasElement;
  headCanvas: HTMLCanvasElement;
  fgCanvas: HTMLCanvasElement;
  leftEyePatchCanvas: HTMLCanvasElement;
  rightEyePatchCanvas: HTMLCanvasElement;
}

let cachedAssets: PhotoRigAssets | null = null;
let loadingStarted = false;

function makeCanvas(w = REF_W, h = REF_H): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function traceSmoothClosed(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>
): void {
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

// Pixel-exact silhouettes traced from the 536x960 reference artwork
const HEAD_OUTLINE: Array<[number, number]> = [
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
  [104, 224],
];

const TAIL_OUTLINE: Array<[number, number]> = [
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
  [110, 794],
];

const BODY_OUTLINE: Array<[number, number]> = [
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
  [276, 526],
];

function traceDeskMonitorRegion(ctx: CanvasRenderingContext2D): void {
  // Lower desk surface, RGB keyboard, mouse, bottom-left chair armrest, and right-edge streaming monitor
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

function traceMicBoomRegion(ctx: CanvasRenderingContext2D): void {
  // Circular pop filter + rainbow condenser mic + shock mount + cable + dual boom arm from right edge
  ctx.beginPath();
  // Start upper-left of boom arm entry on right edge
  ctx.moveTo(540, 502);
  ctx.lineTo(436, 602);
  // Top arc of circular pop filter (center 372, 634, r ~56)
  ctx.lineTo(418, 588);
  ctx.quadraticCurveTo(372, 560, 326, 594);
  ctx.quadraticCurveTo(304, 636, 326, 678);
  ctx.quadraticCurveTo(348, 704, 372, 718);
  // Lower cable loop + shock mount base
  ctx.quadraticCurveTo(408, 754, 456, 728);
  ctx.quadraticCurveTo(468, 712, 462, 690);
  ctx.lineTo(454, 668);
  ctx.lineTo(468, 630);
  ctx.lineTo(484, 616);
  ctx.lineTo(540, 562);
  ctx.closePath();
}

function paintCleanMicAreaOnBody(ctx: CanvasRenderingContext2D): void {
  // Cleanly inpaints the boom-arm mic footprint on the right side of the hoodie layer
  // so moving/bouncing the cat behind the mic never shows a duplicate mic!
  ctx.save();
  // Clip to body silhouette so we never spill outside the hoodie
  traceSmoothClosed(ctx, BODY_OUTLINE);
  ctx.clip();

  // Fill mic overlap area with smooth photo-matched lavender -> pink -> sky-blue hoodie gradient
  ctx.beginPath();
  ctx.arc(374, 622, 68, 0, Math.PI * 2);
  ctx.ellipse(418, 686, 58, 66, -0.18, 0, Math.PI * 2);
  ctx.closePath();

  const hGrad = ctx.createLinearGradient(312, 558, 460, 764);
  hGrad.addColorStop(0, '#D8BCF6');
  hGrad.addColorStop(0.28, '#F6C2E5');
  hGrad.addColorStop(0.68, '#E3C8FA');
  hGrad.addColorStop(1, '#BCE2FF');
  ctx.fillStyle = hGrad;
  ctx.fill();

  // Softly blend left edge of mic patch into existing hoodie chest
  const blendLeft = ctx.createLinearGradient(304, 630, 344, 630);
  blendLeft.addColorStop(0, 'rgba(246, 194, 229, 0)');
  blendLeft.addColorStop(1, 'rgba(246, 194, 229, 0.35)');
  ctx.fillStyle = blendLeft;
  ctx.fillRect(304, 560, 40, 140);

  // Subtle soft anime cloth fold shadow along right chest/arm crease
  ctx.strokeStyle = 'rgba(72, 46, 82, 0.42)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(324, 652);
  ctx.quadraticCurveTo(368, 664, 406, 696);
  ctx.stroke();

  // Soft outer right sleeve dark ink edge continuation
  ctx.strokeStyle = '#3A2639';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(394, 574);
  ctx.bezierCurveTo(426, 620, 452, 666, 470, 712);
  ctx.stroke();

  ctx.restore();
}

function paintCleanArmRemoval(
  ctx: CanvasRenderingContext2D,
  side: -1 | 1
): void {
  // 1. Cleanly remove the resting bent sleeve, elbow & paw on `side`
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
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

  // 2. Paint a full-width, plump, seamless oversized hoodie torso & curved bottom hem on `side`
  // covering ALL THE WAY to the real hoodie outer silhouette (zero dark vertical gaps!)
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
  fillGrad.addColorStop(0, 'rgba(246, 195, 228, 0)');
  fillGrad.addColorStop(0.14, '#F5C2E4');
  fillGrad.addColorStop(0.55, '#DFC4FA');
  fillGrad.addColorStop(1, '#BDE0FF');
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Soft anime hoodie crease line near waist
  ctx.strokeStyle = 'rgba(72, 46, 82, 0.34)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (side === 1) {
    ctx.moveTo(318, 764);
    ctx.quadraticCurveTo(366, 754, 404, 768);
  } else {
    ctx.moveTo(246, 766);
    ctx.quadraticCurveTo(192, 754, 144, 770);
  }
  ctx.stroke();

  // Crisp outer hoodie waist & curved hem ink line
  ctx.strokeStyle = '#3B2538';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
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

function buildBackgroundCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const bg = makeCanvas();
  const ctx = bg.getContext('2d')!;
  // Start with 100% pixel-identical photo (all figurines, plushies, fairy lights, neon signs, posters!)
  ctx.drawImage(img, 0, 0, REF_W, REF_H);

  ctx.save();

  // 1. Cleanly inpaint behind tail with matching soft bedroom lavender/purple wall tones
  ctx.save();
  traceSmoothClosed(ctx, TAIL_OUTLINE);
  ctx.clip();
  const tailBgGrad = ctx.createLinearGradient(0, 520, 0, 810);
  tailBgGrad.addColorStop(0, '#8E79C2');
  tailBgGrad.addColorStop(0.45, '#7262AB');
  tailBgGrad.addColorStop(1, '#4C437A');
  ctx.fillStyle = tailBgGrad;
  ctx.fillRect(-4, 515, 134, 305);
  ctx.restore();

  // 2. Cleanly inpaint behind head/ears using sampled real wall/shelf strips from right above
  // the cat's head so nodding, crying, or jumping NEVER shows a cat-ear sticker silhouette!
  ctx.save();
  traceSmoothClosed(ctx, HEAD_OUTLINE);
  ctx.clip();

  // Left wall (x=68..250): stretch real lavender bedroom wall & framed poster area seamlessly
  ctx.drawImage(img, 140, 148, 110, 48, 66, 190, 184, 386);
  // Right wall (x=250..476): stretch real blue-violet bedroom wall seamlessly
  ctx.drawImage(img, 252, 168, 142, 34, 250, 190, 228, 386);

  // Soft ambient vertical gradient tint so the inpainted wall matches lower room lighting smoothly
  const wallFade = ctx.createLinearGradient(0, 190, 0, 565);
  wallFade.addColorStop(0, 'rgba(98, 92, 174, 0.14)');
  wallFade.addColorStop(0.55, 'rgba(116, 102, 182, 0.28)');
  wallFade.addColorStop(1, 'rgba(92, 82, 152, 0.42)');
  ctx.fillStyle = wallFade;
  ctx.fillRect(66, 190, 412, 386);

  // Subtle room corner seam at x=250
  ctx.strokeStyle = 'rgba(42, 32, 76, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, 190);
  ctx.lineTo(250, 565);
  ctx.stroke();
  ctx.restore();

  // 3. Clean dark ergonomic gaming chair backrest strictly INSIDE the real glowing left & right RGB rims,
  // extending cleanly down behind the desk surface so Jump never reveals duplicate resting paws!
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
  chairGrad.addColorStop(0, '#494466');
  chairGrad.addColorStop(0.45, '#383452');
  chairGrad.addColorStop(1, '#26233A');
  ctx.fillStyle = chairGrad;
  ctx.fill();

  // Subtle chair seam contours
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
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

function buildMaskedLayer(
  img: HTMLImageElement,
  traceFn: (ctx: CanvasRenderingContext2D) => void
): HTMLCanvasElement {
  const c = makeCanvas();
  const ctx = c.getContext('2d')!;
  ctx.save();
  traceFn(ctx);
  ctx.clip();
  ctx.drawImage(img, 0, 0, REF_W, REF_H);
  ctx.restore();
  return c;
}

function buildAssetsFromImage(img: HTMLImageElement): PhotoRigAssets {
  const bgCanvas = buildBackgroundCanvas(img);

  const tailCanvas = buildMaskedLayer(img, (ctx) =>
    traceSmoothClosed(ctx, TAIL_OUTLINE)
  );

  const headCanvas = buildMaskedLayer(img, (ctx) =>
    traceSmoothClosed(ctx, HEAD_OUTLINE)
  );

  // Full hoodie body with mic footprint cleanly painted as seamless pastel hoodie
  const bodyFullCanvas = buildMaskedLayer(img, (ctx) =>
    traceSmoothClosed(ctx, BODY_OUTLINE)
  );
  paintCleanMicAreaOnBody(bodyFullCanvas.getContext('2d')!);

  // Variants with resting arm(s) cleanly removed for raised arm animations (Wave, Heart, Dance, Jump, Clap)
  const bodyNoRightArmCanvas = makeCanvas();
  bodyNoRightArmCanvas.getContext('2d')!.drawImage(bodyFullCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoRightArmCanvas.getContext('2d')!, 1);

  const bodyNoLeftArmCanvas = makeCanvas();
  bodyNoLeftArmCanvas.getContext('2d')!.drawImage(bodyFullCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoLeftArmCanvas.getContext('2d')!, -1);

  const bodyNoArmsCanvas = makeCanvas();
  bodyNoArmsCanvas.getContext('2d')!.drawImage(bodyNoRightArmCanvas, 0, 0);
  paintCleanArmRemoval(bodyNoArmsCanvas.getContext('2d')!, -1);

  // Foreground: 100% original desk + RGB keyboard + mouse + armrest + right monitor + boom-arm condenser mic!
  const fgCanvas = makeCanvas();
  const fgCtx = fgCanvas.getContext('2d')!;
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

  // Pre-rendered zero-lag feathered fur patches for smooth 60fps eye blinking & expressions
  const buildEyePatchCanvas = (side: -1 | 1): HTMLCanvasElement => {
    const c = makeCanvas(104, 92);
    const ectx = c.getContext('2d')!;
    ectx.translate(52, 46);

    const baseGrad = ectx.createRadialGradient(side * 3, 2, 27, side * 3, 2, 47);
    baseGrad.addColorStop(0, '#FBF1E8');
    baseGrad.addColorStop(0.76, '#FAF0E6');
    baseGrad.addColorStop(1, 'rgba(250, 240, 230, 0)');
    ectx.fillStyle = baseGrad;
    ectx.beginPath();
    ectx.ellipse(side * 3, 2, 47, 40, 0, 0, Math.PI * 2);
    ectx.fill();

    const apricotGrad = ectx.createRadialGradient(side * 24, -24, 4, side * 22, -22, 36);
    apricotGrad.addColorStop(0, '#F6BE84');
    apricotGrad.addColorStop(0.6, 'rgba(246, 190, 132, 0.75)');
    apricotGrad.addColorStop(1, 'rgba(246, 190, 132, 0)');
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
    rightEyePatchCanvas,
  };
}

export function ensurePhotoRigLoaded(): PhotoRigAssets | null {
  if (cachedAssets?.loaded) return cachedAssets;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;

  if (!loadingStarted) {
    loadingStarted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
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
          rightEyePatchCanvas: makeCanvas(1, 1),
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
        rightEyePatchCanvas: makeCanvas(1, 1),
      };
    };
    img.src = PHOTO_URL;
  }

  return cachedAssets?.loaded ? cachedAssets : null;
}

function getCoatFilter(coat: CatAppearance['coat']): string {
  switch (coat) {
    case 'ginger':
      return 'none';
    case 'matcha':
      return 'hue-rotate(64deg) saturate(0.75) brightness(1.04)';
    case 'sakura':
      return 'hue-rotate(-36deg) saturate(1.18) brightness(1.04)';
    case 'russian':
      return 'saturate(0.18) brightness(0.98)';
    case 'midnight':
      return 'saturate(0.25) brightness(0.72) contrast(1.14)';
    case 'snowball':
      return 'saturate(0.12) brightness(1.14)';
    case 'tuxedo':
      return 'saturate(0.22) brightness(0.84) contrast(1.12)';
    case 'siamese':
      return 'hue-rotate(-8deg) saturate(0.65) contrast(1.08)';
    case 'calico':
      return 'saturate(1.22) contrast(1.05)';
    default:
      return 'none';
  }
}

function drawAnimeHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
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

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Draws a full-size, photo-proportional oversized bent-elbow pastel hoodie sleeve,
 * chunky ribbed knit cuff, and plump cream cat paw with pink toe beans using a
 * kink-free double-stroked round-join quadratic Bezier (mathematically impossible
 * to twist or spike at any bend angle!), anchored seamlessly to her hoodie shoulder!
 */
function drawOversizedBentHoodieArm(
  ctx: CanvasRenderingContext2D,
  side: -1 | 1,
  angle: number,
  lift: number,
  actionLabel?: string,
  fxTime = 0
): void {
  // Smoothstep 0..1 lift from the resting desk cuff to the full gesture target (zero pop-in!)
  const rawRaise = Math.min(1, Math.max(0, (lift - 0.14) / 0.86));
  const raise = rawRaise * rawRaise * (3 - 2 * rawRaise);

  // Real hoodie shoulder anchors & resting desk cuff anchors from the 536x960 reference photo
  const sx = side === 1 ? 378 : 162;
  const sy = side === 1 ? 654 : 656;
  const restEx = side === 1 ? 434 : 114;
  const restEy = side === 1 ? 748 : 750;
  const restWx = side === 1 ? 336 : 216;
  const restWy = side === 1 ? 772 : 774;

  // Target elbow & wrist coordinates per gesture (plush natural curves, zero overlap with mic!)
  const swing = angle * 24;
  let targetEx = side === 1 ? 452 : 96;
  let targetEy = 706;
  let targetWx = side === 1 ? 446 + swing : 102 + swing;
  let targetWy = 562 + Math.abs(swing) * 0.1;
  let pawExtraRot = side * -0.06 + angle * 0.12;

  if (actionLabel === 'Wave') {
    const waveDx = Math.sin(fxTime * 11) * 24 + angle * 10;
    targetEx = side === 1 ? 454 : 94;
    targetEy = 702;
    targetWx = side === 1 ? 448 + waveDx : 100 + waveDx;
    targetWy = 556 + Math.abs(waveDx) * 0.12;
    pawExtraRot = waveDx * 0.01;
  } else if (actionLabel === 'Explain') {
    const gX = Math.sin(fxTime * 5.2 + (side === 1 ? 0 : Math.PI)) * 18 + angle * 12;
    const gY = Math.cos(fxTime * 4.4 + (side === 1 ? 0 : Math.PI)) * 14;
    targetEx = side === 1 ? 448 : 100;
    targetEy = 716;
    targetWx = side === 1 ? 434 + gX : 114 + gX;
    targetWy = 594 + gY;
    pawExtraRot = side * 0.1 + gX * 0.008;
  } else if (actionLabel === 'Heart Hands') {
    const pulse = Math.sin(fxTime * 7) * 5;
    targetEx = side === 1 ? 430 : 118;
    targetEy = 736;
    targetWx = side === 1 ? 324 + pulse : 224 - pulse;
    targetWy = 636;
    pawExtraRot = side * -0.22;
  } else if (actionLabel === 'Clap') {
    const clapIn = Math.max(0, Math.sin(fxTime * 15));
    targetEx = side === 1 ? 426 : 122;
    targetEy = 738;
    targetWx = side === 1 ? 344 - clapIn * 36 : 204 + clapIn * 36;
    targetWy = 640;
    pawExtraRot = side * (-0.16 - clapIn * 0.16);
  } else if (actionLabel === 'Shy' || actionLabel === 'Laugh') {
    const wig = Math.sin(fxTime * 8.5 + side) * 6;
    targetEx = side === 1 ? 424 : 124;
    targetEy = 734;
    targetWx = side === 1 ? 348 + wig : 200 - wig;
    targetWy = 612 + Math.abs(wig) * 0.4;
    pawExtraRot = side * -0.18;
  } else if (actionLabel === 'Sad') {
    const dab = Math.sin(fxTime * 6.5) * 14;
    targetEx = side === 1 ? 422 : 126;
    targetEy = 732;
    targetWx = side === 1 ? 346 : 202;
    targetWy = 602 + dab;
    pawExtraRot = side * -0.14;
  } else if (actionLabel === 'Groom') {
    const lick = Math.sin(fxTime * 7.5) * 10;
    targetEx = side === 1 ? 424 : 124;
    targetEy = 732;
    targetWx = side === 1 ? 334 : 214;
    targetWy = 602 + lick;
    pawExtraRot = side * -0.18;
  } else if (actionLabel === 'Eat Fish') {
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

  const ink = '#3A2538';
  // Exact tangent angle of quadratic Bezier S->E->W at t=1 is vector (W - E)!
  const forearmAngle = Math.atan2(wy - ey, wx - ex);

  ctx.save();

  // 1. Kink-free plump oversized pastel hoodie sleeve (double-stroked smooth quadratic Bezier!)
  const traceSleeveCurve = () => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(ex, ey, wx, wy);
  };

  // Outer 3.5px anime ink outline around entire curved sleeve & plush elbow
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 78;
  traceSleeveCurve();
  ctx.stroke();

  // Inner plush oversized pastel pink -> lavender -> sky-blue hoodie fill
  const sleeveGrad = ctx.createLinearGradient(sx, sy - 24, wx, wy + 24);
  sleeveGrad.addColorStop(0, '#F5C2E4');
  sleeveGrad.addColorStop(0.5, '#E4C7FA');
  sleeveGrad.addColorStop(1, '#BEE2FF');
  ctx.strokeStyle = sleeveGrad;
  ctx.lineWidth = 71;
  traceSleeveCurve();
  ctx.stroke();

  // Soft cel-shaded lower-elbow contour & upper sheen along the sleeve curve
  ctx.strokeStyle = 'rgba(146, 118, 202, 0.2)';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(sx + side * 6, sy + 16);
  ctx.quadraticCurveTo(ex + side * 10, ey + 14, wx + side * 4, wy + 12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 244, 252, 0.34)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(sx - side * 8, sy - 10);
  ctx.quadraticCurveTo(ex - side * 8, ey - 10, wx - side * 6, wy - 8);
  ctx.stroke();

  // Seamless shoulder blend cap into the real hoodie chest (hides any round cap seam at S!)
  const blendGrad = ctx.createRadialGradient(sx, sy, 14, sx, sy, 46);
  blendGrad.addColorStop(0, '#F5C2E4');
  blendGrad.addColorStop(0.7, '#F2C3E6');
  blendGrad.addColorStop(1, 'rgba(242, 195, 230, 0)');
  ctx.fillStyle = blendGrad;
  ctx.beginPath();
  ctx.arc(sx - side * 6, sy - 2, 46, 0, Math.PI * 2);
  ctx.fill();

  // Subtle curved anime cloth crease inside the bent elbow crook
  const midX = 0.25 * sx + 0.5 * ex + 0.25 * wx;
  const midY = 0.25 * sy + 0.5 * ey + 0.25 * wy;
  ctx.strokeStyle = 'rgba(64, 40, 74, 0.5)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(midX - side * 14, midY - 12);
  ctx.quadraticCurveTo(midX - side * 2, midY - 2, midX + side * 12, midY + 4);
  ctx.stroke();

  // 2. Chunky Ribbed Knit Cuff & Full-Size Plump Anime Cat Paw oriented along forearm tangent!
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(forearmAngle - Math.PI * 0.5);

  const cuffW = 74;
  const cuffH = 30;
  ctx.beginPath();
  ctx.roundRect(-cuffW * 0.5, -14, cuffW, cuffH, 10);
  const cuffGrad = ctx.createLinearGradient(0, -14, 0, 16);
  cuffGrad.addColorStop(0, '#DFC4FA');
  cuffGrad.addColorStop(1, '#C2D9FD');
  ctx.fillStyle = cuffGrad;
  ctx.fill();
  ctx.lineWidth = 3.1;
  ctx.strokeStyle = ink;
  ctx.stroke();

  // Ribbed knit stitches matching the reference photo's chunky cuff
  ctx.beginPath();
  for (const rx of [-22, -11, 0, 11, 22]) {
    ctx.moveTo(rx, -11);
    ctx.lineTo(rx, 13);
  }
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = 'rgba(58, 37, 56, 0.48)';
  ctx.stroke();

  // Plump photo-sized cream anime cat paw (76x62px!) with soft toe notches & rosy pink beans
  ctx.save();
  ctx.translate(0, 18);
  ctx.rotate(pawExtraRot * raise);

  ctx.beginPath();
  ctx.ellipse(0, 22, 38, 31, 0, 0, Math.PI * 2);
  const pawGrad = ctx.createRadialGradient(-8, 16, 5, 0, 24, 40);
  pawGrad.addColorStop(0, '#FFFDF9');
  pawGrad.addColorStop(0.74, '#FFF1E4');
  pawGrad.addColorStop(1, '#F4DBC4');
  ctx.fillStyle = pawGrad;
  ctx.fill();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = ink;
  ctx.stroke();

  // Subtle top finger crease notches matching the photo's plump paws
  ctx.strokeStyle = 'rgba(58, 37, 56, 0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-12, 44);
  ctx.lineTo(-10, 51);
  ctx.moveTo(12, 44);
  ctx.lineTo(10, 51);
  ctx.stroke();

  // Rosy pink main paw pad + 3 plump toe beans (fade in smoothly as paw lifts toward viewer!)
  if (raise > 0.22) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (raise - 0.22) / 0.35);
    ctx.fillStyle = '#F79EB6';
    ctx.beginPath();
    ctx.ellipse(0, 18, 14.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [bx, by] of [
      [-15, 34],
      [0, 38],
      [15, 34],
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

/**
 * Draws seamless photo-matched anime eye blinks & expressions directly at the
 * exact eye pixel coordinates on the 536x960 head layer using pre-cached fur patches
 * and pixel-locked eyelid clipping for silky zero-lag 60fps blinks!
 */
function drawPhotoMatchedEyes(
  ctx: CanvasRenderingContext2D,
  pose: CatPose,
  assets: PhotoRigAssets
): void {
  const ink = '#3A2334';
  const eyes: Array<{
    x: number;
    y: number;
    side: -1 | 1;
    patch: HTMLCanvasElement;
  }> = [
    { x: 222, y: 448, side: -1, patch: assets.leftEyePatchCanvas },
    { x: 364, y: 444, side: 1, patch: assets.rightEyePatchCanvas },
  ];

  // Subtle blush boost for Shy / Happy / Heart Hands / Pet
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
      ctx.lineCap = 'round';
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
    const effectiveStyle =
      pose.eyeStyle === 'wink' && eye.side === 1 ? 'happy' : pose.eyeStyle;
    const isBlinking = effectiveStyle === 'normal' && pose.blink > 0.05;

    // When normal & open, let the 100% original luminous hand-painted anime eyes shine!
    if (effectiveStyle === 'normal' && !isBlinking) {
      continue;
    }

    if (effectiveStyle === 'sparkle') {
      // Keep the 100% original glossy eyes and add bright anime star glints!
      ctx.save();
      ctx.translate(eye.x + 14, eye.y - 16);
      const pulse = 0.85 + Math.sin(pose.fxTime * 10) * 0.2;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#FFFFFF';
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

    // Zero-allocation stamp of the pre-rendered cream-to-apricot eye fur patch!
    const maskEyePatch = () => {
      ctx.drawImage(eye.patch, eye.x - 52, eye.y - 46);
    };

    if (isBlinking) {
      // Pixel-locked unified anime eyelid: fur mask bottom edge & dark lash arch move as ONE!
      const lidH = Math.min(1, pose.blink);
      const lidY = eye.y - 38 + lidH * 52;
      const archCtrlY = lidY + (1 - lidH) * -14 + lidH * 10;

      ctx.save();
      ctx.beginPath();
      if (lidH > 0.92) {
        // Fully closed: cleanly cover the entire eye opening
        ctx.rect(eye.x - 52, eye.y - 46, 104, 92);
      } else {
        // Curved clip strictly matching the descending upper eyelash curve!
        ctx.moveTo(eye.x - 52, eye.y - 46);
        ctx.lineTo(eye.x + 52, eye.y - 46);
        ctx.lineTo(eye.x + 52, lidY + 2);
        ctx.quadraticCurveTo(eye.x, archCtrlY + 2, eye.x - 52, lidY + 2);
        ctx.closePath();
      }
      ctx.clip();
      maskEyePatch();
      ctx.restore();

      // Crisp upper lash line locked directly to the descending lid edge
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(eye.x - 36, lidY);
      ctx.quadraticCurveTo(eye.x, archCtrlY, eye.x + 36, lidY);
      ctx.stroke();
      // Subtle outer winged lash flick matching the photo's eyeliner
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(eye.x + eye.side * 33, lidY - 1);
      ctx.lineTo(eye.x + eye.side * 42, lidY - 6);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (effectiveStyle === 'happy') {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y + 8);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 6, 30, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      // Cute winged anime lash flick matching photo style
      ctx.beginPath();
      ctx.moveTo(eye.side * 27, -6);
      ctx.lineTo(eye.side * 40, -14);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (effectiveStyle === 'sleep') {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y + 4);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -6, 26, Math.PI * 0.14, Math.PI * 0.86);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (effectiveStyle === 'wide') {
      maskEyePatch();
      ctx.save();
      ctx.translate(eye.x, eye.y);
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 40, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4.2;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#4B2F52';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#1D1026';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-4.5, -4.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    if (effectiveStyle === 'angry') {
      // Keep original glossy eyes and add crisp slanted anime angry brow + upper lid slant!
      ctx.save();
      ctx.translate(eye.x, eye.y);
      ctx.fillStyle = '#F7BE84';
      ctx.beginPath();
      ctx.moveTo(-eye.side * 44, -42);
      ctx.lineTo(eye.side * 42, -48);
      ctx.lineTo(eye.side * 42, -24);
      ctx.lineTo(-eye.side * 44, -10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eye.side * 38, -14);
      ctx.lineTo(eye.side * 34, -32);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if (effectiveStyle === 'sad') {
      // Keep original glossy eyes + add glistening tear pools, animated anime tear streams & worried brows!
      ctx.save();
      ctx.translate(eye.x, eye.y);

      // Shimmering aqua tear pool filling lower rim of glossy eye
      const poolGrad = ctx.createLinearGradient(0, 14, 0, 38);
      poolGrad.addColorStop(0, 'rgba(170, 234, 255, 0.35)');
      poolGrad.addColorStop(0.6, 'rgba(140, 224, 255, 0.85)');
      poolGrad.addColorStop(1, 'rgba(195, 245, 255, 0.92)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(0, 25, 31, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Animated glistening vertical tear stream cascading down cheek
      const streamPulse = Math.sin(pose.fxTime * 8 + eye.side) * 2.5;
      const streamGrad = ctx.createLinearGradient(0, 26, 0, 96);
      streamGrad.addColorStop(0, 'rgba(155, 232, 255, 0.82)');
      streamGrad.addColorStop(0.65, 'rgba(145, 226, 255, 0.55)');
      streamGrad.addColorStop(1, 'rgba(145, 226, 255, 0)');
      ctx.fillStyle = streamGrad;
      ctx.beginPath();
      ctx.moveTo(eye.side * 8 - 7, 28);
      ctx.quadraticCurveTo(eye.side * 10 - 9 + streamPulse, 62, eye.side * 12 - 5, 96);
      ctx.lineTo(eye.side * 12 + 7, 96);
      ctx.quadraticCurveTo(eye.side * 10 + 9 + streamPulse, 62, eye.side * 8 + 7, 28);
      ctx.closePath();
      ctx.fill();

      // Bright specular water droplets in tear pool (separate subpaths so zero connecting triangles!)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-11, 24, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(13, 26, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eye.side * 10, 48 + ((pose.fxTime * 54) % 34), 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Expressive worried downward-tilted anime brow
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eye.side * 30, -54);
      ctx.quadraticCurveTo(0, -48, eye.side * 28, -36);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Draw the speech mouth and expressions in the photo's head coordinates. */
function drawPhotoMatchedMouth(
  ctx: CanvasRenderingContext2D,
  pose: CatPose
): void {
  const mx = 301;
  const my = 507;
  const ink = '#3A2334';

  ctx.save();
  ctx.translate(mx, my);

  // Feather the replacement muzzle in both directions around the original mouth.
  ctx.save();
  ctx.translate(0, 11);
  ctx.scale(1, 0.69);
  const patch = ctx.createRadialGradient(0, 0, 30, 0, 0, 49);
  patch.addColorStop(0, '#FCF2E9');
  patch.addColorStop(1, 'rgba(252, 242, 233, 0)');
  ctx.fillStyle = patch;
  ctx.beginPath();
  ctx.arc(0, 0, 49, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawFangedMouth = (openDepth: number, halfWidth = 24) => {
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
    mGrad.addColorStop(0, '#6E263D');
    mGrad.addColorStop(1, '#A43B57');
    ctx.fillStyle = mGrad;
    ctx.fill();

    // Rosy pink anime tongue + two crisp tiny white fangs matching the photo!
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#F68AA6';
    ctx.beginPath();
    ctx.ellipse(0, openDepth * 0.78, halfWidth * 0.7, openDepth * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 210, 224, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, openDepth * 0.66, halfWidth * 0.36, openDepth * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp white mini-fangs
    ctx.fillStyle = '#FFFFFF';
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
    // Crisp cat :3 upper lip line connecting up to pink nose
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 1);
    ctx.moveTo(-halfWidth - 4, 0);
    ctx.quadraticCurveTo(-halfWidth * 0.45, 12, 0, 1);
    ctx.quadraticCurveTo(halfWidth * 0.45, 12, halfWidth + 4, 0);
    ctx.stroke();
  };

  switch (pose.mouthStyle) {
    case 'open': {
      drawFangedMouth(38, 25);
      break;
    }

    case 'smile':
    case 'talk': {
      const open = pose.mouthStyle === 'talk' ? pose.mouthOpen : 0;
      const roundness = pose.mouthRoundness;
      const width = 26 + open * (5 - roundness * 19);
      const depth = open * (27 + roundness * 11);
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(0, 1);
      ctx.stroke();
      const lips = new Path2D();
      lips.moveTo(-width, 2);
      lips.quadraticCurveTo(-width * 0.46, 13, 0, 1);
      lips.quadraticCurveTo(width * 0.46, 13, width, 2);
      if (open > 0) {
        lips.quadraticCurveTo(width * 0.5, 13 + depth, 0, 1 + depth);
        lips.quadraticCurveTo(-width * 0.5, 13 + depth, -width, 2);
        lips.closePath();
        ctx.fillStyle = '#80324A';
        ctx.fill(lips);
        ctx.save();
        ctx.clip(lips);
        ctx.globalAlpha *= open;
        ctx.fillStyle = '#F68AA6';
        ctx.beginPath();
        ctx.ellipse(0, 5 + depth, width * 0.62, 4 + depth * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.stroke(lips);
      break;
    }

    case 'meow': {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(0, -1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 14, 16, 19, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8C324C';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 24, 11, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F68AA6';
      ctx.fill();
      break;
    }

    case 'yawn': {
      ctx.beginPath();
      ctx.ellipse(0, 16, 21, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#822B45';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 29, 13, 8.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#F68AA6';
      ctx.fill();
      break;
    }

    case 'chew': {
      ctx.beginPath();
      ctx.moveTo(-20, 8);
      ctx.quadraticCurveTo(-9, 0, 0, 8);
      ctx.quadraticCurveTo(9, 0, 20, 8);
      ctx.stroke();
      break;
    }

    case 'o': {
      ctx.beginPath();
      ctx.ellipse(0, 13, 11, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8C324C';
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'frown': {
      ctx.beginPath();
      ctx.moveTo(-22, 16);
      ctx.quadraticCurveTo(0, 0, 22, 16);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-13, 10);
      ctx.lineTo(-9, 19);
      ctx.lineTo(-5, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'tongue': {
      ctx.beginPath();
      ctx.moveTo(-22, 4);
      ctx.quadraticCurveTo(0, 15, 22, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-10, 9, 20, 21, 10);
      ctx.fillStyle = '#F68AA6';
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

function drawPhotoExtraAccessory(
  ctx: CanvasRenderingContext2D,
  appearance: CatAppearance
): void {
  const ink = '#3A2334';
  if (appearance.accessory === 'crown') {
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
    ctx.fillStyle = '#FCD34D';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -10, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#F43F5E';
    ctx.fill();
    ctx.restore();
  } else if (appearance.accessory === 'bowtie') {
    ctx.save();
    ctx.translate(274, 594);
    ctx.fillStyle = '#F43F5E';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
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
    ctx.fillStyle = '#BE123C';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (appearance.accessory === 'collar') {
    ctx.save();
    ctx.translate(274, 596);
    ctx.beginPath();
    ctx.arc(0, 12, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 15, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.restore();
  } else if (appearance.accessory === 'bandana') {
    ctx.save();
    ctx.translate(274, 586);
    ctx.beginPath();
    ctx.moveTo(-54, 0);
    ctx.quadraticCurveTo(0, 14, 54, 0);
    ctx.lineTo(6, 52);
    ctx.quadraticCurveTo(0, 58, -6, 52);
    ctx.closePath();
    ctx.fillStyle = '#38BDF8';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }
}

function drawPhotoFx(
  ctx: CanvasRenderingContext2D,
  pose: CatPose
): void {
  const t = pose.fxTime;

  // Fish snack prop when eating
  if (pose.prop === 'fish') {
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
    ctx.fillStyle = '#7DD3FC';
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#3A2334';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4, 0, 42, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#BAE6FD';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(22, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3A2334';
    ctx.fill();
    ctx.restore();
  }

  // Petting hand prop when petted
  if (pose.prop === 'petHand') {
    const strokeX = Math.sin(t * 6.5) * 24;
    ctx.save();
    ctx.translate(274 + strokeX, 206 + pose.headY * 1.4);
    ctx.rotate(Math.sin(t * 6.5) * 0.08);
    ctx.beginPath();
    ctx.roundRect(-42, -18, 84, 34, 16);
    ctx.fillStyle = '#FDE0C6';
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#3A2334';
    ctx.stroke();
    ctx.restore();
  }

  if (pose.fx === 'none') return;

  switch (pose.fx) {
    case 'hearts': {
      for (let i = 0; i < 4; i++) {
        const cycle = (t * 0.85 + i * 0.25) % 1;
        const x = 274 + (i - 1.5) * 86 + Math.sin(cycle * Math.PI * 2 + i) * 18;
        const y = 320 - cycle * 150;
        const alpha = Math.sin(cycle * Math.PI);
        const s = 14 + Math.sin(cycle * Math.PI) * 8;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = i % 2 === 0 ? '#FF8CC6' : '#9BF4FF';
        drawAnimeHeart(ctx, x, y, s);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'notes': {
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
        ctx.fillStyle = i === 1 ? '#FF8CD8' : '#8CF4FF';
        ctx.strokeStyle = i === 1 ? '#FF8CD8' : '#8CF4FF';
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

    case 'zzz': {
      ctx.font = '700 38px "Bricolage Grotesque", sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const cycle = (t * 0.45 + i * 0.33) % 1;
        const x = 365 + cycle * 66;
        const y = 350 - cycle * 150;
        const s = 0.65 + cycle * 0.65;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);
        ctx.globalAlpha = Math.sin(cycle * Math.PI) * 0.95;
        ctx.fillStyle = '#E0D7FF';
        ctx.strokeStyle = '#3A2334';
        ctx.lineWidth = 4;
        ctx.strokeText('Z', 0, 0);
        ctx.fillText('Z', 0, 0);
        ctx.restore();
      }
      break;
    }

    case 'anger': {
      const pulse = 1 + Math.sin(t * 16) * 0.12;
      ctx.save();
      ctx.translate(392, 316);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#FB7185';
      ctx.lineWidth = 6.5;
      ctx.lineCap = 'round';
      for (let a = 0; a < 4; a++) {
        ctx.save();
        ctx.rotate((a * Math.PI) / 2);
        ctx.beginPath();
        ctx.moveTo(6, -20);
        ctx.quadraticCurveTo(6, -6, 20, -6);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 'sparkles': {
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
        ctx.fillStyle = i % 2 === 0 ? '#FFE680' : '#99F6FF';
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

    case 'soundwaves': {
      const dir = pose.facing >= 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const cycle = (t * 1.8 + i * 0.33) % 1;
        ctx.save();
        ctx.translate(274 + dir * (162 + cycle * 48), 464);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 1 - cycle;
        ctx.strokeStyle = i % 2 === 0 ? '#98F5FF' : '#FFA6E0';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 18 + cycle * 28, -0.65, 0.65);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'exclamation': {
      const pop = Math.min(1, t * 5);
      ctx.save();
      ctx.translate(274, 175 - Math.sin(pop * Math.PI) * 20);
      ctx.scale(pop, pop);
      ctx.fillStyle = '#FB7185';
      ctx.strokeStyle = '#3A2334';
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

    case 'tears': {
      for (const tx of [214, 368]) {
        const cycle = (t * 1.3 + (tx > 300 ? 0.5 : 0)) % 1;
        const y = 478 + cycle * 74;
        ctx.save();
        ctx.translate(tx, y);
        ctx.globalAlpha = 1 - cycle * 0.65;
        ctx.fillStyle = '#8BE4FF';
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

export interface PhotoRigRenderOptions {
  width: number;
  height: number;
  background: StageBackground;
  isOverlay: boolean;
  actionLabel?: string;
}

/**
 * Renders the 100% photo-faithful Live2D rigged anime gamer cat directly from
 * kitty.png with articulated tail, breathing hoodie torso,
 * tilting/bobbing head, eye blinking/expressions, speech-driven mouth shapes,
 * raised waving/heart arms, and live glowing keyboard/mic/hearts foreground.
 */
export function renderPhotoRigScene(
  ctx: CanvasRenderingContext2D,
  pose: CatPose,
  appearance: CatAppearance,
  opts: PhotoRigRenderOptions
): boolean {
  const assets = ensurePhotoRigLoaded();
  if (!assets || !assets.loaded) return false;

  const { width, height, background, isOverlay, actionLabel } = opts;

  ctx.clearRect(0, 0, width, height);

  // 1. Non-gamer backgrounds (studio, green, blue, dark) — transparent stays clear
  if (background === 'studio' && !isOverlay) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#F5F7FA');
    grad.addColorStop(0.76, '#ECEFF4');
    grad.addColorStop(1, '#E2E7EF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (background === 'green') {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(0, 0, width, height);
  } else if (background === 'blue') {
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(0, 0, width, height);
  } else if (background === 'dark') {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#1B192B');
    grad.addColorStop(1, '#100E1B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Fit the 536x960 reference art cleanly into any aspect ratio (9:16 fills 100% edge-to-edge!)
  const fitScale =
    background === 'gamer'
      ? Math.max(width / REF_W, height / REF_H)
      : Math.min(width / REF_W, height / REF_H);
  const offsetX = (width - REF_W * fitScale) * 0.5;
  const offsetY = (height - REF_H * fitScale) * 0.5;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(fitScale, fitScale);

  // 2. Full-detail cozy gamer bedroom backdrop (with clean inpainted chair behind cat!)
  if (background === 'gamer') {
    ctx.drawImage(assets.bgCanvas, 0, 0);

    // Subtle live twinkle on the photo's fairy lights & neon heart glow
    const twinkle = 0.25 + Math.sin(pose.fxTime * 3.2) * 0.14;
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 185, ${twinkle})`;
    for (const [fx, fy] of [
      [34, 134],
      [78, 152],
      [126, 160],
      [428, 136],
      [476, 152],
      [518, 156],
    ]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Articulated Live2D Cat Rig (in 536x960 reference pixel space!)
  const rootTx = pose.rootX * 150;
  const rootTy = pose.rootY * 0.92;
  const userScale = appearance.scale;
  const pivotX = 274;
  const pivotY = 748;
  const breathScaleY = 1 + pose.breath * 0.012;
  const breathScaleX = 1 - pose.breath * 0.008;

  const safeFacing =
    Math.abs(pose.facing) < 0.14
      ? pose.facing >= 0
        ? 0.14
        : -0.14
      : pose.facing;

  const coatFilter = getCoatFilter(appearance.coat);
  const leftRaised = pose.armLeftLift > 0.14;
  const rightRaised = pose.armRightLift > 0.14;

  // Pick clean body variant so raised arms never leave a duplicate resting arm behind!
  const bodyImg =
    leftRaised && rightRaised
      ? assets.bodyNoArmsCanvas
      : rightRaised
      ? assets.bodyNoRightArmCanvas
      : leftRaised
      ? assets.bodyNoLeftArmCanvas
      : assets.bodyFullCanvas;

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

  // 3a. Articulated Fluffy Tail (pivots naturally at tail root behind left hoodie!)
  ctx.save();
  const tailPivotX = 96;
  const tailPivotY = 766;
  const tailPuff = 1 + pose.tailPuff * 0.14;
  ctx.translate(tailPivotX, tailPivotY);
  ctx.rotate(pose.tailWag * 0.14 - pose.tailLift * 0.07);
  ctx.scale(tailPuff, tailPuff);
  ctx.translate(-tailPivotX, -tailPivotY);
  if (coatFilter !== 'none') ctx.filter = coatFilter;
  ctx.drawImage(assets.tailCanvas, 0, 0);
  ctx.filter = 'none';
  ctx.restore();

  // 3b. Oversized Pastel Hoodie Body (+ slight typing bounce during Gaming!)
  const gamingBounce =
    actionLabel === 'Gaming' ? Math.sin(pose.fxTime * 24) * 3 : 0;
  ctx.save();
  ctx.translate(0, gamingBounce);
  ctx.drawImage(bodyImg, 0, 0);
  ctx.restore();

  // 3c. Optional neck accessory (bowtie / collar / bandana)
  if (
    appearance.accessory === 'bowtie' ||
    appearance.accessory === 'collar' ||
    appearance.accessory === 'bandana'
  ) {
    drawPhotoExtraAccessory(ctx, appearance);
  }

  // 3d. Articulated Head + Real Ears + RGB Cat-Ear Headphones (pivots at neck!)
  ctx.save();
  const headPivotX = 278;
  const headPivotY = 552;
  ctx.translate(headPivotX + pose.headX * 1.45, headPivotY + pose.headY * 1.45);
  ctx.rotate(pose.headRot);
  ctx.translate(-headPivotX, -headPivotY);

  if (coatFilter !== 'none') ctx.filter = coatFilter;
  ctx.drawImage(assets.headCanvas, 0, 0);
  ctx.filter = 'none';

  // Live2D Eye Blinking & Expressions right on the photo's eyes (zero-lag cached fur patches!)
  drawPhotoMatchedEyes(ctx, pose, assets);

  // Draw the lips with the same transform as the head.
  drawPhotoMatchedMouth(ctx, pose);

  // Optional Crown accessory
  if (appearance.accessory === 'crown') {
    drawPhotoExtraAccessory(ctx, appearance);
  }

  ctx.restore();
  // 3e. Raised Full-Size Oversized Bent-Elbow Hoodie Arms (drawn WITH the cat rig BEFORE
  // the foreground desk, keyboard & boom-arm condenser mic so she naturally lives BEHIND her setup!)
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

    // Floating glowing pink heart framed right between her paws during Heart Hands!
    if (actionLabel === 'Heart Hands' && leftRaised && rightRaised) {
      const heartAlpha = Math.min(1, Math.max(0, (pose.armLeftLift - 0.35) / 0.45));
      const pulse = 1 + Math.sin(pose.fxTime * 9) * 0.12;
      ctx.save();
      ctx.globalAlpha = heartAlpha;
      ctx.translate(274, 586);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(255, 140, 200, 0.35)';
      drawAnimeHeart(ctx, 0, 0, 32);
      ctx.fill();
      ctx.fillStyle = '#FF7EB9';
      drawAnimeHeart(ctx, 0, 0, 22);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
    }

    // Crisp gold-white impact burst rays right between her paws on each Clap beat!
    if (actionLabel === 'Clap' && Math.sin(pose.fxTime * 15) > 0.65) {
      ctx.save();
      ctx.translate(274, 598);
      ctx.strokeStyle = '#FFF5B8';
      ctx.lineWidth = 4.2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.restore();

  // 4. Foreground Photo-Exact Desk, Tilted RGB Keyboard, Mouse, Boom-Arm Condenser Mic & Monitor!
  if (appearance.showDeskSetup) {
    ctx.drawImage(assets.fgCanvas, 0, 0);

    // Subtle reactive talking glow around the real condenser microphone!
    const isSpeakingNow =
      pose.isSpeaking ||
      actionLabel === 'Meow' ||
      actionLabel === 'Talk' ||
      actionLabel === 'Explain' ||
      actionLabel === 'Sing';
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

    // Subtle reactive RGB keycap sparkles when Gaming!
    if (actionLabel === 'Gaming') {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const kx = 264 + ((i * 53 + Math.floor(pose.fxTime * 18) * 19) % 180);
        const ky = 824 + ((i * 29) % 44) - (kx - 264) * 0.14;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.roundRect(kx, ky, 15, 11, 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 5. Animated FX particles (hearts, sparkles, music notes, soundwaves, zzz, tears)
  if (appearance.showFx) {
    drawPhotoFx(ctx, pose);
  }

  ctx.restore();

  // 6. Optional subtle action caption
  if (
    appearance.showActionLabel &&
    actionLabel &&
    (!isOverlay || actionLabel !== 'Idle')
  ) {
    ctx.save();
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const textY = height - 18;
    const metrics = ctx.measureText(actionLabel);
    const boxW = metrics.width + 26;
    const boxH = 26;
    ctx.fillStyle = 'rgba(20, 17, 34, 0.82)';
    ctx.beginPath();
    ctx.roundRect(width * 0.5 - boxW / 2, textY - 18, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(actionLabel, width * 0.5, textY);
    ctx.restore();
  }

  return true;
}
