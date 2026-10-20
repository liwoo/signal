// Verifies checkpoint resume: seed an in-progress draft, reload, and confirm the
// player lands back in play at the saved step with their code — no intro replay.
// Usage: node test-visual/capture-resume.mjs http://localhost:3100/play /tmp/resume
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3100/play";
const out = process.argv[3] ?? "/tmp/resume";
const browser = await chromium.launch({ args: ["--headless=new"] });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

const MARKER = 'fmt.Println("resume marker 4242")';

await page.goto(url, { waitUntil: "networkidle" });

// Seed a mid-chapter draft for chapter 1 (Go), step 2 of 2, with distinctive code.
await page.evaluate((marker) => {
  localStorage.setItem(
    "signal_draft_chapter-01_go",
    JSON.stringify({
      version: 1,
      challengeId: "chapter-01",
      language: "go",
      stepId: "chapter-01:transmit",
      stepIndex: 1,
      code: `package main\n\nimport "fmt"\n\nfunc main() {\n    ${marker}\n}\n`,
      attempts: 2,
      updatedAt: Date.now(),
    }),
  );
}, MARKER);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(4000);

const bodyText = await page.evaluate(() => document.body.innerText);
const restored = /SESSION RESTORED/i.test(bodyText);
const atStep2 = /STEP 2\/2/i.test(bodyText);
const editorText = await page.locator("textarea").first().inputValue().catch(() => "");
const hasCode = editorText.includes("resume marker 4242");
const introGone = !/CONNECT TO MAYA|START CHAPTER/i.test(bodyText);

await page.screenshot({ path: `${out}-01.png` });

console.log(JSON.stringify({ restored, atStep2, hasCode, introGone }, null, 2));
await browser.close();

if (!(restored && atStep2 && hasCode && introGone)) {
  console.error("RESUME CHECK FAILED");
  process.exit(1);
}
console.log("RESUME CHECK PASSED");
