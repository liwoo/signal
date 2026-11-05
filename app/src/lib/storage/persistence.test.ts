import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLAYER_PROGRESS,
  DEFAULTS,
  loadPersistedState,
  migrateProgress,
  normalizePersistedState,
  progressFor,
  progressScore,
  reconcileSaves,
  resetToDefaultBackend,
  savePersistedState,
  setPersistenceBackend,
  withProgress,
  type GamePersistence,
  type PersistedState,
} from "./persistence";
import type { PlayerProgress } from "@/types/game";

const idbMock = vi.hoisted(() => ({
  load: vi.fn(async () => ({ source: "idb" })),
  save: vi.fn(async () => {}),
  reset: vi.fn(async () => {}),
}));
vi.mock("./idb", () => ({ createIDBPersistence: () => idbMock }));

const v1: PlayerProgress = { ...DEFAULT_PLAYER_PROGRESS, currentChapter: 3, completedChapters: [1, 2] };

describe("per-language progress", () => {
  it("folds a version-1 save into the go slice", () => {
    const store = migrateProgress(v1);
    expect(store.version).toBe(2);
    expect(store.byLanguage.go).toEqual(v1);
    expect(store.byLanguage.python).toBeUndefined();
  });

  it("keeps a version-2 store as-is", () => {
    const store = withProgress(migrateProgress(v1), "python", { ...DEFAULT_PLAYER_PROGRESS, completedChapters: [1] });
    expect(migrateProgress(store)).toEqual(store);
  });

  it("starts empty for missing or garbage data", () => {
    expect(migrateProgress(null)).toEqual({ version: 2, byLanguage: {} });
    expect(migrateProgress({ nonsense: true })).toEqual({ version: 2, byLanguage: {} });
    expect(DEFAULTS.progress).toEqual({ version: 2, byLanguage: {} });
  });

  it("tracks each language independently", () => {
    let store = migrateProgress(v1);
    store = withProgress(store, "javascript", { ...DEFAULT_PLAYER_PROGRESS, completedChapters: [1, 2, 3] });
    expect(progressFor(store, "go").completedChapters).toEqual([1, 2]);
    expect(progressFor(store, "javascript").completedChapters).toEqual([1, 2, 3]);
    expect(progressFor(store, "python")).toEqual(DEFAULT_PLAYER_PROGRESS);
  });

  it("defaults new players to go, not yet asked", () => {
    expect(DEFAULTS.settings.language).toBe("go");
    expect(DEFAULTS.settings.languageChosen).toBe(false);
  });
});

// ── Cloud vs local reconciliation ──

function save(opts: {
  xp?: number;
  completed?: number[];
  resumeStep?: number;
  meta?: PersistedState["meta"];
}): PersistedState {
  const progress: PlayerProgress = {
    ...DEFAULT_PLAYER_PROGRESS,
    completedChapters: opts.completed ?? [],
    resume: opts.resumeStep !== undefined
      ? { chapterId: "chapter-01", stepIndex: opts.resumeStep, introDone: true }
      : undefined,
  };
  return {
    ...DEFAULTS,
    progress: withProgress(DEFAULTS.progress, "go", progress),
    stats: { ...DEFAULTS.stats, xp: opts.xp ?? 0 },
    ...(opts.meta ? { meta: opts.meta } : {}),
  };
}

describe("progressScore", () => {
  it("orders chapters > checkpoint > xp", () => {
    expect(progressScore(save({}))).toBe(0);
    expect(progressScore(save({ xp: 65 }))).toBeLessThan(progressScore(save({ resumeStep: 1 })));
    expect(progressScore(save({ resumeStep: 1, xp: 4000 }))).toBeLessThan(progressScore(save({ completed: [1] })));
  });
});

describe("reconcileSaves", () => {
  const uid = "user-1";

  it("keeps local progress when the cloud row is stale/empty (the playtest 0 XP reset)", () => {
    const cloud = save({});
    const local = save({ xp: 65, resumeStep: 1 });
    const r = reconcileSaves(cloud, local, uid);
    expect(r.source).toBe("local");
    expect(r.state.stats.xp).toBe(65);
  });

  it("prefers the cloud when it is further along (played on another device)", () => {
    const r = reconcileSaves(save({ completed: [1, 2] }), save({ xp: 65, resumeStep: 1 }), uid);
    expect(r.source).toBe("cloud");
  });

  it("ties go to the cloud", () => {
    expect(reconcileSaves(save({ xp: 10 }), save({ xp: 10 }), uid).source).toBe("cloud");
  });

  it("newest stamped write wins when both copies are stamped for this user", () => {
    const cloud = save({ completed: [1], meta: { savedAt: 2_000, userId: uid } });
    const local = save({ xp: 5, meta: { savedAt: 1_000, userId: uid } });
    expect(reconcileSaves(cloud, local, uid).source).toBe("cloud");
    const newerLocal = save({ completed: [1], xp: 200, meta: { savedAt: 3_000, userId: uid } });
    expect(reconcileSaves(cloud, newerLocal, uid).source).toBe("local");
  });

  it("never adopts a local copy that belongs to another account", () => {
    const cloud = save({});
    const local = save({ completed: [1, 2, 3], meta: { savedAt: 9_999, userId: "someone-else" } });
    expect(reconcileSaves(cloud, local, uid).source).toBe("cloud");
  });

  it("uses the cloud when there is no local copy", () => {
    expect(reconcileSaves(save({ xp: 1 }), null, uid).source).toBe("cloud");
  });
});

describe("normalizePersistedState · meta", () => {
  it("keeps a valid stamp and drops garbage", () => {
    expect(normalizePersistedState({ meta: { savedAt: 5, userId: "u" } }).meta).toEqual({ savedAt: 5, userId: "u" });
    expect(normalizePersistedState({ meta: "nope" }).meta).toBeUndefined();
    expect(normalizePersistedState({}).meta).toBeUndefined();
  });

  it("round-trips a mid-chapter checkpoint", () => {
    const s = save({ resumeStep: 1 });
    expect(progressFor(normalizePersistedState(s).progress, "go").resume?.stepIndex).toBe(1);
  });
});

// ── Backend selection race ──

describe("backend selection", () => {
  it("does not clobber a backend installed while the default IDB backend is loading", async () => {
    resetToDefaultBackend();
    const cloud: GamePersistence = {
      load: vi.fn(async () => ({ ...DEFAULTS, stats: { ...DEFAULTS.stats, xp: 65 } })),
      save: vi.fn(async () => {}),
      reset: vi.fn(async () => {}),
    };
    // GameRouter's load starts first; AuthProvider installs the cloud backend
    // before the lazy IDB import resolves.
    const pending = loadPersistedState();
    setPersistenceBackend(cloud);
    const loaded = await pending;

    expect(loaded.stats.xp).toBe(65);
    expect(cloud.load).toHaveBeenCalledTimes(1);
    expect(idbMock.load).not.toHaveBeenCalled();

    // …and every later save still goes to the cloud backend.
    await savePersistedState({ stats: loaded.stats });
    expect(cloud.save).toHaveBeenCalledTimes(1);
    expect(idbMock.save).not.toHaveBeenCalled();
    resetToDefaultBackend();
  });
});
