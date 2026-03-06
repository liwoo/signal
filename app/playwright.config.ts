import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test-visual",
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 1200, height: 900 },
  },
  webServer: {
    command: "npx vite --port 5199 --config vite.config.visual.ts",
    port: 5199,
    reuseExistingServer: true,
    timeout: 15000,
  },
});
