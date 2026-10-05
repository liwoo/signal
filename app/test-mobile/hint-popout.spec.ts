import { expect, test } from "@playwright/test";

/**
 * The "stuck?" hint is a focused popout: it opens only when the player taps
 * HINT, floats over a blurred backdrop, and closes again on Escape / backdrop
 * tap. It must never be open by default.
 */
test("the stuck? hint opens as a blurred popout and closes on escape", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("signal_warmup_completed", JSON.stringify(true));
  });

  await page.goto("/play");
  // The Next.js dev-tools overlay floats over the bottom-left HINT button in dev.
  await page.addStyleTag({ content: "nextjs-portal{display:none !important;}" });
  await page.getByRole("button", { name: "CONNECT TO MAYA" }).click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Space");
  const dismiss = page.getByRole("button", { name: "DON'T SHOW AGAIN" });
  if (await dismiss.count()) await dismiss.click();

  const gamePanels = page.getByRole("navigation", { name: "Game panels" });
  await gamePanels.waitFor();
  await gamePanels.getByRole("button", { name: "CHAT" }).click();

  const overlay = page.getByRole("region", { name: "Stuck? helper" });
  // Closed by default.
  await expect(overlay).toHaveCount(0);

  // Opens on tap.
  await page.getByRole("button", { name: /HINT/ }).first().click();
  await expect(overlay).toBeVisible();

  // Closes on Escape.
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);

  // Opens again, then closes on backdrop tap (top-left corner, away from the card).
  await page.getByRole("button", { name: /HINT/ }).first().click();
  await expect(overlay).toBeVisible();
  await page.mouse.click(8, 420);
  await expect(overlay).toHaveCount(0);
});
