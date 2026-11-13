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
      rust: classroomChaptersFor("rust").length,
    },
  };
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** 9 → "nine" (falls back to digits past twelve). */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** "19.99" over 25 chapters → "0.80" (what one chapter costs in the full license). */
export function pricePerChapter(price: string, chapters: number): string {
  const total = Number.parseFloat(price);
  if (!Number.isFinite(total) || chapters <= 0) return price;
  return (total / chapters).toFixed(2);
}

/** What a learner can do by the end of an act, in plain language — the curriculum as outcomes. */
export interface LandingOutcome {
  act: string;
  name: string;
  /** The act's concepts, deduped, in order. */
  concepts: string[];
  /** "free" = Act I, "playable" = some chapters built, "soon" = nothing built yet. */
  status: "free" | "playable" | "soon";
}

export function landingOutcomes(curriculum: LandingCurriculum): LandingOutcome[] {
  return curriculum.acts.map((act, index) => {
    const concepts = [...new Set(act.chapters.flatMap((c) => c.concepts))];
    const anyPlayable = act.chapters.some((c) => c.playable);
    return {
      act: act.act,
      name: act.name,
      concepts,
      status: index === 0 ? "free" : anyPlayable ? "playable" : "soon",
    };
  });
}

/**
 * The mission shown on the landing page: Chapter 2's CLASSIFY step, as a player
 * would solve it in each language. The Python, JavaScript and Rust snippets must match
 * the reference solutions the golden tests run (landing.test.ts checks), so the
 * page never shows code the game wouldn't accept.
 */
export const LANDING_DEMO = {
  chapter: "Chapter 2 · Door Code",
  stake:
    "Maya's cell keypad cycles through ten access codes. Your program sorts which ones lock, warn, or open the door.",
  task: "Print each code 1–10 with its access level.",
  code: {
    go: `for i := 1; i <= 10; i++ {
	switch {
	case i <= 3:
		fmt.Println(i, "DENY")
	case i <= 6:
		fmt.Println(i, "WARN")
	case i <= 9:
		fmt.Println(i, "GRANT")
	default:
		fmt.Println(i, "OVERRIDE")
	}
}`,
    python: `for i in range(1, 11):
    if i <= 3:
        print(i, "DENY")
    elif i <= 6:
        print(i, "WARN")
    elif i <= 9:
        print(i, "GRANT")
    else:
        print(i, "OVERRIDE")`,
    javascript: `for (let i = 1; i <= 10; i++) {
  if (i <= 3) {
    console.log(i, "DENY");
  } else if (i <= 6) {
    console.log(i, "WARN");
  } else if (i <= 9) {
    console.log(i, "GRANT");
  } else {
    console.log(i, "OVERRIDE");
  }
}`,
    rust: `fn main() {
    for i in 1..=10 {
        if i <= 3 {
            println!("{} DENY", i);
        } else if i <= 6 {
            println!("{} WARN", i);
        } else if i <= 9 {
            println!("{} GRANT", i);
        } else {
            println!("{} OVERRIDE", i);
        }
    }
}`,
  } satisfies Record<LanguageId, string>,
  output: "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
  /** Maya's real success line for this step (engine bank), without the completion token. */
  reply: "the keypad's responding. all 10 codes mapped.",
};

export type LandingDemo = typeof LANDING_DEMO;

/** Everything the landing page sells with, built on the server and handed to the client page. */
export interface LandingPitch {
  curriculum: LandingCurriculum;
  outcomes: LandingOutcome[];
  demo: LandingDemo;
  /** The act count as a word, e.g. "nine". */
  actsWord: string;
  /** The full license price divided across every chapter, e.g. "0.80". */
  perChapter: string;
}
