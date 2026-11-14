// Landing page proof shots (desktop + mobile, fold + full page).
//   node test-visual/capture-landing.mjs http://localhost:3000 <outdir> <tag>
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "/tmp/landing";
const tag = process.argv[4] ?? "landing";
const browser = await chromium.launch();
for (const [name, viewport] of [
  ["desktop", { width: 1280, height: 860 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const decline = page.getByRole("button", { name: "Decline" });
  if (await decline.isVisible().catch(() => false)) await decline.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${tag}-${name}-fold.png` });
  // The landing scrolls inside a fixed wrapper; unpin it for a full-page shot.
  await page.evaluate(() => {
    const shell = document.getElementById("main")?.parentElement;
    if (shell) Object.assign(shell.style, { position: "static", overflow: "visible" });
  });
  await page.screenshot({ path: `${out}/${tag}-${name}-full.png`, fullPage: true });
  await page.close();
}
await browser.close();
