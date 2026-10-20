// Captures the terminal's active/standby clarity: STANDBY (Maya talking) with a
// reason, the amber reject-shake when you type while locked, and LIVE (your turn).
// Usage: node test-visual/capture-terminal-state.mjs http://localhost:3100/play /tmp/term
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3100/play";
const out = process.argv[3] ?? "/tmp/term";
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

// Advance through intro → cinematic → warmup → book → mission brief until the
// editor shows up. Tap-through cinematics advance on a center click / Space.
for (let i = 0; i < 70 && (await editor.count()) === 0; i++) {
  if (await click(/CONNECT TO MAYA|START CHAPTER/)) {}
  else if (await click(/SKIP WARMUP/i)) {}
  else if (await click(/SKIP · START LEVEL|START LEVEL/i)) {}
  else if (await click(/SKIP READING|CLOSE|SKIP TOUR/i)) {}
  else if (await click(/GOT IT|BEGIN|CONTINUE ▸/i)) {}
  else {
    await page.mouse.click(750, 400).catch(() => {});
    await page.keyboard.press("Space").catch(() => {});
  }
  await page.waitForTimeout(650);
}
if ((await editor.count()) === 0) { console.log("NEVER REACHED EDITOR"); await page.screenshot({ path: `${out}-stuck.png` }); await browser.close(); process.exit(1); }

const continueButton = page.getByRole("button", { name: /^continue/i });

// 1) STANDBY: Maya is transmitting right after the level opens.
await page.waitForTimeout(1200);
const standbyWasReadonly = (await editor.getAttribute("readonly")) !== null;
await page.screenshot({ path: `${out}-01-standby.png` });

// 2) Reject shake: type into the locked terminal.
if (standbyWasReadonly) {
  await editor.click({ force: true }).catch(() => {});
  await page.keyboard.press("a");
  await page.waitForTimeout(110);
  await page.screenshot({ path: `${out}-02-reject.png` });
}

// 3) LIVE: advance past Maya's chunks until it's the player's turn.
let reachedLive = false;
for (let i = 0; i < 45; i++) {
  if (await continueButton.first().isVisible().catch(() => false)) await page.keyboard.press("Enter");
  if ((await editor.getAttribute("readonly")) === null) { reachedLive = true; break; }
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}-03-live.png` });

console.log(JSON.stringify({ standbyWasReadonly, reachedLive }, null, 2));
await browser.close();
