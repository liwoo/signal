// ── Core Game Types ──

export type Act = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type GamePhase = "intro" | "playing" | "boss" | "twist" | "gameover";

export type JeopardyEvent =
  | "guard_entered"
  | "power_reduced"
  | "signal_scramble"
  | "energy_drain"
  | "hint_burned";

export type StoryBranch = "a" | "b" | null;
export type KiraVerdict = "trusted" | "rejected" | null;

// ── Challenge ──

export interface Challenge {
  id: string;
  act: Act;
  chapter: number;
  title: string;
  location: string;
  concepts: string[];
  brief: string;
  starterCode: string;
  expectedBehavior: string;
  hints: ChallengeHint[];
  events: TimedEvent[];
  rushMode: RushConfig | null;
  xp: XPConfig;
  isBoss: boolean;
  parTimeSeconds: number;
}

export interface ChallengeHint {
  level: 1 | 2 | 3;
  text: string;
  energyCost: number;
}

export interface TimedEvent {
  triggerAtSeconds: number;
  type: "story" | "rush" | "powercut" | "system";
  message: string;
  effect?: JeopardyEvent;
}

export interface RushConfig {
  durationSeconds: number;
  label: string;
  onExpiry: JeopardyEvent;
}

export interface XPConfig {
  base: number;
  firstTryBonus: number;
  parTimeSeconds: number;
}

// ── Player State ──

export interface PlayerProgress {
  version: number;
  currentAct: Act;
  currentChapter: number;
  completedChapters: number[];
  bossesDefeated: string[];
  kiraVerdict: KiraVerdict;
  storyBranch: StoryBranch;
  checkpointData: CheckpointData;
}

export interface CheckpointData {
  chapter: number;
  energy: number;
  jeopardyCarryover: JeopardyEvent[];
}

export interface PlayerStats {
  xp: number;
  level: number;
  energy: number;
  energyMax: number;
  aiTokens: number;
  streak: number;
  streakMultiplier: number;
  totalAttempts: number;
  firstTryCount: number;
  totalPlayTimeMs: number;
}

export interface PlayerUnlocks {
  syntaxHighlighting: "locked" | "timed" | "permanent";
  syntaxHighlightTimeRemainingMs: number;
  vimMode: boolean;
  blackMarket: boolean;
  permanentHighlighting: boolean;
  ghostChannel: boolean;
  extraEnergyCapacity: boolean;
  webModeTheme: boolean;
  httpPreviewPanel: boolean;
  expandedTokenCapacity: boolean;
  nexusDossier: boolean;
}

export interface PlayerSettings {
  vimModeEnabled: boolean;
  fontSize: number;
  soundEnabled: boolean;
}

// ── Chat ──

export type MessageSender = "MAYA" | "YOU" | "SYS" | "GHOST" | "KIRA" | "VASIK" | "REEVES" | "FIXER";
export type MessageEra = "current" | "previous";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
  era: MessageEra;
  type?: "separator" | "system" | "chat";
}

// ── Editor ──

export type VimMode = "NORMAL" | "INSERT" | "VISUAL";

export interface EditorState {
  code: string;
  cursorLine: number;
  cursorCol: number;
  vimMode: VimMode;
  scrollTop: number;
}

// ── Submission ──

export interface SubmissionResult {
  pass: boolean;
  feedback: string;
  xpEarned?: number;
  speedBonus?: number;
  firstTry?: boolean;
}

// ── Economy ──

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  costXp: number;
  effect: string;
}

// ── AI Backend ──

export type AIBackend = "gemini-nano" | "webllm" | "anthropic-api";

// ── Level Config ──

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  unlock: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, unlock: "Basic editor" },
  { level: 2, xpRequired: 300, unlock: "Syntax highlighting — 5 minutes" },
  { level: 3, xpRequired: 700, unlock: "Vim mode unlocked permanently" },
  { level: 4, xpRequired: 1200, unlock: "AI hint token x3" },
  { level: 5, xpRequired: 2000, unlock: "Black Market access" },
  { level: 6, xpRequired: 3500, unlock: "Syntax highlighting — permanent" },
  { level: 7, xpRequired: 5500, unlock: "Extra energy capacity (+50)" },
  { level: 8, xpRequired: 8000, unlock: "GHOST channel" },
  { level: 9, xpRequired: 10000, unlock: "Part II + Web Mode theme" },
  { level: 10, xpRequired: 12500, unlock: "HTTP request preview panel" },
  { level: 11, xpRequired: 15000, unlock: "AI token capacity +5" },
  { level: 12, xpRequired: 18000, unlock: "NEXUS dossier" },
];

// ── Streak ──

export interface StreakTier {
  count: number;
  multiplier: number;
  label: string;
}

export const STREAK_TIERS: StreakTier[] = [
  { count: 2, multiplier: 1.2, label: "SHARP" },
  { count: 3, multiplier: 1.4, label: "ON FIRE" },
  { count: 4, multiplier: 1.7, label: "CRACKING" },
  { count: 5, multiplier: 2.0, label: "GHOST MODE" },
];
