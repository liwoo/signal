// Every chapter realized beyond Go, and the reference solutions that prove it.
// The golden and content tests (and /dev/lang) iterate over these, so a newly
// realized chapter is covered by adding it here plus its act's fixtures.

import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { chapter04 } from "@/data/challenges/chapter-04";
import { chapter04_2 } from "@/data/challenges/chapter-04.2";
import type { Challenge, LanguageId } from "@/types/game";
import { HARDCODED as ACT1_HARDCODED, SOLUTIONS as ACT1_SOLUTIONS, type Solutions } from "./act1.fixtures";
import { ACT2_HARDCODED, ACT2_SOLUTIONS } from "./act2.fixtures";

type NonGo = Exclude<LanguageId, "go">;

/** Regular (non-boss) chapters realized in every language, in play order. */
export const REALIZED_CHAPTERS: Challenge[] = [chapter01, chapter02, chapter03, chapter04, chapter04_2];

export const SOLUTIONS: Record<NonGo, Solutions> = {
  javascript: { ...ACT1_SOLUTIONS.javascript, ...ACT2_SOLUTIONS.javascript },
  python: { ...ACT1_SOLUTIONS.python, ...ACT2_SOLUTIONS.python },
};

export const HARDCODED: Record<NonGo, Partial<Solutions>> = {
  javascript: { ...ACT1_HARDCODED.javascript, ...ACT2_HARDCODED.javascript },
  python: { ...ACT1_HARDCODED.python, ...ACT2_HARDCODED.python },
};
