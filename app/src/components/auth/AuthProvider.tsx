"use client";

/**
 * Supabase auth context for SIGNAL.
 *
 * Holds the current user and the sign-in / sign-out actions. The session lives
 * in localStorage (managed by supabase-js); on the post-OAuth redirect the
 * client picks it back out of the URL automatically, and `onAuthStateChange`
 * flips `user` here. When Supabase isn't configured, `authAvailable` is false
 * and the app degrades to a clearly signed-out state.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { resetToDefaultBackend, setPersistenceBackend } from "@/lib/storage/persistence";
import { createSupabasePersistence } from "@/lib/storage/supabase";

interface AuthContextValue {
  user: User | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /** False when Supabase env vars are missing — auth can't run. */
  authAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  // Nothing to check when auth isn't configured — don't start in a loading state.
  const [loading, setLoading] = useState(supabase !== null);

  // Point the persistence layer at the right backend BEFORE GameRouter loads.
  // Done synchronously in the auth callbacks (not an effect) so the module-level
  // backend is set before GameRouter's mount effect calls loadPersistedState().
  // Guarded by uid so a token refresh (same user) doesn't reset the backend's
  // in-memory cache.
  const appliedUid = useRef<string | null | undefined>(undefined);
  const syncBackend = useCallback((u: User | null) => {
    const uid = u?.id ?? null;
    if (appliedUid.current === uid) return;
    appliedUid.current = uid;
    if (uid) setPersistenceBackend(createSupabasePersistence(uid));
    else resetToDefaultBackend();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      syncBackend(data.session?.user ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncBackend(session?.user ?? null);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, syncBackend]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/play` },
    });
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, authAvailable: supabase !== null, signInWithGoogle, signOut }),
    [user, loading, supabase, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
