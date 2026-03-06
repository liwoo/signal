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

  // Desk surface
  ctx.fillStyle = "#1e3048";
  ctx.fillRect(x - 10, y + monH + 2, w + 20, deskH);
  ctx.fillStyle = "#2a4260";
  ctx.fillRect(x - 10, y + monH + 2, w + 20, 2);
  // Desk legs
  ctx.fillStyle = "#142030";
  ctx.fillRect(x - 8, y + h - 2, 5, 5);
  ctx.fillRect(x + w + 4, y + h - 2, 5, 5);

  // Monitor bezel
  ctx.fillStyle = "#141e2c";
  ctx.fillRect(x - 4, y - 4, w + 8, monH + 8);
  ctx.fillStyle = "#243448";
  ctx.fillRect(x - 4, y - 4, w + 8, 2);

  // Screen — dark with content
  ctx.fillStyle = "#040e18";
  ctx.fillRect(x, y, w, monH);

  // Screen content — terminal text lines
  // Use deterministic "random" via simple hash
  for (let ly = y + 4; ly < y + monH - 4; ly += 5) {
    const hash = (ly * 7 + 13) % 100;
    const lineW = 12 + (hash % (w - 20));
    const bright = hash % 3;
    ctx.fillStyle = bright === 0 ? C.termBright : bright === 1 ? C.termMid : C.termDim;
    ctx.globalAlpha = 0.5 + (hash % 40) / 100;
    ctx.fillRect(x + 4, ly, lineW, 3);
    ctx.globalAlpha = 1;
  }

  // Cursor
  ctx.fillStyle = C.termBright;
  ctx.fillRect(x + 4, y + monH - 10, 8, 4);

  // Screen bezel glow
  ctx.strokeStyle = "rgba(0,212,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, monH - 1);

  // Monitor stand
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(x + w / 2 - 8, y + monH + 1, 16, 4);

  // Keyboard
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x + 4, y + monH + 8, w - 8, 10);
  for (let kx = x + 6; kx < x + w - 8; kx += 5) {
    ctx.fillStyle = "#2a3a50";
    ctx.fillRect(kx, y + monH + 10, 3, 5);
  }

  // Mouse
  ctx.fillStyle = "#1e2e44";
  ctx.fillRect(x + w - 2, y + monH + 12, 8, 5);
  ctx.fillStyle = "#2a3e58";
  ctx.fillRect(x + w - 2, y + monH + 12, 8, 1);

  // Cables from back
  ctx.fillStyle = "#0e1828";
  ctx.fillRect(x + w - 4, y + monH * 0.4, 10, 2);
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(x + w + 4, y + monH * 0.4, 5, 1);
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

  // Card reader with colored LED
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x + w - 14, y + h * 0.28, 10, 10);
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(x + w - 12, y + h * 0.28 + 3, 6, 3);

  // Door number stencil
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 8, y + 8, 16, 8);

  // Frame inner shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x, y + h - 2, w, 2);
}

function drawDetailedCot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 3, y + h + 1, w - 6, 6);

  // Frame legs — bright metal, clearly visible
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x, y + h - 6, 6, 12);
  ctx.fillRect(x + w - 6, y + h - 6, 6, 12);
  ctx.fillRect(x, y + 2, 6, 10);
  ctx.fillRect(x + w - 6, y + 2, 6, 10);
  // Leg highlights
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y + h - 6, 1, 12);
  ctx.fillRect(x + w - 6, y + h - 6, 1, 12);

  // Frame rail — bright
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y + h - 3, w, 4);
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x, y + h - 3, w, 1);

  // Mattress — grayish, distinct from blue floor
  fillGradientV(ctx, x + 6, y + 3, w - 12, h - 8, "#3a4a5a", "#2e3e4e");
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 6, y + 3, w - 12, 1);

  // Pillow — lighter gray
  fillGradientV(ctx, x + 8, y + 5, 30, h - 12, "#485868", "#3a4a5a");
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 8, y + 5, 30, 1);

  // Blanket — dark green tint (Maya's hoodie color vibe)
  ctx.fillStyle = "#2a4840";
  ctx.fillRect(x + 42, y + 5, w - 50, 4);
  ctx.fillStyle = "#1e3830";
  ctx.fillRect(x + 42, y + 9, w - 50, 3);

  // Wrinkle details on mattress
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(x + 50, y + 16, 30, 1);
  ctx.fillRect(x + 60, y + 24, 20, 1);
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Military-style crate — distinct from floor
  ctx.fillStyle = "#2e4458";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#3a5870";
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = "#1e3448";
  ctx.fillRect(x, y + h - 2, w, 2);
  // Left edge highlight
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, 1, h);
  // Metal bands
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + 4, w, 2);
  ctx.fillRect(x, y + h - 5, w, 2);
  // Warning label
  ctx.fillStyle = C.alertDim;
  ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(x + 6, y + h / 2 - 1, w - 12, 2);
  // Handle
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + w / 2 - 6, y + 1, 12, 2);
}

function drawShelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Wall-mounted shelf with brackets and items
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 5, y, 3, h);
  ctx.fillRect(x + w - 8, y, 3, h);

  for (let i = 0; i < 3; i++) {
    const sy = y + 4 + i * Math.floor(h / 3);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(x, sy, w, 3);
    ctx.fillStyle = C.metalHighlight;
    ctx.fillRect(x, sy, w, 1);

    if (i === 0) {
      // Containers
      ctx.fillStyle = "#2e4868";
      ctx.fillRect(x + 2, sy - 10, 10, 10);
      ctx.fillStyle = "#3a5878";
      ctx.fillRect(x + 2, sy - 10, 10, 1);
      ctx.fillStyle = C.alertDim;
      ctx.fillRect(x + 14, sy - 7, 7, 7);
      ctx.fillStyle = C.alertMid;
      ctx.fillRect(x + 15, sy - 5, 5, 3);
      // Small bottle
      ctx.fillStyle = "#3a5068";
      ctx.fillRect(x + 24, sy - 8, 5, 8);
    } else if (i === 1) {
      // Water jug
      ctx.fillStyle = "#1e3850";
      ctx.fillRect(x + 2, sy - 12, 14, 12);
      ctx.fillStyle = "rgba(0,180,255,0.15)";
      ctx.fillRect(x + 4, sy - 7, 10, 5);
      // Book
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(x + 20, sy - 6, 12, 6);
      ctx.fillStyle = C.woodMid;
      ctx.fillRect(x + 20, sy - 6, 12, 1);
    } else {
      // Folded cloth
      ctx.fillStyle = "#243854";
      ctx.fillRect(x + 2, sy - 6, 18, 6);
      ctx.fillStyle = "#2a4060";
      ctx.fillRect(x + 2, sy - 6, 18, 1);
      // Cup
      ctx.fillStyle = C.metalMid;
      ctx.fillRect(x + 24, sy - 8, 7, 8);
      ctx.fillStyle = C.metalLight;
      ctx.fillRect(x + 24, sy - 8, 7, 1);
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y + h, w, 5);
}

function drawToilet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 2, w / 2 + 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bowl — bright metal, clearly visible
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 2, y + 5, w - 4, h - 5);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 2, y + 5, w - 4, 2);
  // Inner bowl
  ctx.fillStyle = "#141e30";
  ctx.fillRect(x + 5, y + 9, w - 10, h - 14);
  // Water in bowl
  ctx.fillStyle = "rgba(0,180,255,0.08)";
  ctx.fillRect(x + 6, y + h - 10, w - 12, 5);

  // Tank — substantial
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 3, y - 2, w - 6, 9);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 3, y - 2, w - 6, 2);

  // Flush handle
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x + w - 8, y, 6, 3);

  // Pipe into wall
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + w / 2 - 2, y - 14, 4, 14);
}

function drawStool(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 2, y + h, w - 4, 4);
  // Legs — visible metal
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 3, y + 5, 3, h - 5);
  ctx.fillRect(x + w - 6, y + 5, 3, h - 5);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 3, y + 5, 1, h - 5);
  ctx.fillRect(x + w - 6, y + 5, 1, h - 5);
  // Seat — bright, visible
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x, y, w, 1);
  // Cross bar
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 5, y + h * 0.6, w - 10, 2);
}

function drawPapers(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Scattered papers — white-ish to pop against dark floor
  ctx.fillStyle = "#586878";
  ctx.fillRect(x, y, 18, 12);
  ctx.fillStyle = "#6a7a8a";
  ctx.fillRect(x, y, 18, 1);
  // Text lines on paper
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 2, y + 3, 12, 1);
  ctx.fillRect(x + 2, y + 6, 10, 1);
  ctx.fillRect(x + 2, y + 9, 14, 1);
  // Second paper (overlapping)
  ctx.fillStyle = "#506070";
  ctx.fillRect(x + 10, y + 4, 14, 10);
  // Pen
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 26, y + 7, 12, 2);
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(x + 26, y + 7, 3, 2);
}

function drawLocker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Tall metal storage locker — like a bookshelf
  // Shadow behind
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 3, y + 3, w, h);

  // Body
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.metalLight);
  g.addColorStop(0.3, C.metalMid);
  g.addColorStop(1, C.metalDark);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // Top edge highlight
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y, w, 2);

  // Door seam (center vertical)
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + w / 2 - 1, y + 2, 2, h - 4);

  // Door handles
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x + w / 2 - 6, y + h * 0.35, 4, 8);
  ctx.fillRect(x + w / 2 + 2, y + h * 0.35, 4, 8);

  // Vent slats on upper doors
  for (let vy = y + 6; vy < y + h * 0.25; vy += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x + 3, vy, w / 2 - 5, 2);
    ctx.fillRect(x + w / 2 + 2, vy, w / 2 - 5, 2);
  }

  // Items visible on open shelf (middle section)
  const shelfY = y + h * 0.3;
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 2, shelfY, w - 4, 2);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 2, shelfY, w - 4, 1);

  // Items on shelf
  ctx.fillStyle = C.woodMid;
  ctx.fillRect(x + 4, shelfY - 12, 8, 12);
  ctx.fillStyle = C.woodLight;
  ctx.fillRect(x + 4, shelfY - 12, 8, 1);
  ctx.fillStyle = "#3a5068";
  ctx.fillRect(x + 14, shelfY - 10, 10, 10);
  ctx.fillStyle = C.alertDim;
  ctx.fillRect(x + 26, shelfY - 8, 8, 8);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(x + 27, shelfY - 5, 6, 2);

  // Second shelf
  const shelf2Y = y + h * 0.55;
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 2, shelf2Y, w - 4, 2);
  // More items
  ctx.fillStyle = "#2e4860";
  ctx.fillRect(x + 4, shelf2Y - 14, 14, 14);
  ctx.fillStyle = "rgba(0,180,255,0.12)";
  ctx.fillRect(x + 6, shelf2Y - 8, 10, 5);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 22, shelf2Y - 10, 6, 10);

  // Bottom section (closed)
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x + 2, y + h * 0.6, w - 4, h * 0.38);

  // Base/feet
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 2, y + h - 4, 6, 4);
  ctx.fillRect(x + w - 8, y + h - 4, 6, 4);
}

function drawSmallTable(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Simple metal work table
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 2, y + h + 1, w - 4, 4);

  // Legs
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 2, y + 3, 3, h);
  ctx.fillRect(x + w - 5, y + 3, 3, h);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x + 2, y + 3, 1, h);
  ctx.fillRect(x + w - 5, y + 3, 1, h);

  // Cross brace
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 5, y + h * 0.6, w - 10, 2);

  // Tabletop
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + 3, w, 1);
}

function drawBucket(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Metal bucket
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 1, w / 2 + 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.metalHighlight);
  g.addColorStop(0.4, C.metalLight);
  g.addColorStop(1, C.metalMid);
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 3, w - 2, h - 3);

  // Rim
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x, y, w, 1);

  // Handle
  ctx.strokeStyle = C.metalHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 2, y);
  ctx.quadraticCurveTo(x + w / 2, y - 8, x + w - 2, y);
  ctx.stroke();

  // Water inside (partial)
  ctx.fillStyle = "rgba(0,180,255,0.12)";
  ctx.fillRect(x + 3, y + h * 0.4, w - 6, h * 0.5);
}

function drawFoodTray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Metal tray — bright
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x, y, w, 2);
  // Rim
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + h - 1, w, 1);
  // Food items — warm tones
  ctx.fillStyle = C.woodMid;
  ctx.fillRect(x + 3, y + 3, 10, 5);
  ctx.fillStyle = "#5a5838";
  ctx.fillRect(x + 15, y + 3, 8, 5);
  // Cup
  ctx.fillStyle = C.metalHighlight;
  ctx.fillRect(x + 25, y + 1, 7, 7);
  ctx.fillStyle = "#7898b8";
  ctx.fillRect(x + 25, y + 1, 7, 1);
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
