// ── Character Painter v2 — detailed characters with Canvas 2D ──
// Maya: ~40x64 base size, properly proportioned.
// Drawn with layered shapes, gradients, and highlights.

import { C } from "./palette";

export type CharAnimation =
  | "idle"
  | "walk-right"
  | "walk-left"
  | "walk-down"
  | "walk-up"
  | "hack"
  | "captured";

const CHAR_W = 40;
const CHAR_H = 64;

const FRAME_COUNT: Record<CharAnimation, number> = {
  "idle": 4,
  "walk-right": 8,
  "walk-left": 8,
  "walk-down": 8,
  "walk-up": 8,
  "hack": 4,
  "captured": 2,
};

// ── Walk cycle pose data (8 frames) ──
// Proper walk cycle: Contact → Down → Passing → Up (per leg, offset by 4)
// Bob: lowest at Down (foot absorbs impact), highest at Up (push-off)
// Arms swing opposite to legs for natural counter-rotation.
interface WalkPose {
  bob: number;       // vertical body offset (negative = lower)
  leftLeg: number;   // horizontal offset from center (positive = forward for walk-right)
  rightLeg: number;
  leftArm: number;   // vertical offset for arm swing (negative = forward/up)
  rightArm: number;
  leftKnee: number;  // knee bend amount (0 = straight, positive = bent inward)
  rightKnee: number;
}

// Frame 0: Right Contact  (right foot strikes ground ahead, left behind)
// Frame 1: Right Down     (weight drops onto right, lowest point)
// Frame 2: Right Passing  (left leg swings past, body rising)
// Frame 3: Right Up       (push off right, highest point)
// Frame 4: Left Contact   (left foot strikes ground ahead)
// Frame 5: Left Down      (weight drops onto left, lowest point)
// Frame 6: Left Passing   (right leg swings past, body rising)
// Frame 7: Left Up        (push off left, highest point)
const WALK_POSES: WalkPose[] = [
  { bob:  0,  leftLeg: -2, rightLeg:  3, leftArm:  2, rightArm: -2, leftKnee: 0, rightKnee: 0 },  // 0: R contact
  { bob: -1,  leftLeg: -1, rightLeg:  2, leftArm:  1, rightArm: -1, leftKnee: 0, rightKnee: 0 },  // 1: R down
  { bob:  0,  leftLeg:  0, rightLeg:  0, leftArm:  0, rightArm:  0, leftKnee: 1, rightKnee: 0 },  // 2: R passing
  { bob:  1,  leftLeg:  1, rightLeg: -1, leftArm: -1, rightArm:  1, leftKnee: 0, rightKnee: 0 },  // 3: R up
  { bob:  0,  leftLeg:  3, rightLeg: -2, leftArm: -2, rightArm:  2, leftKnee: 0, rightKnee: 0 },  // 4: L contact
  { bob: -1,  leftLeg:  2, rightLeg: -1, leftArm: -1, rightArm:  1, leftKnee: 0, rightKnee: 0 },  // 5: L down
  { bob:  0,  leftLeg:  0, rightLeg:  0, leftArm:  0, rightArm:  0, leftKnee: 0, rightKnee: 1 },  // 6: L passing
  { bob:  1,  leftLeg: -1, rightLeg:  1, leftArm:  1, rightArm: -1, leftKnee: 0, rightKnee: 0 },  // 7: L up
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
// MAYA
// ════════════════════════════════════════════════════════════════

function drawMaya(ctx: CanvasRenderingContext2D, anim: CharAnimation, frame: number) {
  // Reference character style: natural proportions, visible skin, clothing variety.
  // Maya: dark hair with green streak, open hoodie over gray tank top,
  // dark cargo pants, combat boots. Athletic build.
  const cx = CHAR_W / 2; // 20
  const baseY = CHAR_H - 2; // 62
  const isWalking = anim.startsWith("walk");
  const pose = isWalking ? WALK_POSES[frame % 8] : null;
  const bob = pose ? pose.bob : 0;
  const facingRight = anim === "walk-right" || anim === "hack";
  const facingLeft = anim === "walk-left";
  const facingUp = anim === "walk-up";
  const blinking = anim === "idle" && frame === 2;
  const isHack = anim === "hack";
  const isCaptured = anim === "captured";
  // Flip leg direction for left-facing walk
  const legDir = facingLeft ? -1 : 1;

  if (isCaptured) {
    drawMayaCaptured(ctx, cx, baseY, frame);
    return;
  }

  // Proportions (40x64 canvas):
  // Head: 12x14 at top
  // Neck: 4px
  // Torso: 18px tall (hoodie open, tank top visible)
  // Legs: 18px
  // Boots: 6px

  const feetY = baseY;
  const legTopY = feetY - 24 + bob;
  const torsoTopY = legTopY - 18 + bob;
  const neckY = torsoTopY - 3 + bob;
  const headTopY = neckY - 14 + bob;

  // ── Drop shadow ──
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, 9, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Per-leg offsets from pose data
  const leftLegOff = pose ? pose.leftLeg * legDir : 0;
  const rightLegOff = pose ? pose.rightLeg * legDir : 0;
  const leftKnee = pose ? pose.leftKnee : 0;
  const rightKnee = pose ? pose.rightKnee : 0;

  // During passing pose, the trailing leg lifts slightly (knee bend)
  const leftBootLift = leftKnee > 0 ? leftKnee : 0;
  const rightBootLift = rightKnee > 0 ? rightKnee : 0;

  // ═══════════════ BOOTS ═══════════════
  // Left boot
  ctx.fillStyle = "#1a1e24";
  ctx.fillRect(cx - 6 + leftLegOff, feetY - 7 - leftBootLift, 8, 7);
  ctx.fillStyle = "#282e38";
  ctx.fillRect(cx - 6 + leftLegOff, feetY - 7 - leftBootLift, 8, 1);
  ctx.fillStyle = "#101418";
  ctx.fillRect(cx - 6 + leftLegOff, feetY - 1 - leftBootLift, 9, 1);
  ctx.fillStyle = "#484848";
  ctx.fillRect(cx - 4 + leftLegOff, feetY - 5 - leftBootLift, 4, 1);
  ctx.fillRect(cx - 4 + leftLegOff, feetY - 3 - leftBootLift, 4, 1);

  // Right boot
  ctx.fillStyle = "#1a1e24";
  ctx.fillRect(cx - 1 + rightLegOff, feetY - 7 - rightBootLift, 8, 7);
  ctx.fillStyle = "#282e38";
  ctx.fillRect(cx - 1 + rightLegOff, feetY - 7 - rightBootLift, 8, 1);
  ctx.fillStyle = "#101418";
  ctx.fillRect(cx - 1 + rightLegOff, feetY - 1 - rightBootLift, 9, 1);
  ctx.fillStyle = "#484848";
  ctx.fillRect(cx + 1 + rightLegOff, feetY - 5 - rightBootLift, 4, 1);
  ctx.fillRect(cx + 1 + rightLegOff, feetY - 3 - rightBootLift, 4, 1);

  // ═══════════════ LEGS (dark cargo pants) ═══════════════
  const legColor1 = "#2a3040";
  const legColor2 = "#222838";
  const legHL = "#363e50";

  // Left leg — adjust height for knee bend (passing leg is shorter due to bend)
  const llH = 17 - leftKnee;
  ctx.fillStyle = legColor1;
  ctx.fillRect(cx - 5 + leftLegOff, legTopY, 6, llH);
  ctx.fillStyle = legColor2;
  ctx.fillRect(cx - 2 + leftLegOff, legTopY, 3, llH);
  ctx.fillStyle = legHL;
  ctx.fillRect(cx - 5 + leftLegOff, legTopY, 1, llH);
  // Cargo pocket
  ctx.fillStyle = "#1e2430";
  ctx.fillRect(cx - 5 + leftLegOff, legTopY + 7, 5, 4);
  ctx.fillStyle = legHL;
  ctx.fillRect(cx - 5 + leftLegOff, legTopY + 7, 5, 1);

  // Right leg
  const rlH = 17 - rightKnee;
  ctx.fillStyle = legColor2;
  ctx.fillRect(cx + rightLegOff, legTopY, 6, rlH);
  ctx.fillStyle = legColor1;
  ctx.fillRect(cx + rightLegOff + 3, legTopY, 3, rlH);
  ctx.fillStyle = legHL;
  ctx.fillRect(cx + rightLegOff, legTopY, 1, rlH);
  // Cargo pocket
  ctx.fillStyle = "#1e2430";
  ctx.fillRect(cx + rightLegOff + 1, legTopY + 7, 5, 4);
  ctx.fillStyle = legHL;
  ctx.fillRect(cx + rightLegOff + 1, legTopY + 7, 5, 1);

  // Belt
  ctx.fillStyle = "#1a1e24";
  ctx.fillRect(cx - 7, legTopY - 1, 14, 3);
  ctx.fillStyle = "#484848";
  ctx.fillRect(cx - 1, legTopY, 3, 2); // buckle

  // ═══════════════ TORSO ═══════════════
  // Open hoodie over gray tank top — the key to visual variety

  // Tank top / undershirt (lighter gray — provides contrast)
  const tankDark = "#505860";
  const tankMid = "#687078";
  const tankLight = "#808890";
  ctx.fillStyle = tankMid;
  ctx.fillRect(cx - 7, torsoTopY + 2, 14, 16);
  ctx.fillStyle = tankLight;
  ctx.fillRect(cx - 6, torsoTopY + 2, 4, 16); // light side
  ctx.fillStyle = tankDark;
  ctx.fillRect(cx + 3, torsoTopY + 2, 4, 16); // shadow side
  // Tank top neckline
  ctx.fillStyle = tankLight;
  ctx.fillRect(cx - 5, torsoTopY + 2, 10, 1);

  // Open hoodie (hangs on sides, doesn't cover chest center)
  // Left side of hoodie
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx - 12, torsoTopY, 7, 18);
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 12, torsoTopY, 2, 18); // outer highlight
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 6, torsoTopY + 3, 2, 15); // inner edge

  // Right side of hoodie
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx + 6, torsoTopY, 7, 18);
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx + 6, torsoTopY + 3, 2, 15); // inner edge
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx + 11, torsoTopY, 2, 18); // outer highlight

  // Hoodie zipper edges (green accent where hoodie opens)
  ctx.fillStyle = C.hoodieAccent;
  ctx.fillRect(cx - 6, torsoTopY + 3, 1, 14);
  ctx.fillRect(cx + 6, torsoTopY + 3, 1, 14);

  // Hoodie hood behind neck (folded down)
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 8, torsoTopY - 2, 16, 4);
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(cx - 7, torsoTopY - 2, 14, 1);
  // Hood collar bump
  ctx.fillStyle = C.hoodieLight;
  ctx.fillRect(cx - 6, torsoTopY, 12, 2);

  // Hoodie pocket on left side
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(cx - 11, torsoTopY + 10, 5, 1);

  // Hoodie hem (bottom edge)
  ctx.fillStyle = C.hoodieDark;
  ctx.fillRect(cx - 12, torsoTopY + 16, 7, 2);
  ctx.fillRect(cx + 6, torsoTopY + 16, 7, 2);

  // ═══════════════ ARMS ═══════════════
  if (isHack) {
    // Arms reaching forward (typing)
    // Left arm: hoodie sleeve → forearm skin → hand
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx + 8, torsoTopY + 4, 5, 8);
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx + 12, torsoTopY + 4, 5, 4);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx + 12, torsoTopY + 4, 5, 1);
    // Right arm
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx + 6, torsoTopY + 7, 5, 8);
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx + 10, torsoTopY + 8, 5, 4);
    // Hands
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx + 16, torsoTopY + 5, 4, 4);
    ctx.fillRect(cx + 14, torsoTopY + 10, 4, 4);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx + 16, torsoTopY + 5, 4, 1);
  } else {
    // Arms swing opposite to legs (counter-rotation)
    const leftArmSwing = pose ? pose.leftArm : 0;
    const rightArmSwing = pose ? pose.rightArm : 0;

    // Left arm: hoodie sleeve (upper) → bare forearm (lower) → hand
    const laY = torsoTopY + 2 + leftArmSwing;
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx - 15, laY, 5, 8); // sleeve
    ctx.fillStyle = C.hoodieLight;
    ctx.fillRect(cx - 15, laY, 1, 8);
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx - 15, laY + 8, 5, 6); // forearm
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 15, laY + 8, 5, 1); // skin highlight
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx - 11, laY + 8, 1, 6); // shadow edge
    // Hand
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx - 15, laY + 14, 5, 4);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 15, laY + 14, 5, 1);

    // Right arm
    const raY = torsoTopY + 2 + rightArmSwing;
    ctx.fillStyle = C.hoodieMid;
    ctx.fillRect(cx + 11, raY, 5, 8);
    ctx.fillStyle = C.hoodieLight;
    ctx.fillRect(cx + 15, raY, 1, 8);
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx + 11, raY + 8, 5, 6);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx + 11, raY + 8, 5, 1);
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx + 11, raY + 8, 1, 6);
    // Hand
    ctx.fillStyle = C.skinMid;
    ctx.fillRect(cx + 11, raY + 14, 5, 4);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx + 11, raY + 14, 5, 1);
  }

  // ═══════════════ NECK ═══════════════
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 3, neckY, 6, 4);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 2, neckY, 4, 1);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 2, neckY + 1, 1, 3);

  // ═══════════════ HEAD ═══════════════
  // Face — rounded shape using layered rects
  // Main face
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 6, headTopY + 2, 12, 12);
  // Wider in middle
  ctx.fillRect(cx - 7, headTopY + 4, 14, 8);
  // Chin (narrower)
  ctx.fillRect(cx - 5, headTopY + 12, 10, 2);

  // Face shading (light left, shadow right)
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(cx - 6, headTopY + 3, 5, 8);
  ctx.fillRect(cx - 5, headTopY + 2, 4, 2);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx + 3, headTopY + 4, 4, 8);

  // Cheek warmth
  ctx.fillStyle = "rgba(200,120,100,0.1)";
  ctx.fillRect(cx - 6, headTopY + 8, 3, 3);
  ctx.fillRect(cx + 4, headTopY + 8, 3, 3);

  if (!facingUp) {
    // ── EYES (expressive, with whites) ──
    if (blinking) {
      ctx.fillStyle = C.hairDark;
      ctx.fillRect(cx - 5, headTopY + 6, 4, 1);
      ctx.fillRect(cx + 2, headTopY + 6, 4, 1);
    } else {
      const pOff = facingRight ? 1 : facingLeft ? -1 : 0;

      // Eye whites
      ctx.fillStyle = "#e8ece8";
      ctx.fillRect(cx - 6, headTopY + 5, 5, 4);
      ctx.fillRect(cx + 2, headTopY + 5, 5, 4);

      // Irises (bright green)
      ctx.fillStyle = C.signalBright;
      ctx.fillRect(cx - 5 + pOff, headTopY + 6, 3, 3);
      ctx.fillRect(cx + 3 + pOff, headTopY + 6, 3, 3);

      // Pupils
      ctx.fillStyle = "#081408";
      ctx.fillRect(cx - 4 + pOff, headTopY + 7, 2, 2);
      ctx.fillRect(cx + 4 + pOff, headTopY + 7, 2, 2);

      // Eye glow (subtle)
      ctx.shadowColor = "rgba(110,255,160,0.4)";
      ctx.shadowBlur = 3;
      ctx.fillStyle = C.signalBright;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(cx - 5 + pOff, headTopY + 6, 3, 3);
      ctx.fillRect(cx + 3 + pOff, headTopY + 6, 3, 3);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Eye catch light
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 5 + pOff, headTopY + 5, 1, 1);
      ctx.fillRect(cx + 3 + pOff, headTopY + 5, 1, 1);

      // Upper eyelid / lash line
      ctx.fillStyle = C.hairDark;
      ctx.fillRect(cx - 6, headTopY + 5, 5, 1);
      ctx.fillRect(cx + 2, headTopY + 5, 5, 1);
    }

    // Eyebrows (expressive)
    ctx.fillStyle = C.hairMid;
    ctx.fillRect(cx - 6, headTopY + 4, 5, 1);
    ctx.fillRect(cx + 2, headTopY + 4, 5, 1);

    // Nose
    ctx.fillStyle = C.skinDark;
    ctx.fillRect(cx, headTopY + 9, 2, 2);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 1, headTopY + 9, 1, 1); // nose highlight

    // Mouth
    ctx.fillStyle = "#8a5050";
    ctx.fillRect(cx - 2, headTopY + 12, 5, 1);
    ctx.fillStyle = C.skinLight;
    ctx.fillRect(cx - 1, headTopY + 13, 3, 1); // lower lip
  }

  // ── Ears ──
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(cx - 8, headTopY + 6, 2, 4);
  ctx.fillRect(cx + 7, headTopY + 6, 2, 4);
  ctx.fillStyle = C.skinDark;
  ctx.fillRect(cx - 7, headTopY + 7, 1, 2);
  ctx.fillRect(cx + 8, headTopY + 7, 1, 2);

  // ═══════════════ HAIR ═══════════════
  // Full, voluminous dark hair — flows down past shoulders on left

  // Hair top (rounded, voluminous)
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx - 6, headTopY - 5, 13, 3); // top crown
  ctx.fillRect(cx - 8, headTopY - 3, 17, 5); // main volume (wider)
  ctx.fillRect(cx - 9, headTopY, 4, 8);       // left side flowing down
  ctx.fillRect(cx - 9, headTopY + 6, 3, 10);  // left long (past shoulder)
  ctx.fillRect(cx + 7, headTopY, 3, 7);       // right side (shorter)

  // Hair mid tones (visible strands for texture)
  ctx.fillStyle = C.hairMid;
  ctx.fillRect(cx - 6, headTopY - 3, 13, 4);
  ctx.fillRect(cx - 8, headTopY + 1, 2, 6);
  ctx.fillRect(cx + 7, headTopY + 1, 2, 4);

  // Hair highlights (sheen)
  ctx.fillStyle = C.hairHighlight;
  ctx.fillRect(cx - 4, headTopY - 4, 3, 3);
  ctx.fillRect(cx + 2, headTopY - 3, 2, 2);
  ctx.fillRect(cx - 8, headTopY + 2, 1, 4);

  // ★ SIGNATURE GREEN STREAK (prominent, right side)
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(cx + 2, headTopY - 4, 4, 7);
  ctx.fillStyle = C.signalBright;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx + 3, headTopY - 3, 2, 5);
  ctx.globalAlpha = 1;
  // Streak glow
  ctx.shadowColor = "rgba(110,255,160,0.6)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = C.signalBright;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(cx + 2, headTopY - 4, 4, 7);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Bangs / fringe
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx - 6, headTopY, 5, 4);  // left bangs
  ctx.fillStyle = C.hairMid;
  ctx.fillRect(cx - 5, headTopY, 3, 3);  // lighter bangs layer
  // Right bangs (shorter, showing green streak)
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(cx + 5, headTopY + 1, 3, 2);

  // ═══════════════ RIM LIGHT ═══════════════
  // Green edge light from environment (right side)
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = C.signalBright;
  // Head
  ctx.fillRect(cx + 8, headTopY + 2, 1, 10);
  // Body
  ctx.fillRect(cx + 12, torsoTopY, 1, 18);
  // Arm
  ctx.fillRect(cx + 15, torsoTopY + 2, 1, 14);
  // Leg
  ctx.fillRect(cx + 5 + rightLegOff, legTopY, 1, 17);
  ctx.globalAlpha = 1;
}

function drawMayaCaptured(ctx: CanvasRenderingContext2D, cx: number, baseY: number, frame: number) {
  ctx.save();
  ctx.translate(cx, baseY - 32);
  ctx.rotate(frame === 0 ? -0.2 : -0.3);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-10, 28, 20, 5);

  // Dangling legs (cargo pants)
  ctx.fillStyle = "#2a3040";
  ctx.fillRect(-6, 18, 6, 14);
  ctx.fillRect(1, 20, 6, 12);
  // Boots
  ctx.fillStyle = "#1a1e24";
  ctx.fillRect(-6, 30, 7, 4);
  ctx.fillRect(1, 30, 7, 4);

  // Tank top body
  ctx.fillStyle = "#687078";
  ctx.fillRect(-7, 0, 14, 18);
  // Hoodie sides hanging
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-12, 0, 6, 18);
  ctx.fillRect(7, 0, 6, 18);

  // Arms hanging limp
  ctx.fillStyle = C.hoodieMid;
  ctx.fillRect(-14, 4, 4, 10);
  ctx.fillRect(10, 2, 4, 10);
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-14, 14, 4, 6);
  ctx.fillRect(10, 12, 4, 6);

  // Head drooped
  ctx.fillStyle = C.skinMid;
  ctx.fillRect(-6, -15, 12, 14);
  ctx.fillStyle = C.skinLight;
  ctx.fillRect(-5, -14, 5, 6);
  // Closed eyes
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(-4, -9, 3, 1);
  ctx.fillRect(2, -9, 3, 1);
  // Hair
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(-7, -20, 15, 8);
  ctx.fillRect(-8, -16, 3, 10);
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(2, -19, 4, 5);

  ctx.restore();
}

// ════════════════════════════════════════════════════════════════
// GUARD
// ════════════════════════════════════════════════════════════════

function drawGuard(ctx: CanvasRenderingContext2D, anim: CharAnimation, frame: number) {
  const cx = CHAR_W / 2; // 20
  const baseY = CHAR_H - 2; // 62
  const isWalking = anim.startsWith("walk");
  const gPose = isWalking ? WALK_POSES[frame % 8] : null;
  const walkBob = gPose ? gPose.bob : 0;
  const gDir = anim === "walk-left" ? -1 : 1;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 1, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyY = baseY - 38 + walkBob;
  const headY = bodyY - 18 + walkBob;
  const gLeftLeg = gPose ? gPose.leftLeg * gDir : 0;
  const gRightLeg = gPose ? gPose.rightLeg * gDir : 0;
  const gLeftKnee = gPose ? gPose.leftKnee : 0;
  const gRightKnee = gPose ? gPose.rightKnee : 0;
  const gLeftBootLift = gLeftKnee > 0 ? gLeftKnee : 0;
  const gRightBootLift = gRightKnee > 0 ? gRightKnee : 0;

  // ── Legs (bulky armored) ──
  const gllH = 17 - gLeftKnee;
  const grlH = 17 - gRightKnee;
  drawLimb(ctx, cx - 6 + gLeftLeg, baseY - 26, 7, gllH, C.guardDark, C.guardMid);
  drawLimb(ctx, cx + 1 + gRightLeg, baseY - 26, 7, grlH, C.guardMid, C.guardDark);
  // Knee pads
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(cx - 6 + gLeftLeg, baseY - 18, 7, 3);
  ctx.fillRect(cx + 1 + gRightLeg, baseY - 18, 7, 3);
  // Heavy boots
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(cx - 7 + gLeftLeg, baseY - 9 - gLeftBootLift, 8, 8);
  ctx.fillRect(cx + gRightLeg, baseY - 9 - gRightBootLift, 8, 8);
  ctx.fillStyle = "#161616";
  ctx.fillRect(cx - 7 + gLeftLeg, baseY - 9 - gLeftBootLift, 8, 1);
  ctx.fillRect(cx + gRightLeg, baseY - 9 - gRightBootLift, 8, 1);
  // Boot sole
  ctx.fillStyle = "#060606";
  ctx.fillRect(cx - 8 + gLeftLeg, baseY - 1 - gLeftBootLift, 9, 2);
  ctx.fillRect(cx + gRightLeg, baseY - 1 - gRightBootLift, 9, 2);

  // ── Body (heavy armor) ──
  drawBody(ctx, cx - 11, bodyY, 22, 20, C.guardArmor, C.guardMid, C.guardLight);

  // Chest armor plates
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 10, bodyY + 2, 9, 10);
  ctx.fillRect(cx + 1, bodyY + 2, 9, 10);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(cx - 10, bodyY + 2, 9, 1);
  ctx.fillRect(cx + 1, bodyY + 2, 9, 1);
  // Plate edge detail
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(cx - 10, bodyY + 11, 9, 1);
  ctx.fillRect(cx + 1, bodyY + 11, 9, 1);

  // Red center stripe
  ctx.fillStyle = C.guardAccent;
  ctx.fillRect(cx - 1, bodyY + 2, 2, 16);
  ctx.fillStyle = C.dangerBright;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(cx, bodyY + 3, 1, 14);
  ctx.globalAlpha = 1;

  // Utility belt
  ctx.fillStyle = "#0c0808";
  ctx.fillRect(cx - 11, bodyY + 16, 22, 4);
  ctx.fillStyle = C.guardAccent;
  ctx.fillRect(cx - 2, bodyY + 16, 4, 4);
  // Belt pouches
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 9, bodyY + 17, 5, 3);
  ctx.fillRect(cx + 5, bodyY + 17, 5, 3);

  // ── Arms (armored) ──
  drawLimb(ctx, cx - 15, bodyY + 2, 5, 17, C.guardArmor, C.guardMid);
  drawLimb(ctx, cx + 11, bodyY + 2, 5, 17, C.guardMid, C.guardArmor);
  // Shoulder pads (larger)
  ctx.fillStyle = C.guardLight;
  ctx.fillRect(cx - 16, bodyY, 6, 5);
  ctx.fillRect(cx + 11, bodyY, 6, 5);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(cx - 16, bodyY, 6, 1);
  ctx.fillRect(cx + 11, bodyY, 6, 1);
  // Elbow guards
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 15, bodyY + 10, 5, 3);
  ctx.fillRect(cx + 11, bodyY + 10, 5, 3);
  // Gloves
  ctx.fillStyle = "#0e0808";
  ctx.fillRect(cx - 15, bodyY + 17, 5, 5);
  ctx.fillRect(cx + 11, bodyY + 17, 5, 5);

  // ── HEAD (helmet) ──
  ctx.fillStyle = C.guardArmor;
  ctx.fillRect(cx - 8, headY, 16, 16);
  // Helmet top ridge
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 8, headY, 16, 4);
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 9, headY - 3, 18, 5);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(cx - 9, headY - 3, 18, 1);
  // Side vents
  ctx.fillStyle = "#0a0606";
  ctx.fillRect(cx - 8, headY + 6, 3, 6);
  ctx.fillRect(cx + 6, headY + 6, 3, 6);

  // Visor (glowing red slit — WIDER)
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(cx - 6, headY + 6, 12, 4);
  ctx.shadowColor = "rgba(255,64,64,0.8)";
  ctx.shadowBlur = 8;
  ctx.fillRect(cx - 6, headY + 6, 12, 4);
  ctx.shadowBlur = 0;
  // Visor highlight
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(cx - 5, headY + 6, 4, 1);

  // Chin guard / jaw plate
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(cx - 6, headY + 12, 12, 4);
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(cx - 6, headY + 12, 12, 1);

  // ── Rim light (red) ──
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(cx + 8, headY, 1, 16);
  ctx.fillRect(cx + 11, bodyY, 1, 20);
  ctx.fillRect(cx + 6 + gRightLeg, baseY - 26, 1, 20);
  ctx.globalAlpha = 1;
}

// ════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ════════════════════════════════════════════════════════════════

function drawLimb(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  colorL: string, colorR: string,
) {
  // Two-tone limb (left side lighter, right darker)
  const half = Math.ceil(w / 2);
  ctx.fillStyle = colorL;
  ctx.fillRect(x, y, half, h);
  ctx.fillStyle = colorR;
  ctx.fillRect(x + half, y, w - half, h);
  // Top highlight
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x, y, w, 1);
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dark: string, mid: string, light: string,
) {
  // Three-tone body: left shadow → mid → right highlight
  const third = Math.ceil(w / 3);
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, third, h);
  ctx.fillStyle = mid;
  ctx.fillRect(x + third, y, third, h);
  ctx.fillStyle = light;
  ctx.fillRect(x + third * 2, y, w - third * 2, h);
  // Top edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x, y, w, 1);
  // Bottom edge shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y + h - 1, w, 1);
}
