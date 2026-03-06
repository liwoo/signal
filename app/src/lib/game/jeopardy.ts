// ── Jeopardy System ──
// Pure functions for timer calculations and jeopardy effects.
// No React, no DOM, no storage.

import type { JeopardyEvent } from "@/types/game";

// ── Level Timer ──

export interface TimerConfig {
  timeLimitSeconds: number;
  rushBonusSeconds: number;   // time added to level timer on rush completion
}

export function calculateTimeRemaining(
  startTimeMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): number {
  const elapsed = (nowMs - startTimeMs) / 1000;
  return Math.max(0, timeLimitSeconds + bonusSeconds - elapsed);
}

export function isTimeExpired(
  startTimeMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): boolean {
  return calculateTimeRemaining(startTimeMs, nowMs, timeLimitSeconds, bonusSeconds) <= 0;
}

// ── Jeopardy Effects ──

export interface JeopardyState {
  chatLocked: boolean;
  chatLockUntilMs: number;
  editorNarrow: boolean;
  lineNumbersHidden: boolean;
  scrambleActive: boolean;
  scrambleIntervalMs: number;
  scrambleCount: number;
  activeEffects: JeopardyEvent[];
}

export function createJeopardyState(): JeopardyState {
  return {
    chatLocked: false,
    chatLockUntilMs: 0,
    editorNarrow: false,
    lineNumbersHidden: false,
    scrambleActive: false,
    scrambleIntervalMs: 8000,
    scrambleCount: 3,
    activeEffects: [],
  };
}

export interface JeopardyResult {
  jeopardy: JeopardyState;
  energyDelta: number;
  hintsBurned: number;
  message: string;
}

export function applyJeopardyEvent(
  state: JeopardyState,
  event: JeopardyEvent,
  nowMs: number
): JeopardyResult {
  const next = { ...state, activeEffects: [...state.activeEffects, event] };
  let energyDelta = 0;
  let hintsBurned = 0;
  let message = "";

  switch (event) {
    case "guard_entered":
      next.chatLocked = true;
      next.chatLockUntilMs = nowMs + 60_000;
      message = "guard entered. maya can't respond for 60 seconds.";
      break;

    case "power_reduced":
      next.editorNarrow = true;
      next.lineNumbersHidden = true;
      message = "power reduced. editor restricted.";
      break;

    case "signal_scramble":
      next.scrambleActive = true;
      message = "signal scramble. characters will corrupt every 8 seconds.";
      break;

    case "energy_drain":
      energyDelta = -20;
      message = "energy drain. -20 energy.";
      break;

    case "hint_burned":
      hintsBurned = 1;
      message = "hint burned. one hint lost.";
      break;
  }

  return { jeopardy: next, energyDelta, hintsBurned, message };
}

// ── Retry Penalties ──

export interface RetryPenalties {
  carryoverEffects: JeopardyEvent[];
  speedBonusAvailable: boolean;
  startingEnergyPct: number;
}

export function calculateRetryPenalties(
  previousEffects: JeopardyEvent[]
): RetryPenalties {
  // 50% intensity = carry over the effects but they're active
  return {
    carryoverEffects: previousEffects,
    speedBonusAvailable: false,
    startingEnergyPct: 0.3,
  };
}

// ── Scramble ──

export function scrambleCode(code: string, count: number): string {
  if (code.length < 2) return code;
  const chars = code.split("");
  const indices: number[] = [];

  // Pick random non-whitespace positions
  const candidates = chars
    .map((c, i) => (c.trim() ? i : -1))
    .filter((i) => i !== -1);

  const total = Math.min(count, candidates.length);
  for (let i = 0; i < total; i++) {
    const pick = Math.floor(Math.random() * candidates.length);
    indices.push(candidates[pick]);
    candidates.splice(pick, 1);
  }

  for (const idx of indices) {
    chars[idx] = "\u2588"; // █
  }

  return chars.join("");
}
