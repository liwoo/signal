import { CURRICULUM_ACTS } from "@/data/curriculum";

export type ConceptStatus = "covered" | "current" | "upcoming" | "planned";

export interface ChapterSummary {
  key: string;
  title: string;
  concepts: string[];
  isBoss: boolean;
  status: ConceptStatus;
}

export interface ActSummary {
  act: string;
  name: string;
  /** True once every built chapter in the act is complete. */
  covered: boolean;
  chapters: ChapterSummary[];
}

export interface CurriculumSummary {
  /** Concepts the player has covered (concepts of completed chapters). */
  covered: number;
  /** Concepts in built/playable chapters. */
  playable: number;
  /** Concepts in planned (not-yet-built) chapters. */
  planned: number;
  /** covered / playable as a 0–100 integer (progress through what's playable). */
  pct: number;
  acts: ActSummary[];
}

/**
 * Pure selector: turns chapter progress into per-concept coverage across the
 * WHOLE game, built and planned. A built chapter is `covered` once completed,
 * `current` while active, `upcoming` otherwise; a not-yet-built chapter is
 * `planned` (shown as a "SOON" signpost so players see what's ahead). The
 * percentage is over playable content so it stays motivating — planned concepts
 * are surfaced separately as `planned`.
 */
export function summarizeCurriculum(
  completedChapterIds: string[],
  currentChapterId: string | null,
): CurriculumSummary {
  const done = new Set(completedChapterIds);
  let covered = 0;
  let playable = 0;
  let planned = 0;

  const acts = CURRICULUM_ACTS.map((act): ActSummary => {
    let actBuilt = 0;
    let actDone = 0;

    const chapters = act.chapters.map((chapter): ChapterSummary => {
      const built = Boolean(chapter.chapterId);
      let status: ConceptStatus;
      if (!built) {
        status = "planned";
        planned += chapter.concepts.length;
      } else {
        actBuilt += 1;
        playable += chapter.concepts.length;
        if (done.has(chapter.chapterId!)) {
          status = "covered";
          actDone += 1;
          covered += chapter.concepts.length;
        } else if (chapter.chapterId === currentChapterId) {
          status = "current";
        } else {
          status = "upcoming";
        }
      }
      return {
        key: chapter.key,
        title: chapter.title,
        concepts: chapter.concepts,
        isBoss: Boolean(chapter.isBoss),
        status,
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
