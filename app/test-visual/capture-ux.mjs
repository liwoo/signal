// Captures the visual-UX screens from /dev/ux (first session, coding loop,
// takeaway). Needs a dev server. Usage:
//   node test-visual/capture-ux.mjs /tmp/ux   (server on :3217)
import { chromium } from "@playwright/test";
const base = "http://localhost:3217/dev/ux";
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await page.goto(`${base}?screen=loop`, { waitUntil: "networkidle" });
const decline = page.getByRole("button", { name: "Decline" });
if (await decline.count()) await decline.click();

for (const lang of ["go", "python"]) {
  await page.goto(`${base}?screen=loop&lang=${lang}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /TEST/ }).first().click();
  await page.waitForSelector("text=CHECKS PASS", { timeout: 60000 });
  await page.waitForTimeout(300);
  await shot(`loop-${lang}-test-fail`);
}
// edit → stale
await page.locator("textarea").first().click();
await page.keyboard.press("End");
await page.keyboard.type(" ");
await page.waitForTimeout(300);
await shot("loop-python-stale");
// fix + test pass
await page.goto(`${base}?screen=loop&lang=go`, { waitUntil: "networkidle" });
const ta = page.locator("textarea").first();
const v = await ta.inputValue();
await ta.fill(v.replace('"SUBLEVEL"', '"- SUBLEVEL"'));
await page.getByRole("button", { name: /TEST/ }).first().click();
await page.waitForSelector("text=ALL CHECKS PASS", { timeout: 60000 });
await shot("loop-go-test-pass");
// hardcoded
await ta.fill('package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("CELL B-09 - SUBLEVEL 3")\n}');
await page.getByRole("button", { name: /TRANSMIT/ }).first().click();
await page.waitForSelector("text=REJECTED", { timeout: 60000 });
await shot("loop-go-transmit-hardcoded");
// compile error
await ta.fill('package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println(cellblock.Cell)\n}');
await page.getByRole("button", { name: /TEST/ }).first().click();
await page.waitForTimeout(6000);
await shot("loop-go-test-compile-error");
// objectives
await page.getByRole("button", { name: /OBJECTIVES/ }).first().click();
await page.waitForTimeout(500);
await shot("loop-objectives");

for (const stage of ["hook", "know", "pace"]) {
  await page.goto(`${base}?screen=first&stage=${stage}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  if (stage === "know") {
    await page.getByRole("radio", { name: "PYTHON", exact: true }).last().click();
    await page.waitForTimeout(300);
  }
  await shot(`first-${stage}`);
}
await page.goto(`${base}?screen=takeaway&lang=go`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shot("takeaway-pattern");
await page.getByRole("button", { name: /QUICK CHECK/ }).click();
await page.getByRole("radio", { name: /print line/ }).click();
await page.waitForTimeout(200);
await shot("takeaway-check-wrong");
await page.getByRole("radio", { name: /cellblock file/ }).click();
await page.waitForTimeout(200);
await shot("takeaway-check-right");

const m = await browser.newPage({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
await m.goto(`${base}?screen=loop&lang=javascript`, { waitUntil: "networkidle" });
if (await m.getByRole("button", { name: "Decline" }).count()) await m.getByRole("button", { name: "Decline" }).click({ force: true });
await m.waitForTimeout(800);
await m.getByRole("button", { name: /TEST/ }).first().dispatchEvent("click");
await m.waitForSelector("text=CHECKS PASS", { timeout: 60000 });
await m.screenshot({ path: `${out}/mobile-loop.png` });
await m.goto(`${base}?screen=takeaway&lang=javascript`, { waitUntil: "networkidle" });
await m.waitForTimeout(800);
await m.screenshot({ path: `${out}/mobile-takeaway.png` });
await browser.close();
