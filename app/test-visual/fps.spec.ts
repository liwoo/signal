import { test } from "@playwright/test";

test("screenshot FPS boss view", async ({ page }) => {
  page.on("console", (msg) => console.log("PAGE:", msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await page.goto("http://localhost:5199/test-visual/fps-test.html");
  await page.waitForFunction(() => document.title === "RENDERED", null, { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-visual/fps-screenshot.png", fullPage: true });
});
