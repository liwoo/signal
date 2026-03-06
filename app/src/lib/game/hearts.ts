// ── Hearts / Lives System ──
// Maya starts with 3 hearts. One is lost each game over.
// Hearts can be purchased with XP. Pure functions only.

export const INITIAL_HEARTS = 3;
export const MAX_HEARTS = 5;
export const HEART_COST_XP = 500;

export function loseHeart(current: number): number {
  return Math.max(0, current - 1);
}

export function canBuyHeart(hearts: number, xp: number): boolean {
  return hearts < MAX_HEARTS && xp >= HEART_COST_XP;
}

export interface BuyHeartResult {
  hearts: number;
  xp: number;
}

export function buyHeart(hearts: number, xp: number): BuyHeartResult | null {
  if (!canBuyHeart(hearts, xp)) return null;
  return {
    hearts: hearts + 1,
    xp: xp - HEART_COST_XP,
  };
}

export function hasLives(hearts: number): boolean {
  return hearts > 0;
}
