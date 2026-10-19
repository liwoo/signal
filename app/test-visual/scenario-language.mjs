// End-to-end: pick a language on the chapter-1 intro, play the 3D intro beat
// (scripted via the dev __adventure hooks), then solve both chapter-1 steps in
// that language through the real editor, engine, and Maya.
//   node test-visual/scenario-language.mjs http://localhost:3131 <outdir> javascript
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/lang";
const language = process.argv[4] ?? "javascript";
const SOLUTIONS = {
  javascript: ['console.log("Hello World");', 'import { cell, sublevel } from "./cellblock.js";\n\nconsole.log(`CELL ${cell} · SUBLEVEL ${sublevel}`);'],
  python: ['print("Hello World")', 'import cellblock\n\nprint(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")'],
};
const browser = await chromium.launch({ args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const shot = (name) => page.screenshot({ path: `${out}/e2e-${language}-${name}.png` });

await page.goto(`${base}/play`, { waitUntil: "networkidle" });
await page.evaluate(() => indexedDB.deleteDatabase("signal-game"));
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("radio", { name: language.toUpperCase() }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /CONNECT TO MAYA/ }).click();

// The intro beat: power → pages → terminal.
await page.waitForFunction(() => window.__adventure?.sim, null, { timeout: 30000 });
await page.waitForTimeout(3500);
const sim = () => page.evaluate(() => { const s = window.__adventure.sim; return { status: s.status, obj: s.objectiveIndex, thought: s.thought?.text ?? s.thought ?? null }; });
for (const id of ["crate-1", "book-1", "terminal-1"]) {
  const before = (await sim()).obj;
  await page.evaluate((target) => window.__adventure.interactWith(target), id);
  for (let i = 0; i < 40 && (await sim()).obj === before && (await sim()).status === "playing"; i++) await page.waitForTimeout(500);
  if (id === "book-1") {
    await page.waitForTimeout(1500);
    console.log("found:", JSON.stringify((await sim()).thought));
    await shot("01-found-pages");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
  }
}

// Into the round.
const editor = page.locator("[data-tour=code-editor] textarea, textarea").first();
await editor.waitFor({ timeout: 30000 });
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(900);
  const skipTour = page.getByRole("button", { name: /skip tour/i });
  if (await skipTour.count()) await skipTour.first().click();
}
const cont = page.getByRole("button", { name: /^continue/i });
const settle = async (n = 12) => {
  for (let i = 0; i < n; i++) {
    if (await cont.first().isVisible().catch(() => false)) await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
  }
};
await settle(6);
await shot("02-round-start");

for (const [i, code] of SOLUTIONS[language].entries()) {
  await editor.fill(code);
  await page.waitForTimeout(300);
  await editor.press("ControlOrMeta+Enter");
  await page.waitForTimeout(language === "python" ? 9000 : 2500);
  await shot(`03-step-${i + 1}-submitted`);
  await settle(10);
  const chat = await page.locator("[data-tour=chat-panel]").innerText().catch(() => "");
  console.log(`--- after step ${i + 1} ---\n` + chat.split("\n").slice(-14).join("\n"));
}
await shot("04-end");
await browser.close();
