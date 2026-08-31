import { expect, test } from "@playwright/test";

test("plays the real game through the compact mobile shell", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("signal_warmup_completed", JSON.stringify(true));
  });

  await page.goto("/play");
  await page.getByRole("button", { name: "CONNECT TO MAYA" }).click();

  await page.waitForTimeout(900);
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "DON'T SHOW AGAIN" }).click();

  const gamePanels = page.getByRole("navigation", { name: "Game panels" });
  await expect(gamePanels).toBeVisible();
  await expect(gamePanels.getByRole("button", { name: "CODE" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "TAB" })).toBeVisible();
  await expect(page.locator("textarea")).toBeVisible();
  await expect(page.getByRole("button", { name: /SUBMIT/ })).toBeVisible();

  await gamePanels.getByRole("button", { name: "MISSION" }).click();
  await expect(page.getByText("STEP 1 · SCAFFOLD")).toBeVisible();

  await gamePanels.getByRole("button", { name: "CHAT" }).click();
  await expect(page.getByPlaceholder("type a question or ask for a hint...")).toBeVisible();

  const editor = page.locator("textarea");
  const continueButton = page.getByRole("button", { name: /continue/i });
  for (let i = 0; i < 4 && await editor.getAttribute("readonly") !== null; i++) {
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    await continueButton.waitFor({ state: "hidden" });
  }
  await gamePanels.getByRole("button", { name: "CODE" }).click();
  await expect(editor).toBeEditable();
  const draft = "// mobile draft\npackage main";
  await editor.fill(draft);
  await page.waitForTimeout(500);

  await page.reload();
  await page.getByRole("button", { name: "CONNECT TO MAYA" }).click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Space");
  const briefingDismiss = page.getByRole("button", { name: "DON'T SHOW AGAIN" });
  if (await briefingDismiss.count()) await briefingDismiss.click();
  await page.getByRole("navigation", { name: "Game panels" }).waitFor();
  await expect(page.locator("textarea")).toHaveValue(draft);

  if (process.env.MOBILE_SCREENSHOT_PATH) {
    if (process.env.MOBILE_KEYBOARD_PREVIEW === "1") {
      await page.locator("textarea").focus();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("navigation", { name: "Game panels" }).evaluate((nav) => {
        const shell = nav.parentElement as HTMLElement | null;
        if (shell) shell.style.height = "500px";
      });
      await page.evaluate(() => {
        const keyboard = document.createElement("div");
        keyboard.setAttribute("aria-hidden", "true");
        keyboard.style.cssText = [
          "position:fixed",
          "inset:auto 0 0 0",
          "height:344px",
          "z-index:9999",
          "box-sizing:border-box",
          "padding:8px 4px 22px",
          "background:#1b1c20",
          "border-top:1px solid #34363d",
          "font-family:-apple-system,BlinkMacSystemFont,sans-serif",
          "color:#fff",
        ].join(";");
        const rows = [
          ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
          ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
          ["⇧", "z", "x", "c", "v", "b", "n", "m", "⌫"],
          ["123", "🌐", "space", "return"],
        ];
        const suggestions = document.createElement("div");
        suggestions.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);height:36px;align-items:center;text-align:center;color:#d7d7dc;font-size:14px";
        suggestions.innerHTML = "<span>package</span><span>main</span><span>func</span>";
        keyboard.appendChild(suggestions);
        rows.forEach((keys, rowIndex) => {
          const row = document.createElement("div");
          row.style.cssText = `display:flex;justify-content:center;gap:5px;margin-top:7px;padding:0 ${rowIndex === 1 ? 15 : 0}px`;
          keys.forEach((label) => {
            const key = document.createElement("span");
            const wide = label === "space" ? 172 : label === "return" ? 72 : label === "123" ? 52 : 32;
            key.style.cssText = `display:flex;align-items:center;justify-content:center;width:${wide}px;height:43px;border-radius:5px;background:${rowIndex === 2 && (label === "⇧" || label === "⌫") || rowIndex === 3 ? "#484a50" : "#6b6d72"};box-shadow:0 1px 0 #000;font-size:${label.length > 2 ? 13 : 21}px`;
            key.textContent = label;
            row.appendChild(key);
          });
          keyboard.appendChild(row);
        });
        document.body.appendChild(keyboard);
      });
    }
    await page.screenshot({
      path: process.env.MOBILE_SCREENSHOT_PATH,
      animations: "disabled",
    });
  }

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
});
