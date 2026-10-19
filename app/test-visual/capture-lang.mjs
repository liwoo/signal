// Language backends in a real browser: the JS worker (bundled) and Python
// (Pyodide from the CDN) actually run code typed into the real CodeEditor.
//   node test-visual/capture-lang.mjs http://localhost:3131 <outdir>
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/lang";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });

async function typeAndRun(lang, code, expectText, timeout = 15000) {
  await page.goto(`${base}/dev/lang?lang=${lang}`, { waitUntil: "networkidle" });
  const ta = page.locator("[data-testid=editor] textarea");
  // fill(), not typing: the editor auto-closes brackets and quotes as you type.
  await ta.fill(code);
  await ta.press("ControlOrMeta+Enter");
  await page.locator("[data-testid=output]").filter({ hasText: expectText }).waitFor({ timeout });
  const text = await page.locator("[data-testid=output]").innerText();
  console.log(`[${lang}]`, JSON.stringify(text));
  await page.screenshot({ path: `${out}/lang-${lang}.png` });
}

await typeAndRun("javascript", 'const cell = "B-09";\nconsole.log(`CELL ${cell}`, [1, 2]);', "— ok");
await typeAndRun("javascript", "while (true) {}", "too long", 10000);
await typeAndRun("javascript", 'const a = 1;\na = 2;', "line 2");
await typeAndRun("python", 'for i in range(1, 4):\n    print(i, "DENY")', "— ok", 90000);
await typeAndRun("python", "while True:\n    pass", "too long", 30000);
await typeAndRun("python", 'print("ok after timeout")', "— ok", 90000);

for (const lang of ["javascript", "python"]) {
  await page.goto(`${base}/dev/lang?lang=${lang}`, { waitUntil: "networkidle" });
  await page.locator("[data-testid=run-act1]").click();
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=act1] tr").length >= 9, null, { timeout: 120000 });
  const rows = await page.locator("[data-testid=act1] tr").allInnerTexts();
  console.log(`[${lang} act I]`, rows.map((r) => r.split("\t").slice(0, 3).join(" ")).join(" | "));
  await page.screenshot({ path: `${out}/act1-${lang}.png`, fullPage: true });
}
await browser.close();
