/**
 * Pure pause/continue state machine for Maya's typing pauses.
 *
 * Flow:
 *   idle → startPause → paused → markTypingDone → waitingForContinue
 *     → resume → idle
 *     → requestExplain → paused (Maya types again → markTypingDone → ...)
 *
 * No React, no DOM, no side effects.
 */

export const EXPLAIN_COST_XP = 10;

export interface PauseState {
  /** Timestamp (ms) when pause began. 0 = not paused. */
  pauseStartMs: number;
  /** Maya finished typing; waiting for player to click continue. */
  waitingForContinue: boolean;
  /** Player already used "explain again" in this pause cycle. */
  explainUsed: boolean;
}

export function createPauseState(): PauseState {
  return { pauseStartMs: 0, waitingForContinue: false, explainUsed: false };
}

/** Whether the game is currently paused (timer should be stopped). */
export function isPaused(state: PauseState): boolean {
  return state.pauseStartMs > 0;
}

/** Whether events should be queued instead of fired. */
export function shouldQueueEvent(state: PauseState): boolean {
  return state.pauseStartMs > 0;
}

/**
 * Attempt to start a pause when Maya begins typing.
 * Returns new state, or null if pause cannot start (already paused or timer stopped).
 */
export function startPause(
  state: PauseState,
  nowMs: number,
  timerAlreadyStopped: boolean
): PauseState | null {
  if (timerAlreadyStopped || state.pauseStartMs > 0) return null;
  return { ...state, pauseStartMs: nowMs };
}

/**
 * The player asked Maya something: hold the clock for her answer.
 *
 * Like `startPause`, but an answer always outranks a pending "continue": if
 * the game is already paused on one, the prompt is withdrawn until the reply
 * has finished typing (`markTypingDone` brings it back). Otherwise the
 * auto-continue could resume the clock — and release queued story beats like
 * the Ch1 footsteps — while the answer is still on its way.
 *
 * Returns the new state, or null when there's nothing to hold (clock not
 * running and not already paused).
 */
export function holdForReply(
  state: PauseState,
  nowMs: number,
  timerAlreadyStopped: boolean
): PauseState | null {
  if (state.pauseStartMs > 0) {
    return state.waitingForContinue ? { ...state, waitingForContinue: false } : state;
  }
  return startPause(state, nowMs, timerAlreadyStopped);
}

/**
 * Mark that Maya has finished typing. Transitions to waitingForContinue.
 * Returns new state, or null if not currently paused.
 */
export function markTypingDone(state: PauseState): PauseState | null {
  if (state.pauseStartMs === 0) return null;
  return { ...state, waitingForContinue: true };
}

/**
 * Resume the game (player clicked continue or auto-timer fired).
 * Returns new state + bonus seconds to compensate paused time,
 * or null if not paused.
 */
export function resume(
  state: PauseState,
  nowMs: number
): { state: PauseState; bonusSeconds: number } | null {
  if (state.pauseStartMs === 0) return null;
  const pausedMs = nowMs - state.pauseStartMs;
  return {
    state: createPauseState(),
    bonusSeconds: pausedMs / 1000,
  };
}

/**
 * Player requests "explain again". Costs XP, can only be used once per cycle.
 * Returns new state + adjusted XP, or null if already used.
 */
export function requestExplain(
  state: PauseState,
  currentXP: number
): { state: PauseState; newXP: number } | null {
  if (state.explainUsed) return null;
  return {
    state: { ...state, explainUsed: true, waitingForContinue: false },
    newXP: Math.max(0, currentXP - EXPLAIN_COST_XP),
  };
}

/**
 * Reset explainUsed for a new step (player should get a fresh explain
 * opportunity on each step's intro message).
 */
export function resetExplainForNewStep(state: PauseState): PauseState {
  return { ...state, explainUsed: false };
}

/** Split a Maya message into chunks at paragraph boundaries for paced delivery. */
export function splitMayaMessage(text: string): string[] {
  return text.split("\n\n").filter((s) => s.trim().length > 0);
}
