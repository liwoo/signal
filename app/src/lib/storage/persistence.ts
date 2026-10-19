/**
 * Storage-agnostic persistence interface for SIGNAL.
 *
 * All game state reads/writes go through this interface.
 * The backing store (IndexedDB, localStorage, Supabase, etc.)
 * is an implementation detail — swap it without touching consumers.
 */

import type { LanguageId, PlayerProgress, PlayerStats, PlayerUnlocks, PlayerSettings, ProgressStore } from "@/types/game";
import type { LibraryState } from "@/lib/game/library";

// ── Schema ──

export interface PersistedState {
  /** Story progress, one slice per language. */
  progress: ProgressStore;
  stats: PlayerStats;
  unlocks: PlayerUnlocks;
  settings: PlayerSettings;
  library: LibraryState;
}

// ── Interface ──

export interface GamePersistence {
  load(): Promise<PersistedState>;
  save(partial: Partial<PersistedState>): Promise<void>;
  reset(): Promise<void>;
}

// ── Defaults ──

export const DEFAULT_PLAYER_PROGRESS: PlayerProgress = {
  version: 1,
  currentAct: 1,
  currentChapter: 1,
  completedChapters: [],
  bossesDefeated: [],
  kiraVerdict: null,
  storyBranch: null,
  checkpointData: { chapter: 1, energy: 100, jeopardyCarryover: [] },
};

export const DEFAULTS: PersistedState = {
  progress: { version: 2, byLanguage: {} },
  stats: {
    xp: 0,
    level: 1,
    energy: 100,
    energyMax: 100,
    aiTokens: 0,
    streak: 0,
    streakMultiplier: 1,
    totalAttempts: 0,
    firstTryCount: 0,
    totalPlayTimeMs: 0,
    hearts: 3,
  },
  unlocks: {
    syntaxHighlighting: "locked",
    syntaxHighlightTimeRemainingMs: 0,
    vimMode: false,
    blackMarket: false,
    permanentHighlighting: false,
    ghostChannel: false,
    extraEnergyCapacity: false,
    webModeTheme: false,
    httpPreviewPanel: false,
    expandedTokenCapacity: false,
    nexusDossier: false,
  },
  settings: {
    vimModeEnabled: false,
    fontSize: 15,
    soundEnabled: true,
    musicEnabled: true,
    beginnerMode: false,
    chatWidthPercent: 42,
    tutorialFontScale: 2,
    tourCompleted: false,
    language: "go",
    languageChosen: false,
  },
  library: { entries: [] },
};

// ── Progress per language ──

/**
 * Normalize whatever is stored under `progress` into the per-language store.
 * A version-1 save is a single PlayerProgress — it was always Go, so it folds
 * into `byLanguage.go`. Anything unrecognized falls back to an empty store.
 */
export function migrateProgress(raw: unknown): ProgressStore {
  if (!raw || typeof raw !== "object") return { version: 2, byLanguage: {} };
  const r = raw as Partial<ProgressStore> & Partial<PlayerProgress>;
  if (r.version === 2 && r.byLanguage && typeof r.byLanguage === "object") {
    return { version: 2, byLanguage: { ...r.byLanguage } };
  }
  if (Array.isArray(r.completedChapters)) {
    return { version: 2, byLanguage: { go: { ...DEFAULT_PLAYER_PROGRESS, ...(r as PlayerProgress) } } };
  }
  return { version: 2, byLanguage: {} };
}

/** The progress slice for one language (a fresh start if they've never played it). */
export function progressFor(store: ProgressStore, language: LanguageId): PlayerProgress {
  return store.byLanguage[language] ?? DEFAULT_PLAYER_PROGRESS;
}

/** Return a new store with one language's slice replaced. Other languages are untouched. */
export function withProgress(store: ProgressStore, language: LanguageId, progress: PlayerProgress): ProgressStore {
  return { version: 2, byLanguage: { ...store.byLanguage, [language]: progress } };
}

// ── Active backend ──
// Lazy-loaded so we don't import IDB on the server during SSR.

let _backend: GamePersistence | null = null;

async function getBackend(): Promise<GamePersistence> {
  if (!_backend) {
    const { createIDBPersistence } = await import("./idb");
    _backend = createIDBPersistence();
  }
  return _backend;
}

/**
 * Override the default backend (useful for testing or swapping to Supabase).
 */
export function setPersistenceBackend(backend: GamePersistence): void {
  _backend = backend;
}

// ── Public API (delegates to active backend) ──

export async function loadPersistedState(): Promise<PersistedState> {
  const backend = await getBackend();
  return backend.load();
}

export async function savePersistedState(partial: Partial<PersistedState>): Promise<void> {
  const backend = await getBackend();
  return backend.save(partial);
}

export async function resetPersistedState(): Promise<void> {
  const backend = await getBackend();
  return backend.reset();
}
