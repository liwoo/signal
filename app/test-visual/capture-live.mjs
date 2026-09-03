// Live capture helper — screenshots the running Next app at fixed times.
//   node test-visual/capture-live.mjs http://localhost:3000/play /tmp/out cinematic
//   node test-visual/capture-live.mjs http://localhost:3000/     /tmp/out landing
//   TIMES="1,2.5,4" node test-visual/capture-live.mjs <url> <out> <mode>
import { chromium } from "@playwright/test";
const url = process.argv[2] ?? "http://localhost:3123/play";
const out = process.argv[3] ?? "/tmp/cine";
const mode = process.argv[4] ?? "cinematic"; // cinematic | landing | intro
// New headless mode with the platform GPU backend — SwiftShader is far too slow
// for the additive light stack and stalls the shot timeline.
const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
if (mode === "landing") {
  const t0 = Date.now();
  const times = (process.env.TIMES ?? "0.5,2.5,5,7,10,12,14.5,16.5,19,24,27,31,39").split(",").map(Number);
  for (const t of times) {
    const wait = t0 + t * 1000 - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}/landing-${String(Math.round(t * 10)).padStart(4, "0")}.png` });
  }
} else if (mode === "intro") {
  await page.screenshot({ path: `${out}/intro-screen.png` });
} else {
  await page.screenshot({ path: `${out}/00-intro-screen.png` });
  const btn = page.getByRole("button", { name: /CONNECT TO MAYA|START CHAPTER|PLAY SEQUENCE/ });
  await btn.click();
  const t0 = Date.now();
  const times = (process.env.TIMES ?? "0.8,1.6,2.6,4.2,5.6,7.4,9.2,10.6,12.4,13.6,15.6,17.4,19.2,20.2,22,23.4,25")
    .split(",").map(Number);
  for (const t of times) {
    const wait = t0 + t * 1000 - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}/shot-${String(Math.round(t * 10)).padStart(4, "0")}.png` });
  }
}
await browser.close();
