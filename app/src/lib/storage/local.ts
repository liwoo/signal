import type {
  PlayerProgress,
  PlayerStats,
  PlayerUnlocks,
  PlayerSettings,
  ChatMessage,
  EditorState,
  JeopardyEvent,
} from "@/types/game";

// ── Keys ──

const KEYS = {
  progress: "signal_progress",
  stats: "signal_stats",
  unlocks: "signal_unlocks",
  settings: "signal_settings",
  market: "signal_market",
  syncQueue: "signal_sync_queue",
  chat: (challengeId: string) => `signal_chat_${challengeId}`,
  editor: (challengeId: string) => `signal_editor_${challengeId}`,
  jeopardy: "signal_jeopardy_active",
} as const;

// ── Defaults ──

const DEFAULT_PROGRESS: PlayerProgress = {
  version: 1,
  currentAct: 1,
  currentChapter: 1,
  completedChapters: [],
  bossesDefeated: [],
  kiraVerdict: null,
  storyBranch: null,
  checkpointData: { chapter: 1, energy: 100, jeopardyCarryover: [] },
};

const DEFAULT_STATS: PlayerStats = {
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
};

const DEFAULT_UNLOCKS: PlayerUnlocks = {
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
};

const DEFAULT_SETTINGS: PlayerSettings = {
  vimModeEnabled: false,
  fontSize: 12,
  soundEnabled: true,
  beginnerMode: true,
  chatWidthPercent: 42,
};

// ── Helpers ──

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or quota exceeded — silently fail
  }
}

function safeSessionGet<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSessionSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

// ── localStorage (persistent) ──

export function loadProgress(): PlayerProgress {
  return safeGet(KEYS.progress, DEFAULT_PROGRESS);
}

export function saveProgress(progress: PlayerProgress): void {
  safeSet(KEYS.progress, progress);
}

export function loadStats(): PlayerStats {
  return safeGet(KEYS.stats, DEFAULT_STATS);
}

export function saveStats(stats: PlayerStats): void {
  safeSet(KEYS.stats, stats);
}

export function loadUnlocks(): PlayerUnlocks {
  return safeGet(KEYS.unlocks, DEFAULT_UNLOCKS);
}

export function saveUnlocks(unlocks: PlayerUnlocks): void {
  safeSet(KEYS.unlocks, unlocks);
}

export function loadSettings(): PlayerSettings {
  return safeGet(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: PlayerSettings): void {
  safeSet(KEYS.settings, settings);
}

// ── sessionStorage (ephemeral) ──

export function loadChat(challengeId: string): ChatMessage[] {
  return safeSessionGet(KEYS.chat(challengeId), []);
}

export function saveChat(challengeId: string, messages: ChatMessage[]): void {
  safeSessionSet(KEYS.chat(challengeId), messages);
}

export function loadEditorState(challengeId: string): EditorState | null {
  return safeSessionGet<EditorState | null>(KEYS.editor(challengeId), null);
}

export function saveEditorState(
  challengeId: string,
  state: EditorState
): void {
  safeSessionSet(KEYS.editor(challengeId), state);
}

export function loadActiveJeopardy(): JeopardyEvent[] {
  return safeSessionGet<JeopardyEvent[]>(KEYS.jeopardy, []);
}

export function saveActiveJeopardy(events: JeopardyEvent[]): void {
  safeSessionSet(KEYS.jeopardy, events);
}

// ── Reset ──

export function resetAllProgress(): void {
  safeSet(KEYS.progress, DEFAULT_PROGRESS);
  safeSet(KEYS.stats, DEFAULT_STATS);
  safeSet(KEYS.unlocks, DEFAULT_UNLOCKS);
}
