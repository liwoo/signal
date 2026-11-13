// Every chapter realized beyond Go, and the reference solutions that prove it.
// The golden and content tests (and /dev/lang) iterate over these, so a newly
// realized chapter is covered by adding it here plus its act's fixtures.

import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { chapter04 } from "@/data/challenges/chapter-04";
import { chapter04_2 } from "@/data/challenges/chapter-04.2";
import { chapter07 } from "@/data/challenges/chapter-07";
import { chapter08 } from "@/data/challenges/chapter-08";
import { chapter09 } from "@/data/challenges/chapter-09";
import { isChallengeAvailable } from "@/data/challenges/realizations";
import type { Challenge, LanguageId } from "@/types/game";
import { HARDCODED as ACT1_HARDCODED, SOLUTIONS as ACT1_SOLUTIONS, type Solutions } from "./act1.fixtures";
import { ACT2_HARDCODED, ACT2_SOLUTIONS } from "./act2.fixtures";
import { ACT3_HARDCODED, ACT3_SOLUTIONS } from "./act3.fixtures";

type NonGo = Exclude<LanguageId, "go">;

/** Every non-Go language, for tests that iterate them. */
export const NON_GO_LANGUAGES: NonGo[] = ["javascript", "python", "rust"];

/** Regular (non-boss) chapters realized in at least one language beyond Go, in play order. */
export const REALIZED_CHAPTERS: Challenge[] = [chapter01, chapter02, chapter03, chapter04, chapter04_2, chapter07, chapter08, chapter09];

/** The regular chapters playable in `language` (Rust ships Act I only). */
export function chaptersRealizedIn(language: LanguageId): Challenge[] {
  return REALIZED_CHAPTERS.filter((c) => isChallengeAvailable(c.id, language));
}

export const SOLUTIONS: Record<NonGo, Solutions> = {
  javascript: { ...ACT1_SOLUTIONS.javascript, ...ACT2_SOLUTIONS.javascript, ...ACT3_SOLUTIONS.javascript },
  python: { ...ACT1_SOLUTIONS.python, ...ACT2_SOLUTIONS.python, ...ACT3_SOLUTIONS.python },
  rust: { ...ACT1_SOLUTIONS.rust },
};

export const HARDCODED: Record<NonGo, Partial<Solutions>> = {
  javascript: { ...ACT1_HARDCODED.javascript, ...ACT2_HARDCODED.javascript, ...ACT3_HARDCODED.javascript },
  python: { ...ACT1_HARDCODED.python, ...ACT2_HARDCODED.python, ...ACT3_HARDCODED.python },
  rust: { ...ACT1_HARDCODED.rust },
};
