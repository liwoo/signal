/**
 * Supabase implementation of GamePersistence — one JSONB row per user in
 * `public.game_state`, holding the whole PersistedState blob. This slots
 * straight onto the GamePersistence seam, so no game code changes.
 *
 * This is an internal backend module (like idb.ts); consumers import from
 * persistence.ts. The composition root (AuthProvider) wires it in on sign-in.
 *
 * Deviation from spec/infrastructure/global-persistence.md: that spec models
 * normalized tables (progress/stats/unlocks/...) to feed a leaderboard view.
 * We ship the single-blob version first — migrate to normalized tables when
 * leaderboards land. Every save is stamped (`meta`) and mirrored to IndexedDB;
 * on load the cloud row and the local mirror are reconciled by
 * `reconcileSaves()` (newest stamped write wins, else the copy further along),
 * so a stale cloud row can't wipe progress. No field-level merge matrix yet.
 */

import type { GamePersistence, PersistedState } from "./persistence";
import { DEFAULTS, normalizePersistedState, reconcileSaves } from "./persistence";
import { getSupabase } from "@/lib/supabase/client";
import { createIDBPersistence } from "./idb";

const TABLE = "game_state";

export function createSupabasePersistence(userId: string): GamePersistence {
  // The whole state, cached in memory so a partial save() can merge without a
  // read round-trip. Seeded by load(), which GameRouter always calls first.
  let current: PersistedState | null = null;

  function stamp(state: PersistedState): PersistedState {
    return { ...state, meta: { savedAt: Date.now(), userId } };
  }

  async function fetchRow(): Promise<PersistedState | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from(TABLE)
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return normalizePersistedState(data.state);
  }

  async function upsert(state: PersistedState): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  return {
    async load(): Promise<PersistedState> {
      const local = await createIDBPersistence().load();
      try {
        const cloud = await fetchRow();
        if (!cloud) {
          // No cloud row yet — this is the player's first sign-in. Migrate
          // their local (guest) save up so progress carries over — unless the
          // local copy belongs to another account on this browser.
          const owner = local.meta?.userId ?? null;
          const seed = owner !== null && owner !== userId ? { ...DEFAULTS, settings: local.settings } : local;
          current = stamp(seed);
          await upsert(current);
          return current;
        }
        // The local mirror can be ahead of the cloud (a save that never made
        // it up, or older builds that routed a whole session to IDB only).
        // Never let a stale/empty cloud row wipe that progress.
        const { state, source } = reconcileSaves(cloud, local, userId);
        current = source === "local" ? stamp(state) : state;
        if (source === "local") {
          try {
            await upsert(current);
          } catch {
            // The next successful save flushes it.
          }
        }
        return current;
      } catch {
        // Supabase unreachable — fall back to local so the game still runs.
        current = local;
        return local;
      }
    },

    async save(partial: Partial<PersistedState>): Promise<void> {
      const stamped: Partial<PersistedState> = { ...partial, meta: { savedAt: Date.now(), userId } };
      // Keep a local mirror too, so a cloud outage doesn't lose the session.
      const localBackend = createIDBPersistence();
      localBackend.save(stamped);
      try {
        if (!current) current = (await fetchRow()) ?? { ...DEFAULTS };
        current = { ...current, ...stamped };
        await upsert(current);
      } catch {
        // Non-blocking: the local mirror holds this write; the next successful
        // save flushes the full merged state.
      }
    },

    async reset(): Promise<void> {
      current = { ...DEFAULTS };
      createIDBPersistence().reset();
      try {
        await upsert({ ...DEFAULTS });
      } catch {
        // ignore — local reset already happened
      }
    },
  };
}
