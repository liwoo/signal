// Walks /play into live gameplay and screenshots the HUD, the mission tab,
// the notes tab, and a hint reveal. Usage:
//   node test-visual/capture-gameplay.mjs http://localhost:3000/play /tmp/out
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://localhost:3123/play";
const out = process.argv[3] ?? "/tmp/gameplay";
const browser = await chromium.launch({
  args: ["--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /CONNECT TO MAYA|START CHAPTER/ }).click();
await page.waitForTimeout(2500);
await page.keyboard.press("Space"); // skip cinematic
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /SKIP WARMUP/i }).click();
await page.waitForTimeout(1200);
// Leave the briefing via its secondary action, which starts the level.
await page.getByRole("button", { name: /DON'T SHOW AGAIN/i }).click();
await page.waitForTimeout(1500);
// First-run order: guided tour → mission brief modal → play.
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(800);
  const skipTour = page.getByRole("button", { name: /skip tour/i });
  if (await skipTour.count()) { await skipTour.first().click(); continue; }
  const begin = page.getByRole("button", { name: /GOT IT/i });
  if (await begin.count()) { await begin.first().click(); continue; }
}
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/01-hud.png` });

await page.waitForTimeout(9000); // let the SYS warning + rush land
await page.screenshot({ path: `${out}/02-hud-rush.png` });

await page.getByRole("button", { name: /^HINT|STUCK\? HINT/ }).first().click();
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/03-hint-revealed.png` });

await page.getByRole("button", { name: /^MISSION$/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/04-mission.png` });

await page.getByRole("button", { name: /^NOTES$/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/05-notes.png` });

// Play both steps through to the chapter end: reward → cinematic → debrief → win.
await page.getByRole("button", { name: /^CODE$/ }).click();
const editor = page.locator("textarea").first();
const continueButton = page.getByRole("button", { name: /^continue/i });
const settle = async () => {
  let quiet = 0;
  for (let i = 0; i < 40 && quiet < 3; i++) {
    if (await continueButton.first().isVisible().catch(() => false)) { await page.keyboard.press("Enter"); quiet = 0; }
    else if ((await editor.getAttribute("readonly")) === null) quiet += 1;
    await page.waitForTimeout(1200);
  }
};
await settle();
await editor.fill('package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    fmt.Println("I\'m in")\n}\n');
await page.getByRole("button", { name: /SUBMIT|HURRY/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/06-reward.png` });
await page.waitForTimeout(4000);
await settle();
await editor.fill('package main\n\nimport (\n    "fmt"\n)\n\nfunc main() {\n    cell := "B-09"\n    const sublevel = 3\n    fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)\n}\n');
await page.getByRole("button", { name: /SUBMIT|HURRY/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/07-chapter-reward.png` });
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1500);
  if (await page.getByText(/ZEN DEBRIEF/).count()) break;
  if (await continueButton.first().isVisible().catch(() => false)) { await page.keyboard.press("Enter"); continue; }
  if (await page.getByText(/PRESS ANY KEY TO SKIP/).count()) { await page.keyboard.press("Space"); continue; }
  const dismiss = page.getByRole("button", { name: /CONTINUE|DISMISS|SKIP/i });
  if (await dismiss.first().isVisible().catch(() => false)) await dismiss.first().click();
}
await page.waitForTimeout(7000);
await page.screenshot({ path: `${out}/08-zen-debrief.png` });
const cont = page.getByRole("button", { name: /SKIP DEBRIEF|CONTINUE ▸/ });
if (await cont.count()) await cont.first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/09-win-modal.png` });

await browser.close();
