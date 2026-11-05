import { CURRICULUM_ACTS } from "./curriculum";
import { classroomChaptersFor } from "./classroom";
import type { LanguageId } from "@/types/game";

/**
 * What the landing page shows about the curriculum, derived from the same
 * roadmap the in-game Concept Tracker uses so the site can't drift from the
 * game (act count, chapter count, what's playable). Plain data — built on the
 * server and handed to the client landing page as props.
 */
export interface LandingChapter {
  title: string;
  concepts: string[];
  isBoss: boolean;
  playable: boolean;
}

export interface LandingAct {
  act: string;
  name: string;
  chapters: LandingChapter[];
}

export interface LandingCurriculum {
  acts: LandingAct[];
  /** Acts in the full Go curriculum (built + planned). */
  actCount: number;
  /** Chapters in the full Go curriculum, bosses excluded. */
  chapterCount: number;
  /** Chapters (bosses included) a student can play today, per language — what the teacher dashboard counts. */
  playableByLanguage: Record<LanguageId, number>;
}

const ACRONYMS = new Set(["HTTP", "JSON", "CLI", "SQL", "URL", "HTML", "API", "I/O", "IO"]);

/** "HTTP CLIENT" → "HTTP Client", "VASIK · TERMINAL 1" → "Vasik · Terminal 1". */
export function displayTitle(raw: string): string {
  return raw
    .split(" ")
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function landingCurriculum(): LandingCurriculum {
  const acts = CURRICULUM_ACTS.map((act) => ({
    act: act.act,
    name: displayTitle(act.name),
    chapters: act.chapters.map((chapter) => ({
      title: displayTitle(chapter.title),
      concepts: chapter.concepts,
      isBoss: !!chapter.isBoss,
      playable: !!chapter.chapterId,
    })),
  }));
  return {
    acts,
    actCount: acts.length,
    chapterCount: acts.reduce((n, act) => n + act.chapters.filter((c) => !c.isBoss).length, 0),
    playableByLanguage: {
      go: classroomChaptersFor("go").length,
      python: classroomChaptersFor("python").length,
      javascript: classroomChaptersFor("javascript").length,
    },
  };
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** 9 → "nine" (falls back to digits past twelve). */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
