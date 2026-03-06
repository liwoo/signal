/**
 * Library system — collects zen tips the player has learned or missed.
 * Pure functions only.
 */

export interface LibraryEntry {
  id: string;
  principle: string;
  learned: boolean;       // player followed the pattern
  jolt: string;           // Maya's affirmation (shown when learned)
  suggestion: string;     // Maya's hint (shown when missed)
  stepId: string;         // which step it came from
  bonusXP: number;
}

export interface LibraryState {
  entries: LibraryEntry[];
}

export function createLibraryState(): LibraryState {
  return { entries: [] };
}

/** Record zen results for a completed step. */
export function recordZenResults(
  state: LibraryState,
  stepId: string,
  rules: Array<{
    id: string;
    principle: string;
    jolt: string;
    suggestion: string;
    bonusXP: number;
    passed: boolean;
  }>
): LibraryState {
  const newEntries = rules.map((r) => ({
    id: r.id,
    principle: r.principle,
    learned: r.passed,
    jolt: r.jolt,
    suggestion: r.suggestion,
    stepId,
    bonusXP: r.bonusXP,
  }));

  // Replace entries for same step (retry), add new ones
  const kept = state.entries.filter((e) => e.stepId !== stepId);
  return { entries: [...kept, ...newEntries] };
}

/** Get all missed tips for reinforcement at end of round. */
export function getMissedTips(state: LibraryState): LibraryEntry[] {
  return state.entries.filter((e) => !e.learned);
}

/** Get all learned tips. */
export function getLearnedTips(state: LibraryState): LibraryEntry[] {
  return state.entries.filter((e) => e.learned);
}

/** Summary stats for the library. */
export function getLibraryStats(state: LibraryState): {
  total: number;
  learned: number;
  missed: number;
  earnedXP: number;
  missedXP: number;
} {
  const learned = state.entries.filter((e) => e.learned);
  const missed = state.entries.filter((e) => !e.learned);
  return {
    total: state.entries.length,
    learned: learned.length,
    missed: missed.length,
    earnedXP: learned.reduce((s, e) => s + e.bonusXP, 0),
    missedXP: missed.reduce((s, e) => s + e.bonusXP, 0),
  };
}
