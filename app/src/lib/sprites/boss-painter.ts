// ── Boss Painter — The Lockmaster ──
// A wall-mounted security mainframe: central monitor "eye", mechanical arms,
// status LED grid, weapon attachments. Painted at 64x80 base, scaled up.
// NOT humanoid — think industrial control panel that came alive.

import { C } from "./palette";

const BOSS_W = 64;
const BOSS_H = 80;

export type BossAnimation =
  | "idle"
  | "charge"
  | "hit-react"
  | "attack"
  | "low-hp"
  | "defeat";

const BOSS_FRAME_COUNT: Record<BossAnimation, number> = {
  "idle": 4,
  "charge": 6,
  "hit-react": 4,
  "attack": 4,
  "low-hp": 4,
  "defeat": 6,
};

// Boss-specific palette
const B = {
  chassisDark: "#1a1020",
  chassisMid: "#2a1830",
  chassisLight: "#3e2848",
  chassisEdge: "#4a3458",
  eyeOff: "#201828",
  eyeGlow: "#ff4040",
  eyeDim: "#aa2020",
  eyeBright: "#ff6060",
  armDark: "#241838",
  armMid: "#3a2850",
  armLight: "#4e3868",
  armJoint: "#5a4878",
  ledGreen: "#40ff80",
  ledYellow: "#ffcc00",
  ledRed: "#ff4040",
  ledOff: "#181020",
  chargeGlow: "#ffaa00",
  sparkWhite: "#ffe8c0",
  sparkYellow: "#ffcc40",
};

export function paintBossFrames(
  animation: BossAnimation,
  scale: number = 3,
  hpPercent: number = 100
): HTMLCanvasElement[] {
  const count = BOSS_FRAME_COUNT[animation];
  return Array.from({ length: count }, (_, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = BOSS_W * scale;
    canvas.height = BOSS_H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    drawLockmaster(ctx, animation, i, hpPercent);
    return canvas;
  });
}

function drawLockmaster(
  ctx: CanvasRenderingContext2D,
  anim: BossAnimation,
  frame: number,
  hpPercent: number
) {
  const cx = BOSS_W / 2; // 32
  const baseY = BOSS_H - 4;
  const isLow = hpPercent <= 30 || anim === "low-hp";
  const isDefeated = anim === "defeat";
  const isCharging = anim === "charge";
  const isHit = anim === "hit-react";
  const isAttacking = anim === "attack";

  // Shake offset for hit reaction
  const shakeX = isHit ? (frame % 2 === 0 ? -1 : 1) : 0;
  const shakeY = isHit ? (frame % 2 === 0 ? 1 : 0) : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Defeat: tilt and fade
  if (isDefeated) {
    const progress = frame / 5; // 0 to 1
    ctx.globalAlpha = 1 - progress * 0.6;
    ctx.translate(cx, baseY - 30);
    ctx.rotate(progress * 0.15);
    ctx.translate(-cx, -(baseY - 30));
  }

  // ── MOUNTING BRACKET (top) ──
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(cx - 18, 2, 36, 6);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(cx - 18, 2, 36, 1);
  // Mounting bolts
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(cx - 15, 4, 2, 2);
  ctx.fillRect(cx + 13, 4, 2, 2);

  // ── MAIN CHASSIS ──
  const chassisY = 8;
  const chassisH = 46;
  const chassisW = 40;
  const chassisX = cx - chassisW / 2;

  // Chassis body
  ctx.fillStyle = B.chassisDark;
  ctx.fillRect(chassisX, chassisY, chassisW, chassisH);
  // Left edge highlight
  ctx.fillStyle = B.chassisLight;
  ctx.fillRect(chassisX, chassisY, 1, chassisH);
  // Right edge shadow
  ctx.fillStyle = "#0a0810";
  ctx.fillRect(chassisX + chassisW - 1, chassisY, 1, chassisH);
  // Top edge
  ctx.fillStyle = B.chassisEdge;
  ctx.fillRect(chassisX, chassisY, chassisW, 1);
  // Bottom edge
  ctx.fillStyle = "#0e0a14";
  ctx.fillRect(chassisX, chassisY + chassisH - 1, chassisW, 1);

  // ── CENTRAL MONITOR "EYE" ──
  const eyeX = cx - 10;
  const eyeY = chassisY + 8;
  const eyeW = 20;
  const eyeH = 14;

  // Screen bezel
  ctx.fillStyle = "#141020";
  ctx.fillRect(eyeX - 2, eyeY - 2, eyeW + 4, eyeH + 4);
  ctx.fillStyle = B.chassisEdge;
  ctx.fillRect(eyeX - 2, eyeY - 2, eyeW + 4, 1);

  // Screen background
  ctx.fillStyle = B.eyeOff;
  ctx.fillRect(eyeX, eyeY, eyeW, eyeH);

  if (!isDefeated || frame < 3) {
    // Eye glow — pulsing
    const pulseAlpha = isCharging
      ? 0.5 + 0.5 * Math.sin(frame * 1.2)
      : isLow
        ? 0.3 + 0.3 * Math.sin(frame * 2.0)
        : 0.7 + 0.3 * Math.sin(frame * 0.8);

    const eyeColor = isCharging ? B.chargeGlow : isLow ? B.ledRed : B.eyeGlow;

    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = eyeColor;
    ctx.fillRect(eyeX + 2, eyeY + 2, eyeW - 4, eyeH - 4);

    // Pupil/iris
    ctx.globalAlpha = 1;
    const pupilX = eyeX + eyeW / 2 - 3;
    const pupilY = eyeY + eyeH / 2 - 2;
    ctx.fillStyle = "#000000";
    ctx.fillRect(pupilX, pupilY, 6, 4);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(pupilX + 1, pupilY, 4, 4);
    // Highlight
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pupilX + 4, pupilY, 1, 1);

    // Screen glow effect
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = eyeColor;
    ctx.fillRect(eyeX - 4, eyeY - 4, eyeW + 8, eyeH + 8);
    ctx.globalAlpha = 1;
  }

  // ── STATUS LED GRID (below eye) ──
  const ledStartY = eyeY + eyeH + 6;
  const ledCols = 8;
  const ledRows = 3;
  const ledSize = 2;
  const ledGap = 2;
  const ledBlockW = ledCols * (ledSize + ledGap);
  const ledStartX = cx - ledBlockW / 2;

  for (let row = 0; row < ledRows; row++) {
    for (let col = 0; col < ledCols; col++) {
      const lx = ledStartX + col * (ledSize + ledGap);
      const ly = ledStartY + row * (ledSize + ledGap);

      // LED color based on HP
      const ledIndex = row * ledCols + col;
      const ledThreshold = (ledIndex / (ledRows * ledCols)) * 100;

      let ledColor: string;
      if (isDefeated && frame > 2) {
        ledColor = B.ledOff;
      } else if (hpPercent <= ledThreshold) {
        ledColor = B.ledOff;
      } else if (hpPercent <= 30) {
        ledColor = frame % 2 === 0 ? B.ledRed : B.ledOff; // Blinking red
      } else if (hpPercent <= 60) {
        ledColor = B.ledYellow;
      } else {
        ledColor = B.ledGreen;
      }

      ctx.fillStyle = ledColor;
      ctx.fillRect(lx, ly, ledSize, ledSize);
    }
  }

  // ── MECHANICAL ARMS (2 per side) ──
  drawArm(ctx, chassisX - 2, chassisY + 12, -1, anim, frame, isLow); // Upper left
  drawArm(ctx, chassisX + chassisW + 2, chassisY + 12, 1, anim, frame, isLow); // Upper right
  drawArm(ctx, chassisX - 2, chassisY + 30, -1, anim, frame, isLow); // Lower left
  drawArm(ctx, chassisX + chassisW + 2, chassisY + 30, 1, anim, frame, isLow); // Lower right

  // ── BOTTOM SECTION — cable tray + mounting ──
  const bottomY = chassisY + chassisH;
  ctx.fillStyle = B.chassisMid;
  ctx.fillRect(chassisX + 4, bottomY, chassisW - 8, 8);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(chassisX + 4, bottomY, chassisW - 8, 1);

  // Cable bundles
  for (let c = 0; c < 4; c++) {
    const cableX = chassisX + 8 + c * 7;
    ctx.fillStyle = c % 2 === 0 ? C.termDim : C.metalDark;
    ctx.fillRect(cableX, bottomY + 3, 3, 20);
    ctx.fillStyle = c % 2 === 0 ? C.termMid : C.metalMid;
    ctx.fillRect(cableX, bottomY + 3, 1, 20);
  }

  // ── CHARGE EFFECT (overlay) ──
  if (isCharging) {
    const chargeIntensity = frame / 5; // builds up
    ctx.globalAlpha = chargeIntensity * 0.3;
    ctx.fillStyle = B.chargeGlow;
    ctx.fillRect(chassisX - 6, chassisY - 4, chassisW + 12, chassisH + 8);
    ctx.globalAlpha = 1;

    // Charge particles
    for (let p = 0; p < frame * 2; p++) {
      const px = chassisX + ((p * 17 + frame * 7) % chassisW);
      const py = chassisY + ((p * 23 + frame * 11) % chassisH);
      ctx.fillStyle = p % 2 === 0 ? B.sparkYellow : B.sparkWhite;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // ── ATTACK EFFECT ──
  if (isAttacking) {
    // Projectile beam
    const beamX = chassisX - 10 - frame * 8;
    ctx.fillStyle = B.eyeGlow;
    ctx.fillRect(beamX, chassisY + chassisH / 2 - 1, 8, 2);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = B.eyeGlow;
    ctx.fillRect(beamX - 2, chassisY + chassisH / 2 - 2, 12, 4);
    ctx.globalAlpha = 1;
  }

  // ── DAMAGE EFFECTS (sparks at low HP) ──
  if (isLow && !isDefeated) {
    for (let s = 0; s < 3; s++) {
      const sx = chassisX + ((s * 13 + frame * 9) % chassisW);
      const sy = chassisY + ((s * 19 + frame * 7) % chassisH);
      ctx.fillStyle = frame % 2 === 0 ? B.sparkWhite : B.sparkYellow;
      ctx.fillRect(sx, sy, 1, 1);
      if (s === 0) ctx.fillRect(sx + 1, sy - 1, 1, 1);
    }

    // Exposed wiring
    ctx.fillStyle = C.dangerBright;
    ctx.fillRect(chassisX + 5, chassisY + chassisH - 3, 3, 1);
    ctx.fillStyle = C.termBright;
    ctx.fillRect(chassisX + chassisW - 10, chassisY + 6, 1, 4);
  }

  // ── DEFEAT EFFECTS ──
  if (isDefeated && frame >= 3) {
    // Explosion sparks
    for (let e = 0; e < frame * 3; e++) {
      const ex = chassisX + ((e * 7 + frame * 13) % (chassisW + 10)) - 5;
      const ey = chassisY + ((e * 11 + frame * 17) % (chassisH + 10)) - 5;
      ctx.fillStyle = e % 3 === 0 ? B.sparkWhite : e % 3 === 1 ? B.sparkYellow : B.eyeGlow;
      ctx.fillRect(ex, ey, 1, 1);
    }

    // Smoke wisps
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#404050";
    ctx.fillRect(cx - 8, chassisY - frame * 2, 16, 4);
    ctx.fillRect(cx - 4, chassisY - frame * 3, 8, 3);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  dir: number, // -1 = left, 1 = right
  anim: BossAnimation,
  frame: number,
  isLow: boolean
) {
  const segLen = 8;

  // Arm movement based on animation
  let angle1 = 0;
  let angle2 = 0;
  if (anim === "charge") {
    angle1 = dir * frame * 0.5;
    angle2 = -dir * frame * 0.3;
  } else if (anim === "attack") {
    angle1 = dir * 3;
    angle2 = -dir * 2;
  } else if (anim === "hit-react") {
    angle1 = dir * (frame % 2 === 0 ? 1 : -1);
  } else {
    // Idle — subtle sway
    angle1 = dir * Math.sin(frame * 0.7) * 0.5;
  }

  // Shoulder joint
  ctx.fillStyle = B.armJoint;
  ctx.fillRect(baseX - 2, baseY - 2, 4, 4);

  // Upper segment
  const midX = baseX + dir * (segLen + angle1);
  const midY = baseY + 4;
  ctx.fillStyle = B.armMid;
  drawThickLine(ctx, baseX, baseY, midX, midY, 3);
  ctx.fillStyle = B.armLight;
  drawThickLine(ctx, baseX, baseY, midX, midY, 1);

  // Elbow joint
  ctx.fillStyle = B.armJoint;
  ctx.fillRect(midX - 1, midY - 1, 3, 3);

  // Lower segment with weapon tip
  const tipX = midX + dir * (segLen - 2 + angle2);
  const tipY = midY + 2;
  ctx.fillStyle = B.armDark;
  drawThickLine(ctx, midX, midY, tipX, tipY, 2);

  // Weapon tip (claw/emitter)
  if (isLow) {
    // Damaged — sparking
    ctx.fillStyle = frame % 2 === 0 ? B.sparkYellow : B.armLight;
  } else {
    ctx.fillStyle = C.dangerBright;
  }
  ctx.fillRect(tipX - 1, tipY - 1, 3, 3);
}

function drawThickLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number
) {
  // Simple thick line using fillRect steps
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const half = Math.floor(thickness / 2);

  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x1 + (dx * i) / steps);
    const y = Math.round(y1 + (dy * i) / steps);
    ctx.fillRect(x - half, y - half, thickness, thickness);
  }
}
