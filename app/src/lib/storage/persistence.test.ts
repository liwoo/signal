import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_PROGRESS, DEFAULTS, migrateProgress, progressFor, withProgress } from "./persistence";
import type { PlayerProgress } from "@/types/game";

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
