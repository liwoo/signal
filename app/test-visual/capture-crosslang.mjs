// Cross-language theming + python f-string highlighting proof shots.
//   node test-visual/capture-crosslang.mjs http://localhost:3131 <outdir>
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/crosslang";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

// 1) Landing page — cross-language front and centre.
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/landing-hero.png` });
await page.screenshot({ path: `${out}/landing-full.png`, fullPage: true });

// 2) Editor themed per language + python f-string interpolation highlighted.
const PY = [
  'name = "MAYA"',
  'level = 3',
  'print(f"agent {name} on sublevel {level}")',
  'print(f"charge {level / 10:.1%} — {{held}}")',
].join("\n");
const JS = 'const cell = "B-09";\nconsole.log(`CELL ${cell}`, [1, 2, 3]);';
const GO = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("CELL B-09")\n}';

async function editorShot(lang, code) {
  await page.goto(`${base}/dev/lang?lang=${lang}`, { waitUntil: "networkidle" });
  const ta = page.locator("[data-testid=editor] textarea");
  await ta.waitFor();
  await ta.fill(code);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/editor-${lang}.png` });
  console.log(`[${lang}] data-lang =`, await page.evaluate(() => document.documentElement.dataset.lang));
}
await editorShot("go", GO);
await editorShot("python", PY);
await editorShot("javascript", JS);

// 3) The game chrome reskins when you pick a language in /play.
await page.goto(`${base}/play`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
for (const label of ["PYTHON", "JAVASCRIPT", "GO"]) {
  const btn = page.getByRole("radio", { name: label });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/play-${label.toLowerCase()}.png` });
    console.log(`[play ${label}] data-lang =`, await page.evaluate(() => document.documentElement.dataset.lang));
  } else {
    console.log(`[play ${label}] picker button not found`);
  }
}

await browser.close();
console.log("done →", out);
