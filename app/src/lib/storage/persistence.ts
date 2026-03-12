/**
 * Storage-agnostic persistence interface for SIGNAL.
 *
 * All game state reads/writes go through this interface.
 * The backing store (IndexedDB, localStorage, Supabase, etc.)
 * is an implementation detail — swap it without touching consumers.
 */

import type { PlayerProgress, PlayerStats, PlayerUnlocks, PlayerSettings } from "@/types/game";
import type { LibraryState } from "@/lib/game/library";

// ── Schema ──

export interface PersistedState {
  progress: PlayerProgress;
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

export const DEFAULTS: PersistedState = {
  progress: {
    version: 1,
    currentAct: 1,
    currentChapter: 1,
    completedChapters: [],
    bossesDefeated: [],
    kiraVerdict: null,
    storyBranch: null,
    checkpointData: { chapter: 1, energy: 100, jeopardyCarryover: [] },
  },
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
    fontSize: 12,
    soundEnabled: true,
    beginnerMode: true,
    chatWidthPercent: 42,
    tutorialFontScale: 2,
  },
  library: { entries: [] },
};

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
