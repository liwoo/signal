import { curriculumFor } from "@/data/curriculum";
import type { LanguageId } from "@/types/game";

export type ConceptStatus = "covered" | "current" | "upcoming" | "planned";

export interface ChapterSummary {
  key: string;
  title: string;
  concepts: string[];
  isBoss: boolean;
  status: ConceptStatus;
  /**
   * How many of `concepts` (from the front) count as learned: all of them for
   * a covered chapter, a share proportional to cleared steps for the current
   * one, none otherwise.
   */
  coveredConcepts: number;
}

export interface ActSummary {
  act: string;
  name: string;
  /** True once every built chapter in the act is complete. */
  covered: boolean;
  chapters: ChapterSummary[];
}

export interface CurriculumSummary {
  /** Concepts the player has covered (completed chapters + cleared steps of the current one). */
  covered: number;
  /** Concepts in built/playable chapters. */
  playable: number;
  /** Concepts in planned (not-yet-built) chapters. */
  planned: number;
  /** covered / playable as a 0–100 integer (progress through what's playable). */
  pct: number;
  acts: ActSummary[];
}

/** Steps cleared in the active chapter, for partial credit. */
export interface StepProgress {
  done: number;
  total: number;
}

/** Concepts earned so far in a chapter of `count` concepts with `steps` cleared. */
export function partialConcepts(count: number, steps: StepProgress | null | undefined): number {
  if (!steps || steps.total <= 0 || count <= 0) return 0;
  const done = Math.min(Math.max(0, steps.done), steps.total);
  return Math.floor((count * done) / steps.total);
}

/**
 * Pure selector: turns chapter progress into per-concept coverage across the
 * WHOLE game, built and planned. A built chapter is `covered` once completed,
 * `current` while active, `upcoming` otherwise; a not-yet-built chapter is
 * `planned` (shown as a "SOON" signpost so players see what's ahead). The
 * current chapter earns partial credit as its steps are cleared
 * (`currentSteps`), so the tracker moves during a chapter, not only between
 * them. The percentage is over playable content so it stays motivating —
 * planned concepts are surfaced separately as `planned`.
 */
export function summarizeCurriculum(
  completedChapterIds: string[],
  currentChapterId: string | null,
  language: LanguageId = "go",
  currentSteps?: StepProgress | null,
): CurriculumSummary {
  const done = new Set(completedChapterIds);
  let covered = 0;
  let playable = 0;
  let planned = 0;

  const acts = curriculumFor(language).map((act): ActSummary => {
    let actBuilt = 0;
    let actDone = 0;

    const chapters = act.chapters.map((chapter): ChapterSummary => {
      const built = Boolean(chapter.chapterId);
      let status: ConceptStatus;
      let coveredConcepts = 0;
      if (!built) {
        status = "planned";
        planned += chapter.concepts.length;
      } else {
        actBuilt += 1;
        playable += chapter.concepts.length;
        if (done.has(chapter.chapterId!)) {
          status = "covered";
          actDone += 1;
          coveredConcepts = chapter.concepts.length;
        } else if (chapter.chapterId === currentChapterId) {
          status = "current";
          coveredConcepts = partialConcepts(chapter.concepts.length, currentSteps);
        } else {
          status = "upcoming";
        }
        covered += coveredConcepts;
      }
      return {
        key: chapter.key,
        title: chapter.title,
        concepts: chapter.concepts,
        isBoss: Boolean(chapter.isBoss),
        status,
        coveredConcepts,
      };
    });

    return {
      act: act.act,
      name: act.name,
      covered: actBuilt > 0 && actDone === actBuilt,
      chapters,
    };
  });

  const pct = playable === 0 ? 0 : Math.round((covered / playable) * 100);
  return { covered, playable, planned, pct, acts };
}
