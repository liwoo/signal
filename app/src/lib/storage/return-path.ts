/**
 * Where to land after the Google OAuth round-trip. The OAuth `redirectTo` only
 * works for URLs on the Supabase redirect allow-list; stashing the path in
 * sessionStorage (same tab, survives the redirect) lets AuthProvider finish the
 * trip even when Supabase falls back to the Site URL.
 */

const KEY = "signal:return-path";

export function rememberReturnPath(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // storage blocked — redirectTo alone will have to do
  }
}

/** Read and clear the stashed path. Only same-origin absolute paths are honoured. */
export function consumeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
