import { loadEnvConfig } from "@next/env";

// Load .env.local the way `next dev` does, so the fake session in fixtures.ts
// is stored under the same project key the app's Supabase client reads. With
// no env (CI), both the dev server and the fixture use a fake project.
loadEnvConfig(process.cwd());

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://fakeproj.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
