// ── Progressive hints ──
// Pure rules for when a player is "stuck" and how hints unlock, one at a time.
// Hints are paid for in XP (the one resource the HUD actually shows), and the
// game only nudges once per step so the offer never turns into nagging.

import type { ChallengeHint } from "@/types/game";

export interface HintState {
  /** Number of hints revealed for the current step (0..hints.length). */
  revealed: number;
  /** Whether Maya has already offered a hint for this step. */
  offered: boolean;
}

export function createHintState(): HintState {
  return { revealed: 0, offered: false };
}

/** Failed attempts before the game proactively offers a hint. */
export const STUCK_ATTEMPTS = 2;
/** Idle time on a step (no submission) before the game proactively offers a hint. */
export const STUCK_AFTER_MS = 75_000;

/**
 * Whether the player looks stuck: repeated failed attempts, or a long stretch
 * on the step with nothing sent.
 */
export function isStuck(attempts: number, stepElapsedMs: number): boolean {
  return attempts >= STUCK_ATTEMPTS || stepElapsedMs >= STUCK_AFTER_MS;
}

/** The next hint that would be revealed, or null when all are used. */
export function nextHint(hints: ChallengeHint[], state: HintState): ChallengeHint | null {
  return hints[state.revealed] ?? null;
}

/** XP price of a hint. Reuses the authored energy cost so content stays untouched. */
export function hintCostXP(hint: ChallengeHint): number {
  return hint.energyCost;
}

export interface RevealResult {
  state: HintState;
  hint: ChallengeHint | null;
  /** XP after paying. Never below zero. */
  xp: number;
}

/** Reveal the next hint, paying for it. No-op when all hints are used. */
export function revealNextHint(hints: ChallengeHint[], state: HintState, xp: number): RevealResult {
  const hint = nextHint(hints, state);
  if (!hint) return { state, hint: null, xp };
  return {
    state: { ...state, revealed: state.revealed + 1 },
    hint,
    xp: Math.max(0, xp - hintCostXP(hint)),
  };
}

/** Mark the one-time offer as made. */
export function markOffered(state: HintState): HintState {
  return state.offered ? state : { ...state, offered: true };
}
