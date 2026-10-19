// ── Per-language realizations ──
// Go is authored inline in the chapter files (it's the spine's own
// realization). Other languages realize the same steps here. A chapter is
// playable in a language only when it has a realization for it — Act I ships
// in all three; later acts are Go-only until they're authored.

import type { Challenge, ChallengeRealization, LanguageId } from "@/types/game";
import type { AdventureLevel, BossPhase } from "@/lib/adventure/types";
import { applyRealization } from "@/lib/lang/realize";
import { localizeManualMention } from "@/data/book";
import { JAVASCRIPT_REALIZATIONS, JAVASCRIPT_BOSS_PHASES } from "./javascript";
import { PYTHON_REALIZATIONS, PYTHON_BOSS_PHASES } from "./python";

export type BossPhaseRealization = Pick<BossPhase, "starterCode"> & Partial<Pick<BossPhase, "brief" | "hint">>;

const REALIZATIONS: Record<Exclude<LanguageId, "go">, Record<string, ChallengeRealization>> = {
  javascript: JAVASCRIPT_REALIZATIONS,
  python: PYTHON_REALIZATIONS,
};

const BOSS_PHASES: Record<Exclude<LanguageId, "go">, Record<string, Record<string, BossPhaseRealization>>> = {
  javascript: JAVASCRIPT_BOSS_PHASES,
  python: PYTHON_BOSS_PHASES,
};

/** Can this chapter be played in this language? */
export function isChallengeAvailable(challengeId: string, language: LanguageId): boolean {
  return language === "go" || Boolean(REALIZATIONS[language][challengeId]);
}

/** The challenge as the player sees it in `language`. Go returns the spine unchanged. */
export function realizeChallenge(challenge: Challenge, language: LanguageId): Challenge {
  if (language === "go") return challenge;
  const r = REALIZATIONS[language][challenge.id];
  if (!r) throw new Error(`${challenge.id} has no ${language} realization`);
  return applyRealization(challenge, r);
}

/** A boss arena with each coding phase's starter code (and wording) in `language`. */
export function realizeBossLevel(level: AdventureLevel, language: LanguageId): AdventureLevel {
  if (language === "go" || !level.boss) return level;
  const phases = BOSS_PHASES[language][level.id];
  if (!phases) return level;
  return {
    ...level,
    boss: {
      ...level.boss,
      phases: level.boss.phases.map((p) => ({ ...p, ...phases[p.id] })),
    },
  };
}

/**
 * A story level as played in `language`. The adventure layer is language-neutral
 * except where Maya names the field manual she finds ("'go: a field manual'").
 */
export function realizeAdventureLevel(level: AdventureLevel, language: LanguageId): AdventureLevel {
  if (language === "go") return level;
  const loc = (t: string | undefined) => (t === undefined ? t : localizeManualMention(t, language));
  return {
    ...level,
    opening: loc(level.opening),
    objectives: level.objectives.map((o) => ({ ...o, stake: loc(o.stake)!, thought: loc(o.thought), done: loc(o.done) })),
  };
}
