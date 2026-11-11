import { chapter01 } from "./challenges/chapter-01";
import { chapter02 } from "./challenges/chapter-02";
import { chapter03 } from "./challenges/chapter-03";
import { boss01 } from "./challenges/boss-01";
import { chapter04 } from "./challenges/chapter-04";
import { chapter04_2 } from "./challenges/chapter-04.2";
import { chapter07 } from "./challenges/chapter-07";
import { chapter08 } from "./challenges/chapter-08";
import { chapter09 } from "./challenges/chapter-09";
import { boss03 } from "./challenges/boss-03";
import { isChallengeAvailable } from "./challenges/realizations";
import type { Challenge, LanguageId } from "@/types/game";

/**
 * The built chapters in play order, as the teacher dashboard reports them.
 * `number` is `Challenge.chapter` — what saves record in `completedChapters`.
 * Keep in step with the CHAPTERS registry in app/play/page.tsx.
 */
export interface ClassroomChapter {
  id: string;
  number: number;
  title: string;
  isBoss: boolean;
  steps: { id: string; title: string }[];
}

function entry(c: Challenge, isBoss = false): ClassroomChapter {
  return { id: c.id, number: c.chapter, title: c.title, isBoss, steps: c.steps.map((s) => ({ id: s.id, title: s.title })) };
}

export const CLASSROOM_CHAPTERS: ClassroomChapter[] = [
  entry(chapter01),
  entry(chapter02),
  entry(chapter03),
  entry(boss01, true),
  entry(chapter04),
  entry(chapter04_2),
  entry(chapter07),
  entry(chapter08),
  entry(chapter09),
  entry(boss03, true),
];

/** The chapters a student can play in `language` (unrealized chapters are Go-only). */
export function classroomChaptersFor(language: LanguageId): ClassroomChapter[] {
  return CLASSROOM_CHAPTERS.filter((c) => isChallengeAvailable(c.id, language));
}
