import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULTS, DEFAULT_PLAYER_PROGRESS as DEFAULTS_PROGRESS } from "./persistence";
import type { PersistedState } from "./persistence";

// Controllable fakes for the Supabase client and the IndexedDB fallback.
const mocks = vi.hoisted(() => {
  const ctrl = {
    row: null as { state: unknown } | null,
    selectError: null as unknown,
    upsertError: null as unknown,
    upserts: [] as Array<{ user_id: string; state: PersistedState }>,
  };
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: ctrl.row, error: ctrl.selectError }),
        }),
      }),
      upsert: async (payload: { user_id: string; state: PersistedState }) => {
        ctrl.upserts.push(payload);
        return { error: ctrl.upsertError };
      },
    }),
  };
  const idb = { load: vi.fn(), save: vi.fn(), reset: vi.fn() };
  return { ctrl, client, idb };
});

vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => mocks.client }));
vi.mock("./idb", () => ({ createIDBPersistence: () => mocks.idb }));

import { createSupabasePersistence } from "./supabase";

function stateWithXp(xp: number): PersistedState {
  return { ...DEFAULTS, stats: { ...DEFAULTS.stats, xp } };
}

beforeEach(() => {
  mocks.ctrl.row = null;
  mocks.ctrl.selectError = null;
  mocks.ctrl.upsertError = null;
  mocks.ctrl.upserts = [];
  mocks.idb.load.mockReset().mockResolvedValue({ ...DEFAULTS });
  mocks.idb.save.mockReset();
  mocks.idb.reset.mockReset();
});

describe("supabase persistence", () => {
  it("loads the cloud row when it exists, without migrating", async () => {
    mocks.ctrl.row = { state: stateWithXp(999) };
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(999);
    expect(mocks.ctrl.upserts).toHaveLength(0);
  });

  it("migrates the local guest save to the cloud on first sign-in", async () => {
    mocks.ctrl.row = null;
    mocks.idb.load.mockResolvedValue(stateWithXp(42));
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(42);
    expect(mocks.ctrl.upserts).toHaveLength(1);
    expect(mocks.ctrl.upserts[0]).toMatchObject({ user_id: "user-1" });
    expect(mocks.ctrl.upserts[0].state.stats.xp).toBe(42);
  });

  it("merges a partial save over the cached state and upserts the whole blob", async () => {
    mocks.ctrl.row = { state: stateWithXp(10) };
    const store = createSupabasePersistence("user-1");
    await store.load();

    await store.save({ stats: { ...DEFAULTS.stats, xp: 20 } });

    expect(mocks.idb.save).toHaveBeenCalledWith(
      expect.objectContaining({ stats: { ...DEFAULTS.stats, xp: 20 } })
    );
    const last = mocks.ctrl.upserts.at(-1)!;
    expect(last.state.stats.xp).toBe(20);
  });

  it("stamps every save (cloud and local mirror) with the time and owner", async () => {
    mocks.ctrl.row = { state: stateWithXp(10) };
    const store = createSupabasePersistence("user-1");
    await store.load();

    await store.save({ stats: { ...DEFAULTS.stats, xp: 20 } });

    const mirrored = mocks.idb.save.mock.calls.at(-1)![0] as Partial<PersistedState>;
    expect(mirrored.meta?.userId).toBe("user-1");
    expect(typeof mirrored.meta?.savedAt).toBe("number");
    expect(mocks.ctrl.upserts.at(-1)!.state.meta).toEqual(mirrored.meta);
  });

  it("does not let a stale cloud row wipe progress that only reached the local mirror", async () => {
    // The cloud row is the empty one written at first sign-in; the step clear
    // (65 XP + checkpoint) only made it to IndexedDB.
    mocks.ctrl.row = { state: { ...DEFAULTS } };
    const local: PersistedState = {
      ...stateWithXp(65),
      progress: {
        version: 2,
        byLanguage: {
          go: {
            ...DEFAULTS_PROGRESS,
            resume: { chapterId: "chapter-01", stepIndex: 1, introDone: true },
          },
        },
      },
    };
    mocks.idb.load.mockResolvedValue(local);
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(65);
    expect(loaded.progress.byLanguage.go?.resume?.stepIndex).toBe(1);
    // …and the recovered copy is pushed back up to the cloud.
    expect(mocks.ctrl.upserts.at(-1)!.state.stats.xp).toBe(65);
  });

  it("keeps the cloud row when the local copy belongs to another account", async () => {
    mocks.ctrl.row = { state: stateWithXp(5) };
    mocks.idb.load.mockResolvedValue({ ...stateWithXp(900), meta: { savedAt: Date.now(), userId: "user-2" } });
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(5);
    expect(mocks.ctrl.upserts).toHaveLength(0);
  });

  it("does not migrate another account's local save on first sign-in", async () => {
    mocks.ctrl.row = null;
    mocks.idb.load.mockResolvedValue({ ...stateWithXp(900), meta: { savedAt: Date.now(), userId: "user-2" } });
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(0);
    expect(mocks.ctrl.upserts[0].state.stats.xp).toBe(0);
  });

  it("falls back to the local save when Supabase errors", async () => {
    mocks.ctrl.selectError = { message: "network down" };
    mocks.idb.load.mockResolvedValue(stateWithXp(7));
    const store = createSupabasePersistence("user-1");

    const loaded = await store.load();

    expect(loaded.stats.xp).toBe(7);
  });
});
