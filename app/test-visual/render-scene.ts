import { paintScene } from "../src/lib/sprites/scene-painter";
import { paintMayaFrames, paintGuardFrames } from "../src/lib/sprites/character-painter";
import { paintActOneMap, ACT_ONE_NODES } from "../src/lib/sprites/map-painter";
import type { MapNode } from "../src/lib/sprites/map-painter";
import { paintBossFrames } from "../src/lib/sprites/boss-painter";
import type { BossAnimation } from "../src/lib/sprites/boss-painter";

function renderTo(id: string, source: HTMLCanvasElement) {
  const target = document.getElementById(id) as HTMLCanvasElement;
  const ctx = target.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
}

console.log("Starting render...");

// Scenes — paint at exact target size
for (const type of ["cell", "corridor", "chase", "vent", "server", "boss-arena"] as const) {
  try {
    const bg = paintScene(type, 640, 420);
    console.log(`${type}: ${bg.width}x${bg.height}, has data:`, bg.width > 0);
    renderTo(type, bg);
  } catch (e) {
    console.error(`Error painting ${type}:`, e);
  }
}

// ── COMPOSITE: Maya standing in cell scene (grounding test) ──
try {
  const W = 640;
  const H = 420;
  const bg = paintScene("cell", W, H);
  const mayaFrames = paintMayaFrames("idle", 3);
  const guardFrames = paintGuardFrames("idle", 3);

  const compCanvas = document.getElementById("composite") as HTMLCanvasElement;
  const ctx = compCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Draw background
  ctx.drawImage(bg, 0, 0);

  // Floor line for this scene: wallBotY = H * 0.50 = 210
  const floorY = Math.floor(H * 0.50);

  // Draw a debug floor line (thin green)
  ctx.strokeStyle = "rgba(110,255,160,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Maya standing on floor — feet at floorY + offset into floor area
  // Character anchor is at feet (bottom center)
  const mayaFeetY = floorY + 60; // Standing on floor, a bit into the floor area
  const mayaX = W * 0.35;
  const mf = mayaFrames[0];
  ctx.drawImage(mf, mayaX - mf.width / 2, mayaFeetY - mf.height);

  // Guard standing further right, slightly lower
  const guardFeetY = floorY + 70;
  const guardX = W * 0.70;
  const gf = guardFrames[0];
  ctx.drawImage(gf, guardX - gf.width / 2, guardFeetY - gf.height);

  // Labels
  ctx.font = "11px monospace";
  ctx.fillStyle = "#6effa0";
  ctx.fillText(`floor line: y=${floorY}`, 10, floorY - 4);
  ctx.fillText(`maya feet: y=${mayaFeetY}`, mayaX - 40, mayaFeetY + 12);
  ctx.fillText(`guard feet: y=${guardFeetY}`, guardX - 40, guardFeetY + 12);

  console.log(`Composite: ${W}x${H}, floorY=${floorY}, maya@${mayaFeetY}, guard@${guardFeetY}`);
} catch (e) {
  console.error("Error painting composite:", e);
}

// ── CINEMATIC composite: new painter at cinematic dims + Maya at authored coords ──
try {
  const el = document.getElementById("cine-cell") as HTMLCanvasElement | null;
  if (el) {
    const ctx = el.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    // Compose at full 1040x600, then scale 0.5 into the visible canvas.
    const full = document.createElement("canvas");
    full.width = 1040; full.height = 600;
    const fctx = full.getContext("2d")!;
    fctx.imageSmoothingEnabled = false;
    fctx.drawImage(paintScene("cell", 1040, 600), 0, 0);
    const f = paintMayaFrames("hack", 2.4)[0];
    const mx = 520, feetY = 340; // authored "rigged the terminal" coords
    fctx.drawImage(f, mx - f.width / 2, feetY - f.height);
    ctx.drawImage(full, 0, 0, 1040, 600, 0, 0, 520, 300);
  }
} catch (e) {
  console.error("Error painting cine-cell:", e);
}

// ── PROMO LOOP composite — verify proportions + grounding ──
try {
  const PW = 960, PH = 540, S = 2.2;
  const pc = document.getElementById("promo-cell") as HTMLCanvasElement | null;
  if (pc) {
    const full = document.createElement("canvas"); full.width = PW; full.height = PH;
    const fx = full.getContext("2d")!; fx.imageSmoothingEnabled = false;
    fx.drawImage(paintScene("cell", PW, PH), 0, 0);
    const f = paintMayaFrames("idle", S)[0];
    fx.drawImage(f, 360 - f.width / 2, 440 - f.height);
    const c = pc.getContext("2d")!; c.imageSmoothingEnabled = false;
    c.drawImage(full, 0, 0, PW, PH, 0, 0, 480, 270);
  }
  const pk = document.getElementById("promo-corridor") as HTMLCanvasElement | null;
  if (pk) {
    const full = document.createElement("canvas"); full.width = PW; full.height = PH;
    const fx = full.getContext("2d")!; fx.imageSmoothingEnabled = false;
    fx.drawImage(paintScene("corridor", PW, PH), 0, 0);
    const m = paintMayaFrames("walk-right", S)[0];
    fx.drawImage(m, 300 - m.width / 2, 470 - m.height);
    const g = paintGuardFrames("walk-right", S)[0];
    fx.globalAlpha = 0.6;
    fx.drawImage(g, 780 - g.width / 2, 470 - g.height);
    fx.globalAlpha = 1;
    const c = pk.getContext("2d")!; c.imageSmoothingEnabled = false;
    c.drawImage(full, 0, 0, PW, PH, 0, 0, 480, 270);
  }
  console.log("Promo composite rendered");
} catch (e) {
  console.error("Error painting promo composite:", e);
}

// ── INTRO CINEMATIC viewport — replicate PixiScene camera crop ──
try {
  const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const SW = 1040, SH = 600, VW = 640, VH = 400, BASE = 0.85;
  const shots: { id: string; scene: Parameters<typeof paintScene>[0]; anim: Parameters<typeof paintMayaFrames>[0]; ax: number; ay: number; camX: number; camY: number; zoom: number }[] = [
    { id: "vp-1", scene: "cell", anim: "idle", ax: 380, ay: 370, camX: 400, camY: 290, zoom: 1.2 },
    { id: "vp-2", scene: "cell", anim: "hack", ax: 520, ay: 340, camX: 560, camY: 295, zoom: 1.4 },
    { id: "vp-3", scene: "corridor", anim: "walk-right", ax: 600, ay: 460, camX: 600, camY: 300, zoom: 1.0 },
  ];
  for (const s of shots) {
    const el = document.getElementById(s.id) as HTMLCanvasElement | null;
    if (!el) continue;
    const ctx = el.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, VW, VH);
    const scale = BASE * s.zoom;
    const cx = clampN(s.camX, VW / 2 / scale, SW - VW / 2 / scale);
    const cy = clampN(s.camY, VH / 2 / scale, SH - VH / 2 / scale);
    const offX = VW / 2 - cx * scale, offY = VH / 2 - cy * scale;
    ctx.drawImage(paintScene(s.scene, SW, SH), 0, 0, SW, SH, offX, offY, SW * scale, SH * scale);
    const f = paintMayaFrames(s.anim, 2.4)[0];
    ctx.drawImage(f, offX + s.ax * scale - (f.width / 2) * scale, offY + (s.ay - f.height) * scale, f.width * scale, f.height * scale);
  }
  console.log("Intro viewport rendered");
} catch (e) {
  console.error("Error painting intro viewport:", e);
}

// ── CINEMATIC AUDIT — check actor grounding against the new floors ──
try {
  const audits: { id: string; scene: Parameters<typeof paintScene>[0]; anim: Parameters<typeof paintMayaFrames>[0]; x0: number; x1: number; y: number }[] = [
    { id: "cine-corridor", scene: "corridor", anim: "walk-right", x0: 160, x1: 620, y: 470 },
    { id: "cine-chase", scene: "chase", anim: "walk-right", x0: 180, x1: 700, y: 470 },
    { id: "cine-vent", scene: "vent", anim: "crawl-right", x0: 180, x1: 520, y: 430 },
    { id: "cine-cell2", scene: "cell", anim: "walk-right", x0: 360, x1: 640, y: 430 },
    { id: "cine-boss", scene: "boss-arena", anim: "walk-right", x0: 260, x1: 420, y: 470 },
  ];
  for (const a of audits) {
    const el = document.getElementById(a.id) as HTMLCanvasElement | null;
    if (!el) continue;
    const ctx = el.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const full = document.createElement("canvas");
    full.width = 1040; full.height = 600;
    const fc = full.getContext("2d")!;
    fc.imageSmoothingEnabled = false;
    fc.drawImage(paintScene(a.scene, 1040, 600), 0, 0);
    const f = paintMayaFrames(a.anim, 1.6)[0];
    fc.globalAlpha = 0.4;
    fc.drawImage(f, a.x0 - f.width / 2, a.y - f.height);
    fc.globalAlpha = 1;
    fc.drawImage(f, a.x1 - f.width / 2, a.y - f.height);
    // draw the floor-far line (farB) for reference in magenta
    ctx.drawImage(full, 0, 0, 1040, 600, 0, 0, 520, 300);
  }
  console.log("Cinematic audit rendered");
} catch (e) {
  console.error("Error painting cinematic audit:", e);
}

// ── CAM-FEED cutouts (replicates MayaAnimation crop logic) ──
try {
  const CAM_W = 220, CAM_H = 140, SW = 460, SH = 340;
  const clampV = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const feeds: { id: string; scene: Parameters<typeof paintScene>[0]; anim: Parameters<typeof paintMayaFrames>[0]; mayaXf: number; feetYf: number; scale: number }[] = [
    { id: "camfeed-cell-hack", scene: "cell", anim: "hack", mayaXf: 0.42, feetYf: 0.74, scale: 2 },
    { id: "camfeed-cell-keypad", scene: "cell", anim: "keypad", mayaXf: 0.74, feetYf: 0.74, scale: 2 },
    { id: "camfeed-vent", scene: "vent", anim: "crawl-right", mayaXf: 0.5, feetYf: 0.7, scale: 3 },
    { id: "camfeed-corridor", scene: "corridor", anim: "walk-right", mayaXf: 0.5, feetYf: 0.72, scale: 2 },
    { id: "camfeed-server", scene: "server", anim: "hack", mayaXf: 0.4, feetYf: 0.74, scale: 2 },
  ];
  for (const f of feeds) {
    const el = document.getElementById(f.id) as HTMLCanvasElement | null;
    if (!el) continue;
    const ctx = el.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const bg = paintScene(f.scene, SW, SH);
    const frame = paintMayaFrames(f.anim, f.scale)[0];
    const mayaX = SW * f.mayaXf, feetY = SH * f.feetYf;
    const camX = clampV(mayaX - CAM_W / 2, 0, SW - CAM_W);
    const camY = clampV(feetY - CAM_H * 0.82, 0, SH - CAM_H);
    ctx.clearRect(0, 0, CAM_W, CAM_H);
    ctx.drawImage(bg, camX, camY, CAM_W, CAM_H, 0, 0, CAM_W, CAM_H);
    ctx.drawImage(frame, mayaX - camX - frame.width / 2, feetY - camY - frame.height);
  }
  console.log("Cam-feeds rendered");
} catch (e) {
  console.error("Error painting cam-feeds:", e);
}

// Maya character standalone
try {
  const mayaFrames = paintMayaFrames("idle", 4);
  console.log("Maya frames:", mayaFrames.length, `size: ${mayaFrames[0].width}x${mayaFrames[0].height}`);
  const mayaCanvas = document.getElementById("maya") as HTMLCanvasElement;
  const ctx = mayaCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080e16";
  ctx.fillRect(0, 0, 192, 320);
  ctx.drawImage(mayaFrames[0], 0, 0);
} catch (e) {
  console.error("Error painting maya:", e);
}

// Guard character standalone
try {
  const guardFrames = paintGuardFrames("idle", 4);
  console.log("Guard frames:", guardFrames.length, `size: ${guardFrames[0].width}x${guardFrames[0].height}`);
  const guardCanvas = document.getElementById("guard") as HTMLCanvasElement;
  const ctx = guardCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080e16";
  ctx.fillRect(0, 0, 192, 320);
  ctx.drawImage(guardFrames[0], 0, 0);
} catch (e) {
  console.error("Error painting guard:", e);
}

// Maya typing/hack animation (6 frames)
try {
  const hackFrames = paintMayaFrames("hack", 3);
  console.log("Maya hack frames:", hackFrames.length, `size: ${hackFrames[0].width}x${hackFrames[0].height}`);
  const hackCanvas = document.getElementById("maya-hack") as HTMLCanvasElement;
  const hCtx = hackCanvas.getContext("2d")!;
  hCtx.imageSmoothingEnabled = false;
  hCtx.fillStyle = "#080e16";
  hCtx.fillRect(0, 0, 1152, 320);
  hackFrames.forEach((f, i) => {
    hCtx.drawImage(f, i * 192, 0);
    hCtx.fillStyle = "#6effa0";
    hCtx.font = "9px monospace";
    hCtx.fillText(`F${i}`, i * 192 + 2, 310);
  });
} catch (e) {
  console.error("Error painting maya hack:", e);
}

// Maya keypad animation (6 frames)
try {
  const keypadFrames = paintMayaFrames("keypad", 3);
  console.log("Maya keypad frames:", keypadFrames.length, `size: ${keypadFrames[0].width}x${keypadFrames[0].height}`);
  const kCanvas = document.getElementById("maya-keypad") as HTMLCanvasElement;
  const kCtx = kCanvas.getContext("2d")!;
  kCtx.imageSmoothingEnabled = false;
  kCtx.fillStyle = "#080e16";
  kCtx.fillRect(0, 0, 1152, 320);
  keypadFrames.forEach((f, i) => {
    kCtx.drawImage(f, i * 192, 0);
    kCtx.fillStyle = "#ff9f1c";
    kCtx.font = "9px monospace";
    kCtx.fillText(`F${i}`, i * 192 + 2, 310);
  });
} catch (e) {
  console.error("Error painting maya keypad:", e);
}

// Maya walk cycle strip (all 8 frames)
try {
  const walkFrames = paintMayaFrames("walk-right", 3);
  console.log("Maya walk frames:", walkFrames.length, `size: ${walkFrames[0].width}x${walkFrames[0].height}`);
  const walkCanvas = document.getElementById("maya-walk") as HTMLCanvasElement;
  const wCtx = walkCanvas.getContext("2d")!;
  wCtx.imageSmoothingEnabled = false;
  wCtx.fillStyle = "#080e16";
  wCtx.fillRect(0, 0, 1536, 320);
  walkFrames.forEach((f, i) => {
    wCtx.drawImage(f, i * 192, 0);
    wCtx.fillStyle = "#6effa0";
    wCtx.font = "9px monospace";
    wCtx.fillText(`F${i}`, i * 192 + 2, 310);
  });
} catch (e) {
  console.error("Error painting maya walk:", e);
}

// Guard walk cycle strip (all 8 frames)
try {
  const gWalkFrames = paintGuardFrames("walk-right", 3);
  console.log("Guard walk frames:", gWalkFrames.length, `size: ${gWalkFrames[0].width}x${gWalkFrames[0].height}`);
  const gWalkCanvas = document.getElementById("guard-walk") as HTMLCanvasElement;
  const gCtx = gWalkCanvas.getContext("2d")!;
  gCtx.imageSmoothingEnabled = false;
  gCtx.fillStyle = "#080e16";
  gCtx.fillRect(0, 0, 1536, 320);
  gWalkFrames.forEach((f, i) => {
    gCtx.drawImage(f, i * 192, 0);
    gCtx.fillStyle = "#ff4040";
    gCtx.font = "9px monospace";
    gCtx.fillText(`F${i}`, i * 192 + 2, 310);
  });
} catch (e) {
  console.error("Error painting guard walk:", e);
}

// Maya crawl cycle strip (all 8 frames)
try {
  const crawlFrames = paintMayaFrames("crawl-right", 3);
  console.log("Maya crawl frames:", crawlFrames.length, `size: ${crawlFrames[0].width}x${crawlFrames[0].height}`);
  const crawlCanvas = document.getElementById("maya-crawl") as HTMLCanvasElement;
  const cCtx = crawlCanvas.getContext("2d")!;
  cCtx.imageSmoothingEnabled = false;
  cCtx.fillStyle = "#080e16";
  cCtx.fillRect(0, 0, 1536, 320);
  crawlFrames.forEach((f, i) => {
    cCtx.drawImage(f, i * 192, 0);
    cCtx.fillStyle = "#ff9f1c";
    cCtx.font = "9px monospace";
    cCtx.fillText(`F${i}`, i * 192 + 2, 310);
  });
} catch (e) {
  console.error("Error painting maya crawl:", e);
}

// Maya crawling in vent scene (composite grounding test)
try {
  const W = 640;
  const H = 420;
  const bg = paintScene("vent", W, H);
  const crawlFrames = paintMayaFrames("crawl-right", 3);

  const compCanvas = document.getElementById("crawl-composite") as HTMLCanvasElement;
  const ctx = compCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(bg, 0, 0);

  // Floor line for vent scene
  const floorY = Math.floor(H * 0.50);
  ctx.strokeStyle = "rgba(110,255,160,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Maya crawling — feet anchored at floor + offset
  const mayaFeetY = floorY + 60;
  const mayaX = W * 0.4;
  const mf = crawlFrames[0];
  ctx.drawImage(mf, mayaX - mf.width / 2, mayaFeetY - mf.height);

  ctx.font = "11px monospace";
  ctx.fillStyle = "#6effa0";
  ctx.fillText(`floor: y=${floorY}`, 10, floorY - 4);
  ctx.fillText(`maya feet: y=${mayaFeetY}`, mayaX - 40, mayaFeetY + 12);

  console.log(`Crawl composite: ${W}x${H}, floorY=${floorY}, maya@${mayaFeetY}`);
} catch (e) {
  console.error("Error painting crawl composite:", e);
}

// Act 1 Game Map — two states
try {
  // Ch.01 complete
  const nodes1: MapNode[] = ACT_ONE_NODES.map((n, i) => ({
    ...n,
    status: i === 0 ? "complete" : i === 1 ? "current" : "locked",
  }));
  const map1 = paintActOneMap(nodes1, 2);
  renderTo("map-ch01", map1);
  console.log("Map ch01:", map1.width, "x", map1.height);

  // Ch.02 complete
  const nodes2: MapNode[] = ACT_ONE_NODES.map((n, i) => ({
    ...n,
    status: i <= 1 ? "complete" : i === 2 ? "current" : "locked",
  }));
  const map2 = paintActOneMap(nodes2, 2);
  renderTo("map-ch02", map2);
  console.log("Map ch02:", map2.width, "x", map2.height);
} catch (e) {
  console.error("Error painting maps:", e);
}

// ── BOSS: Lockmaster animation strips ──
function renderBossStrip(canvasId: string, anim: BossAnimation, hp: number = 100) {
  try {
    const frames = paintBossFrames(anim, 3, hp);
    console.log(`Boss ${anim}: ${frames.length} frames, ${frames[0].width}x${frames[0].height}`);
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#080e16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    frames.forEach((f, i) => {
      ctx.drawImage(f, i * f.width, 0);
      ctx.fillStyle = "#ff4040";
      ctx.font = "9px monospace";
      ctx.fillText(`F${i}`, i * f.width + 2, canvas.height - 6);
    });
  } catch (e) {
    console.error(`Error painting boss ${anim}:`, e);
  }
}

renderBossStrip("boss-idle", "idle");
renderBossStrip("boss-charge", "charge");
renderBossStrip("boss-hit", "hit-react");
renderBossStrip("boss-low", "low-hp", 25);
renderBossStrip("boss-defeat", "defeat");

// ── BOSS ARENA COMPOSITE: Maya vs Lockmaster in server room ──
try {
  const W = 640;
  const H = 420;
  const bg = paintScene("boss-arena", W, H);
  const mayaFrames = paintMayaFrames("hack", 3);
  const bossFrames = paintBossFrames("idle", 3);

  const arenaCanvas = document.getElementById("boss-composite") as HTMLCanvasElement;
  const ctx = arenaCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // Background (already has red tint from boss-arena scene)
  ctx.drawImage(bg, 0, 0);

  // Floor line
  const floorY = Math.floor(H * 0.38);
  ctx.strokeStyle = "rgba(255,64,64,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Maya on the left
  const mayaFeetY = floorY + 65;
  const mayaX = W * 0.2;
  const mf = mayaFrames[0];
  ctx.drawImage(mf, mayaX - mf.width / 2, mayaFeetY - mf.height);

  // Lockmaster on the right (wall-mounted, higher up)
  const bossY = floorY - 10; // Mounted on wall
  const bossX = W * 0.75;
  const bf = bossFrames[0];
  ctx.drawImage(bf, bossX - bf.width / 2, bossY - bf.height / 2);

  // Labels
  ctx.font = "11px monospace";
  ctx.fillStyle = "#6effa0";
  ctx.fillText("MAYA", mayaX - 15, mayaFeetY + 14);
  ctx.fillStyle = "#ff4040";
  ctx.fillText("LOCKMASTER", bossX - 32, bossY + bf.height / 2 + 14);

  console.log(`Boss arena: ${W}x${H}, maya@${mayaX},${mayaFeetY}, boss@${bossX},${bossY}`);
} catch (e) {
  console.error("Error painting boss arena:", e);
}

console.log("Render complete");
document.title = "RENDERED";
