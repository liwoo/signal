import { expect, test } from "@playwright/test";
import { openCodeTab, signIn } from "./fixtures";

/**
 * The "stuck?" hint is a focused popout: it opens only when the player taps
 * HINT, floats over a blurred backdrop, and closes again on Escape / backdrop
 * tap. It must never be open by default.
 */
test("the stuck? hint opens as a blurred popout and closes on escape", async ({ page }) => {
  await signIn(page);
  await openCodeTab(page);

  const gamePanels = page.getByRole("navigation", { name: "Game panels" });
  await gamePanels.getByRole("button", { name: "CHAT", exact: true }).click();

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
