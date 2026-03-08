import { paintScene } from "../src/lib/sprites/scene-painter";
import { paintMayaFrames, paintGuardFrames } from "../src/lib/sprites/character-painter";
import { paintActOneMap, ACT_ONE_NODES } from "../src/lib/sprites/map-painter";
import type { MapNode } from "../src/lib/sprites/map-painter";

function renderTo(id: string, source: HTMLCanvasElement) {
  const target = document.getElementById(id) as HTMLCanvasElement;
  const ctx = target.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
}

console.log("Starting render...");

// Scenes — paint at exact target size
for (const type of ["cell", "corridor", "chase", "server"] as const) {
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

console.log("Render complete");
document.title = "RENDERED";
