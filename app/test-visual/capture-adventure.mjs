// Adventure capture helper — screenshots a playable level in the running Next app.
//   node test-visual/capture-adventure.mjs http://localhost:3131 /tmp/out chapter-01-intro
//   MODE=play node test-visual/capture-adventure.mjs http://localhost:3131 /tmp/out   (real /play flow)
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/adventure";
const levelId = process.argv[4] ?? "chapter-01-intro";
const mode = process.env.MODE ?? "level";

const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--enable-unsafe-webgpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`CONSOLE[${m.type()}]:`, m.text().slice(0, 300)); });

const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

if (mode === "play") {
  await page.goto(`${base}/play`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot("play-00-intro-screen");
  await page.getByRole("button", { name: /CONNECT TO MAYA|START CHAPTER|FACE THE LOCKMASTER/ }).click();
  await page.waitForTimeout(1200);
  await shot("play-01-adventure-title");
  await page.waitForTimeout(2500);
  await shot("play-02-adventure");
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await page.waitForTimeout(300);
  await shot("play-03-moved");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await shot("play-04-after-skip");
} else {
  await page.goto(`${base}/dev/adventure?level=${levelId}&autoplay=1&sound=0`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await shot(`${levelId}-00-title`);
  await page.waitForTimeout(2400);
  await shot(`${levelId}-01-start`);
  // Walk with the keyboard for a moment.
  await page.keyboard.down("d");
  await page.waitForTimeout(600);
  await page.keyboard.up("d");
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  await page.waitForTimeout(400);
  await shot(`${levelId}-02-walked`);
  // Rotate the camera.
  await page.keyboard.down("q");
  await page.waitForTimeout(500);
  await page.keyboard.up("q");
  await page.waitForTimeout(300);
  await shot(`${levelId}-03-rotated`);
  // Click-to-move somewhere on the floor near the centre.
  await page.mouse.click(700, 430);
  await page.waitForTimeout(1600);
  await shot(`${levelId}-04-clicked`);
  await page.waitForTimeout(3000);
  await shot(`${levelId}-05-later`);
}
await browser.close();
