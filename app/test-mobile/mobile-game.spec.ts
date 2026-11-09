import { expect, test } from "@playwright/test";
import { checkpointState, openCodeTab, signIn } from "./fixtures";

test("a signed-in player resumes a checkpoint and plays through the compact mobile shell", async ({ page }) => {
  const cloud: { state: unknown } = { state: checkpointState() };
  await signIn(page, cloud);

  const { panels, editor } = await openCodeTab(page);
  await expect(panels.getByRole("button", { name: "CODE", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(editor).toHaveValue(/Hello World/);

  // The task reads in full — its own line, never truncated.
  const task = page.locator('[data-tour="objective-bar"] p');
  await expect(task).toHaveText("Print Maya's cell and sublevel");
  const clipped = await task.evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1);
  expect(clipped, "task instruction is clipped").toBe(false);

  // Objectives open as a popout, Escape closes them.
  await page.getByRole("button", { name: "OBJECTIVES ›" }).click();
  await expect(page.getByText("LEVEL OBJECTIVES")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("LEVEL OBJECTIVES")).toHaveCount(0);

  // TEST is free and explains why the answer is wrong.
  await expect(page.getByRole("button", { name: /TRANSMIT TO MAYA/ })).toBeVisible();
  await page.getByRole("button", { name: /▷ TEST/ }).click();
  await expect(page.getByText(/^TEST · /)).toBeVisible({ timeout: 20_000 });

  // Chat is one tap away.
  await panels.getByRole("button", { name: "CHAT", exact: true }).click();
  await expect(page.getByPlaceholder("ask maya anything…")).toBeVisible();
  await panels.getByRole("button", { name: "CODE", exact: true }).click();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

  if (process.env.MOBILE_SCREENSHOT_PATH) {
    await page.screenshot({ path: process.env.MOBILE_SCREENSHOT_PATH, animations: "disabled" });
  }

  // A reload lands back on the saved checkpoint, step 2 with its code.
  await page.reload();
  const again = await openCodeTab(page);
  await expect(again.editor).toHaveValue(/Hello World/);
  await expect(page.locator('[data-tour="objective-bar"]')).toContainText("TASK 2 OF 2");
});
