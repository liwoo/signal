import { createClient, SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  instance = createClient(url, key, {
    auth: {
      // PKCE OAuth, with the session persisted + auto-refreshed in localStorage
      // and picked back out of the URL on the post-sign-in redirect.
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return instance;
}
