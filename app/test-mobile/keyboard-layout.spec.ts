import { expect, test } from "@playwright/test";
import { openCodeTab, signIn } from "./fixtures";

// Simulate the keyboard being open by shrinking the viewport, then check the
// symbol keys stay a single row and TRANSMIT stays on-screen — down to 320px.
for (const size of [{ width: 360, height: 430 }, { width: 320, height: 420 }]) {
  test(`editor actions stay visible with the keyboard open at ${size.width}×${size.height}`, async ({ page }) => {
    await signIn(page);
    await openCodeTab(page);
    await page.setViewportSize(size);
    await page.waitForTimeout(400);

    const transmit = page.getByRole("button", { name: /TRANSMIT TO MAYA/ });
    const keys = page.getByRole("toolbar", { name: "Code keyboard shortcuts" });
    const tab = keys.getByRole("button", { name: "TAB" });
    const more = keys.getByRole("button", { name: "More keys" });

    const transmitBox = (await transmit.boundingBox())!;
    expect(transmitBox.y + transmitBox.height, "TRANSMIT bottom within viewport").toBeLessThanOrEqual(size.height + 1);
    expect(transmitBox.x + transmitBox.width, "TRANSMIT right within viewport").toBeLessThanOrEqual(size.width + 1);

    // One row: the first and last key share a baseline.
    const [tabBox, moreBox] = [(await tab.boundingBox())!, (await more.boundingBox())!];
    expect(Math.abs(tabBox.y - moreBox.y), "symbol keys fit one row").toBeLessThan(2);
    expect(moreBox.x + moreBox.width).toBeLessThanOrEqual(size.width + 1);
    expect(tabBox.height, "touch target height").toBeGreaterThanOrEqual(44);

    // ⋯ reveals format / cursor / redo, without stealing focus from the editor.
    await page.locator("textarea").first().focus();
    await more.click();
    await expect(keys.getByRole("button", { name: "Format code" })).toBeVisible();
    await expect(keys.getByRole("button", { name: "REDO" })).toBeVisible();
    await expect(keys.getByRole("button", { name: "Fewer keys" })).toHaveAttribute("aria-expanded", "true");

    // The task is still readable at this width.
    const task = page.locator('[data-tour="objective-bar"] p');
    expect(await task.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}
