import { LEVEL_THRESHOLDS, STREAK_TIERS } from "@/types/game";

export function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xpRequired) {
      return LEVEL_THRESHOLDS[i].level;
    }
  }
  return 1;
}

export function xpForNextLevel(xp: number): {
  current: number;
  required: number;
  progress: number;
} {
  const level = calculateLevel(xp);
  const currentThreshold =
    LEVEL_THRESHOLDS.find((t) => t.level === level)?.xpRequired ?? 0;
  const nextThreshold =
    LEVEL_THRESHOLDS.find((t) => t.level === level + 1)?.xpRequired ?? currentThreshold;

  const earned = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;

  return {
    current: earned,
    required: needed,
    progress: needed > 0 ? earned / needed : 1,
  };
}

export function calculateSpeedXP(
  baseXP: number,
  elapsedSeconds: number,
  parTimeSeconds: number
): number {
  if (elapsedSeconds >= parTimeSeconds) return 0;
  return Math.floor(baseXP * (1 - elapsedSeconds / parTimeSeconds) * 0.5);
}

export function getStreakMultiplier(streak: number): {
  multiplier: number;
  label: string | null;
} {
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_TIERS[i].count) {
      return {
        multiplier: STREAK_TIERS[i].multiplier,
        label: STREAK_TIERS[i].label,
      };
    }
  }
  return { multiplier: 1.0, label: null };
}

export function calculateTotalXP(
  baseXP: number,
  firstTry: boolean,
  speedBonusXP: number,
  streakMultiplier: number
): number {
  let total = baseXP;
  if (firstTry) total += Math.floor(baseXP * 0.5);
  total += speedBonusXP;
  total = Math.floor(total * streakMultiplier);
  return total;
}
