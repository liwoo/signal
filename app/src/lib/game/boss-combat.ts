// ── Boss Combat Logic ──
// Pure functions for boss fight state management.
// No React, no DOM, no side effects.

import type { BossFightConfig, BossTurn, BossTab, BossCombatPhase } from "@/types/game";

// ── State ──

export interface BossCombatState {
  phase: BossCombatPhase;
  bossHP: number;
  turnIndex: number;              // 0-based index into config.turns
  heartsLost: number;             // hearts lost during this fight
  turnStartMs: number;            // timestamp when player window opened
  turnResults: TurnResult[];      // history of all completed turns
  tabCode: Record<string, string>; // current code per tab id
}

export interface TurnResult {
  turnId: number;
  outcome: "hit" | "miss" | "timeout" | "malfunction";
  damageDealt: number;
  elapsedMs: number;
}

// ── Init ──

export function createBossCombatState(config: BossFightConfig): BossCombatState {
  const tabCode: Record<string, string> = {};
  for (const tab of config.tabs) {
    tabCode[tab.id] = tab.starterCode;
  }
  return {
    phase: "ready",
    bossHP: config.bossHP,
    turnIndex: 0,
    heartsLost: 0,
    turnStartMs: 0,
    turnResults: [],
    tabCode,
  };
}

// ── Turn management ──

export function getCurrentTurn(config: BossFightConfig, state: BossCombatState): BossTurn | null {
  if (state.turnIndex >= config.turns.length) return null;
  return config.turns[state.turnIndex];
}

export function startTelegraph(state: BossCombatState): BossCombatState {
  return { ...state, phase: "telegraph" };
}

export function startPlayerWindow(state: BossCombatState, nowMs: number): BossCombatState {
  return { ...state, phase: "player_window", turnStartMs: nowMs };
}

export function updateTabCode(
  state: BossCombatState,
  tabId: string,
  code: string
): BossCombatState {
  return {
    ...state,
    tabCode: { ...state.tabCode, [tabId]: code },
  };
}

// ── Compilation ──

/** Build the full Go source from all tabs + the turn's test harness. */
/** Minimal correct stubs for each tab — used when a non-active tab still has corrupted code. */
const TAB_STUBS: Record<string, string> = {
  aim: `func Aim(sector int) (int, int) { return 0, 0 }`,
  load: `func Load(threat string) []string { return nil }`,
  fire: `func Fire(x, y int, ammo []string) string { return "" }`,
  main: `func Combo(shots ...string) string { return "" }`,
};

export function buildSource(
  config: BossFightConfig,
  state: BossCombatState,
  turn: BossTurn
): string {
  const parts: string[] = [
    `package main`,
    ``,
    `import (`,
    `\t"fmt"`,
    `\t"strings"`,
    `)`,
    ``,
  ];

  for (const tab of config.tabs) {
    parts.push(`// ── ${tab.filename} ──`);
    const userCode = state.tabCode[tab.id] ?? tab.starterCode;
    const cleaned = stripPackageAndImports(userCode);

    if (tab.id === turn.activeTab) {
      // Active tab: always use the player's code (bugs and all)
      parts.push(cleaned);
    } else {
      // Non-active tab: try the player's code, but if it would cause a compile
      // error (still corrupted), swap in a minimal stub so the active tab can
      // be tested in isolation.
      // Heuristic: if the code still contains known corruption markers, use stub.
      const hasCorruption =
        userCode === tab.starterCode ||    // untouched starter = still corrupted
        /\bsting\b/.test(userCode) ||      // "sting" instead of "string"
        /\bin\)/.test(userCode) ||          // "in)" instead of "int)"
        (tab.id === "main" && !/\bfunc\b/.test(userCode)); // main.go has no func yet
      parts.push(hasCorruption ? (TAB_STUBS[tab.id] ?? cleaned) : cleaned);
    }
    parts.push(``);
  }

  // Suppress unused import errors
  parts.push(`var _ = fmt.Sprintf`);
  parts.push(`var _ = strings.Join`);
  parts.push(``);

  parts.push(`// ── test harness ──`);
  parts.push(turn.testHarness);

  return parts.join("\n");
}

/** Remove `package main`, `import "fmt"`, and `import (...)` blocks from user code. */
function stripPackageAndImports(code: string): string {
  return code
    .replace(/^\s*package\s+\w+\s*$/gm, "")
    .replace(/^\s*import\s+"[^"]+"\s*$/gm, "")
    .replace(/^\s*import\s*\([\s\S]*?\)\s*$/gm, "")
    .trim();
}

/** Check the compiled output against expected. */
export function checkOutput(actual: string, expected: string): boolean {
  return actual.trim() === expected.trim();
}

// ── Turn resolution ──

export interface TurnResolution {
  state: BossCombatState;
  outcome: "hit" | "miss" | "malfunction";
}

export function resolveTurnHit(
  config: BossFightConfig,
  state: BossCombatState,
  turn: BossTurn,
  elapsedMs: number
): TurnResolution {
  const result: TurnResult = {
    turnId: turn.id,
    outcome: "hit",
    damageDealt: turn.damage,
    elapsedMs,
  };
  const newHP = Math.max(0, state.bossHP - turn.damage);
  const nextIndex = state.turnIndex + 1;

  let phase: BossCombatPhase = "hit";
  // Check if boss is defeated after this hit
  if (newHP <= 0) {
    phase = "victory";
  }

  return {
    state: {
      ...state,
      phase,
      bossHP: newHP,
      turnIndex: nextIndex,
      turnResults: [...state.turnResults, result],
    },
    outcome: "hit",
  };
}

export function resolveTurnMiss(
  config: BossFightConfig,
  state: BossCombatState,
  turn: BossTurn,
  elapsedMs: number,
  reason: "miss" | "malfunction" | "timeout"
): TurnResolution {
  const result: TurnResult = {
    turnId: turn.id,
    outcome: reason === "malfunction" ? "malfunction" : reason === "timeout" ? "timeout" : "miss",
    damageDealt: 0,
    elapsedMs,
  };
  const nextIndex = state.turnIndex + 1;

  return {
    state: {
      ...state,
      phase: "miss",
      turnIndex: nextIndex,
      // heartsLost NOT incremented — misses cost nothing.
      // Only boss attacks (bossAttackHit) deduct hearts.
      turnResults: [...state.turnResults, result],
    },
    outcome: reason === "malfunction" ? "malfunction" : "miss",
  };
}

// ── Post-turn transitions ──

/** After hit/miss animation, determine next phase. */
export function advanceAfterResult(
  config: BossFightConfig,
  state: BossCombatState,
  currentHearts: number
): BossCombatState {
  // Already in victory
  if (state.phase === "victory") return state;

  // Check game over (hearts depleted)
  if (currentHearts <= 0) {
    return { ...state, phase: "gameover" };
  }

  // All turns exhausted
  if (state.turnIndex >= config.turns.length) {
    // Boss retreats if HP is at or below threshold
    if (state.bossHP <= config.retreatThreshold) {
      return { ...state, phase: "boss_retreats" };
    }
    // Boss survived — partial loss (but we still let them pass per spec)
    return { ...state, phase: "boss_retreats" };
  }

  // More turns — start next telegraph
  return { ...state, phase: "telegraph" };
}

// ── XP calculation ──

export interface BossXPBreakdown {
  hitXP: number;
  defeatBonus: number;
  flawlessBonus: number;
  speedBonus: number;
  total: number;
}

export function calculateBossXP(
  config: BossFightConfig,
  state: BossCombatState
): BossXPBreakdown {
  const hits = state.turnResults.filter((r) => r.outcome === "hit").length;
  const hitXP = hits * config.perHitXP;

  const defeated = state.bossHP <= 0;
  const defeatBonus = defeated ? config.defeatXP : config.survivalXP;

  const flawlessBonus = state.heartsLost === 0 ? config.flawlessBonus : 0;

  // Speed bonus: average time under 5s per turn
  const completedTurns = state.turnResults.filter((r) => r.outcome === "hit");
  let speedBonus = 0;
  if (completedTurns.length > 0) {
    const avgMs = completedTurns.reduce((sum, r) => sum + r.elapsedMs, 0) / completedTurns.length;
    if (avgMs < 5000) {
      speedBonus = config.speedBonus;
    }
  }

  return {
    hitXP,
    defeatBonus,
    flawlessBonus,
    speedBonus,
    total: hitXP + defeatBonus + flawlessBonus + speedBonus,
  };
}

// ── Helpers ──

export function isBossDefeated(state: BossCombatState): boolean {
  return state.bossHP <= 0;
}

export function isFightOver(config: BossFightConfig, state: BossCombatState): boolean {
  return (
    state.phase === "victory" ||
    state.phase === "boss_retreats" ||
    state.phase === "gameover"
  );
}

export function getTotalDamageDealt(state: BossCombatState): number {
  return state.turnResults.reduce((sum, r) => sum + r.damageDealt, 0);
}

export function getHitCount(state: BossCombatState): number {
  return state.turnResults.filter((r) => r.outcome === "hit").length;
}

export function getMissCount(state: BossCombatState): number {
  return state.turnResults.filter((r) => r.outcome !== "hit").length;
}
