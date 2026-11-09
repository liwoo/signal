import { defineConfig, devices } from "@playwright/test";
import "./test-mobile/supabase-env";

// The specs sign in against a faked Supabase (test-mobile/fixtures.ts). The
// dev server must use the same NEXT_PUBLIC_SUPABASE_URL as the fixture, which
// supabase-env.ts guarantees (it loads .env.local, else a fake project).
const PORT = 3005;

export default defineConfig({
  testDir: "./test-mobile",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["iPhone 13"],
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  },
});
