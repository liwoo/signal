// ── Character Painter v3 — anatomically improved pixel art ──
// Maya: 48x80 base, ~5-head proportions, shaped body, tapered limbs.
// Guard: same canvas, bulkier build, segmented tactical armor.
// Reference: SLYNYRD Pixelblog anatomy + cyberpunk tutorials.

import { C } from "./palette";

export type CharAnimation =
  | "idle"
  | "walk-right"
  | "walk-left"
  | "walk-down"
  | "walk-up"
  | "hack"
  | "keypad"
  | "captured"
  | "crawl-right";

const CHAR_W = 48;
const CHAR_H = 80;

const FRAME_COUNT: Record<CharAnimation, number> = {
  "idle": 4,
  "walk-right": 8,
  "walk-left": 8,
  "walk-down": 8,
  "walk-up": 8,
  "hack": 6,
  "keypad": 6,
  "captured": 2,
  "crawl-right": 8,
};

// ── Walk cycle pose data (8 frames) ──
// Contact → Down → Passing → Up (per leg, offset by 4)
interface WalkPose {
  bob: number;
  leftLeg: number;
  rightLeg: number;
  leftArm: number;
  rightArm: number;
  leftKnee: number;
  rightKnee: number;
}

const WALK_POSES: WalkPose[] = [
  { bob:  0,  leftLeg: -3, rightLeg:  4, leftArm:  2, rightArm: -2, leftKnee: 0, rightKnee: 0 },
  { bob: -1,  leftLeg: -2, rightLeg:  3, leftArm:  1, rightArm: -1, leftKnee: 0, rightKnee: 0 },
  { bob:  0,  leftLeg:  0, rightLeg:  0, leftArm:  0, rightArm:  0, leftKnee: 2, rightKnee: 0 },
  { bob:  1,  leftLeg:  2, rightLeg: -1, leftArm: -1, rightArm:  1, leftKnee: 0, rightKnee: 0 },
  { bob:  0,  leftLeg:  4, rightLeg: -3, leftArm: -2, rightArm:  2, leftKnee: 0, rightKnee: 0 },
  { bob: -1,  leftLeg:  3, rightLeg: -2, leftArm: -1, rightArm:  1, leftKnee: 0, rightKnee: 0 },
  { bob:  0,  leftLeg:  0, rightLeg:  0, leftArm:  0, rightArm:  0, leftKnee: 0, rightKnee: 2 },
  { bob:  1,  leftLeg: -1, rightLeg:  2, leftArm:  1, rightArm: -1, leftKnee: 0, rightKnee: 0 },
];

export function paintMayaFrames(animation: CharAnimation, scale: number = 3): HTMLCanvasElement[] {
  const count = FRAME_COUNT[animation];
  return Array.from({ length: count }, (_, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = CHAR_W * scale;
    canvas.height = CHAR_H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    drawMaya(ctx, animation, i);
    return canvas;
  });
}

export function paintGuardFrames(animation: CharAnimation, scale: number = 3): HTMLCanvasElement[] {
  const count = FRAME_COUNT[animation] ?? 2;
  return Array.from({ length: count }, (_, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = CHAR_W * scale;
    canvas.height = CHAR_H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    drawGuard(ctx, animation, i);
    return canvas;
  });
}

// ════════════════════════════════════════════════════════════════
// MAYA — Athletic female, dark hair w/ green streak, open hoodie,
//        gray tank top, cargo pants, combat boots
// ════════════════════════════════════════════════════════════════

function drawMaya(ctx: CanvasRenderingContext2D, anim: CharAnimation, frame: number) {
  const cx = CHAR_W / 2; // 24
  const baseY = CHAR_H - 2; // 78
  const isWalking = anim.startsWith("walk");
  const pose = isWalking ? WALK_POSES[frame % 8] : null;
  const bob = pose ? pose.bob : 0;
  const facingRight = anim === "walk-right" || anim === "hack" || anim === "keypad";
  const facingLeft = anim === "walk-left";
  const facingUp = anim === "walk-up";
  const blinking = anim === "idle" && frame === 2;
  const isHack = anim === "hack";
  const isKeypad = anim === "keypad";
  const isCaptured = anim === "captured";
  const legDir = facingLeft ? -1 : 1;

  if (isCaptured) {
    drawMayaCaptured(ctx, cx, baseY, frame);
    return;
  }

  if (anim === "crawl-right") {
    drawMayaCrawl(ctx, cx, baseY, frame);
    return;
  }

  // ── Anatomy landmarks (5-head model, 48x80) ──
  // Head: 14px, neck: 3px, torso: 20px, belt: 3px, legs: 20px, boots: 8px = 68px
  const feetY = baseY;                          // 78
  const bootTopY = feetY - 8 + bob;             // 70
  const kneeY = feetY - 18 + bob;               // 60
  const hipY = feetY - 28 + bob;                // 50
  const beltY = hipY - 3;                       // 47
  const waistY = hipY - 8;                      // 42
  const chestY = hipY - 15;                     // 35
  const shoulderY = hipY - 20;                  // 30
  const neckTopY = shoulderY - 3;               // 27
  const chinY = neckTopY - 1;                   // 26
  const headTopY = chinY - 13;                  // 13
  const hairTopY = headTopY - 5;                // 8

  // Per-leg offsets
  const lOff = pose ? pose.leftLeg * legDir : 0;
  const rOff = pose ? pose.rightLeg * legDir : 0;
  const lKnee = pose ? pose.leftKnee : 0;
  const rKnee = pose ? pose.rightKnee : 0;

  // ── Drop shadow ──
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ═══════════════ BOOTS ═══════════════
  // Left boot — chunky combat style with sole + lace detail
  const lbx = cx - 7 + lOff;
  const lby = bootTopY - lKnee;
  drawBoot(ctx, lbx, lby, 8, 8 + lKnee, false);

  // Right boot
  const rbx = cx + rOff;
  const rby = bootTopY - rKnee;
  drawBoot(ctx, rbx, rby, 8, 8 + rKnee, true);

  // ═══════════════ LEGS (cargo pants) ═══════════════
  const pantsDk = "#252d3e";
  const pantsMd = "#2e384a";
  const pantsLt = "#3a4560";
  const pantsHl = "#485878";

  // Left leg — tapered: 8px at thigh, 6px at knee
  const llH = 20 - lKnee;
  drawTaperedLimb(ctx, cx - 8 + lOff, hipY, 8, cx - 7 + lOff, hipY + llH, 6, llH, pantsDk, pantsMd, pantsLt);
  // Cargo pocket
  ctx.fillStyle = "#1e2838";
  ctx.fillRect(cx - 8 + lOff, hipY + 6, 6, 5);
  ctx.fillStyle = pantsHl;
  ctx.fillRect(cx - 8 + lOff, hipY + 6, 6, 1);
  ctx.fillStyle = "#16202e";
  ctx.fillRect(cx - 7 + lOff, hipY + 8, 4, 1); // pocket flap shadow
  // Knee crease
  ctx.fillStyle = pantsDk;
  ctx.fillRect(cx - 7 + lOff, hipY + llH - 3, 5, 1);

  // Right leg
  const rlH = 20 - rKnee;
  drawTaperedLimb(ctx, cx + 1 + rOff, hipY, 8, cx + 1 + rOff, hipY + rlH, 6, rlH, pantsMd, pantsDk, pantsLt);
  // Cargo pocket
  ctx.fillStyle = "#1e2838";
  ctx.fillRect(cx + 2 + rOff, hipY + 6, 6, 5);
  ctx.fillStyle = pantsHl;
  ctx.fillRect(cx + 2 + rOff, hipY + 6, 6, 1);
  ctx.fillStyle = "#16202e";
  ctx.fillRect(cx + 3 + rOff, hipY + 8, 4, 1);
  // Knee crease
  ctx.fillStyle = pantsDk;
  ctx.fillRect(cx + 2 + rOff, hipY + rlH - 3, 5, 1);

  // ── Belt ──
  ctx.fillStyle = "#1a1e26";
  ctx.fillRect(cx - 8, beltY, 16, 3);
  ctx.fillStyle = "#484848";
  ctx.fillRect(cx - 1, beltY + 1, 3, 2); // buckle
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(cx, beltY + 1, 1, 1); // buckle highlight

  // ═══════════════ TORSO ═══════════════
  // Shaped torso — wider at shoulders, narrower at waist
  // Tank top base
  const tankDk = "#4a525e";
  const tankMd = "#5e6878";
  const tankLt = "#728090";

  // Tank top — shaped: wide at chest, narrow at waist
  for (let row = 0; row < 20; row++) {
    const y = shoulderY + row;
    // Width interpolation: 20px at shoulders → 14px at waist
    const t = row / 19;
    const halfW = Math.round(10 - t * 3); // 10 → 7
    const shade = row < 7 ? tankLt : row < 14 ? tankMd : tankDk;
    ctx.fillStyle = shade;
    ctx.fillRect(cx - halfW, y, halfW * 2, 1);
  }

  // Tank top neckline (V-shape)
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 3, shoulderY, 6, 3);
  ctx.fillStyle = tankLt;
  ctx.fillRect(cx - 4, shoulderY + 2, 1, 1);
  ctx.fillRect(cx + 3, shoulderY + 2, 1, 1);

  // Tank top shading — left lighter (light source), right darker
  for (let row = 3; row < 18; row++) {
    const y = shoulderY + row;
    const t = row / 19;
    const halfW = Math.round(10 - t * 3);
    ctx.fillStyle = tankLt;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(cx - halfW, y, 3, 1); // light edge
    ctx.fillStyle = tankDk;
    ctx.fillRect(cx + halfW - 3, y, 3, 1); // shadow edge
    ctx.globalAlpha = 1;
  }

  // ── Hoodie (open, hanging on sides) ──
  // Left panel
  for (let row = 0; row < 22; row++) {
    const y = shoulderY - 2 + row;
    const w = row < 3 ? 5 : row < 18 ? 6 : 5; // shaped bottom
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx - 10 - w + 3, y, w, 1);
  }
  // Left panel shading
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 13, shoulderY, 2, 18);
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 8, shoulderY + 2, 2, 16);

  // Right panel
  for (let row = 0; row < 22; row++) {
    const y = shoulderY - 2 + row;
    const w = row < 3 ? 5 : row < 18 ? 6 : 5;
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx + 7, y, w, 1);
  }
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx + 7, shoulderY + 2, 2, 16);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx + 11, shoulderY, 2, 18);

  // Hoodie zipper accent lines
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(cx - 8, shoulderY + 2, 1, 16);
  ctx.fillRect(cx + 7, shoulderY + 2, 1, 16);

  // Hood (folded behind neck)
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 10, shoulderY - 3, 20, 4);
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx - 9, shoulderY - 3, 18, 1);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 8, shoulderY - 1, 16, 2);

  // Hoodie bottom hem
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 13, beltY - 1, 6, 2);
  ctx.fillRect(cx + 7, beltY - 1, 6, 2);
  // Pocket slit on left panel
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(cx - 13, shoulderY + 12, 5, 1);

  // ═══════════════ ARMS ═══════════════
  if (isHack) {
    drawMayaHackArms(ctx, cx, shoulderY, frame);
  } else if (isKeypad) {
    drawMayaKeypadArms(ctx, cx, shoulderY, frame);
  } else {
    drawMayaArms(ctx, cx, shoulderY, pose);
  }

  // ═══════════════ NECK ═══════════════
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 3, neckTopY, 6, 3);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 2, neckTopY, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 2, neckTopY + 1, 1, 2);
  // Neck shadow from head
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(cx - 2, neckTopY, 4, 1);

  // ═══════════════ HEAD ═══════════════
  drawMayaHead(ctx, cx, headTopY, chinY, facingRight, facingLeft, facingUp, blinking);

  // ═══════════════ HAIR ═══════════════
  drawMayaHair(ctx, cx, hairTopY, headTopY, chinY);

  // ═══════════════ RIM LIGHT ═══════════════
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(cx + 9, headTopY + 2, 1, 12);      // head
  ctx.fillRect(cx + 13, shoulderY, 1, 20);         // hoodie
  ctx.fillRect(cx + 6 + rOff, hipY, 1, 20);        // leg
  ctx.globalAlpha = 1;
}

function drawMayaHead(
  ctx: CanvasRenderingContext2D,
  cx: number, headTopY: number, chinY: number,
  facingRight: boolean, facingLeft: boolean, facingUp: boolean, blinking: boolean,
) {
  // Face shape — rounded using layered rects
  // Row-by-row face shape for organic silhouette
  const faceRows: [number, number][] = [
    // [halfWidth offset, width] for each row from headTopY
    [4, 8],   // 0: forehead top (narrow)
    [5, 10],  // 1
    [6, 12],  // 2: forehead
    [7, 14],  // 3: wide
    [7, 14],  // 4: brow
    [7, 14],  // 5: eyes
    [7, 14],  // 6: eyes
    [7, 14],  // 7: eyes
    [7, 14],  // 8: cheeks
    [7, 14],  // 9: nose
    [7, 14],  // 10: nose
    [6, 12],  // 11: mouth
    [5, 10],  // 12: jaw
    [4, 8],   // 13: chin
  ];

  // Base face fill
  for (let i = 0; i < faceRows.length; i++) {
    const [hw] = faceRows[i];
    const y = headTopY + i;
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx - hw, y, hw * 2, 1);
  }

  // Face shading — light side (left), shadow side (right)
  for (let i = 2; i < 12; i++) {
    const [hw] = faceRows[i];
    const y = headTopY + i;
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - hw, y, 4, 1);
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx + hw - 4, y, 4, 1);
  }

  // Cheek warmth (subtle)
  ctx.fillStyle = "rgba(200,120,100,0.08)";
  ctx.fillRect(cx - 6, headTopY + 8, 3, 3);
  ctx.fillRect(cx + 4, headTopY + 8, 3, 3);

  // Jaw definition
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 4, headTopY + 11, 2, 2); // jaw shadow

  if (!facingUp) {
    const pOff = facingRight ? 1 : facingLeft ? -1 : 0;

    // ── EYES ──
    if (blinking) {
      ctx.fillStyle = C.hairDark;
      ctx.fillRect(cx - 6, headTopY + 6, 5, 1);
      ctx.fillRect(cx + 2, headTopY + 6, 5, 1);
    } else {
      // Eye whites — slightly taller for expressiveness
      ctx.fillStyle = "#e0e4e0";
      ctx.fillRect(cx - 6, headTopY + 5, 5, 4);
      ctx.fillRect(cx + 2, headTopY + 5, 5, 4);

      // Irises (bright green — Maya's signature)
      ctx.fillStyle = C.signalBright;
      ctx.fillRect(cx - 5 + pOff, headTopY + 6, 3, 3);
      ctx.fillRect(cx + 3 + pOff, headTopY + 6, 3, 3);

      // Pupils
      ctx.fillStyle = "#081408";
      ctx.fillRect(cx - 4 + pOff, headTopY + 7, 2, 2);
      ctx.fillRect(cx + 4 + pOff, headTopY + 7, 2, 2);

      // Iris glow
      ctx.shadowColor = "rgba(110,255,160,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = C.signalBright;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(cx - 5 + pOff, headTopY + 6, 3, 3);
      ctx.fillRect(cx + 3 + pOff, headTopY + 6, 3, 3);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Catch light
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 5 + pOff, headTopY + 5, 1, 1);
      ctx.fillRect(cx + 3 + pOff, headTopY + 5, 1, 1);

      // Upper eyelid / lash line
      ctx.fillStyle = C.hairDark;
      ctx.fillRect(cx - 6, headTopY + 5, 5, 1);
      ctx.fillRect(cx + 2, headTopY + 5, 5, 1);
      // Lower lash hint
      ctx.fillStyle = "rgba(16,20,24,0.3)";
      ctx.fillRect(cx - 5, headTopY + 9, 3, 1);
      ctx.fillRect(cx + 3, headTopY + 9, 3, 1);
    }

    // Eyebrows — slightly arched for determination
    ctx.fillStyle = C.hairMid;
    ctx.fillRect(cx - 6, headTopY + 4, 5, 1);
    ctx.fillRect(cx + 2, headTopY + 4, 5, 1);
    // Brow arch highlight
    ctx.fillStyle = C.hairDark;
    ctx.fillRect(cx - 7, headTopY + 4, 1, 1);
    ctx.fillRect(cx + 7, headTopY + 4, 1, 1);

    // Nose — bridge + tip with highlight
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx, headTopY + 9, 1, 1);    // bridge shadow
    ctx.fillRect(cx - 1, headTopY + 10, 3, 2); // nose body
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 1, headTopY + 10, 1, 1); // tip highlight
    // Nostril shadow
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(cx - 1, headTopY + 12, 1, 1);
    ctx.fillRect(cx + 1, headTopY + 12, 1, 1);

    // Mouth — defined lips
    ctx.fillStyle = "#8a5050";
    ctx.fillRect(cx - 2, headTopY + 12, 5, 1); // upper lip
    ctx.fillStyle = "#9a6060";
    ctx.fillRect(cx - 2, headTopY + 13, 5, 1); // lower lip
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 1, headTopY + 12, 3, 1); // lip highlight center
  }

  // ── Ears ──
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 8, headTopY + 5, 2, 5);
  ctx.fillRect(cx + 7, headTopY + 5, 2, 5);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx - 7, headTopY + 6, 1, 3); // inner ear shadow
  ctx.fillRect(cx + 8, headTopY + 6, 1, 3);
}

function drawMayaHair(
  ctx: CanvasRenderingContext2D,
  cx: number, hairTopY: number, headTopY: number, chinY: number,
) {
  // Full dark hair with volume — flows longer on left side

  // Crown volume
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx - 5, hairTopY, 11, 3);         // top
  ctx.fillRect(cx - 8, hairTopY + 2, 17, 5);     // main volume
  ctx.fillRect(cx - 9, hairTopY + 5, 4, 10);     // left flow
  ctx.fillRect(cx - 9, hairTopY + 12, 3, 12);    // left long (past shoulder)
  ctx.fillRect(cx + 7, hairTopY + 5, 3, 8);      // right side (shorter)

  // Mid-tone strands
  ctx.fillStyle = C.hairMid;
  ctx.fillRect(cx - 5, hairTopY + 2, 11, 5);
  ctx.fillRect(cx - 8, hairTopY + 5, 2, 7);
  ctx.fillRect(cx + 7, hairTopY + 5, 2, 5);
  // Individual strand detail
  ctx.fillRect(cx - 8, hairTopY + 14, 1, 6);
  ctx.fillRect(cx - 7, hairTopY + 16, 1, 4);

  // Sheen highlights
  ctx.fillStyle = C.hairHighlight;
  ctx.fillRect(cx - 3, hairTopY + 1, 3, 3);
  ctx.fillRect(cx + 3, hairTopY + 2, 2, 2);
  ctx.fillRect(cx - 8, hairTopY + 6, 1, 4);

  // ★ GREEN STREAK (right side — prominent, glowing)
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(cx + 2, hairTopY + 1, 5, 8);
  ctx.fillStyle = C.signalBright;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx + 3, hairTopY + 2, 3, 6);
  ctx.globalAlpha = 1;
  // Streak glow
  ctx.shadowColor = "rgba(110,255,160,0.6)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = C.signalBright;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(cx + 2, hairTopY + 1, 5, 8);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Bangs / fringe
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx - 6, headTopY - 1, 5, 4);  // left bangs
  ctx.fillStyle = C.hairMid;
  ctx.fillRect(cx - 5, headTopY, 3, 3);
  // Right bangs (shorter — streak shows through)
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx + 5, headTopY, 3, 3);

  // Parting line
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(cx + 1, hairTopY + 2, 1, 4);
}

function drawMayaArms(
  ctx: CanvasRenderingContext2D,
  cx: number, shoulderY: number,
  pose: WalkPose | null,
) {
  const leftSwing = pose ? pose.leftArm : 0;
  const rightSwing = pose ? pose.rightArm : 0;

  // Left arm: hoodie sleeve → skin forearm → hand
  const laY = shoulderY + 1 + leftSwing;
  // Upper arm (sleeve)
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx - 16, laY, 5, 9);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 16, laY, 1, 9);
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 12, laY + 2, 1, 7);
  // Forearm (skin) — tapered
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 15, laY + 9, 4, 7);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 15, laY + 9, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx - 12, laY + 10, 1, 6);
  // Elbow crease
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx - 14, laY + 9, 2, 1);
  // Hand — with thumb distinction
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 15, laY + 16, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 15, laY + 16, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx - 15, laY + 19, 1, 1); // thumb
  ctx.fillRect(cx - 13, laY + 20, 2, 1); // fingertips

  // Right arm
  const raY = shoulderY + 1 + rightSwing;
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx + 12, raY, 5, 9);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx + 16, raY, 1, 9);
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx + 12, raY + 2, 1, 7);
  // Forearm
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 12, raY + 9, 4, 7);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 12, raY + 9, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 12, raY + 10, 1, 6);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 13, raY + 9, 2, 1);
  // Hand
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 12, raY + 16, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 12, raY + 16, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 15, raY + 19, 1, 1);
  ctx.fillRect(cx + 12, raY + 20, 2, 1);
}

function drawMayaHackArms(
  ctx: CanvasRenderingContext2D,
  cx: number, shoulderY: number, frame: number,
) {
  // Arms forward, hands typing
  const hf = frame % 6;
  const lhY = (hf % 2 === 0) ? 1 : 0;
  const rhY = (hf % 2 === 1) ? 1 : 0;
  const lhX = hf < 2 ? 0 : hf < 4 ? 1 : -1;
  const rhX = hf < 2 ? 0 : hf < 4 ? -1 : 1;

  // Left arm reaching forward
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx + 9, shoulderY + 3, 6, 8);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 14, shoulderY + 4, 5, 5);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 14, shoulderY + 4, 5, 1);
  // Right arm
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx + 7, shoulderY + 7, 6, 8);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 12, shoulderY + 8, 5, 5);

  // Left hand — typing
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 18 + lhX, shoulderY + 5 + lhY, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 18 + lhX, shoulderY + 5 + lhY, 4, 1);
  if (lhY > 0) {
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx + 18 + lhX, shoulderY + 9 + lhY, 1, 1);
    ctx.fillRect(cx + 20 + lhX, shoulderY + 9 + lhY, 1, 1);
  }
  // Right hand
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 16 + rhX, shoulderY + 11 + rhY, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 16 + rhX, shoulderY + 11 + rhY, 4, 1);
  if (rhY > 0) {
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx + 16 + rhX, shoulderY + 15 + rhY, 1, 1);
    ctx.fillRect(cx + 18 + rhX, shoulderY + 15 + rhY, 1, 1);
  }
}

function drawMayaKeypadArms(
  ctx: CanvasRenderingContext2D,
  cx: number, shoulderY: number, frame: number,
) {
  // Standing upright, RIGHT arm extended forward/up to a wall keypad.
  // Left arm hangs at her side. 6 frames: finger jabs at different buttons.
  const hf = frame % 6;

  // Finger press offset — moves across keypad grid
  const fingerY = hf < 2 ? 0 : hf < 4 ? 1 : -1;   // vertical jab
  const fingerX = hf % 3 === 0 ? 0 : hf % 3 === 1 ? 1 : -1; // lateral shift
  const pressing = hf % 2 === 0; // finger pushes in on even frames

  // Left arm — hanging at side (idle position)
  const laY = shoulderY + 1;
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx - 16, laY, 5, 9);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 16, laY, 1, 9);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 15, laY + 9, 4, 7);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 15, laY + 9, 4, 1);
  // Hand
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 15, laY + 16, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 15, laY + 16, 4, 1);

  // Right arm — extended forward and UP to reach wall-mounted keypad
  // Upper arm (sleeve) — angled forward
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx + 10, shoulderY + 1, 6, 7);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx + 15, shoulderY + 1, 1, 7);
  // Forearm (skin) — reaching forward/up at ~45 degrees
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx + 14, shoulderY - 2, 5, 6);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx + 14, shoulderY - 2, 5, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 14, shoulderY - 1, 1, 5);

  // Hand/finger at keypad — index finger extended
  const handX = cx + 18 + fingerX;
  const handY = shoulderY - 5 + fingerY;
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(handX, handY, 4, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(handX, handY, 4, 1);

  // Index finger poking forward
  if (pressing) {
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(handX + 1, handY - 1, 2, 1); // finger tip pressing
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(handX + 1, handY - 1, 1, 1); // finger shadow
  } else {
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(handX + 1, handY - 2, 2, 2); // finger hovering
  }

  // Curled fingers (other 3 fingers)
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(handX, handY + 3, 3, 1);
}

function drawBoot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isRight: boolean) {
  // Combat boot: dark body + sole + lace detail + ankle cuff
  const soleH = 2;
  const bodyH = h - soleH;

  // Boot body
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(x, y, w, bodyH);
  // Ankle cuff (top)
  ctx.fillStyle = "#2a3040";
  ctx.fillRect(x, y, w, 2);
  // Tongue highlight
  ctx.fillStyle = "#323a48";
  ctx.fillRect(x + 2, y + 2, w - 4, bodyH - 2);
  // Lace eyelets
  ctx.fillStyle = "#484848";
  const eyeX = isRight ? x + 2 : x + w - 3;
  for (let i = 0; i < 3 && y + 2 + i * 2 < y + bodyH - 1; i++) {
    ctx.fillRect(eyeX, y + 2 + i * 2, 1, 1);
  }
  // Sole — wider, darker
  ctx.fillStyle = "#0e1014";
  ctx.fillRect(x - 1, y + bodyH, w + 1, soleH);
  // Sole tread
  ctx.fillStyle = "#060808";
  ctx.fillRect(x, y + bodyH + soleH - 1, w, 1);
  // Boot edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x, y, w, 1);
}

// ── Crawl animation — Maya nearly flat, army-crawling through tight vent ──
// 8-frame cycle: alternating arm-pull / knee-push, body very low
// Contact pattern: R-arm pull → L-knee push → L-arm pull → R-knee push
const CRAWL_POSES = [
  { armF:  6, armB: -4, legF: -5, legB:  7, bob: 0 },   // R-arm forward, L-leg back
  { armF:  3, armB: -2, legF: -3, legB:  5, bob: -1 },   // pulling in
  { armF: -1, armB:  1, legF:  0, legB:  2, bob: -2 },   // mid-pull, body dips
  { armF: -4, armB:  3, legF:  3, legB: -1, bob: -1 },   // arm back, knee forward
  { armF: -4, armB:  6, legF:  7, legB: -5, bob: 0 },    // L-arm forward, R-leg back
  { armF: -2, armB:  3, legF:  5, legB: -3, bob: -1 },   // pulling in
  { armF:  1, armB: -1, legF:  2, legB:  0, bob: -2 },   // mid-pull, body dips
  { armF:  3, armB: -4, legF: -1, legB:  3, bob: -1 },   // arm back, knee forward
];

function drawMayaCrawl(ctx: CanvasRenderingContext2D, cx: number, baseY: number, frame: number) {
  const pose = CRAWL_POSES[frame % 8];
  ctx.save();
  // Body nearly horizontal — low army crawl
  ctx.translate(cx, baseY - 6);
  ctx.rotate(0.55); // ~32° forward lean

  const bob = pose.bob;

  // ── Drop shadow (very wide, flat — body is almost on the ground) ──
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(2, 10 + bob, 20, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Back leg (trailing, bent at knee) ──
  const pantsDk = "#252d3e";
  const pantsMd = "#2e384a";
  const pantsLt = "#3a4560";
  // Thigh
  ctx.fillStyle = pantsDk;
  ctx.fillRect(-6 + pose.legF, 4 + bob, 5, 10);
  // Shin (angled back)
  ctx.fillStyle = pantsMd;
  ctx.fillRect(-10 + pose.legF, 8 + bob, 6, 5);
  // Boot
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(-14 + pose.legF, 9 + bob, 5, 4);
  ctx.fillStyle = "#141820";
  ctx.fillRect(-14 + pose.legF, 12 + bob, 5, 2); // sole

  // ── Front leg (pushing, knee bent more) ──
  // Thigh
  ctx.fillStyle = pantsMd;
  ctx.fillRect(-4 + pose.legB, 6 + bob, 5, 9);
  // Shin
  ctx.fillStyle = pantsLt;
  ctx.fillRect(-8 + pose.legB, 10 + bob, 5, 5);
  // Boot
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(-12 + pose.legB, 11 + bob, 5, 4);
  ctx.fillStyle = "#141820";
  ctx.fillRect(-12 + pose.legB, 14 + bob, 5, 2);

  // ── Belt ──
  ctx.fillStyle = "#1a1e26";
  ctx.fillRect(-5, 2 + bob, 10, 2);

  // ── Torso (flat, elongated — belly nearly on ground) ──
  const tankMd = "#5e6878";
  const tankDk = "#4a525e";
  const tankLt = "#728090";
  // Main torso — wider and flatter than upright
  ctx.fillStyle = tankMd;
  ctx.fillRect(-6, -6 + bob, 13, 10);
  ctx.fillStyle = tankLt;
  ctx.fillRect(-5, -6 + bob, 11, 2); // top highlight
  ctx.fillStyle = tankDk;
  ctx.fillRect(-5, 2 + bob, 11, 2); // bottom shadow

  // ── Hoodie (bunched, draped on sides) ──
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-9, -5 + bob, 4, 10);
  ctx.fillRect(6, -5 + bob, 4, 10);
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(-9, -5 + bob, 1, 10);
  ctx.fillRect(9, -5 + bob, 1, 10);
  // Hood bunched at neck
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(-5, -9 + bob, 10, 3);
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-4, -9 + bob, 8, 1);

  // ── Back arm (behind body) ──
  // Upper arm (sleeve)
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(-10 + pose.armB, -4 + bob, 4, 6);
  // Forearm (skin)
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(-14 + pose.armB, -2 + bob, 5, 4);
  // Hand (flat on ground)
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-16 + pose.armB, 0 + bob, 3, 3);

  // ── Front arm (reaching forward) ──
  // Upper arm (sleeve)
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(6 + pose.armF, -7 + bob, 5, 6);
  // Elbow
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(10 + pose.armF, -6 + bob, 3, 3);
  // Forearm (skin — reaching out)
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(12 + pose.armF, -7 + bob, 6, 4);
  // Hand (fingers spread, gripping)
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(17 + pose.armF, -7 + bob, 3, 3);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(19 + pose.armF, -6 + bob, 2, 2); // fingertips

  // ── Neck (short, compressed) ──
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(0, -10 + bob, 4, 3);

  // ── Head (tucked, chin down, looking forward) ──
  // Skull
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-2, -19 + bob, 10, 10);
  // Face — lighter on the forward-facing side
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(2, -18 + bob, 5, 5);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(-1, -17 + bob, 3, 4); // shadow side
  // Eyes (narrow, intense, looking right)
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(3, -16 + bob, 3, 1);
  ctx.fillRect(3, -14 + bob, 2, 1); // one visible eye (side view)
  // Brow (furrowed)
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(2, -17 + bob, 4, 1);
  // Mouth (clenched)
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(3, -12 + bob, 3, 1);

  // ── Hair (messy, hanging down, gravity pulling forward) ──
  ctx.fillStyle = C.hairDark;
  // Top of head
  ctx.fillRect(-3, -23 + bob, 12, 6);
  // Hanging strands (gravity — hair falls toward ground)
  ctx.fillRect(-4, -19 + bob, 3, 7);
  ctx.fillRect(-3, -17 + bob, 2, 5);
  // Back of head
  ctx.fillRect(-3, -21 + bob, 4, 8);
  // Signal-green streak (visible on top)
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(3, -23 + bob, 4, 4);
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(3, -20 + bob, 3, 2);

  ctx.restore();
}

function drawMayaCaptured(ctx: CanvasRenderingContext2D, cx: number, baseY: number, frame: number) {
  ctx.save();
  ctx.translate(cx, baseY - 40);
  ctx.rotate(frame === 0 ? -0.2 : -0.3);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(-10, 34, 20, 5);

  // Dangling legs
  ctx.fillStyle = "#2e384a";
  ctx.fillRect(-7, 22, 7, 16);
  ctx.fillRect(1, 24, 7, 14);
  // Boots
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(-7, 36, 8, 5);
  ctx.fillRect(1, 36, 8, 5);

  // Tank top body — shaped
  ctx.fillStyle = "#5e6878";
  ctx.fillRect(-8, 0, 16, 22);
  // Hoodie panels
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-14, 0, 7, 22);
  ctx.fillRect(7, 0, 7, 22);

  // Arms hanging
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-16, 4, 4, 12);
  ctx.fillRect(12, 2, 4, 12);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-16, 16, 4, 8);
  ctx.fillRect(12, 14, 4, 8);

  // Head drooped
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-6, -16, 12, 14);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(-5, -15, 5, 6);
  // Closed eyes
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(-4, -10, 3, 1);
  ctx.fillRect(2, -10, 3, 1);
  // Hair
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(-7, -22, 15, 9);
  ctx.fillRect(-8, -17, 3, 12);
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(2, -21, 5, 6);

  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
// GUARD — Heavy tactical armor, helmet with red visor,
//         bulkier frame, menacing silhouette
// ════════════════════════════════════════════════════════════════

function drawGuard(ctx: CanvasRenderingContext2D, anim: CharAnimation, frame: number) {
  const cx = CHAR_W / 2; // 24
  const baseY = CHAR_H - 2; // 78
  const isWalking = anim.startsWith("walk");
  const gPose = isWalking ? WALK_POSES[frame % 8] : null;
  const walkBob = gPose ? gPose.bob : 0;
  const gDir = anim === "walk-left" ? -1 : 1;

  // Anatomy — stockier than Maya, 4.5-head proportions
  const feetY = baseY;
  const bootTopY = feetY - 9 + walkBob;
  const hipY = feetY - 28 + walkBob;
  const beltY = hipY - 4;
  const shoulderY = hipY - 22;
  const headTopY = shoulderY - 18;

  const gLeftLeg = gPose ? gPose.leftLeg * gDir : 0;
  const gRightLeg = gPose ? gPose.rightLeg * gDir : 0;
  const gLeftKnee = gPose ? gPose.leftKnee : 0;
  const gRightKnee = gPose ? gPose.rightKnee : 0;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ═══════════════ BOOTS (heavy tactical) ═══════════════
  const lbH = 9 + gLeftKnee;
  const rbH = 9 + gRightKnee;
  drawGuardBoot(ctx, cx - 8 + gLeftLeg, bootTopY - gLeftKnee, 9, lbH);
  drawGuardBoot(ctx, cx + gRightLeg, bootTopY - gRightKnee, 9, rbH);

  // ═══════════════ LEGS (armored) ═══════════════
  const gllH = 19 - gLeftKnee;
  const grlH = 19 - gRightKnee;

  // Left leg
  drawTaperedLimb(ctx, cx - 8 + gLeftLeg, hipY, 9, cx - 7 + gLeftLeg, hipY + gllH, 7, gllH, C.guardDark, C.guardMid, C.guardLight);
  // Knee pad
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(cx - 8 + gLeftLeg, hipY + gllH - 5, 8, 4);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(cx - 8 + gLeftLeg, hipY + gllH - 5, 8, 1);
  // Thigh armor plate
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 8 + gLeftLeg, hipY + 2, 7, 6);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(cx - 8 + gLeftLeg, hipY + 7, 7, 1);

  // Right leg
  drawTaperedLimb(ctx, cx + 1 + gRightLeg, hipY, 9, cx + 1 + gRightLeg, hipY + grlH, 7, grlH, C.guardMid, C.guardDark, C.guardLight);
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(cx + 1 + gRightLeg, hipY + grlH - 5, 8, 4);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(cx + 1 + gRightLeg, hipY + grlH - 5, 8, 1);
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx + 2 + gRightLeg, hipY + 2, 7, 6);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(cx + 2 + gRightLeg, hipY + 7, 7, 1);

  // ═══════════════ BODY (heavy armor vest) ═══════════════
  // Wide armored torso
  const armorW = 24;
  const armorH = 22;
  const ax = cx - armorW / 2;

  // Base armor
  ctx.fillStyle = C.guardArmor;
  ctx.fillRect(ax, shoulderY, armorW, armorH);

  // Three-tone shading
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(ax, shoulderY, 8, armorH);
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(ax + 8, shoulderY, 8, armorH);
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(ax + 16, shoulderY, 8, armorH);

  // Chest plate segments
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 10, shoulderY + 2, 9, 10);
  ctx.fillRect(cx + 1, shoulderY + 2, 9, 10);
  // Plate top edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(cx - 10, shoulderY + 2, 9, 1);
  ctx.fillRect(cx + 1, shoulderY + 2, 9, 1);
  // Plate bottom shadow
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(cx - 10, shoulderY + 11, 9, 1);
  ctx.fillRect(cx + 1, shoulderY + 11, 9, 1);
  // Center gap between plates
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 1, shoulderY + 2, 2, 10);

  // Red center stripe (insignia)
  ctx.fillStyle = C.guardAccent;
  ctx.fillRect(cx - 1, shoulderY + 13, 2, 7);
  ctx.fillStyle = C.dangerBright;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(cx, shoulderY + 14, 1, 5);
  ctx.globalAlpha = 1;

  // Armor edge highlighting
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(ax, shoulderY, armorW, 1);

  // ── Utility belt ──
  ctx.fillStyle = "#0c0a0a";
  ctx.fillRect(cx - 12, beltY, 24, 4);
  // Belt buckle
  ctx.fillStyle = C.guardAccent;
  ctx.fillRect(cx - 2, beltY + 1, 4, 3);
  // Belt pouches
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 10, beltY + 1, 6, 3);
  ctx.fillRect(cx + 5, beltY + 1, 6, 3);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(cx - 10, beltY + 3, 6, 1);
  ctx.fillRect(cx + 5, beltY + 3, 6, 1);

  // ═══════════════ ARMS (armored, bulky) ═══════════════
  const armSwingL = gPose ? gPose.leftArm : 0;
  const armSwingR = gPose ? gPose.rightArm : 0;

  // Left arm
  const laY = shoulderY + 2 + armSwingL;
  drawGuardArm(ctx, cx - 18, laY, false);
  // Right arm
  const raY = shoulderY + 2 + armSwingR;
  drawGuardArm(ctx, cx + 12, raY, true);

  // Shoulder pads (over arms)
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(cx - 18, shoulderY - 1, 7, 5);
  ctx.fillRect(cx + 12, shoulderY - 1, 7, 5);
  // Shoulder highlight
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(cx - 18, shoulderY - 1, 7, 1);
  ctx.fillRect(cx + 12, shoulderY - 1, 7, 1);
  // Shoulder pad rivets
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(cx - 16, shoulderY + 1, 1, 1);
  ctx.fillRect(cx + 16, shoulderY + 1, 1, 1);

  // ═══════════════ HEAD (tactical helmet) ═══════════════
  drawGuardHelmet(ctx, cx, headTopY);

  // ═══════════════ RIM LIGHT (red) ═══════════════
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(cx + 9, headTopY, 1, 18);
  ctx.fillRect(cx + 12, shoulderY, 1, 22);
  ctx.fillRect(cx + 7 + gRightLeg, hipY, 1, 22);
  ctx.globalAlpha = 1;
}

function drawGuardHelmet(ctx: CanvasRenderingContext2D, cx: number, headTopY: number) {
  // Tactical helmet — angular, with visor and breathing grille

  // Helmet dome
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 10, headTopY - 3, 20, 5); // top ridge
  ctx.fillStyle = C.guardArmor;
  ctx.fillRect(cx - 9, headTopY, 18, 16);
  // Helmet shading
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 9, headTopY, 18, 4);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(cx - 10, headTopY - 3, 20, 1);

  // Side vents (dark slits)
  ctx.fillStyle = "#080606";
  ctx.fillRect(cx - 9, headTopY + 6, 3, 7);
  ctx.fillRect(cx + 7, headTopY + 6, 3, 7);
  // Vent lines
  ctx.fillStyle = "#121010";
  for (let vy = headTopY + 7; vy < headTopY + 12; vy += 2) {
    ctx.fillRect(cx - 8, vy, 1, 1);
    ctx.fillRect(cx + 8, vy, 1, 1);
  }

  // Visor (glowing red slit — the signature look)
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(cx - 7, headTopY + 6, 14, 4);
  // Visor glow
  ctx.shadowColor = "rgba(255,64,64,0.8)";
  ctx.shadowBlur = 8;
  ctx.fillRect(cx - 7, headTopY + 6, 14, 4);
  ctx.shadowBlur = 0;
  // Visor highlight streak
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(cx - 6, headTopY + 6, 5, 1);
  // Visor gradient (brighter center)
  ctx.fillStyle = "rgba(255,128,128,0.2)";
  ctx.fillRect(cx - 3, headTopY + 7, 6, 2);

  // Chin guard / breathing grille
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 7, headTopY + 12, 14, 4);
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 7, headTopY + 12, 14, 1);
  // Grille slits
  ctx.fillStyle = "#0a0808";
  for (let gx = cx - 5; gx <= cx + 5; gx += 3) {
    ctx.fillRect(gx, headTopY + 13, 2, 2);
  }

  // Comms antenna (right side)
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx + 9, headTopY - 2, 1, 5);
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(cx + 9, headTopY - 3, 1, 1); // tip blinks
}

function drawGuardArm(ctx: CanvasRenderingContext2D, x: number, y: number, isRight: boolean) {
  // Upper arm (armor)
  ctx.fillStyle = isRight ? C.guardMid : C.guardArmor;
  ctx.fillRect(x, y, 6, 9);
  ctx.fillStyle = isRight ? C.guardArmor : C.guardMid;
  ctx.fillRect(x, y, 2, 9);
  // Elbow guard
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(x, y + 9, 6, 3);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x, y + 9, 6, 1);
  // Forearm
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(x + 1, y + 12, 5, 7);
  // Glove
  ctx.fillStyle = "#0e0a0a";
  ctx.fillRect(x, y + 19, 6, 5);
  ctx.fillStyle = "#1a1414";
  ctx.fillRect(x + 1, y + 19, 4, 1); // glove cuff
  // Knuckle detail
  ctx.fillStyle = "#1e1818";
  ctx.fillRect(x + 1, y + 21, 4, 1);
}

function drawGuardBoot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Heavy tactical boot
  const soleH = 3;
  const bodyH = h - soleH;

  // Boot body
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(x, y, w, bodyH);
  // Boot cuff
  ctx.fillStyle = "#181818";
  ctx.fillRect(x, y, w, 2);
  // Shin guard
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(x + 1, y + 2, w - 2, bodyH - 3);
  // Boot strap
  ctx.fillStyle = "#222228";
  ctx.fillRect(x, y + Math.floor(bodyH / 2), w, 1);

  // Thick sole
  ctx.fillStyle = "#080808";
  ctx.fillRect(x - 1, y + bodyH, w + 1, soleH);
  // Tread
  ctx.fillStyle = "#040404";
  ctx.fillRect(x, y + bodyH + soleH - 1, w, 1);
}

// ════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ════════════════════════════════════════════════════════════════

function drawTaperedLimb(
  ctx: CanvasRenderingContext2D,
  topX: number, topY: number, topW: number,
  _botX: number, _botY: number, botW: number,
  height: number,
  colorL: string, colorR: string, _highlight: string,
) {
  // Draw a limb that tapers from topW to botW over height
  for (let row = 0; row < height; row++) {
    const t = row / Math.max(height - 1, 1);
    const w = Math.round(topW + (botW - topW) * t);
    const x = topX + Math.round((topW - w) * 0.5);
    const y = topY + row;
    const half = Math.ceil(w / 2);
    ctx.fillStyle = colorL;
    ctx.fillRect(x, y, half, 1);
    ctx.fillStyle = colorR;
    ctx.fillRect(x + half, y, w - half, 1);
  }
  // Top edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(topX, topY, topW, 1);
}
