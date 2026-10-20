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
  /** Seconds poured back onto the level clock for clearing this step (0 = none). */
  timeBonusSeconds: number;
  /** Text badges in display order, e.g. "FIRST TRY +20". */
  badges: string[];
}

/** Clock-style format for a seconds amount: "+0:30", "+1:15", or "+20s". */
export function formatTimeBonus(seconds: number): string {
  const whole = Math.round(seconds);
  if (whole >= 60) {
    const mins = Math.floor(whole / 60);
    const secs = whole % 60;
    return `+${mins}:${String(secs).padStart(2, "0")}`;
  }
  return `+${whole}s`;
}

export function buildReward(input: {
  stepTitle: string;
  stepIndex: number;
  totalSteps: number;
  base: number;
  firstTry: boolean;
  speedXP: number;
  zenXP: number;
  /** Seconds added to the level clock as a reward for getting it right. */
  timeBonusSeconds?: number;
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
  const timeBonusSeconds = Math.max(0, Math.round(input.timeBonusSeconds ?? 0));
  const badges: string[] = [];
  if (firstTryXP > 0) badges.push(`FIRST TRY +${firstTryXP}`);
  if (input.speedXP > 0) badges.push(`SPEED +${input.speedXP}`);
  if (input.zenXP > 0) badges.push(`ZEN +${input.zenXP}`);
  // The time reward gets its own prominent "ON THE CLOCK" line on the card
  // (see RewardCard), so it is not duplicated as a badge here.
  return {
    title: chapterClear ? "CHAPTER CLEAR" : "STEP CLEAR",
    subtitle: `${input.stepTitle} · ${input.stepIndex + 1}/${input.totalSteps}`,
    breakdown,
    chapterClear,
    timeBonusSeconds,
    badges,
  };
}
