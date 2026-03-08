/**
 * Pure timer computation functions.
 *
 * Extracted from useGame so the main-timer / rush-timer interaction
 * can be unit-tested without React.
 */

import type { RushConfig, JeopardyEvent } from "@/types/game";

/** Seconds remaining on the main level timer. */
export function mainTimeRemaining(
  startMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): number {
  const elapsed = (nowMs - startMs) / 1000;
  return timeLimitSeconds + bonusSeconds - elapsed;
}

/** Whether the main timer has expired at a given instant. */
export function isMainTimerExpired(
  startMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): boolean {
  return mainTimeRemaining(startMs, nowMs, timeLimitSeconds, bonusSeconds) <= 0;
}

export interface RushExpireResult {
  jeopardyEffect: JeopardyEvent;
  mainTimerExpired: boolean;
}

/**
 * Compute what happens when a rush challenge expires.
 *
 * The critical case: the main timer runs out *during* a rush.
 * The rush UI shields the player, so the main timer's onExpire
 * doesn't fire. When the rush ends we must check retroactively.
 */
export function resolveRushExpiry(
  rushConfig: RushConfig,
  startMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): RushExpireResult {
  return {
    jeopardyEffect: rushConfig.onExpiry,
    mainTimerExpired: isMainTimerExpired(startMs, nowMs, timeLimitSeconds, bonusSeconds),
  };
}

export interface TimerTickResult {
  remaining: number;
  expired: boolean;
}

/** Compute a single timer tick (used by LevelTimer's interval). */
export function timerTick(
  startMs: number,
  nowMs: number,
  timeLimitSeconds: number,
  bonusSeconds: number
): TimerTickResult {
  const remaining = Math.max(0, mainTimeRemaining(startMs, nowMs, timeLimitSeconds, bonusSeconds));
  return { remaining, expired: remaining <= 0 };
}
