// ── The Field Manual ──
// Dr. Eleanor Reeves wrote a Go primer for her students. Held in this facility
// before Maya, she tore it into chapters and hid one in every place she was
// moved through — for whoever they put in her cell next. Each intro level
// hides exactly one chapter; the player finds it before reaching the terminal
// and reads it (the beginner notes, typeset as a book) before the round.

import type { LanguageId } from "@/types/game";

export interface BookInfo {
  title: string;
  subtitle: string;
  author: string;
  edition: string;
  dedication: string;
  signature: string;
}

export const BOOK: BookInfo = {
  title: "GO",
  subtitle: "A FIELD MANUAL",
  author: "E. REEVES",
  edition: "second printing · annotated",
  dedication: "for whoever they put in this cell next.",
  signature: "— e.r.",
};

// One Reeves book, re-skinned per language: same chapters, same hiding places,
// the primer she wrote for the language the player is learning.
const BOOK_TITLES: Record<LanguageId, string> = {
  go: "GO",
  python: "PYTHON",
  javascript: "JAVASCRIPT",
};

/** Story text that names the manual ("'go: a field manual'") names the player's language's manual instead. */
export function localizeManualMention(text: string, language: LanguageId): string {
  if (language === "go") return text;
  return text.replace(/'go: a field manual'/g, `'${BOOK_TITLES[language].toLowerCase()}: a field manual'`);
}

export function bookFor(language: LanguageId = "go"): BookInfo {
  return language === "go" ? BOOK : { ...BOOK, title: BOOK_TITLES[language] };
}

export interface BookChapter {
  /** Challenge id this chapter teaches (key into beginner notes). */
  challengeId: string;
  /** 1-based chapter number in the manual. */
  number: number;
  numeral: string;
  /** Chapter title as printed in the book. */
  title: string;
  /** Where Reeves hid it — shown on the found card. */
  hiddenIn: string;
  /** Reeves' handwritten note in the margin of the first page. */
  marginNote: string;
  /** Maya's thought when she finds it (lowercase). */
  found: string;
  /** Per-language overrides where the Go wording doesn't fit (e.g. no "skeleton" outside Go). */
  byLanguage?: Partial<Record<LanguageId, Partial<Pick<BookChapter, "title" | "marginNote">>>>;
}

export const BOOK_CHAPTERS: BookChapter[] = [
  {
    challengeId: "chapter-01",
    number: 1,
    numeral: "I",
    title: "The Skeleton",
    hiddenIn: "folded into the mattress · cell b-09",
    marginNote: "start with the skeleton. everything else hangs from it.",
    found: "a book chapter, torn out and folded small. 'go: a field manual' — chapter one. someone was in this cell before me.",
    byLanguage: {
      python: { title: "The First Line", marginNote: "one line that runs. everything else follows from it." },
      javascript: { title: "The First Line", marginNote: "one line that runs. everything else follows from it." },
    },
  },
  {
    challengeId: "chapter-02",
    number: 2,
    numeral: "II",
    title: "Loops & Branches",
    hiddenIn: "taped inside the light housing · cell b-09",
    marginNote: "the keypad counts. so can you.",
    found: "chapter two. same handwriting in the margins. whoever hid these was learning exactly what i need.",
  },
  {
    challengeId: "chapter-03",
    number: 3,
    numeral: "III",
    title: "Functions",
    hiddenIn: "behind the hatch grille · corridor b",
    marginNote: "a function is a door you can open twice.",
    found: "chapter three, behind the grille. they came this way too.",
  },
  {
    challengeId: "boss-01",
    number: 4,
    numeral: "IV",
    title: "Weapon Systems",
    hiddenIn: "under the bunk · cell b-10",
    marginNote: "when the lock cycles, don't chase it. predict it.",
    found: "chapter four, in b-10. reeves' handwriting. it was her all along — she hid them for whoever they put in her cell next.",
  },
  {
    challengeId: "chapter-04",
    number: 5,
    numeral: "V",
    title: "Maps & Sets",
    hiddenIn: "behind the rack · surveillance room",
    marginNote: "the roster is a map. keys first, then values.",
    found: "chapter five. reeves said it would be here. maps — keys and values.",
  },
  {
    challengeId: "chapter-04.2",
    number: 6,
    numeral: "VI",
    title: "Strings & Runes",
    hiddenIn: "inside the relay cabinet · comms room",
    marginNote: "they read our words. make the words unreadable.",
    found: "chapter six. the last one she hid. strings, runes, the cipher.",
  },
];

export function bookChapterFor(challengeId: string, language: LanguageId = "go"): BookChapter | null {
  const chapter = BOOK_CHAPTERS.find((c) => c.challengeId === challengeId) ?? null;
  if (!chapter || language === "go") return chapter;
  return {
    ...chapter,
    ...chapter.byLanguage?.[language],
    found: localizeManualMention(chapter.found, language),
  };
}

/** The chapter a level hands over: "chapter-01-intro" → chapter for "chapter-01". */
export function bookChapterForLevel(levelId: string, language: LanguageId = "go"): BookChapter | null {
  const challengeId = levelId.replace(/-(intro|complete)$/, "").replace(/^chapter-04-2$/, "chapter-04.2");
  return bookChapterFor(challengeId, language);
}
