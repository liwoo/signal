import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test-mobile",
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3005",
    ...devices["iPhone 13"],
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --port 3005",
    port: 3005,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
