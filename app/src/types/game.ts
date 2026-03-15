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

export interface ChallengeStep {
  id: string;                        // e.g. "chapter-01:scaffold"
  title: string;                     // e.g. "SCAFFOLD"
  brief: string;                     // what the player needs to do
  starterCode: string | null;        // null = carry forward from previous step
  expectedBehavior: string;
  hints: ChallengeHint[];
  rushMode: RushConfig | null;       // step-scoped rush (optional)
  xp: XPConfig;
  events: TimedEvent[];              // step-scoped timed events
  /** Go main() that tests the user's code with fixed inputs. Engine swaps this in before compiling. */
  testHarness?: string;
  /** Exact stdout the testHarness produces when the code is correct. */
  expectedOutput?: string;
  /** Patterns the user's code must contain (even if output matches) to prevent hardcoding answers. */
  requiredCode?: string[];
}

export interface Challenge {
  id: string;
  act: Act;
  chapter: number;
  title: string;
  location: string;
  concepts: string[];
  steps: ChallengeStep[];
  events: TimedEvent[];              // level-wide timed events (fire once at level start)
  timer: LevelTimerConfig;
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
  bonusTimeSeconds: number; // time added to level timer on rush completion
}

export interface LevelTimerConfig {
  timeLimitSeconds: number;  // total time to complete the level
  gameOverOnExpiry: boolean; // true = Maya captured, false = jeopardy only
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
  hearts: number;
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
  beginnerMode: boolean;
  chatWidthPercent: number;
  /** Tutorial text size multiplier (1 = original 11px, 2 = default 22px) */
  tutorialFontScale: number;
  tourCompleted: boolean;
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

export type AIBackend = "gemini-nano" | "anthropic-api";

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

// ── Boss Fight ──

export interface BossTab {
  id: string;                        // "aim" | "load" | "fire"
  filename: string;                  // "aim.go"
  label: string;                     // tab display label
  starterCode: string;               // initial code in this tab
  functionSignature: string;         // shown as reference
}

export interface BossTurn {
  id: number;                        // 1-based turn number
  telegraph: string;                 // boss announcement
  hint: string;                      // player guidance
  activeTab: string;                 // which tab to highlight
  windowSeconds: number;             // coding time for this turn
  testHarness: string;               // generated main() for validation
  expectedOutput: string;            // stdout when correct
  damage: number;                    // HP removed on hit (out of 100)
  bossCharge: string;                // animation key during telegraph
  hitEffect: string;                 // animation key on hit
  missEffect: string;                // animation key on miss
}

export interface BossFightConfig {
  bossName: string;
  bossHP: number;                    // starting HP (usually 100)
  tabs: BossTab[];                   // weapon subsystem files
  turns: BossTurn[];                 // sequence of combat turns
  defeatXP: number;                  // XP on full defeat
  survivalXP: number;               // XP if survived but didn't fully defeat
  retreatThreshold: number;          // boss HP at or below which boss retreats
  perHitXP: number;                  // XP per successful hit
  flawlessBonus: number;            // XP bonus for no hearts lost
  speedBonus: number;               // XP bonus for avg < 5s/turn
}

export type BossCombatPhase =
  | "ready"
  | "telegraph"
  | "player_window"
  | "executing"
  | "hit"
  | "miss"
  | "victory"
  | "boss_retreats"
  | "gameover";

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
