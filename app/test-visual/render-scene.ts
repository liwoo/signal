import { paintScene } from "../src/lib/sprites/scene-painter";
import { paintMayaFrames, paintGuardFrames } from "../src/lib/sprites/character-painter";

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
  ctx.fillRect(0, 0, 160, 256);
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
  ctx.fillRect(0, 0, 160, 256);
  ctx.drawImage(guardFrames[0], 0, 0);
} catch (e) {
  console.error("Error painting guard:", e);
}

// Maya walk cycle strip (all 8 frames)
try {
  const walkFrames = paintMayaFrames("walk-right", 3);
  console.log("Maya walk frames:", walkFrames.length, `size: ${walkFrames[0].width}x${walkFrames[0].height}`);
  const walkCanvas = document.getElementById("maya-walk") as HTMLCanvasElement;
  const wCtx = walkCanvas.getContext("2d")!;
  wCtx.imageSmoothingEnabled = false;
  wCtx.fillStyle = "#080e16";
  wCtx.fillRect(0, 0, 960, 256);
  walkFrames.forEach((f, i) => {
    wCtx.drawImage(f, i * 120, 0);
    wCtx.fillStyle = "#6effa0";
    wCtx.font = "9px monospace";
    wCtx.fillText(`F${i}`, i * 120 + 2, 250);
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
  gCtx.fillRect(0, 0, 960, 256);
  gWalkFrames.forEach((f, i) => {
    gCtx.drawImage(f, i * 120, 0);
    gCtx.fillStyle = "#ff4040";
    gCtx.font = "9px monospace";
    gCtx.fillText(`F${i}`, i * 120 + 2, 250);
  });
} catch (e) {
  console.error("Error painting guard walk:", e);
}

console.log("Render complete");
document.title = "RENDERED";
