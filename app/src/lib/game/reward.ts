// ── Step / chapter rewards ──
// Pure breakdown of what a successful submission earned, so the reward card
// can show the player *why* the number is what it is.

export interface RewardBreakdown {
  base: number;
  firstTry: number;
  speed: number;
  zen: number;
  total: number;
}

export interface Reward {
  /** "STEP CLEAR" or "CHAPTER CLEAR" */
  title: string;
  /** e.g. "SCAFFOLD · 1/2" */
  subtitle: string;
  breakdown: RewardBreakdown;
  chapterClear: boolean;
  /** Text badges in display order, e.g. "FIRST TRY +20". */
  badges: string[];
}

export function buildReward(input: {
  stepTitle: string;
  stepIndex: number;
  totalSteps: number;
  base: number;
  firstTry: boolean;
  speedXP: number;
  zenXP: number;
}): Reward {
  const firstTryXP = input.firstTry ? Math.floor(input.base * 0.5) : 0;
  const breakdown: RewardBreakdown = {
    base: input.base,
    firstTry: firstTryXP,
    speed: input.speedXP,
    zen: input.zenXP,
    total: input.base + firstTryXP + input.speedXP + input.zenXP,
  };
  const chapterClear = input.stepIndex >= input.totalSteps - 1;
  const badges: string[] = [];
  if (firstTryXP > 0) badges.push(`FIRST TRY +${firstTryXP}`);
  if (input.speedXP > 0) badges.push(`SPEED +${input.speedXP}`);
  if (input.zenXP > 0) badges.push(`ZEN +${input.zenXP}`);
  return {
    title: chapterClear ? "CHAPTER CLEAR" : "STEP CLEAR",
    subtitle: `${input.stepTitle} · ${input.stepIndex + 1}/${input.totalSteps}`,
    breakdown,
    chapterClear,
    badges,
  };
}
