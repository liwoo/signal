import { test } from "@playwright/test";

test("generate OG image", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto("http://localhost:5199/test-visual/og.html");
  // Wait for SVG image to load
  await page.waitForFunction(() => {
    const img = document.querySelector("img");
    return img && img.complete && img.naturalWidth > 0;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(200);
  await page.locator("#og").screenshot({
    path: "public/og.jpg",
    type: "jpeg",
    quality: 90,
  });
});
