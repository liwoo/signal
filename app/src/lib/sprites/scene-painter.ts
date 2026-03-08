// ── Scene Painter v4 — dramatically brighter, denser environments ──
// Inspired by high-quality pixel art with architectural depth, warm/cool contrast,
// many props, visible light rays, and rich atmospheric lighting.

import { C } from "./palette";

export type SceneType = "cell" | "corridor" | "chase" | "vent" | "server";

export function paintScene(type: SceneType, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case "cell": paintCell(ctx, w, h); break;
    case "corridor": paintCorridor(ctx, w, h, false); break;
    case "chase": paintCorridor(ctx, w, h, true); break;
    case "vent": paintVent(ctx, w, h); break;
    case "server": paintServer(ctx, w, h); break;
  }
  return canvas;
}

// ════════════════════════════════════════════════════════════════════
// CELL B-09 — Maya's prison cell. Dense, atmospheric, multi-layered.
// Layout: ceiling with exposed structure → back wall → floor with perspective
// ════════════════════════════════════════════════════════════════════

function paintCell(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const infraBot = Math.floor(h * 0.10);  // Bottom of upper infrastructure
  const ceilY = Math.floor(h * 0.16);     // Concrete ceiling slab
  const wallTopY = Math.floor(h * 0.22);  // Top of back wall
  const wallBotY = Math.floor(h * 0.50);  // Bottom of back wall / floor start
  const floorY = wallBotY;

  // ── Fill background ──
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, w, h);

  // ── UPPER INFRASTRUCTURE (visible through grated ceiling) ──
  // This is the space above the cell — ducts, catwalks, pipes
  fillGradientV(ctx, 0, 0, w, infraBot + 4, "#0a1420", "#101e30");

  // Catwalk / grating (horizontal metal walkway above)
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(0, 0, w, 5);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(0, 0, w, 1);
  // Grate holes
  for (let gx = 0; gx < w; gx += 10) {
    ctx.fillStyle = "#040a14";
    ctx.fillRect(gx + 2, 1, 6, 3);
  }

  // Large ducts in upper space
  drawDetailedPipe(ctx, 0, 8, w, 8, 10, "#2a3e58", C.metalHighlight);
  drawDetailedPipe(ctx, 0, 22, w * 0.5, 22, 6, C.metalDark, C.metalMid);
  drawPipeJoint(ctx, w * 0.2, 8, 10);
  drawPipeJoint(ctx, w * 0.5, 8, 10);
  drawPipeJoint(ctx, w * 0.8, 8, 10);

  // Vertical support columns from catwalk
  for (let cx = w * 0.15; cx < w; cx += w * 0.35) {
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(cx - 3, 5, 6, infraBot - 3);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(cx - 3, 5, 1, infraBot - 3);
  }

  // Small status lights on infrastructure
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(w * 0.28, 14, 2, 2);
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(w * 0.62, 10, 2, 2);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(w * 0.45, 18, 2, 2);

  // ── CEILING SLAB — concrete with steel beams ──
  fillGradientV(ctx, 0, infraBot, w, ceilY - infraBot + 6, "#141e30", "#1a2840");

  // Ceiling panels between beams
  for (let px = 0; px < w; px += 70) {
    fillGradientV(ctx, px + 6, infraBot + 2, 58, ceilY - infraBot - 2, "#101828", "#182838");
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(px + 6, (infraBot + ceilY) / 2, 58, 1);
  }

  // Steel I-beams across ceiling
  for (let bx = 0; bx < w; bx += 70) {
    drawSteelBeam(ctx, bx, infraBot, 8, ceilY - infraBot + 6);
  }

  // Exposed pipes below ceiling
  drawDetailedPipe(ctx, 0, ceilY - 2, w, ceilY - 2, 5, C.metalMid, C.metalLight);
  drawDetailedPipe(ctx, 0, ceilY + 6, w * 0.55, ceilY + 6, 3, C.metalDark, C.metalMid);
  // Vertical pipe drop to wall
  drawDetailedPipe(ctx, w * 0.55, ceilY + 6, w * 0.55, wallTopY + 20, 3, C.metalDark, C.metalMid);
  drawPipeJoint(ctx, w * 0.22, ceilY - 2, 5);
  drawPipeJoint(ctx, w * 0.55, ceilY - 2, 5);
  drawPipeJoint(ctx, w * 0.55, ceilY + 6, 3);

  // ── Ceiling light fixtures (pendant lights hanging through ceiling) ──
  drawPendantLight(ctx, w * 0.35, ceilY, 50, h * 0.45);
  drawPendantLight(ctx, w * 0.72, ceilY, 38, h * 0.35);

  // ── Conduit / cable tray ──
  drawConduit(ctx, 0, wallTopY - 4, w, 8);

  // ── BACK WALL — brighter, more detail ──
  fillGradientV(ctx, 0, wallTopY, w, wallBotY - wallTopY, "#304e78", "#243e60");

  // Wall panel texture — horizontal seams with visible rivets
  for (let y = wallTopY + 16; y < wallBotY; y += 20) {
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, y + 1, w, 1);
    for (let rx = 24; rx < w; rx += 50) {
      drawRivet(ctx, rx, y);
    }
  }

  // Vertical panel seams (thicker, more visible)
  for (let x = 100; x < w; x += 100) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x, wallTopY, 2, wallBotY - wallTopY);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(x + 2, wallTopY, 1, wallBotY - wallTopY);
  }

  // ── WALL PROPS ──

  // Large terminal/computer station (right side, dominant prop)
  drawDetailedTerminal(ctx, w * 0.58, wallTopY + 14, 90, 70);

  // Intercom panel (left of center)
  drawIntercom(ctx, w * 0.25, wallTopY + 18, 22, 30);

  // Warning sign / stencil text on wall
  drawWallSign(ctx, w * 0.38, wallTopY + 8, 40, 14);

  // Vent grate high on wall
  drawWallVent(ctx, w * 0.44, wallTopY + 6, 40, 20);

  // Small camera / sensor in corner
  drawCamera(ctx, w * 0.92, wallTopY + 4);

  // ── Baseboard (heavy metal strip) ──
  drawBaseboard(ctx, 0, wallBotY, w);

  // ── LEFT WALL (perspective depth panel) ──
  drawSideWall(ctx, 0, wallTopY, w * 0.12, wallBotY, h, "left");

  // ── RIGHT WALL with HEAVY DOOR ──
  drawSideWall(ctx, w * 0.86, wallTopY, w * 0.14, wallBotY, h, "right");
  drawHeavyDoor(ctx, w * 0.74, wallTopY + 6, 56, wallBotY - wallTopY - 6);

  // ── FLOOR — perspective tile grid ──
  paintPerspectiveFloor(ctx, 0, floorY, w, h - floorY, w);

  // ── FLOOR PROPS — sized relative to character (~h*0.32 tall) ──
  // Character at scale 3 is ~192px in a 600px scene.
  // Props must be proportional: table = waist-high, stool = thigh-high, etc.

  const ch = h * 0.32; // character reference height

  // TALL LOCKER/CABINET on right side — slightly taller than character
  drawLocker(ctx, w * 0.82, wallBotY + 2, ch * 0.34, ch * 1.1);

  // Cot / bed — low but long (shin-height frame, character-length)
  drawDetailedCot(ctx, w * 0.02, floorY + ch * 0.55, ch * 0.9, ch * 0.22);

  // Metal shelf on left wall — waist-high
  drawShelf(ctx, w * 0.01, wallTopY + 10, ch * 0.38, ch * 0.32);

  // Storage crate stack — knee-high
  drawCrate(ctx, w * 0.02, wallBotY + 6, ch * 0.28, ch * 0.24);
  drawCrate(ctx, w * 0.10, wallBotY + 4, ch * 0.22, ch * 0.20);

  // Toilet/sink — knee to waist height
  drawToilet(ctx, w * 0.20, floorY + ch * 0.40, ch * 0.24, ch * 0.28);

  // Stool near terminal desk — mid-thigh height
  drawStool(ctx, w * 0.52, floorY + ch * 0.32, ch * 0.20, ch * 0.24);

  // Bucket — shin height
  drawBucket(ctx, w * 0.28, floorY + ch * 0.50, ch * 0.13, ch * 0.16);

  // Work surface / small table — waist height, wider than tall
  drawSmallTable(ctx, w * 0.36, floorY + ch * 0.35, ch * 0.48, ch * 0.28);

  // Papers / books scattered on table and floor
  drawPapers(ctx, w * 0.38, floorY + ch * 0.30);
  drawPapers(ctx, w * 0.22, floorY + ch * 0.85);

  // Food tray near door — flat on floor
  drawFoodTray(ctx, w * 0.66, floorY + ch * 0.78, ch * 0.22, ch * 0.06);

  // Fire extinguisher on wall near door — knee-high cylinder
  drawFireExtinguisher(ctx, w * 0.72, wallBotY + 8, ch * 0.08, ch * 0.22);

  // Floor drain near toilet
  drawFloorDrain(ctx, w * 0.22, floorY + ch * 0.72, ch * 0.12);

  // Floor stains
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(w * 0.45, h * 0.76, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.beginPath();
  ctx.ellipse(w * 0.7, h * 0.88, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Vertical pipe on left wall (with drip + puddle) ──
  drawDetailedPipe(ctx, w * 0.13, wallTopY, w * 0.13, wallBotY + 40, 4, C.metalMid, C.metalLight);
  drawPipeJoint(ctx, w * 0.13, wallTopY + 24, 4);
  // Drip
  ctx.fillStyle = C.termBright;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(w * 0.13 - 1, wallBotY + 36, 2, 5);
  ctx.globalAlpha = 1;
  // Puddle
  ctx.fillStyle = "rgba(0,180,255,0.1)";
  ctx.beginPath();
  ctx.ellipse(w * 0.13, wallBotY + 44, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Signal wire along floor ──
  drawSignalWire(ctx, w * 0.08, wallBotY + 18, w * 0.72, wallBotY + 18);
  // Wire climbs wall to terminal
  drawSignalWire(ctx, w * 0.62, wallTopY + 78, w * 0.62, wallBotY + 18);

  // ── Floor scratches near cot ──
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.2 + i * 7, h * 0.7);
    ctx.lineTo(w * 0.24 + i * 7, h * 0.74);
    ctx.stroke();
  }

  // ── LIGHTING EFFECTS ──

  // Main ceiling light cone — warm/bright, STRONG
  drawLightCone(ctx, w * 0.35, ceilY + 20, w * 0.8, h * 0.8, "rgba(220,230,255,0.12)");
  drawLightCone(ctx, w * 0.35, ceilY + 20, w * 0.45, h * 0.5, "rgba(220,230,255,0.08)");

  // Secondary light cone (dimmer)
  drawLightCone(ctx, w * 0.72, ceilY + 18, w * 0.5, h * 0.5, "rgba(220,230,255,0.04)");

  // Terminal screen glow — strong cyan wash
  const tGlow = ctx.createRadialGradient(w * 0.68, wallTopY + 44, 10, w * 0.68, wallTopY + 44, 150);
  tGlow.addColorStop(0, "rgba(0,212,255,0.18)");
  tGlow.addColorStop(0.3, "rgba(0,212,255,0.08)");
  tGlow.addColorStop(1, "transparent");
  ctx.fillStyle = tGlow;
  ctx.fillRect(w * 0.4, wallTopY - 10, w * 0.55, wallBotY - wallTopY + 80);

  // Terminal glow on floor
  const tFloor = ctx.createRadialGradient(w * 0.66, wallBotY + 20, 5, w * 0.66, wallBotY + 20, 100);
  tFloor.addColorStop(0, "rgba(0,212,255,0.1)");
  tFloor.addColorStop(1, "transparent");
  ctx.fillStyle = tFloor;
  ctx.fillRect(w * 0.45, wallBotY, w * 0.4, 100);

  // Door crack amber light
  const dGlow = ctx.createRadialGradient(w * 0.82, wallBotY, 4, w * 0.82, wallBotY, 60);
  dGlow.addColorStop(0, "rgba(255,180,50,0.12)");
  dGlow.addColorStop(1, "transparent");
  ctx.fillStyle = dGlow;
  ctx.fillRect(w * 0.62, wallTopY, w * 0.3, wallBotY - wallTopY + 30);

  // Signal wire glow along floor
  const wGlow = ctx.createLinearGradient(0, wallBotY + 10, 0, wallBotY + 26);
  wGlow.addColorStop(0, "transparent");
  wGlow.addColorStop(0.5, "rgba(110,255,160,0.06)");
  wGlow.addColorStop(1, "transparent");
  ctx.fillStyle = wGlow;
  ctx.fillRect(w * 0.08, wallBotY + 10, w * 0.65, 16);

  // ── Visible light rays from ceiling fixture (more prominent) ──
  drawLightRays(ctx, w * 0.35, ceilY + 20, w, h, 0.06);

  // ── Floor glow pool under main light (illuminates props) ──
  const floorGlow = ctx.createRadialGradient(w * 0.35, h * 0.65, 10, w * 0.35, h * 0.65, w * 0.4);
  floorGlow.addColorStop(0, "rgba(200,215,235,0.06)");
  floorGlow.addColorStop(1, "transparent");
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, wallBotY, w, h - wallBotY);

  // ── Post-processing ──
  drawVignette(ctx, w, h, 0.35);
  drawAO(ctx, 0, wallBotY, w, 20, "down");
  drawAO(ctx, 0, wallTopY, w, 12, "down");
}

// ════════════════════════════════════════════════════════════════════
// CORRIDOR — long hallway, top-down perspective
// ════════════════════════════════════════════════════════════════════

function paintCorridor(ctx: CanvasRenderingContext2D, w: number, h: number, alarm: boolean) {
  const ceilY = Math.floor(h * 0.06);
  const topWallBot = Math.floor(h * 0.32);
  const botWallTop = Math.floor(h * 0.70);
  const botWallBot = Math.floor(h * 0.92);

  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, w, h);

  // ── Ceiling ──
  fillGradientV(ctx, 0, 0, w, ceilY, "#0e1420", "#141e30");
  for (let bx = 30; bx < w; bx += 70) {
    drawSteelBeam(ctx, bx, 0, 6, ceilY + 4);
  }
  drawDetailedPipe(ctx, 0, ceilY + 1, w, ceilY + 1, 5, C.metalMid, C.metalLight);
  drawDetailedPipe(ctx, 0, ceilY + 10, w, ceilY + 10, 3, C.metalDark, C.metalMid);

  // ── Top wall ──
  fillGradientV(ctx, 0, ceilY + 14, w, topWallBot - ceilY - 14, "#243e60", "#1e3450");
  for (let y = ceilY + 24; y < topWallBot; y += 18) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, y + 1, w, 1);
  }
  drawConduit(ctx, 0, ceilY + 14, w, 6);
  drawBaseboard(ctx, 0, topWallBot, w);

  // ── Bottom wall ──
  fillGradientV(ctx, 0, botWallTop, w, botWallBot - botWallTop, "#1e3450", "#243e60");
  for (let y = botWallTop + 8; y < botWallBot; y += 18) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, y, w, 1);
  }
  drawBaseboard(ctx, 0, botWallTop - 4, w);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(0, botWallBot, w, 4);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(0, botWallBot, w, 1);

  // ── Floor (between walls) — perspective tiles ──
  paintPerspectiveFloor(ctx, 0, topWallBot + 4, w, botWallTop - topWallBot - 8, w);

  // ── Bottom floor ──
  paintPerspectiveFloor(ctx, 0, botWallBot + 4, w, h - botWallBot - 4, w);

  // ── Signal wire center of corridor ──
  drawSignalWire(ctx, 0, (topWallBot + botWallTop) / 2, w, (topWallBot + botWallTop) / 2);

  // ── Doors on both walls (heavier, more detailed) ──
  for (let x = 50; x < w; x += 180) {
    drawHeavyDoor(ctx, x, ceilY + 20, 50, topWallBot - ceilY - 24);
    drawHeavyDoor(ctx, x + 90, botWallTop + 4, 50, botWallBot - botWallTop - 8);
  }

  // ── Wall fixtures between doors ──
  for (let x = 130; x < w; x += 180) {
    // Small panel/screen on top wall
    drawSmallScreen(ctx, x, ceilY + 28, 20, 14);
    // Pipe segment on bottom wall
    drawDetailedPipe(ctx, x - 10, botWallTop + 8, x - 10, botWallBot - 4, 3, C.metalDark, C.metalMid);
  }

  // ── Alarm lights ──
  for (let x = 30; x < w; x += 130) {
    drawAlarmFixture(ctx, x, ceilY + 16, alarm);
    drawAlarmFixture(ctx, x + 65, botWallTop + 2, alarm);
  }

  // ── Ceiling lights ──
  for (let x = 100; x < w; x += 200) {
    drawPendantLight(ctx, x, ceilY, 44, h * 0.3);
  }

  // ── Alarm overlay ──
  if (alarm) {
    ctx.fillStyle = "rgba(255,30,10,0.06)";
    ctx.fillRect(0, 0, w, h);
    for (let x = 30; x < w; x += 130) {
      drawLightCone(ctx, x, ceilY + 16, 90, 70, "rgba(255,40,20,0.08)");
    }
  }

  drawVignette(ctx, w, h, 0.45);
  drawAO(ctx, 0, topWallBot, w, 14, "down");
  drawAO(ctx, 0, botWallTop - 14, w, 14, "up");
}

// ════════════════════════════════════════════════════════════════════
// VENT SHAFT — claustrophobic with pipe detail
// ════════════════════════════════════════════════════════════════════

function paintVent(ctx: CanvasRenderingContext2D, w: number, h: number) {
  fillGradientV(ctx, 0, 0, w, h, "#1a2840", "#142030");

  // Duct ribs (structural)
  for (let x = 0; x < w; x += 24) {
    ctx.fillStyle = "#2a3e58";
    ctx.fillRect(x, 0, 6, h);
    ctx.fillStyle = "#3a5068";
    ctx.fillRect(x + 1, 0, 1, h);
    ctx.fillStyle = "#141e30";
    ctx.fillRect(x + 5, 0, 1, h);
  }

  // Top surface highlight
  fillGradientV(ctx, 0, 0, w, h * 0.2, "#243854", "#1a2840");

  // Bottom surface shadow
  fillGradientV(ctx, 0, h * 0.85, w, h * 0.15, "#141e30", "#0e1420");

  // Floor grate with depth
  const grateY = Math.floor(h * 0.56);
  ctx.fillStyle = "#2a3e58";
  ctx.fillRect(0, grateY, w, 6);
  for (let x = 0; x < w; x += 12) {
    ctx.fillStyle = "#060c14";
    ctx.fillRect(x + 2, grateY + 8, 8, 3);
    ctx.fillRect(x + 2, grateY + 14, 8, 3);
    ctx.fillRect(x + 2, grateY + 20, 8, 3);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x + 2, grateY + 6, 8, 2);
  }
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(0, grateY, w, 2);

  // Pipes (large + small)
  drawDetailedPipe(ctx, 0, h * 0.1, w, h * 0.1, 12, C.metalMid, C.metalHighlight);
  drawDetailedPipe(ctx, 0, h * 0.26, w, h * 0.26, 7, C.metalDark, C.metalMid);
  drawDetailedPipe(ctx, 0, h * 0.38, w, h * 0.38, 4, C.metalDark, C.metalMid);
  drawPipeJoint(ctx, w * 0.2, h * 0.1, 12);
  drawPipeJoint(ctx, w * 0.55, h * 0.1, 12);
  drawPipeJoint(ctx, w * 0.4, h * 0.26, 7);
  drawPipeJoint(ctx, w * 0.75, h * 0.26, 7);

  // Condensation drips
  ctx.fillStyle = "rgba(0,180,255,0.2)";
  ctx.fillRect(w * 0.3, h * 0.16, 1, 8);
  ctx.fillRect(w * 0.65, h * 0.32, 1, 6);

  // Signal wire
  drawSignalWire(ctx, 0, h * 0.44, w, h * 0.44);

  // Light from grate below — green tinted
  for (let x = 50; x < w; x += 90) {
    const g = ctx.createRadialGradient(x, grateY + 10, 2, x, grateY + 10, 60);
    g.addColorStop(0, "rgba(110,255,160,0.08)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, grateY - 50, 120, 100);
  }

  // ── Junction panel (wall-mounted, right side of shaft) ──
  const jpX = Math.floor(w * 0.60);
  const jpY = Math.floor(h * 0.28);
  // Panel housing recessed into rib
  ctx.fillStyle = "#101828";
  ctx.fillRect(jpX - 2, jpY - 2, 28, 36);
  ctx.fillStyle = "#1a2838";
  ctx.fillRect(jpX, jpY, 24, 32);
  // Code display (small green/amber screen)
  ctx.fillStyle = "#081014";
  ctx.fillRect(jpX + 2, jpY + 2, 20, 8);
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(jpX + 3, jpY + 3, 18, 6);
  // Display digits
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(jpX + 4, jpY + 4, 3, 4);
  ctx.fillRect(jpX + 8, jpY + 4, 3, 4);
  ctx.fillRect(jpX + 12, jpY + 4, 3, 4);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(jpX + 17, jpY + 4, 3, 4);
  // Button grid (2x3)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const bx = jpX + 3 + col * 10;
      const by = jpY + 13 + row * 6;
      ctx.fillStyle = "#2a3848";
      ctx.fillRect(bx, by, 8, 4);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(bx, by, 8, 1);
    }
  }
  // Status LED
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(jpX + 10, jpY + 30, 4, 2);
  ctx.shadowColor = "rgba(110,255,160,0.4)";
  ctx.shadowBlur = 3;
  ctx.fillRect(jpX + 10, jpY + 30, 4, 2);
  ctx.shadowBlur = 0;

  // Dust particles
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < 20; i++) {
    const dx = (i * 37 + 13) % w;
    const dy = (i * 53 + 7) % h;
    ctx.fillRect(dx, dy, 1, 1);
  }

  drawVignette(ctx, w, h, 0.55);
}

// ════════════════════════════════════════════════════════════════════
// SERVER ROOM — banks of equipment with blinking LEDs
// ════════════════════════════════════════════════════════════════════

function paintServer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ceilY = Math.floor(h * 0.08);
  const wallBot = Math.floor(h * 0.38);

  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, w, h);

  // Ceiling
  fillGradientV(ctx, 0, 0, w, ceilY, "#0e1420", "#141e30");
  for (let bx = 40; bx < w; bx += 80) {
    drawSteelBeam(ctx, bx, 0, 6, ceilY + 4);
  }

  // Back wall
  fillGradientV(ctx, 0, ceilY + 6, w, wallBot - ceilY - 6, "#182840", "#142030");
  drawConduit(ctx, 0, ceilY + 6, w, 6);

  // Server racks (detailed, with variety)
  const rackW = 48;
  const rackGap = 6;
  const rackY = ceilY + 14;
  const rackH = wallBot - rackY - 4;
  for (let x = 12; x + rackW < w - 12; x += rackW + rackGap) {
    drawDetailedServerRack(ctx, x, rackY, rackW, rackH);
  }

  drawBaseboard(ctx, 0, wallBot, w);

  // Floor
  paintPerspectiveFloor(ctx, 0, wallBot + 6, w, h - wallBot - 6, w);

  // Cable runs on floor
  drawSignalWire(ctx, 0, h * 0.62, w, h * 0.62);
  drawCableBundle(ctx, 0, h * 0.68, w, h * 0.68, C.termDim);
  drawCableBundle(ctx, 0, h * 0.74, w, h * 0.74, "#304058");

  // Floor cable covers (raised)
  for (let x = 40; x < w; x += 120) {
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(x, h * 0.58, 60, 4);
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(x, h * 0.58, 60, 1);
  }

  // Ceiling lights — cool white
  for (let x = 60; x < w; x += 120) {
    drawPendantLight(ctx, x, ceilY, 36, h * 0.35);
  }

  // Ambient glow from server LEDs — stronger
  const g = ctx.createLinearGradient(0, wallBot, 0, wallBot + 80);
  g.addColorStop(0, "rgba(0,212,255,0.08)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, wallBot, w, 80);

  // Green glow from specific racks
  for (let x = 12; x + rackW < w - 12; x += (rackW + rackGap) * 2) {
    const rg = ctx.createRadialGradient(x + rackW / 2, wallBot, 5, x + rackW / 2, wallBot + 30, 60);
    rg.addColorStop(0, "rgba(110,255,160,0.06)");
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(x - 20, wallBot, rackW + 40, 60);
  }

  drawVignette(ctx, w, h, 0.45);
  drawAO(ctx, 0, wallBot, w, 18, "down");
}

// ════════════════════════════════════════════════════════════════════
// DRAWING PRIMITIVES
// ════════════════════════════════════════════════════════════════════

function fillGradientV(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c1: string, c2: string) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function drawSteelBeam(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#141e2c";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#2a3a50";
  ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = "#0a1018";
  ctx.fillRect(x + w - 1, y, 1, h);
  // Bottom flange
  ctx.fillStyle = "#2a3a4e";
  ctx.fillRect(x - 3, y + h - 4, w + 6, 4);
  ctx.fillStyle = "#3a4e68";
  ctx.fillRect(x - 3, y + h - 4, w + 6, 1);
}

function drawDetailedPipe(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  r: number, colorMid: string, colorHi: string,
) {
  const minY = Math.min(y1, y2);
  const minX = Math.min(x1, x2);
  const len = Math.abs(x2 - x1) || Math.abs(y2 - y1);
  const isH = Math.abs(x2 - x1) > Math.abs(y2 - y1);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  if (isH) ctx.fillRect(minX, minY + r + 1, len, 3);
  else ctx.fillRect(minX + r + 1, minY, 3, len);

  if (isH) {
    const g = ctx.createLinearGradient(0, minY - r, 0, minY + r);
    g.addColorStop(0, colorHi);
    g.addColorStop(0.3, colorHi);
    g.addColorStop(0.7, colorMid);
    g.addColorStop(1, "#0e1420");
    ctx.fillStyle = g;
    ctx.fillRect(minX, minY - r, len, r * 2);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(minX, minY - r, len, 1);
  } else {
    const g = ctx.createLinearGradient(minX - r, 0, minX + r, 0);
    g.addColorStop(0, colorHi);
    g.addColorStop(0.3, colorHi);
    g.addColorStop(0.7, colorMid);
    g.addColorStop(1, "#0e1420");
    ctx.fillStyle = g;
    ctx.fillRect(minX - r, minY, r * 2, len);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(minX - r, minY, 1, len);
  }
}

function drawPipeJoint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x - r - 2, y - r - 1, r * 2 + 4, r * 2 + 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x - r - 2, y - r - 1, r * 2 + 4, 1);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - r - 2, y + r, r * 2 + 4, 1);
}

function drawRivet(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y - 1, 2, 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y + 1, 2, 1);
}

function drawConduit(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#243448";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#3a4e68";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x, y + h - 1, w, 1);
  for (let cx = x + 6; cx < x + w; cx += 18) {
    ctx.fillStyle = C.signalDim;
    ctx.fillRect(cx, y + 2, 5, h - 4);
    ctx.fillStyle = C.termDim;
    ctx.fillRect(cx + 7, y + 2, 3, h - 4);
    ctx.fillStyle = "#5a1818";
    ctx.fillRect(cx + 12, y + 2, 3, h - 4);
  }
}

function drawBaseboard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = "#243448";
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x, y + 6, w, 1);
}

// ── Perspective floor with receding tile grid ──
function paintPerspectiveFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _totalW: number) {
  // Base gradient — visible floor surface
  fillGradientV(ctx, x, y, w, h, "#1a3050", "#243e60");

  // Tile grid lines (horizontal — increase spacing for perspective)
  let rowY = y;
  let spacing = 8;
  while (rowY < y + h) {
    // Top edge (highlight)
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, rowY, w, 1);
    // Bottom edge (shadow)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, rowY + 1, w, 1);

    rowY += spacing;
    spacing = Math.min(spacing + 1.5, 28);
  }

  // Vertical lines (converge toward center for perspective)
  const cx = x + w / 2;
  for (let i = -10; i <= 10; i++) {
    const topX = cx + i * 18;
    const botX = cx + i * 36;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(topX, y);
    ctx.lineTo(botX, y + h);
    ctx.stroke();
  }

  // Floor surface variation (some tiles slightly different)
  for (let ty = y + 4; ty < y + h - 4; ty += 20) {
    for (let tx = x + 10; tx < x + w - 10; tx += 40) {
      if ((tx + ty) % 80 < 20) {
        ctx.fillStyle = "rgba(255,255,255,0.015)";
        ctx.fillRect(tx, ty, 18, 10);
      }
    }
  }

  // Wet reflection near top (wall junction)
  ctx.fillStyle = "rgba(180,200,230,0.025)";
  ctx.fillRect(x, y + 2, w, 4);
}

// ── Pendant light fixture (hanging from ceiling) ──
function drawPendantLight(ctx: CanvasRenderingContext2D, x: number, ceilY: number, fixtureW: number, coneH: number) {
  // Mount plate
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - fixtureW / 2, ceilY - 2, fixtureW, 4);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - fixtureW / 2, ceilY - 2, fixtureW, 1);

  // Rod / cable
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - 1, ceilY + 2, 2, 12);

  // Shade (trapezoid shape)
  const shadeW = fixtureW * 0.6;
  const shadeTop = ceilY + 14;
  ctx.fillStyle = "#2a3a50";
  ctx.fillRect(x - shadeW / 3, shadeTop, shadeW * 0.67, 3);
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(x - shadeW / 2, shadeTop + 3, shadeW, 5);
  ctx.fillStyle = "#2a3e58";
  ctx.fillRect(x - shadeW / 2, shadeTop + 3, shadeW, 1);

  // Bulb — bright glowing point
  ctx.fillStyle = "rgba(220,235,255,0.5)";
  ctx.fillRect(x - 3, shadeTop + 8, 6, 3);
  ctx.fillStyle = "rgba(220,235,255,0.8)";
  ctx.fillRect(x - 1, shadeTop + 8, 2, 2);

  // Light cone below
  drawLightCone(ctx, x, shadeTop + 10, fixtureW * 2.5, coneH, "rgba(220,235,255,0.04)");
  drawLightCone(ctx, x, shadeTop + 10, fixtureW * 1.2, coneH * 0.5, "rgba(220,235,255,0.03)");
}

function drawLightCone(ctx: CanvasRenderingContext2D, x: number, y: number, spread: number, h: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 3, x, y + h * 0.6, spread);
  g.addColorStop(0, color);
  g.addColorStop(0.6, color.replace(/[\d.]+\)$/, "0.01)"));
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - spread, y, spread * 2, h);
}

function drawSideWall(
  ctx: CanvasRenderingContext2D,
  x: number, wallTop: number, wallW: number, wallBot: number, floorH: number,
  side: "left" | "right",
) {
  const g = ctx.createLinearGradient(
    side === "left" ? x : x + wallW, 0,
    side === "left" ? x + wallW : x, 0,
  );
  g.addColorStop(0, "#0e1828");
  g.addColorStop(1, "#182840");
  ctx.fillStyle = g;
  ctx.fillRect(x, 0, wallW, floorH);

  // Panel lines
  const step = wallW / 3;
  for (let i = 1; i < 3; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(x + step * i, wallTop, 1, wallBot - wallTop);
  }

  // Horizontal details
  for (let y = wallTop + 20; y < wallBot; y += 30) {
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(x + 2, y, wallW - 4, 1);
  }

  // Edge highlight
  const edgeX = side === "left" ? x + wallW - 1 : x;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(edgeX, wallTop, 1, wallBot - wallTop);
}

function drawDetailedTerminal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const monH = Math.floor(h * 0.6);
  const deskH = Math.floor(h * 0.4);
  const deskW = w + 20;
  const deskX = x - 10;
  const deskY = y + monH + 2;

  // Desk shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(deskX + 3, y + h + 2, deskW - 2, 5);

  // Desk body — thick industrial surface with 3D edge
  const deskG = ctx.createLinearGradient(deskX, 0, deskX + deskW, 0);
  deskG.addColorStop(0, "#2a4260");
  deskG.addColorStop(0.5, "#1e3450");
  deskG.addColorStop(1, "#162840");
  ctx.fillStyle = deskG;
  ctx.fillRect(deskX, deskY, deskW, deskH);
  // Top surface highlight
  ctx.fillStyle = "#3a5878";
  ctx.fillRect(deskX, deskY, deskW, 2);
  // Front edge (3D)
  ctx.fillStyle = "#142438";
  ctx.fillRect(deskX, deskY + deskH - 2, deskW, 2);

  // Desk legs — angular steel
  for (const lx of [deskX + 2, deskX + deskW - 5]) {
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(lx, y + h - 2, 4, 6);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(lx, y + h - 2, 1, 6);
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(lx, y + h + 3, 5, 2); // foot
  }

  // Desk drawer (center, small)
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(deskX + Math.floor(deskW * 0.3), deskY + 4, Math.floor(deskW * 0.4), deskH - 6);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(deskX + Math.floor(deskW * 0.45), deskY + Math.floor(deskH * 0.4), 8, 2); // handle

  // Monitor bezel — thicker frame with brand light
  ctx.fillStyle = "#101820";
  ctx.fillRect(x - 5, y - 5, w + 10, monH + 10);
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(x - 5, y - 5, w + 10, 2); // top bezel
  // Power LED on bezel
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(x + w / 2 - 1, y + monH + 2, 2, 2);
  ctx.shadowColor = "rgba(110,255,160,0.3)";
  ctx.shadowBlur = 3;
  ctx.fillRect(x + w / 2 - 1, y + monH + 2, 2, 2);
  ctx.shadowBlur = 0;

  // Screen — dark with content and scanlines
  ctx.fillStyle = "#030a14";
  ctx.fillRect(x, y, w, monH);

  // Scanline overlay
  for (let sy = y; sy < y + monH; sy += 2) {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(x, sy, w, 1);
  }

  // Screen content — terminal text lines
  for (let ly = y + 4; ly < y + monH - 4; ly += 5) {
    const hash = (ly * 7 + 13) % 100;
    const lineW = 12 + (hash % (w - 20));
    const bright = hash % 3;
    ctx.fillStyle = bright === 0 ? C.termBright : bright === 1 ? C.termMid : C.termDim;
    ctx.globalAlpha = 0.5 + (hash % 40) / 100;
    ctx.fillRect(x + 4, ly, lineW, 3);
    ctx.globalAlpha = 1;
  }

  // Prompt line (distinct from text)
  ctx.fillStyle = C.signalBright;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x + 4, y + monH - 14, 6, 3); // prompt symbol
  ctx.globalAlpha = 1;

  // Cursor — blinking block
  ctx.fillStyle = C.termBright;
  ctx.fillRect(x + 12, y + monH - 14, 6, 4);

  // Screen reflection spot (subtle)
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(x + 4, y + 2, Math.floor(w * 0.4), Math.floor(monH * 0.3));

  // Screen bezel inner glow
  ctx.strokeStyle = "rgba(0,212,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, monH - 1);

  // Monitor stand — wider base
  ctx.fillStyle = "#1a2a40";
  ctx.fillRect(x + w / 2 - 10, y + monH + 4, 20, 3);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + w / 2 - 3, y + monH + 1, 6, 4); // neck
  // Stand base
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(x + w / 2 - 14, deskY - 2, 28, 3);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w / 2 - 14, deskY - 2, 28, 1);

  // Keyboard — with key rows and spacebar
  const kbX = x + 4;
  const kbY = deskY + 4;
  const kbW = w - 8;
  ctx.fillStyle = "#101820";
  ctx.fillRect(kbX, kbY, kbW, 12);
  ctx.fillStyle = "#1a2838";
  ctx.fillRect(kbX, kbY, kbW, 1); // top edge
  // Key rows
  for (let row = 0; row < 3; row++) {
    for (let kx = kbX + 2; kx < kbX + kbW - 2; kx += 5) {
      ctx.fillStyle = "#2a3a50";
      ctx.fillRect(kx, kbY + 2 + row * 3, 3, 2);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(kx, kbY + 2 + row * 3, 3, 1);
    }
  }
  // Spacebar
  ctx.fillStyle = "#2a3a50";
  ctx.fillRect(kbX + Math.floor(kbW * 0.25), kbY + 10, Math.floor(kbW * 0.5), 2);

  // Mouse — ergonomic shape
  const msX = x + w + 2;
  const msY = deskY + 6;
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(msX, msY, 8, 6);
  ctx.fillStyle = "#2a3e58";
  ctx.fillRect(msX, msY, 8, 1); // top
  ctx.fillStyle = "#141e30";
  ctx.fillRect(msX + 3, msY, 1, 3); // button divider
  // Scroll wheel
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(msX + 3, msY + 1, 2, 1);
  // Mouse cable
  ctx.fillStyle = "#0e1828";
  ctx.fillRect(msX + 3, msY - 2, 2, 3);

  // Cables from monitor back
  ctx.fillStyle = "#0e1828";
  ctx.fillRect(x + w + 2, y + Math.floor(monH * 0.35), 8, 2);
  ctx.fillRect(x + w + 2, y + Math.floor(monH * 0.5), 8, 2);
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(x + w + 8, y + Math.floor(monH * 0.35), 4, 1); // green cable
  ctx.fillStyle = C.termDim;
  ctx.fillRect(x + w + 8, y + Math.floor(monH * 0.5), 4, 1); // blue cable
}

function drawIntercom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#1e3048";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#2a4260";
  ctx.fillRect(x, y, w, 1);
  for (let gy = y + 4; gy < y + h - 10; gy += 3) {
    ctx.fillStyle = "#142030";
    ctx.fillRect(x + 3, gy, w - 6, 1);
  }
  ctx.fillStyle = C.dangerDim;
  ctx.fillRect(x + w / 2 - 3, y + h - 7, 6, 4);
  ctx.fillStyle = C.dangerMid;
  ctx.fillRect(x + w / 2 - 2, y + h - 6, 4, 2);
  // LED
  ctx.fillStyle = "#1a0808";
  ctx.fillRect(x + 3, y + 3, 3, 3);
}

function drawWallSign(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Warning sign plate
  ctx.fillStyle = "#3a3020";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.alertDim;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Stencil text (just a stripe pattern)
  ctx.fillStyle = "#2a2010";
  ctx.fillRect(x + 4, y + h / 2 - 1, w - 8, 3);
  ctx.fillRect(x + 4, y + h / 2 + 3, (w - 8) * 0.6, 2);
}

function drawCamera(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Wall-mounted security camera
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - 2, y, 6, 8);
  // Lens
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x - 4, y + 6, 10, 6);
  ctx.fillStyle = "#0a1018";
  ctx.fillRect(x - 2, y + 8, 6, 3);
  // LED
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(x, y + 2, 2, 2);
  // Glow from LED
  const g = ctx.createRadialGradient(x + 1, y + 3, 1, x + 1, y + 3, 10);
  g.addColorStop(0, "rgba(255,64,64,0.15)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - 10, y - 8, 22, 22);
}

function drawSmallScreen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#040e18";
  ctx.fillRect(x, y, w, h);
  // Content — just a few lines
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(x + 2, y + 3, w - 4, 2);
  ctx.fillStyle = C.termDim;
  ctx.fillRect(x + 2, y + 7, (w - 4) * 0.7, 2);
  // Bezel glow
  ctx.strokeStyle = "rgba(110,255,160,0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawWallVent(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#162840";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  for (let sy = y; sy < y + h; sy += 4) {
    ctx.fillStyle = "#2a3e58";
    ctx.fillRect(x, sy, w, 2);
    ctx.fillStyle = "#0a1420";
    ctx.fillRect(x, sy + 2, w, 2);
  }
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x - 2, y - 2, w + 4, 1);
  drawRivet(ctx, x, y - 1);
  drawRivet(ctx, x + w - 2, y - 1);
  drawRivet(ctx, x, y + h);
  drawRivet(ctx, x + w - 2, y + h);
}

function drawHeavyDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Frame
  ctx.fillStyle = "#2a3e58";
  ctx.fillRect(x - 4, y - 2, w + 8, h + 4);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - 4, y - 2, w + 8, 2);

  // Door surface — visible gradient
  fillGradientV(ctx, x, y, w, h, "#1e3450", "#182840");

  // Upper panel (recessed)
  ctx.fillStyle = "#243854";
  ctx.fillRect(x + 5, y + 5, w - 10, h * 0.38);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + 5, y + 5, w - 10, 1);

  // Lower panel
  ctx.fillStyle = "#203048";
  ctx.fillRect(x + 5, y + h * 0.48, w - 10, h * 0.38);

  // Center seam
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + w / 2, y, 2, h);

  // Handle (bigger, more visible)
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w - 14, y + h * 0.4, 10, 14);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + w - 14, y + h * 0.4, 10, 2);

  // ── Keypad panel (mounted beside handle) ──
  const kpX = x + w - 18;
  const kpY = Math.floor(y + h * 0.20);
  // Keypad housing
  ctx.fillStyle = "#101820";
  ctx.fillRect(kpX - 2, kpY - 2, 18, 32);
  ctx.fillStyle = "#1a2838";
  ctx.fillRect(kpX, kpY, 14, 28);
  // Small display strip at top
  ctx.fillStyle = "#081018";
  ctx.fillRect(kpX + 1, kpY + 1, 12, 5);
  ctx.fillStyle = C.dangerDim;
  ctx.fillRect(kpX + 2, kpY + 2, 10, 3); // red readout glow
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(kpX + 3, kpY + 3, 3, 1); // digits
  ctx.fillRect(kpX + 7, kpY + 3, 3, 1);
  // Number grid (3x4 buttons)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = kpX + 1 + col * 4;
      const by = kpY + 8 + row * 5;
      ctx.fillStyle = "#2a3848";
      ctx.fillRect(bx, by, 3, 3);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(bx, by, 3, 1);
    }
  }
  // Status LED below keypad
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(kpX + 5, kpY + 28 - 2, 4, 2);
  // LED glow
  ctx.shadowColor = "rgba(255,64,64,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillRect(kpX + 5, kpY + 28 - 2, 4, 2);
  ctx.shadowBlur = 0;

  // Door number stencil
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 8, y + 8, 16, 8);

  // Frame inner shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x, y + h - 2, w, 2);
}

function drawDetailedCot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow — elongated under cot
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 4, y + h + 2, w - 4, 5);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 2, y + h + 4, w, 3);

  // Frame legs — tubular metal with weld spots
  for (const lx of [x, x + w - 6]) {
    // Rear leg (shorter visible portion)
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(lx + 1, y + 2, 5, 10);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(lx + 1, y + 2, 2, 10);
    // Front leg (extends below frame)
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(lx, y + h - 4, 6, 10);
    ctx.fillStyle = C.metalHighlight;
    ctx.fillRect(lx, y + h - 4, 2, 10);
    // Foot pad
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(lx - 1, y + h + 5, 8, 2);
    // Weld spots
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(lx + 2, y + h - 3, 2, 2);
  }

  // Frame side rails — tubular
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + h - 3, w, 4);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y + h - 3, w, 1);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x, y + h, w, 1);
  // Cross-wire support mesh (spring base)
  for (let sx = x + 8; sx < x + w - 8; sx += 6) {
    ctx.fillStyle = "rgba(62,88,120,0.4)";
    ctx.fillRect(sx, y + h - 5, 1, 3);
  }

  // Mattress — with quilted texture and edge piping
  const mX = x + 6, mY = y + 2, mW = w - 12, mH = h - 7;
  fillGradientV(ctx, mX, mY, mW, mH, "#404e5e", "#303e4e");
  // Edge piping (rolled mattress edge)
  ctx.fillStyle = "#4a5a6a";
  ctx.fillRect(mX, mY, mW, 2);
  ctx.fillStyle = "#2a3848";
  ctx.fillRect(mX, mY + mH - 1, mW, 1);
  ctx.fillStyle = "#4a5a6a";
  ctx.fillRect(mX, mY, 2, mH);
  // Quilted stitch lines
  for (let qy = mY + 5; qy < mY + mH - 2; qy += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(mX + 2, qy, mW - 4, 1);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(mX + 2, qy + 1, mW - 4, 1);
  }

  // Pillow — plump with highlight and indent
  const pW = Math.min(30, Math.floor(mW * 0.35));
  fillGradientV(ctx, mX + 3, mY + 3, pW, mH - 6, "#506070", "#404e5e");
  ctx.fillStyle = "#5a6a7a";
  ctx.fillRect(mX + 3, mY + 3, pW, 2); // top highlight
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(mX + 6, mY + mH / 2, pW - 6, 1); // head indent

  // Blanket — rumpled with folds (dark green/teal)
  const blX = mX + pW + 4;
  const blW = mW - pW - 6;
  if (blW > 0) {
    ctx.fillStyle = "#2a4840";
    ctx.fillRect(blX, mY + 2, blW, 5);
    ctx.fillStyle = "#1e3830";
    ctx.fillRect(blX, mY + 7, blW, 4);
    // Fold shadow lines
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(blX + 4, mY + 3, 1, 7);
    ctx.fillRect(blX + blW - 6, mY + 4, 1, 5);
    // Fold highlight
    ctx.fillStyle = "#3a5850";
    ctx.fillRect(blX + 5, mY + 2, 3, 1);
    // Blanket draping over edge
    ctx.fillStyle = "#1e3830";
    ctx.fillRect(blX + blW - 3, mY + 5, 4, 6);
  }

  // Wrinkle detail on mattress surface
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(mX + pW + 8, mY + mH - 5, 20, 1);
  ctx.fillRect(mX + pW + 14, mY + mH - 8, 14, 1);
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Military crate — 3D form with wood grain, corner hardware, stencil markings

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 3, y + h, w - 2, 4);

  // Main body — front face with vertical grain
  const bodyG = ctx.createLinearGradient(x, 0, x + w, 0);
  bodyG.addColorStop(0, "#3a5870");
  bodyG.addColorStop(0.15, "#2e4a60");
  bodyG.addColorStop(0.85, "#2e4458");
  bodyG.addColorStop(1, "#1e3448");
  ctx.fillStyle = bodyG;
  ctx.fillRect(x, y, w, h);

  // Top face (3D lid visible)
  ctx.fillStyle = "#3a5e78";
  ctx.fillRect(x + 1, y, w - 2, 4);
  ctx.fillStyle = "#4a6e88";
  ctx.fillRect(x + 1, y, w - 2, 1);

  // Wood plank lines (vertical grain)
  const plankW = Math.max(6, Math.floor(w / 5));
  for (let px = x + plankW; px < x + w; px += plankW) {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(px, y + 3, 1, h - 3);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(px + 1, y + 3, 1, h - 3);
  }

  // Horizontal wood grain scratches
  for (let gy = y + 5; gy < y + h - 2; gy += 3) {
    const hash = (gy * 17 + x * 7) % 100;
    if (hash < 30) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(x + 2, gy, w - 4, 1);
    }
  }

  // Metal reinforcement bands
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + 3, w, 3);
  ctx.fillRect(x, y + h - 4, w, 3);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y + 3, w, 1);
  ctx.fillRect(x, y + h - 4, w, 1);
  // Band shadow
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x, y + 6, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);

  // Corner brackets (L-shaped metal hardware)
  const brkSz = Math.min(5, Math.floor(w * 0.15));
  for (const [bx, by] of [[x, y], [x + w - brkSz, y], [x, y + h - brkSz], [x + w - brkSz, y + h - brkSz]]) {
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(bx, by, brkSz, 2);
    ctx.fillRect(bx, by, 2, brkSz);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(bx + 1, by + 1, 1, 1); // rivet
  }

  // Warning stencil label (center)
  if (w > 16) {
    ctx.fillStyle = C.alertDim;
    ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6);
    ctx.fillStyle = C.alertBright;
    ctx.fillRect(x + 6, y + h / 2 - 1, w - 12, 2);
    // Stencil border
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + 4, y + h / 2 + 3, w - 8, 1);
  }

  // Handle — recessed grip
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + w / 2 - 6, y + 1, 12, 2);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + w / 2 - 5, y + 2, 10, 1);

  // Bottom edge dark line
  ctx.fillStyle = "#1a2838";
  ctx.fillRect(x, y + h - 1, w, 1);
}

function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Wall-mounted industrial shelf with triangular brackets and items

  // Mounting brackets (triangular supports)
  for (const bx of [x + 4, x + w - 7]) {
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(bx, y, 3, h);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(bx, y, 1, h);
  }

  // Shadow under shelf unit
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y + h, w, 4);

  for (let i = 0; i < 3; i++) {
    const sy = y + 4 + i * Math.floor(h / 3);

    // Shelf plank — metal with lip
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(x, sy, w, 3);
    ctx.fillStyle = C.metalHighlight;
    ctx.fillRect(x, sy, w, 1);
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(x, sy + 2, w, 1);
    // Bracket triangle (diagonal support under shelf)
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(x + 5, sy + 3, 2, 4);
    ctx.fillRect(x + w - 7, sy + 3, 2, 4);

    if (i === 0) {
      // Box container with lid
      ctx.fillStyle = "#2e4868";
      ctx.fillRect(x + 2, sy - 10, 10, 10);
      ctx.fillStyle = "#3a5878";
      ctx.fillRect(x + 2, sy - 10, 10, 2); // lid
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x + 2, sy - 1, 10, 1); // bottom shadow
      // Warning canister
      ctx.fillStyle = C.alertDim;
      ctx.fillRect(x + 14, sy - 7, 7, 7);
      ctx.fillStyle = C.alertMid;
      ctx.fillRect(x + 15, sy - 5, 5, 3);
      ctx.fillStyle = C.alertBright;
      ctx.fillRect(x + 16, sy - 4, 3, 1); // label stripe
      // Small bottle with neck
      ctx.fillStyle = "#3a5068";
      ctx.fillRect(x + 24, sy - 8, 5, 8);
      ctx.fillStyle = "#4a6078";
      ctx.fillRect(x + 24, sy - 8, 5, 1);
      ctx.fillStyle = "#3a5068";
      ctx.fillRect(x + 25, sy - 10, 3, 3); // neck
    } else if (i === 1) {
      // Water jug (translucent plastic feel)
      ctx.fillStyle = "#1e3850";
      ctx.fillRect(x + 2, sy - 12, 14, 12);
      ctx.fillStyle = "#2a4a68";
      ctx.fillRect(x + 2, sy - 12, 14, 2); // cap
      ctx.fillStyle = "rgba(0,180,255,0.18)";
      ctx.fillRect(x + 4, sy - 7, 10, 5);
      // Water level line
      ctx.fillStyle = "rgba(0,180,255,0.08)";
      ctx.fillRect(x + 3, sy - 7, 12, 1);
      // Stack of books
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(x + 20, sy - 8, 12, 3);
      ctx.fillStyle = C.woodMid;
      ctx.fillRect(x + 20, sy - 5, 12, 3);
      ctx.fillStyle = C.woodLight;
      ctx.fillRect(x + 20, sy - 5, 12, 1); // spine highlight
    } else {
      // Folded cloth/towel — with visible folds
      ctx.fillStyle = "#243854";
      ctx.fillRect(x + 2, sy - 6, 18, 6);
      ctx.fillStyle = "#2a4060";
      ctx.fillRect(x + 2, sy - 6, 18, 1);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(x + 8, sy - 5, 1, 4); // fold crease
      ctx.fillRect(x + 14, sy - 4, 1, 3);
      // Metal cup with rim highlight
      ctx.fillStyle = C.metalMid;
      ctx.fillRect(x + 24, sy - 8, 7, 8);
      ctx.fillStyle = C.metalLight;
      ctx.fillRect(x + 24, sy - 8, 7, 1);
      ctx.fillStyle = C.metalDark;
      ctx.fillRect(x + 24, sy - 1, 7, 1);
      // Liquid inside
      ctx.fillStyle = "rgba(80,60,40,0.2)";
      ctx.fillRect(x + 25, sy - 5, 5, 3);
    }
  }
}

function drawToilet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow — elliptical
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 2, w / 2 + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pipe into wall (behind everything)
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + w / 2 - 2, y - 16, 4, 18);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w / 2 - 2, y - 16, 1, 18);
  // Pipe joint at wall
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w / 2 - 3, y - 16, 6, 3);

  // Tank — porcelain-like with lid
  const tankG = ctx.createLinearGradient(x + 3, 0, x + w - 3, 0);
  tankG.addColorStop(0, C.metalLight);
  tankG.addColorStop(0.4, C.metalHighlight);
  tankG.addColorStop(1, C.metalMid);
  ctx.fillStyle = tankG;
  ctx.fillRect(x + 3, y - 2, w - 6, 9);
  // Tank lid
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x + 2, y - 3, w - 4, 2);
  // Tank seam
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + 4, y + 4, w - 8, 1);

  // Flush handle — chrome lever
  ctx.fillStyle = "#8aaac8";
  ctx.fillRect(x + w - 7, y - 1, 6, 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + w - 3, y - 2, 2, 2);

  // Bowl — wider at top, narrowing
  const bowlG = ctx.createLinearGradient(x + 1, 0, x + w - 1, 0);
  bowlG.addColorStop(0, C.metalHighlight);
  bowlG.addColorStop(0.5, "#7a9ab8");
  bowlG.addColorStop(1, C.metalMid);
  ctx.fillStyle = bowlG;
  ctx.fillRect(x + 1, y + 6, w - 2, h - 6);
  // Bowl rim
  ctx.fillStyle = "#8aaccc";
  ctx.fillRect(x, y + 5, w, 3);
  ctx.fillStyle = "#9abcdc";
  ctx.fillRect(x, y + 5, w, 1);
  // Inner bowl (dark recess)
  ctx.fillStyle = "#101820";
  ctx.fillRect(x + 4, y + 9, w - 8, h - 14);
  // Water surface
  ctx.fillStyle = "rgba(0,180,255,0.12)";
  ctx.fillRect(x + 5, y + h - 10, w - 10, 4);
  ctx.fillStyle = "rgba(0,180,255,0.06)";
  ctx.fillRect(x + 5, y + h - 8, w - 10, 1); // water highlight

  // Base — tapered pedestal
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 3, y + h - 3, w - 6, 3);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 3, y + h - 1, w - 6, 1);
}

function drawStool(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow — small under stool
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 3, y + h + 1, w - 6, 3);

  // Legs — angled tubular steel with foot pads
  // Left leg (slightly splayed)
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 2, y + 5, 3, h - 4);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 2, y + 5, 1, h - 4);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 1, y + h, 5, 2); // foot pad
  // Right leg
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w - 5, y + 5, 3, h - 4);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + w - 5, y + 5, 1, h - 4);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + w - 6, y + h, 5, 2);

  // Cross brace (stretcher)
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 5, y + Math.floor(h * 0.6), w - 10, 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x + 5, y + Math.floor(h * 0.6), w - 10, 1);

  // Seat — thick metal disc with edge detail
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x - 1, y, w + 2, 5);
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x - 1, y, w + 2, 1); // top highlight
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + 4, w, 2); // seat bottom edge
  // Seat surface texture — concentric
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + 3, y + 1, w - 6, 1);
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  ctx.fillRect(x + 5, y + 2, w - 10, 1);

  // Weld spot where leg meets seat
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 3, y + 4, 2, 2);
  ctx.fillRect(x + w - 5, y + 4, 2, 2);
}

function drawPapers(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Scattered papers/notes — slightly rotated for realism

  // Paper 1 — slightly angled (larger, main document)
  ctx.save();
  ctx.translate(x + 9, y + 6);
  ctx.rotate(-0.08);
  ctx.fillStyle = "#606e7e";
  ctx.fillRect(-9, -6, 18, 12);
  ctx.fillStyle = "#707e8e";
  ctx.fillRect(-9, -6, 18, 1);
  // Paper shadow edge
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(-9, 5, 18, 1);
  ctx.fillRect(8, -6, 1, 12);
  // Text lines — varying lengths
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(-7, -3, 13, 1);
  ctx.fillRect(-7, 0, 10, 1);
  ctx.fillRect(-7, 3, 14, 1);
  // Graph/diagram doodle
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(4, -4, 4, 4);
  ctx.restore();

  // Paper 2 — different angle, overlapping
  ctx.save();
  ctx.translate(x + 18, y + 8);
  ctx.rotate(0.12);
  ctx.fillStyle = "#586878";
  ctx.fillRect(-7, -5, 14, 10);
  ctx.fillStyle = "#687888";
  ctx.fillRect(-7, -5, 14, 1);
  // Lines
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(-5, -2, 10, 1);
  ctx.fillRect(-5, 1, 8, 1);
  // Red mark (correction/highlight)
  ctx.fillStyle = "rgba(200,60,60,0.2)";
  ctx.fillRect(-5, -2, 5, 1);
  ctx.restore();

  // Paper 3 — small note/sticky
  ctx.fillStyle = C.alertDim;
  ctx.fillRect(x + 28, y + 2, 8, 8);
  ctx.fillStyle = C.alertMid;
  ctx.fillRect(x + 28, y + 2, 8, 1);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(x + 29, y + 4, 5, 1);
  ctx.fillRect(x + 29, y + 6, 4, 1);

  // Pen — detailed with clip
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 30, y + 12, 12, 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 30, y + 12, 12, 1);
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(x + 30, y + 12, 3, 2); // cap
  ctx.fillStyle = "#141e2c";
  ctx.fillRect(x + 42, y + 12, 1, 2); // tip
  // Pen clip
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 34, y + 11, 4, 1);
}

function drawLocker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Tall metal locker — industrial, slightly battered, with proper 3D form

  // Shadow behind
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 4, y + 4, w, h);

  // Side face (3D — visible right side)
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + w, y + 2, 4, h - 2);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + w, y + 2, 4, 1);

  // Top face (3D — visible top)
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y - 2, w + 4, 3);
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x, y - 2, w + 4, 1);

  // Front face body — gradient for cylindrical metal feel
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.metalHighlight);
  g.addColorStop(0.12, C.metalLight);
  g.addColorStop(0.5, C.metalMid);
  g.addColorStop(1, C.metalDark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Door seam (center vertical — deep groove)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + w / 2 - 1, y + 2, 1, h - 4);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + w / 2, y + 2, 1, h - 4);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + w / 2 + 1, y + 2, 1, h - 4);

  // Vent slats on upper doors (angled louvers)
  const ventTop = y + 4;
  const ventBot = y + Math.floor(h * 0.22);
  for (let vy = ventTop; vy < ventBot; vy += 4) {
    // Left door slats
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + 3, vy, w / 2 - 5, 2);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(x + 3, vy + 2, w / 2 - 5, 1);
    // Right door slats
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(x + w / 2 + 2, vy, w / 2 - 5, 2);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(x + w / 2 + 2, vy + 2, w / 2 - 5, 1);
  }

  // Door handles — recessed grip style
  const handleY = Math.floor(y + h * 0.35);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + w / 2 - 7, handleY - 1, 5, 10);
  ctx.fillRect(x + w / 2 + 2, handleY - 1, 5, 10);
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x + w / 2 - 6, handleY, 3, 8);
  ctx.fillRect(x + w / 2 + 3, handleY, 3, 8);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x + w / 2 - 6, handleY, 3, 1);
  ctx.fillRect(x + w / 2 + 3, handleY, 3, 1);

  // Shelf 1 — visible through gap
  const shelfY = Math.floor(y + h * 0.3);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 2, shelfY, w - 4, 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 2, shelfY, w - 4, 1);
  // Items: book, box, canister
  ctx.fillStyle = C.woodMid;
  ctx.fillRect(x + 4, shelfY - 12, 8, 12);
  ctx.fillStyle = C.woodLight;
  ctx.fillRect(x + 4, shelfY - 12, 8, 1);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x + 5, shelfY - 11, 6, 1); // title line on spine
  ctx.fillStyle = "#3a5068";
  ctx.fillRect(x + 14, shelfY - 10, 10, 10);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x + 14, shelfY - 10, 10, 1);
  ctx.fillStyle = C.alertDim;
  ctx.fillRect(x + 26, shelfY - 8, 8, 8);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(x + 27, shelfY - 5, 6, 2);

  // Shelf 2
  const shelf2Y = Math.floor(y + h * 0.55);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 2, shelf2Y, w - 4, 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 2, shelf2Y, w - 4, 1);
  // Water container + tool
  ctx.fillStyle = "#2e4860";
  ctx.fillRect(x + 4, shelf2Y - 14, 14, 14);
  ctx.fillStyle = "#3a5a78";
  ctx.fillRect(x + 4, shelf2Y - 14, 14, 2);
  ctx.fillStyle = "rgba(0,180,255,0.15)";
  ctx.fillRect(x + 6, shelf2Y - 8, 10, 5);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 22, shelf2Y - 10, 6, 10);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 22, shelf2Y - 10, 6, 1);

  // Bottom section (closed panel)
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x + 2, y + h * 0.6, w - 4, h * 0.38);
  // Panel recess lines
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + 4, y + h * 0.65, w / 2 - 6, h * 0.28);
  ctx.fillRect(x + w / 2 + 2, y + h * 0.65, w / 2 - 6, h * 0.28);

  // Dent / scratch marks (battle-worn)
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(x + 6, y + h * 0.45, 8, 1);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(x + 6, y + h * 0.46, 8, 1);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + w - 12, y + h * 0.7, 5, 1);

  // Base/feet — raised on leveling feet
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x, y + h - 1, w, 2);
  ctx.fillRect(x + 2, y + h, 4, 3);
  ctx.fillRect(x + w - 6, y + h, 4, 3);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 2, y + h + 3, 4, 1);
  ctx.fillRect(x + w - 6, y + h + 3, 4, 1);
}

function drawSmallTable(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Industrial work table — welded steel, sturdy

  // Shadow under table
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 3, y + h + 1, w - 6, 4);

  // Legs — angle iron profile (L-shaped)
  for (const lx of [x + 2, x + w - 5]) {
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(lx, y + 5, 3, h - 2);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(lx, y + 5, 1, h - 2);
    // Foot pad
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(lx - 1, y + h + 1, 5, 2);
    // Weld at top
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(lx, y + 4, 3, 2);
  }

  // Cross brace — X-pattern
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 5, y + Math.floor(h * 0.55), w - 10, 2);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + 5, y + Math.floor(h * 0.55), w - 10, 1);
  // Diagonal brace hint
  ctx.fillStyle = "rgba(42,62,88,0.5)";
  ctx.fillRect(x + 5, y + Math.floor(h * 0.4), 1, Math.floor(h * 0.15));
  ctx.fillRect(x + w - 6, y + Math.floor(h * 0.4), 1, Math.floor(h * 0.15));

  // Tabletop — thick slab with 3D edge
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x - 1, y, w + 2, 4);
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x - 1, y, w + 2, 1); // top surface highlight
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - 1, y + 3, w + 2, 2); // front edge (3D)
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - 1, y + 4, w + 2, 1); // bottom edge shadow

  // Surface scratches
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + 4, y + 1, Math.floor(w * 0.3), 1);
  ctx.fillRect(x + Math.floor(w * 0.5), y + 2, Math.floor(w * 0.2), 1);
}

function drawBucket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Metal bucket — tapered cylinder with handle

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 1, w / 2 + 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body — tapered (wider at top)
  const bodyTop = y + 3;
  const bodyBot = y + h;
  for (let row = 0; row < bodyBot - bodyTop; row++) {
    const t = row / Math.max(bodyBot - bodyTop - 1, 1);
    const inset = Math.round(t * 2); // narrower at bottom
    const rw = w - 2 - inset * 2;
    const rx = x + 1 + inset;
    // Cylindrical shading
    const leftCol = t < 0.3 ? C.metalHighlight : C.metalLight;
    const rightCol = C.metalMid;
    const half = Math.ceil(rw / 2);
    ctx.fillStyle = leftCol;
    ctx.fillRect(rx, bodyTop + row, half, 1);
    ctx.fillStyle = rightCol;
    ctx.fillRect(rx + half, bodyTop + row, rw - half, 1);
  }

  // Reinforcement bands (horizontal rings)
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 1, y + Math.floor(h * 0.35), w - 2, 1);
  ctx.fillRect(x + 2, y + Math.floor(h * 0.7), w - 4, 1);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(x + 1, y + Math.floor(h * 0.35) + 1, w - 2, 1);

  // Rim — wide lip
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x - 1, y, w + 2, 3);
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x - 1, y, w + 2, 1);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + 2, w, 1);

  // Handle — wire with attachment rivets
  ctx.strokeStyle = C.metalHighlight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 1);
  ctx.quadraticCurveTo(x + w / 2, y - 10, x + w - 2, y + 1);
  ctx.stroke();
  // Handle rivets
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 1, y, 2, 2);
  ctx.fillRect(x + w - 3, y, 2, 2);

  // Water inside
  ctx.fillStyle = "rgba(0,180,255,0.12)";
  ctx.fillRect(x + 3, y + Math.floor(h * 0.4), w - 6, Math.floor(h * 0.5));
  // Water surface highlight
  ctx.fillStyle = "rgba(180,220,255,0.08)";
  ctx.fillRect(x + 3, y + Math.floor(h * 0.4), w - 6, 1);

  // Bottom edge
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 3, y + h - 1, w - 6, 1);
}

function drawFoodTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Metal mess tray — institutional, with compartments and food

  // Tray shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 2, y + h, w - 2, 2);

  // Tray base — brushed steel
  const tG = ctx.createLinearGradient(x, 0, x + w, 0);
  tG.addColorStop(0, C.metalHighlight);
  tG.addColorStop(0.5, C.metalLight);
  tG.addColorStop(1, C.metalMid);
  ctx.fillStyle = tG;
  ctx.fillRect(x, y, w, h);

  // Raised rim
  ctx.fillStyle = "#7a9ab8";
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x, y + h - 1, w, 1);

  // Compartment dividers
  const divX1 = x + Math.floor(w * 0.4);
  const divX2 = x + Math.floor(w * 0.7);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(divX1, y + 1, 1, h - 2);
  ctx.fillRect(divX2, y + 1, 1, h - 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(divX1 + 1, y + 1, 1, h - 2);

  // Food: main portion (bread/protein — warm brown)
  ctx.fillStyle = "#6a5038";
  ctx.fillRect(x + 3, y + 2, divX1 - x - 5, h - 4);
  ctx.fillStyle = "#7a6048";
  ctx.fillRect(x + 3, y + 2, divX1 - x - 5, 1);
  // Sauce drizzle
  ctx.fillStyle = "rgba(160,80,40,0.3)";
  ctx.fillRect(x + 5, y + 3, 6, 1);

  // Food: green portion (vegetables)
  ctx.fillStyle = "#3a5838";
  ctx.fillRect(divX1 + 2, y + 2, divX2 - divX1 - 3, h - 4);
  ctx.fillStyle = "#4a6848";
  ctx.fillRect(divX1 + 3, y + 2, 3, 2);

  // Cup in third compartment
  const cupX = divX2 + 2;
  const cupW = Math.min(7, x + w - cupX - 2);
  if (cupW > 3) {
    ctx.fillStyle = C.metalHighlight;
    ctx.fillRect(cupX, y + 1, cupW, h - 3);
    ctx.fillStyle = "#7a9ab8";
    ctx.fillRect(cupX, y + 1, cupW, 1);
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(cupX, y + h - 3, cupW, 1);
    // Liquid inside
    ctx.fillStyle = "rgba(80,60,40,0.3)";
    ctx.fillRect(cupX + 1, y + 2, cupW - 2, h - 5);
  }
}

function drawFireExtinguisher(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Wall-mounted fire extinguisher — red cylinder with details

  // Wall bracket (behind)
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - 1, y - 2, w + 2, 4);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - 1, y + Math.floor(h * 0.6), w + 2, 3);

  // Cylinder body — red with cylindrical shading
  for (let row = 0; row < h; row++) {
    const ry = y + row;
    const t = (row < h / 2) ? row / (h / 2) : 1;
    // Tapered at top
    const inset = row < 4 ? 4 - row : 0;
    const rw = Math.max(1, w - inset * 2);
    const rx = x + inset;
    const bright = row < h * 0.3;
    ctx.fillStyle = bright ? C.dangerBright : C.dangerMid;
    ctx.fillRect(rx, ry, Math.ceil(rw * 0.5), 1);
    ctx.fillStyle = bright ? C.dangerMid : C.dangerDim;
    ctx.fillRect(rx + Math.ceil(rw * 0.5), ry, rw - Math.ceil(rw * 0.5), 1);
    void t; // used for taper
  }

  // Label band (white stripe)
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x, y + Math.floor(h * 0.3), w, Math.max(2, Math.floor(h * 0.15)));
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y + Math.floor(h * 0.3), w, 1);

  // Valve/nozzle at top
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + Math.floor(w * 0.3), y - 3, Math.max(2, Math.floor(w * 0.4)), 4);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + Math.floor(w * 0.3), y - 3, Math.max(2, Math.floor(w * 0.4)), 1);
  // Handle
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + w, y - 2, 3, 3);

  // Pressure gauge (tiny circle)
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(x + Math.floor(w * 0.3), y + Math.floor(h * 0.2), 2, 2);

  // Bottom base
  ctx.fillStyle = C.dangerDim;
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillStyle = "#1a0a0a";
  ctx.fillRect(x, y + h - 1, w, 1);
}

function drawFloorDrain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Circular floor drain grate — dark recess with metal grid

  // Recessed shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2 + 2, size / 4 + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Drain hole (dark)
  ctx.fillStyle = "#060a10";
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2, size / 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Grate bars (cross pattern)
  const hs = Math.floor(size / 2);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - hs, y - 1, size, 1); // horizontal
  ctx.fillRect(x - 1, y - Math.floor(size / 4), 1, Math.floor(size / 2)); // vertical
  // Diagonal bars
  ctx.fillStyle = "rgba(42,62,88,0.6)";
  ctx.fillRect(x - hs + 2, y - 1, Math.floor(size * 0.3), 1);
  ctx.fillRect(x + 2, y - 1, Math.floor(size * 0.3), 1);

  // Rim highlight
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2 + 1, size / 4 + 1, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Moisture around drain
  ctx.fillStyle = "rgba(0,180,255,0.04)";
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2 + 4, size / 4 + 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSignalWire(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.strokeStyle = C.signalMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = C.signalBright;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const isH = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  if (isH) {
    const g = ctx.createLinearGradient(0, y1 - 10, 0, y1 + 10);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, "rgba(110,255,160,0.08)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x1, x2), y1 - 10, Math.abs(x2 - x1), 20);
  } else {
    const g = ctx.createLinearGradient(x1 - 10, 0, x1 + 10, 0);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, "rgba(110,255,160,0.08)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x1 - 10, Math.min(y1, y2), 20, Math.abs(y2 - y1));
  }
}

function drawCableBundle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1 + 2);
  ctx.lineTo(x2, y2 + 2);
  ctx.stroke();
}

function drawAlarmFixture(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  ctx.fillStyle = "#243448";
  ctx.fillRect(x - 8, y, 16, 10);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x - 8, y, 16, 1);

  if (active) {
    ctx.fillStyle = C.dangerBright;
    ctx.fillRect(x - 4, y + 3, 8, 4);
    const g = ctx.createRadialGradient(x, y + 5, 2, x, y + 5, 50);
    g.addColorStop(0, "rgba(255,64,64,0.2)");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - 50, y - 35, 100, 80);
  } else {
    ctx.fillStyle = C.dangerDim;
    ctx.fillRect(x - 3, y + 4, 6, 2);
  }
}

function drawDetailedServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Rack frame
  ctx.fillStyle = "#0e1828";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#243448";
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y, w, 2);

  // Server units (1U style)
  for (let sy = y + 4; sy + 8 < y + h; sy += 10) {
    ctx.fillStyle = "#1a2e48";
    ctx.fillRect(x + 4, sy, w - 8, 8);
    ctx.fillStyle = "#243854";
    ctx.fillRect(x + 4, sy, w - 8, 1);

    // LEDs — deterministic, colorful
    const baseHash = (sy * 13 + x * 7) | 0;
    for (let lx = x + 6; lx < x + w - 8; lx += 5) {
      const ledHash = (baseHash + lx * 3) % 100;
      if (ledHash < 20) continue; // some off
      const colors = [C.signalBright, C.termBright, C.alertBright, C.dangerBright, "#80ff80"];
      const c = colors[ledHash % colors.length];
      ctx.fillStyle = c;
      ctx.fillRect(lx, sy + 3, 2, 2);
    }

    // Vent holes
    ctx.fillStyle = "#0a1420";
    ctx.fillRect(x + w - 14, sy + 2, 6, 1);
    ctx.fillRect(x + w - 14, sy + 5, 6, 1);
  }
}

function drawLightRays(ctx: CanvasRenderingContext2D, sourceX: number, sourceY: number, w: number, h: number, alpha: number) {
  // Diagonal light streaks from a light source
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rayCount = 5;
  for (let i = 0; i < rayCount; i++) {
    const angle = -0.3 + i * 0.15;
    const rayLen = h * 0.8;
    const rayW = 15 + i * 8;

    ctx.save();
    ctx.translate(sourceX, sourceY);
    ctx.rotate(angle);

    const g = ctx.createLinearGradient(0, 0, 0, rayLen);
    g.addColorStop(0, `rgba(200,215,235,${alpha})`);
    g.addColorStop(0.3, `rgba(200,215,235,${alpha * 0.6})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(-rayW / 2, 0, rayW, rayLen);

    ctx.restore();
  }
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
  g.addColorStop(0, "transparent");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawAO(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: "down" | "up") {
  const g = ctx.createLinearGradient(0, dir === "down" ? y : y + h, 0, dir === "down" ? y + h : y);
  g.addColorStop(0, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
