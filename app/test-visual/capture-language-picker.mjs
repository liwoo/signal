// Language picker on the chapter intro screen, desktop + phone, before and
// after choosing JavaScript.
//   node test-visual/capture-language-picker.mjs http://localhost:3131 <outdir>
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3131";
const out = process.argv[3] ?? "/tmp/lang";
const browser = await chromium.launch({ args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist"] });
for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 800 } }], ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await page.goto(`${base}/play`, { waitUntil: "networkidle" });
  await page.getByRole("radiogroup", { name: "Language to learn in" }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/picker-${name}-first-run.png` });
  await page.getByRole("radio", { name: "JAVASCRIPT" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/picker-${name}-javascript.png` });
  console.log(name, "checked:", await page.getByRole("radio", { checked: true }).innerText());
  await ctx.close();
}
await browser.close();
