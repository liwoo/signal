import { paintBossFPS } from "../src/lib/sprites/scene-painter";
import { paintBossFrames } from "../src/lib/sprites/boss-painter";

console.log("Starting FPS test render...");

// ── Game-size FPS (640x200 — actual boss arena dimensions) ──
try {
  const W = 640;
  const H = 200;
  const bg = paintBossFPS(W, H);

  const canvas = document.getElementById("fps-game") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);

  // Draw Lockmaster at the back wall center
  const bossFrames = paintBossFrames("idle", 2);
  const bf = bossFrames[0];
  const vpX = W * 0.5;
  const vpY = H * 0.38;
  ctx.drawImage(bf, vpX - bf.width / 2, vpY - bf.height / 2);

  console.log(`FPS game: ${W}x${H}`);
} catch (e) {
  console.error("Error painting FPS game:", e);
}

// ── Detail FPS (640x400 — for inspecting perspective quality) ──
try {
  const W = 640;
  const H = 400;
  const bg = paintBossFPS(W, H);

  const canvas = document.getElementById("fps-detail") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);

  // Draw Lockmaster at the back wall center
  const bossFrames = paintBossFrames("idle", 2);
  const bf = bossFrames[0];
  const vpX = W * 0.5;
  const vpY = H * 0.38;
  ctx.drawImage(bf, vpX - bf.width / 2, vpY - bf.height / 2);

  console.log(`FPS detail: ${W}x${H}`);
} catch (e) {
  console.error("Error painting FPS detail:", e);
}

console.log("FPS test render complete");
document.title = "RENDERED";
