import { paintScene } from "../src/lib/sprites/scene-painter";
import { paintMayaFrames } from "../src/lib/sprites/character-painter";

console.log("Starting crawl test render...");

// ── CRAWL STRIP: 8 frames at scale 5 for detail ──
try {
  const crawlFrames = paintMayaFrames("crawl-right", 5);
  console.log("Crawl frames:", crawlFrames.length, `size: ${crawlFrames[0].width}x${crawlFrames[0].height}`);
  const canvas = document.getElementById("crawl-strip") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080e16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellW = 240;
  crawlFrames.forEach((f, i) => {
    ctx.drawImage(f, i * cellW, 0);
    // Frame label
    ctx.fillStyle = "#ff9f1c";
    ctx.font = "12px monospace";
    ctx.fillText(`F${i}`, i * cellW + 4, canvas.height - 8);
    // Divider line
    if (i > 0) {
      ctx.strokeStyle = "rgba(110,255,160,0.1)";
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, canvas.height);
      ctx.stroke();
    }
  });
} catch (e) {
  console.error("Error painting crawl strip:", e);
}

// ── CRAWL IN VENT COMPOSITE ──
try {
  const W = 640;
  const H = 420;
  const bg = paintScene("vent", W, H);
  const crawlFrames = paintMayaFrames("crawl-right", 3);

  const canvas = document.getElementById("crawl-vent") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);

  // Floor line
  const floorY = Math.floor(H * 0.50);
  ctx.strokeStyle = "rgba(110,255,160,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(W, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Show 3 crawl frames spaced across the vent
  for (let i = 0; i < 3; i++) {
    const mf = crawlFrames[i * 2]; // frames 0, 2, 4
    const x = 120 + i * 180;
    const feetY = floorY + 60;
    ctx.drawImage(mf, x - mf.width / 2, feetY - mf.height);
    ctx.fillStyle = "#6effa0";
    ctx.font = "9px monospace";
    ctx.fillText(`F${i * 2}`, x - 8, feetY + 12);
  }

  ctx.font = "11px monospace";
  ctx.fillStyle = "#6effa0";
  ctx.fillText(`floor: y=${floorY}`, 10, floorY - 4);
} catch (e) {
  console.error("Error painting crawl vent:", e);
}

// ── WALK vs CRAWL COMPARISON ──
try {
  const canvas = document.getElementById("walk-vs-crawl") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#080e16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const walkFrames = paintMayaFrames("walk-right", 3);
  const crawlFrames = paintMayaFrames("crawl-right", 3);

  // Walk — top row
  ctx.fillStyle = "#6effa0";
  ctx.font = "11px monospace";
  ctx.fillText("WALK-RIGHT", 4, 14);
  walkFrames.forEach((f, i) => {
    ctx.drawImage(f, i * 120, 20);
  });

  // Crawl — bottom row
  ctx.fillText("CRAWL-RIGHT", 4, 280);
  crawlFrames.forEach((f, i) => {
    ctx.drawImage(f, i * 120, 290);
  });
} catch (e) {
  console.error("Error painting walk vs crawl:", e);
}

console.log("Crawl test render complete");
document.title = "RENDERED";
