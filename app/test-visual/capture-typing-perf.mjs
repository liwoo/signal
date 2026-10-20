// Typing responsiveness under a throttled CPU (simulates a low-end device): reach
// the live editor, type a burst, and confirm every character lands (no drops) and
// the burst completes quickly. Guards the editor-input memoization work.
// Usage: node test-visual/capture-typing-perf.mjs http://localhost:3100/play
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3100/play";
const browser = await chromium.launch({ args: ["--headless=new"] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto(url, { waitUntil: "networkidle" });

const editor = page.locator("textarea").first();
const click = async (re) => {
  const b = page.getByRole("button", { name: re });
  if (await b.count()) { await b.first().click().catch(() => {}); return true; }
  return false;
};
for (let i = 0; i < 70 && (await editor.count()) === 0; i++) {
  if (await click(/CONNECT TO MAYA|START CHAPTER/)) {}
  else if (await click(/SKIP WARMUP/i)) {}
  else if (await click(/SKIP · START LEVEL|START LEVEL/i)) {}
  else if (await click(/SKIP READING|CLOSE|SKIP TOUR/i)) {}
  else if (await click(/GOT IT|BEGIN|CONTINUE ▸/i)) {}
  else { await page.mouse.click(750, 400).catch(() => {}); await page.keyboard.press("Space").catch(() => {}); }
  await page.waitForTimeout(650);
}
const continueButton = page.getByRole("button", { name: /^continue/i });
for (let i = 0; i < 45; i++) {
  if (await continueButton.first().isVisible().catch(() => false)) await page.keyboard.press("Enter");
  if ((await editor.getAttribute("readonly")) === null) break;
  await page.waitForTimeout(1000);
}

// Throttle the CPU 6x to approximate a low-end device, then type a burst fast.
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });

// Measure main-thread blocking during the burst via long tasks (>50ms).
await page.evaluate(() => {
  window.__lt = { total: 0, count: 0, max: 0 };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__lt.total += e.duration; window.__lt.count += 1;
      window.__lt.max = Math.max(window.__lt.max, e.duration);
    }
  }).observe({ entryTypes: ["longtask"] });
});

await editor.click();
await editor.fill(""); // clean slate
const sample = 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("the quick brown fox jumps over the lazy dog 0123456789")\n}';
const t0 = Date.now();
for (const ch of sample) {
  await page.keyboard.type(ch, { delay: 8 }); // ~125 cps burst
}
const elapsed = Date.now() - t0;
await page.waitForTimeout(400);
const value = await editor.inputValue();
const landed = value === sample;
const lt = await page.evaluate(() => window.__lt);

await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
console.log(JSON.stringify({
  chars: sample.length, elapsedMs: elapsed, allCharsLanded: landed,
  longTaskMsTotal: Math.round(lt.total), longTaskCount: lt.count, longTaskMsMax: Math.round(lt.max),
  got: landed ? "<match>" : value,
}, null, 2));
await browser.close();
process.exit(landed ? 0 : 1);
