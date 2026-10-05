import { expect, test } from "@playwright/test";

// Simulate the keyboard being open by shrinking the viewport height, then check
// that the editor's SUBMIT button and the FMT accessory key stay on-screen.
test("editor submit + accessory keys stay visible when the keyboard is open", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("signal_warmup_completed", JSON.stringify(true));
  });
  await page.goto("/play");
  await page.addStyleTag({ content: "nextjs-portal{display:none !important;}" });
  await page.getByRole("button", { name: "CONNECT TO MAYA" }).click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Space");
  const dismiss = page.getByRole("button", { name: "DON'T SHOW AGAIN" });
  if (await dismiss.count()) await dismiss.click();

  const gamePanels = page.getByRole("navigation", { name: "Game panels" });
  await gamePanels.waitFor();

  // Advance narration so the editor is live, then go to CODE.
  const continueButton = page.getByRole("button", { name: /continue/i });
  for (let i = 0; i < 8; i++) {
    if (await continueButton.count()) {
      await continueButton.first().click();
      await page.waitForTimeout(350);
    } else break;
  }
  await gamePanels.getByRole("button", { name: "CODE" }).click();
  await page.waitForTimeout(300);

  // Keyboard open ≈ short, narrow viewport (a compact Android with keyboard up).
  await page.setViewportSize({ width: 360, height: 430 });
  await page.waitForTimeout(400);

  const vh = page.viewportSize()!.height;
  const submit = page.getByRole("button", { name: /SUBMIT/ });
  const fmt = page.getByRole("button", { name: "FMT" }).first();

  const submitBox = await submit.boundingBox();
  const fmtBox = await fmt.boundingBox();
  console.log("VIEWPORT_H", vh, "SUBMIT", submitBox, "FMT", fmtBox);

  // Both must sit fully within the visible viewport.
  expect(submitBox, "SUBMIT button has a box").not.toBeNull();
  expect(fmtBox, "FMT key has a box").not.toBeNull();
  expect(submitBox!.y + submitBox!.height, "SUBMIT bottom within viewport").toBeLessThanOrEqual(vh + 1);
  expect(submitBox!.x, "SUBMIT left within viewport").toBeGreaterThanOrEqual(-1);
  expect(fmtBox!.x, "FMT left within viewport").toBeGreaterThanOrEqual(-1);
});
