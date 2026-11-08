// ── Per-language realizations ──
// Go is authored inline in the chapter files (it's the spine's own
// realization). Other languages realize the same steps here. A chapter is
// playable in a language only when it has a realization for it — Act I and the
// built Act II chapters ship in all three; anything newer is Go-only until it's
// authored (docs/cross-language-act-2-plan.md).

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

// Where Maya names a Go-only concept in a story line, the phrase she'd use in
// each language. Whole phrases, so an unrelated "map" or "string" is untouched.
const STORY_TERMS: Record<Exclude<LanguageId, "go">, [string, string][]> = {
  python: [
    ["room — maps.", "room — dictionaries."],
    ["maps — keys and values", "dictionaries — keys and values"],
    ["strings and runes", "strings and slices"],
    ["strings, runes,", "strings, slices,"],
  ],
  javascript: [
    ["room — maps.", "room — objects."],
    ["maps — keys and values", "objects — keys and values"],
    ["strings and runes", "strings and characters"],
    ["strings, runes,", "strings, characters,"],
  ],
};

function localizeStoryLine(text: string, language: Exclude<LanguageId, "go">): string {
  const named = localizeManualMention(text, language);
  return STORY_TERMS[language].reduce((t, [from, to]) => t.replaceAll(from, to), named);
}

/**
 * A story level as played in `language`. The adventure layer is language-neutral
 * except where Maya names the field manual she finds ("'go: a field manual'") or
 * the Go concept a chapter teaches ("maps", "runes").
 */
export function realizeAdventureLevel(level: AdventureLevel, language: LanguageId): AdventureLevel {
  if (language === "go") return level;
  const loc = (t: string | undefined) => (t === undefined ? t : localizeStoryLine(t, language));
  return {
    ...level,
    opening: loc(level.opening),
    objectives: level.objectives.map((o) => ({ ...o, stake: loc(o.stake)!, thought: loc(o.thought), done: loc(o.done) })),
  };
}
