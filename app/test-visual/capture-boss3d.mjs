// Boss-fight 3D capture helper.
//   node test-visual/capture-boss3d.mjs http://localhost:3131 /tmp/boss3d
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/boss3d";

const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE[error]:", m.text().slice(0, 300)); });
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

await page.goto(`${base}/dev/boss?level=boss-01-fight&sound=0&music=0`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await shot("00-briefing");

await page.getByRole("button", { name: "ENGAGE" }).click();
await page.waitForTimeout(1500);
await shot("01-fight-start");

// Arm a strong weapon via the dev hook and watch the boss take damage.
await page.evaluate(() => window.__bossfight?.arm({ damage: 8, fireRateMs: 250, range: 20 }));
await page.waitForTimeout(1600);
await shot("02-firing");

// Wait for the boss to telegraph + fire a projectile.
await page.waitForTimeout(2600);
await shot("03-boss-attack");

// Walk to a cover pad to trigger the coding overlay.
await page.evaluate(() => window.__bossfight?.moveTo(2.5, 2.5));
await page.waitForTimeout(2200);
await shot("04-cover-coding");

const status = await page.evaluate(() => window.__bossfight?.sim?.status);
const hp = await page.evaluate(() => Math.round(window.__bossfight?.sim?.boss?.hp));
console.log("status:", status, "bossHP:", hp);

await browser.close();
