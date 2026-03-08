import { test } from "@playwright/test";

test("screenshot crawl animation", async ({ page }) => {
  page.on("console", (msg) => console.log("PAGE:", msg.text()));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  await page.goto("http://localhost:5199/test-visual/crawl-test.html");
  await page.waitForFunction(() => document.title === "RENDERED", null, { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-visual/crawl-screenshot.png", fullPage: true });
});
