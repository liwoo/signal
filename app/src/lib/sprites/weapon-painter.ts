/**
 * Weapon system visual effects for boss fights.
 * All functions paint onto an existing canvas context.
 * Pure rendering — no state, no side effects.
 */

import { C } from "./palette";

// ── Sector grid positions (normalized 0-1 within the canvas) ──

const SECTOR_POS: Record<number, [number, number]> = {
  1: [0.25, 0.22], 2: [0.50, 0.22], 3: [0.75, 0.22],
  4: [0.25, 0.48], 5: [0.50, 0.48], 6: [0.75, 0.48],
  7: [0.25, 0.74], 8: [0.50, 0.74], 9: [0.75, 0.74],
};

// ── Targeting grid (AIM phase) ──

export function drawTargetingGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  activeSector: number,
  scanProgress: number, // 0-1, loops
) {
  ctx.save();

  // Grid lines
  ctx.strokeStyle = "rgba(110,255,160,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const x = Math.floor(w * (i / 3));
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
    const y = Math.floor(h * (i / 3));
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Sector labels
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  for (let s = 1; s <= 9; s++) {
    const [nx, ny] = SECTOR_POS[s];
    const sx = Math.floor(w * nx);
    const sy = Math.floor(h * ny);
    const isActive = s === activeSector;

    if (isActive) {
      // Active sector highlight
      const cellW = w / 3;
      const cellH = h / 3;
      const col = (s - 1) % 3;
      const row = Math.floor((s - 1) / 3);
      const pulse = 0.06 + Math.sin(scanProgress * Math.PI * 2) * 0.04;

      ctx.fillStyle = `rgba(255,64,64,${pulse})`;
      ctx.fillRect(col * cellW, row * cellH, cellW, cellH);

      ctx.strokeStyle = `rgba(255,64,64,${0.3 + Math.sin(scanProgress * Math.PI * 2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(col * cellW + 2, row * cellH + 2, cellW - 4, cellH - 4);
    }

    ctx.fillStyle = isActive ? "#ff6e6e" : "rgba(110,255,160,0.15)";
    ctx.fillText(String(s), sx, sy + 4);
  }

  // Crosshair on active sector
  if (activeSector >= 1 && activeSector <= 9) {
    const [nx, ny] = SECTOR_POS[activeSector];
    drawCrosshair(ctx, w * nx, h * ny, 28, scanProgress);
  }

  // Scan line sweeping vertically
  const scanY = (scanProgress * 1.3 * h) % (h + 40) - 20;
  ctx.strokeStyle = "rgba(110,255,160,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(w, scanY);
  ctx.stroke();

  ctx.restore();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  progress: number,
) {
  const pulse = 0.6 + Math.sin(progress * Math.PI * 4) * 0.4;
  const s = size * (0.9 + Math.sin(progress * Math.PI * 2) * 0.1);
  const half = s / 2;
  const gap = s * 0.2;

  ctx.save();
  ctx.strokeStyle = `rgba(255,110,110,${pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ff4040";
  ctx.shadowBlur = 6;

  // Top
  ctx.beginPath();
  ctx.moveTo(x, y - half);
  ctx.lineTo(x, y - gap);
  ctx.stroke();
  // Bottom
  ctx.beginPath();
  ctx.moveTo(x, y + gap);
  ctx.lineTo(x, y + half);
  ctx.stroke();
  // Left
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - gap, y);
  ctx.stroke();
  // Right
  ctx.beginPath();
  ctx.moveTo(x + gap, y);
  ctx.lineTo(x + half, y);
  ctx.stroke();

  // Corner brackets
  const bracket = s * 0.15;
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(255,110,110,${pulse * 0.6})`;
  // TL
  ctx.beginPath();
  ctx.moveTo(x - half, y - half + bracket);
  ctx.lineTo(x - half, y - half);
  ctx.lineTo(x - half + bracket, y - half);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(x + half - bracket, y - half);
  ctx.lineTo(x + half, y - half);
  ctx.lineTo(x + half, y - half + bracket);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(x - half, y + half - bracket);
  ctx.lineTo(x - half, y + half);
  ctx.lineTo(x - half + bracket, y + half);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(x + half - bracket, y + half);
  ctx.lineTo(x + half, y + half);
  ctx.lineTo(x + half, y + half - bracket);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = `rgba(255,110,110,${pulse})`;
  ctx.fillRect(x - 1, y - 1, 3, 3);

  ctx.restore();
}

// ── Ammo loading (LOAD phase) ──

export function drawAmmoRack(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  threatType: string,
  loadProgress: number, // 0-1, fills over time
) {
  ctx.save();

  const rackX = w * 0.06;
  const rackY = h * 0.25;
  const rackW = w * 0.08;
  const rackH = h * 0.5;

  // Rack background
  ctx.fillStyle = "rgba(10,4,8,0.7)";
  ctx.fillRect(rackX - 4, rackY - 4, rackW + 8, rackH + 8);
  ctx.strokeStyle = "rgba(255,64,64,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(rackX - 4, rackY - 4, rackW + 8, rackH + 8);

  // Label
  ctx.fillStyle = "#ff6e6e";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("AMMO", rackX + rackW / 2, rackY - 8);

  // Determine slots
  let slotCount = 1;
  let ammoColor: string = C.signalBright;
  let ammoLabel = "PULSE";
  if (threatType === "shield") {
    slotCount = 3; ammoColor = "#00d4ff"; ammoLabel = "PIERCE";
  } else if (threatType === "armor") {
    slotCount = 2; ammoColor = "#ffaa00"; ammoLabel = "BLAST";
  } else {
    slotCount = 1; ammoColor = C.signalBright; ammoLabel = "PULSE";
  }

  const slotH = Math.min(rackH / slotCount - 8, 40);
  const slotGap = (rackH - slotCount * slotH) / (slotCount + 1);

  for (let i = 0; i < slotCount; i++) {
    const sy = rackY + slotGap + i * (slotH + slotGap);
    const loaded = loadProgress > (i / slotCount);
    const fillAmount = loaded
      ? Math.min(1, (loadProgress - i / slotCount) * slotCount)
      : 0;

    // Slot border
    ctx.strokeStyle = loaded ? ammoColor : "rgba(255,64,64,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rackX, sy, rackW, slotH);

    // Fill
    if (fillAmount > 0) {
      ctx.fillStyle = ammoColor;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(rackX + 1, sy + 1, (rackW - 2) * fillAmount, slotH - 2);
      ctx.globalAlpha = 1;

      // Glow
      ctx.shadowColor = ammoColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = ammoColor;
      ctx.fillRect(rackX + 1, sy + slotH / 2 - 1, (rackW - 2) * fillAmount, 2);
      ctx.shadowBlur = 0;
    }
  }

  // Ammo type label
  ctx.fillStyle = "rgba(255,110,110,0.5)";
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  ctx.fillText(ammoLabel, rackX + rackW / 2, rackY + rackH + 14);

  ctx.restore();
}

// ── Charge bar (FIRE phase) ──

export function drawChargeBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  chargeProgress: number, // 0-1
) {
  ctx.save();

  const barW = w * 0.3;
  const barH = 12;
  const barX = (w - barW) / 2;
  const barY = h * 0.82;

  // Background
  ctx.fillStyle = "rgba(10,4,8,0.7)";
  ctx.fillRect(barX - 4, barY - 16, barW + 8, barH + 28);
  ctx.strokeStyle = "rgba(255,64,64,0.2)";
  ctx.strokeRect(barX - 4, barY - 16, barW + 8, barH + 28);

  // Label
  ctx.fillStyle = "#ff6e6e";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.fillText("WEAPON CHARGE", w / 2, barY - 4);

  // Bar outline
  ctx.strokeStyle = "rgba(255,110,110,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Fill
  const fillColor = chargeProgress < 0.5
    ? "#ff6e6e"
    : chargeProgress < 0.8
      ? "#ffaa00"
      : C.signalBright;

  ctx.fillStyle = fillColor;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * chargeProgress, barH - 2);
  ctx.globalAlpha = 1;

  // Glow at charge front
  if (chargeProgress > 0.1) {
    const frontX = barX + (barW - 2) * chargeProgress;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = fillColor;
    ctx.fillRect(frontX - 2, barY, 4, barH);
    ctx.shadowBlur = 0;
  }

  // Percentage text
  ctx.fillStyle = "#ff6e6e";
  ctx.font = "bold 9px monospace";
  ctx.fillText(`${Math.floor(chargeProgress * 100)}%`, w / 2, barY + barH + 12);

  ctx.restore();
}

// ── Firing beam (on HIT) ──

export function drawFiringBeam(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  progress: number, // 0-1, beam extends then fades
) {
  ctx.save();

  const extend = Math.min(1, progress * 3); // beam reaches target at 33%
  const fade = progress > 0.4 ? (progress - 0.4) / 0.6 : 0;
  const alpha = 1 - fade;

  if (alpha <= 0) { ctx.restore(); return; }

  const midX = fromX + (toX - fromX) * extend;
  const midY = fromY + (toY - fromY) * extend;

  ctx.globalAlpha = alpha;

  // Outer glow
  ctx.strokeStyle = "rgba(255,170,0,0.3)";
  ctx.lineWidth = 12;
  ctx.shadowColor = "#ffaa00";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(midX, midY);
  ctx.stroke();

  // Core beam
  ctx.strokeStyle = "#ffe8a0";
  ctx.lineWidth = 3;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(midX, midY);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Sparks along beam
  if (extend > 0.3) {
    for (let i = 0; i < 8; i++) {
      const t = Math.random();
      const sx = fromX + (midX - fromX) * t + (Math.random() - 0.5) * 16;
      const sy = fromY + (midY - fromY) * t + (Math.random() - 0.5) * 16;
      ctx.fillStyle = Math.random() > 0.5 ? "#ffe8a0" : "#ffaa00";
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Explosion effect (on HIT at boss position) ──

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxRadius: number,
  progress: number, // 0-1
) {
  if (progress >= 1) return;
  ctx.save();

  const radius = maxRadius * Math.pow(progress, 0.5);
  const alpha = 1 - progress;

  // Outer glow
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(255,255,200,${alpha * 0.8})`);
  grad.addColorStop(0.3, `rgba(255,170,0,${alpha * 0.5})`);
  grad.addColorStop(0.7, `rgba(255,64,0,${alpha * 0.2})`);
  grad.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Debris particles
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + progress * 0.5;
    const dist = radius * (0.5 + Math.random() * 0.5);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const size = 2 + Math.random() * 3;
    ctx.fillStyle = `rgba(255,${100 + Math.floor(Math.random() * 155)},0,${alpha})`;
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  }

  ctx.restore();
}

// ── Boss projectile (periodic attack during player window) ──

export function drawBossProjectile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  startX: number,
  startY: number,
  progress: number, // 0-1, projectile flies from boss to camera
  targetNX: number = 0.3, // normalized target X (0-1)
  targetNY: number = 0.6, // normalized target Y (0-1)
) {
  if (progress >= 1) return;
  ctx.save();

  const endX = w * targetNX;
  const endY = h * targetNY;

  // Projectile grows as it "approaches camera"
  const scale = 0.5 + progress * 2;
  const x = startX + (endX - startX) * progress;
  const y = startY + (endY - startY) * progress;
  const size = 4 * scale;

  // Red energy bolt
  ctx.fillStyle = "#ff4040";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 16 * scale;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = "#ff8080";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Trail
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.3;
  for (let i = 1; i <= 5; i++) {
    const t = Math.max(0, progress - i * 0.04);
    const tx = startX + (endX - startX) * t;
    const ty = startY + (endY - startY) * t;
    const ts = 3 * (0.5 + t * 2) * (1 - i * 0.15);
    ctx.fillStyle = "#ff4040";
    ctx.beginPath();
    ctx.arc(tx, ty, ts, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Impact flash (screen-wide flash on boss attack landing) ──

export function drawImpactFlash(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number, // 0-1
) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.15;
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Screen shake offset ──

export function getShakeOffset(intensity: number): { x: number; y: number } {
  if (intensity <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * intensity * 8,
    y: (Math.random() - 0.5) * intensity * 6,
  };
}

// ── Weapon status indicator (bottom-left HUD) ──

export function drawWeaponStatus(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  activeTab: string,
  phase: string,
) {
  ctx.save();

  const labels = ["AIM", "LOAD", "FIRE"];
  const tabIds = ["aim", "load", "fire"];
  const x = w * 0.04;
  const y = h * 0.88;

  // Background
  ctx.fillStyle = "rgba(10,4,8,0.6)";
  ctx.fillRect(x - 6, y - 14, 140, 24);
  ctx.strokeStyle = "rgba(255,64,64,0.15)";
  ctx.strokeRect(x - 6, y - 14, 140, 24);

  ctx.font = "bold 8px monospace";
  ctx.textAlign = "left";

  for (let i = 0; i < 3; i++) {
    const lx = x + i * 44;
    const isActive = tabIds[i] === activeTab;

    ctx.fillStyle = isActive ? "#ff6e6e" : "rgba(255,64,64,0.2)";
    if (isActive && phase === "player_window") {
      ctx.shadowColor = "#ff4040";
      ctx.shadowBlur = 6;
    }
    ctx.fillText(labels[i], lx, y);
    ctx.shadowBlur = 0;

    if (isActive) {
      ctx.fillStyle = "#ff4040";
      ctx.fillRect(lx, y + 2, 30, 2);
    }
  }

  ctx.restore();
}

// ── Timer bar overlay ──

export function drawTimerBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  remaining: number,
  total: number,
) {
  ctx.save();

  const barW = w * 0.5;
  const barH = 4;
  const barX = (w - barW) / 2;
  const barY = h * 0.94;
  const pct = Math.max(0, remaining / total);

  // Track
  ctx.fillStyle = "rgba(30,8,8,0.6)";
  ctx.fillRect(barX, barY, barW, barH);

  // Fill
  const color = pct > 0.4 ? "#ff6e6e" : pct > 0.2 ? "#ffaa00" : "#ff4040";
  ctx.fillStyle = color;
  ctx.fillRect(barX, barY, barW * pct, barH);

  // Glow at front
  if (pct > 0.05) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX + barW * pct - 2, barY - 1, 4, barH + 2);
    ctx.shadowBlur = 0;
  }

  // Time text
  ctx.fillStyle = color;
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${remaining.toFixed(1)}s`, w / 2, barY - 4);

  ctx.restore();
}

// ── Miss / weapon malfunction effect ──

export function drawMissEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  originX: number,
  originY: number,
  progress: number,
) {
  if (progress >= 1) return;
  ctx.save();

  const alpha = 1 - progress;

  // Sparks from weapon position
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = progress * 60 * (0.3 + Math.random() * 0.7);
    const sx = originX + Math.cos(angle) * dist;
    const sy = originY + Math.sin(angle) * dist;
    ctx.fillStyle = Math.random() > 0.5 ? "#ff6e6e" : "#ffaa00";
    ctx.fillRect(sx, sy, 2 + Math.random() * 2, 2);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Blood splatter on camera lens (progressive damage) ──

// Pre-generate deterministic splatter positions based on hit index
function splatSeed(hitIndex: number, i: number): number {
  // Simple hash for deterministic "random" positioning
  return ((hitIndex * 7919 + i * 1301) % 1000) / 1000;
}

export function drawBloodSplatters(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  heartsLost: number, // 0-5, how many hearts lost so far
  maxHearts: number,
) {
  if (heartsLost <= 0) return;
  ctx.save();

  // Each heart lost adds a new cluster of blood spatters
  for (let hit = 0; hit < heartsLost; hit++) {
    const severity = (hit + 1) / maxHearts; // 0.2 → 1.0

    // Each hit has 3-6 splatter drops
    const dropCount = 3 + Math.floor(splatSeed(hit, 0) * 4);

    for (let d = 0; d < dropCount; d++) {
      const sx = splatSeed(hit, d * 3 + 1);
      const sy = splatSeed(hit, d * 3 + 2);
      const sz = splatSeed(hit, d * 3 + 3);

      // Position biased toward edges (more dramatic)
      const edgeBias = splatSeed(hit, d + 50) > 0.4;
      let px: number, py: number;
      if (edgeBias) {
        // Edge splatter — pick a random edge
        const edge = Math.floor(sx * 4);
        if (edge === 0) { px = sx * w * 0.3; py = sy * h; }
        else if (edge === 1) { px = w - sx * w * 0.3; py = sy * h; }
        else if (edge === 2) { px = sx * w; py = sy * h * 0.3; }
        else { px = sx * w; py = h - sy * h * 0.3; }
      } else {
        px = 0.1 * w + sx * w * 0.8;
        py = 0.1 * h + sy * h * 0.8;
      }

      const radius = 15 + sz * 40 * (0.5 + severity * 0.5);
      const alpha = 0.35 + severity * 0.45;

      // Main splat
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, `rgba(160,10,10,${alpha})`);
      grad.addColorStop(0.3, `rgba(120,4,4,${alpha * 0.85})`);
      grad.addColorStop(0.7, `rgba(80,0,0,${alpha * 0.4})`);
      grad.addColorStop(1, "rgba(40,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Drip streaks (on later hits)
      if (hit >= 1 && splatSeed(hit, d + 100) > 0.4) {
        const dripLen = 30 + sz * 60 * severity;
        const dripW = 3 + sz * 3;
        const dripGrad = ctx.createLinearGradient(px, py, px + (sx - 0.5) * 10, py + dripLen);
        dripGrad.addColorStop(0, `rgba(140,4,4,${alpha * 0.8})`);
        dripGrad.addColorStop(0.7, `rgba(80,0,0,${alpha * 0.3})`);
        dripGrad.addColorStop(1, "rgba(40,0,0,0)");
        ctx.fillStyle = dripGrad;
        ctx.fillRect(px - dripW / 2, py, dripW, dripLen);
      }
    }

    // Red vignette overlay — starts from first hit, gets heavier
    if (hit >= 1) {
      const vigAlpha = Math.min(0.06 + 0.06 * hit, 0.4);
      ctx.globalAlpha = vigAlpha;
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.65);
      vigGrad.addColorStop(0, "transparent");
      vigGrad.addColorStop(0.6, "rgba(60,0,0,0.3)");
      vigGrad.addColorStop(1, "#500000");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

// ── Boss telegraph visual warning ──

export function drawTelegraphWarning(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number, // 0-1, pulsing
) {
  ctx.save();

  // Pulsing red border vignette
  const pulse = 0.5 + Math.sin(progress * Math.PI * 4) * 0.5;
  const edgeSize = 40;

  ctx.globalAlpha = pulse * 0.15;

  // Top edge
  const gradT = ctx.createLinearGradient(0, 0, 0, edgeSize);
  gradT.addColorStop(0, "#ff0000");
  gradT.addColorStop(1, "transparent");
  ctx.fillStyle = gradT;
  ctx.fillRect(0, 0, w, edgeSize);

  // Bottom edge
  const gradB = ctx.createLinearGradient(0, h, 0, h - edgeSize);
  gradB.addColorStop(0, "#ff0000");
  gradB.addColorStop(1, "transparent");
  ctx.fillStyle = gradB;
  ctx.fillRect(0, h - edgeSize, w, edgeSize);

  // Left edge
  const gradL = ctx.createLinearGradient(0, 0, edgeSize, 0);
  gradL.addColorStop(0, "#ff0000");
  gradL.addColorStop(1, "transparent");
  ctx.fillStyle = gradL;
  ctx.fillRect(0, 0, edgeSize, h);

  // Right edge
  const gradR = ctx.createLinearGradient(w, 0, w - edgeSize, 0);
  gradR.addColorStop(0, "#ff0000");
  gradR.addColorStop(1, "transparent");
  ctx.fillStyle = gradR;
  ctx.fillRect(w - edgeSize, 0, edgeSize, h);

  // "WARNING" text flashing
  if (pulse > 0.6) {
    ctx.globalAlpha = pulse * 0.8;
    ctx.fillStyle = "#ff4040";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 12;
    ctx.fillText("⚠ INCOMING", w / 2, h * 0.12);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
