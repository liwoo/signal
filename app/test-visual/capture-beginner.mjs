// Walks /play → cinematic (skipped) → warm-up → briefing → beginner walkthrough,
// screenshotting each stop. Usage:
//   node test-visual/capture-beginner.mjs http://localhost:3000/play /tmp/out
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3123/play";
const out = process.argv[3] ?? "/tmp/beginner";
const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /CONNECT TO MAYA|START CHAPTER/ }).click();
await page.waitForTimeout(2500);
await page.keyboard.press("Space"); // skip the cinematic
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01-warmup.png` });

const skipWarmup = page.getByRole("button", { name: /SKIP WARMUP/i });
await skipWarmup.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/02-briefing-expert.png` });

const beginner = page.getByRole("button", { name: /I'M A BEGINNER/i });
await beginner.waitFor({ timeout: 15000 });
await beginner.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/03-beginner-card.png` });

const watch = page.getByRole("button", { name: /WATCH THE WALKTHROUGH/i });
await watch.waitFor({ timeout: 15000 });
await watch.click();
const t0 = Date.now();
const times = (process.env.TIMES ?? "1,4,9,14,20,27,35,45,55,64,72,80,90,98").split(",").map(Number);
for (const t of times) {
  const wait = t0 + t * 1000 - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/video-${String(Math.round(t)).padStart(3, "0")}.png` });
}
await browser.close();
