// Plays level one end-to-end on an iPhone-sized viewport and screenshots each
// stop, so mobile regressions are visible. Usage:
//   node test-visual/capture-mobile.mjs http://localhost:3000 /tmp/out
import { chromium, devices } from "@playwright/test";

const base = (process.argv[2] ?? "http://localhost:3123").replace(/\/$/, "");
const out = process.argv[3] ?? "/tmp/mobile";
const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
});
const context = await browser.newContext({ ...devices["iPhone 13"], browserName: undefined });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await shot("01-landing");
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(400);
await shot("02-landing-pitch");

await page.goto(`${base}/play`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("03-intro-screen");
await page.getByRole("button", { name: /CONNECT TO MAYA|START CHAPTER/ }).click();
await page.waitForTimeout(6000);
await shot("04-cinematic");
await page.getByRole("button", { name: /SKIP/i }).first().click();
await page.waitForTimeout(1500);
await shot("05-warmup");
await page.getByRole("button", { name: /SKIP WARMUP/i }).click();
await page.waitForTimeout(1200);
await shot("06-briefing");
const beginner = page.getByRole("button", { name: /I'M A BEGINNER/i });
await beginner.waitFor({ timeout: 15000 });
await beginner.click();
await page.waitForTimeout(1200);
await shot("07-beginner-card");
const watch = page.getByRole("button", { name: /WATCH THE WALKTHROUGH/i });
await watch.waitFor({ timeout: 15000 });
await watch.click();
await page.waitForTimeout(9000);
await shot("08-video");
await page.getByRole("button", { name: /DON'T SHOW AGAIN/i }).click();
await page.waitForTimeout(1500);
const begin = page.getByRole("button", { name: /GOT IT/i });
if (await begin.count()) await begin.first().click();
await page.waitForTimeout(5000);
await shot("09-play-code");

const nav = page.getByRole("navigation", { name: "Game panels" });
await nav.getByRole("button", { name: "CHAT" }).click();
await page.waitForTimeout(800);
await shot("10-play-chat");
// Let Maya finish; press continue until the editor unlocks.
const editor = page.locator("textarea");
const continueButton = page.getByRole("button", { name: /continue/i });
for (let i = 0; i < 12 && (await editor.getAttribute("readonly")) !== null; i++) {
  if (await continueButton.first().isVisible().catch(() => false)) await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
}
await nav.getByRole("button", { name: "MISSION" }).click();
await page.waitForTimeout(600);
await shot("11-play-mission");
await nav.getByRole("button", { name: "CODE" }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /^HINT|STUCK\? HINT/ }).first().click();
await page.waitForTimeout(800);
await shot("12-play-hint");

// Solve step 1.
await editor.fill('package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    fmt.Println("I\'m in")\n}\n');
await page.getByRole("button", { name: /SUBMIT|HURRY/ }).click();
await page.waitForTimeout(1800);
await shot("13-reward");
await page.waitForTimeout(9000);
await shot("14-after-step");

// Step 2: let Maya finish (continue lives in the chat view), then transmit the location.
await nav.getByRole("button", { name: "CHAT" }).click();
await page.waitForTimeout(600);
// Maya delivers several chunks; keep pressing continue until the editor stays unlocked.
let quiet = 0;
for (let i = 0; i < 40 && quiet < 3; i++) {
  const visible = await continueButton.first().isVisible().catch(() => false);
  if (visible) { await page.keyboard.press("Enter"); quiet = 0; }
  else if ((await editor.getAttribute("readonly")) === null) quiet += 1;
  await page.waitForTimeout(1200);
}
await nav.getByRole("button", { name: "CODE" }).click();
await page.waitForTimeout(500);
await editor.fill('package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    cell := "B-09"\n    const sublevel = 3\n    fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)\n}\n');
await page.getByRole("button", { name: /SUBMIT|HURRY/ }).click();
await page.waitForTimeout(1800);
await shot("15-chapter-reward");
// Maya's closing chain → twist → outro cinematic → debrief.
await nav.getByRole("button", { name: "CHAT" }).click();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  if (await page.getByText(/ZEN DEBRIEF/).count()) break;
  if (await continueButton.first().isVisible().catch(() => false)) { await page.keyboard.press("Enter"); continue; }
  if (await page.getByText(/PRESS ANY KEY TO SKIP/).count()) { await page.keyboard.press("Space"); continue; }
  const dismiss = page.getByRole("button", { name: /CONTINUE|DISMISS|SKIP/i });
  if (await dismiss.first().isVisible().catch(() => false)) await dismiss.first().click();
}
await page.waitForTimeout(6000);
await shot("16-zen-debrief");
const cont = page.getByRole("button", { name: /SKIP DEBRIEF|CONTINUE ▸/ });
if (await cont.count()) await cont.first().click();
await page.waitForTimeout(1200);
await shot("17-win-modal");

await browser.close();
