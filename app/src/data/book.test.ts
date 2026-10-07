import { describe, it, expect } from "vitest";
import { BOOK_CHAPTERS, bookChapterFor, bookChapterForLevel } from "./book";
import { getBeginnerNotes } from "./beginner-notes";
import { ALL_LEVELS } from "@/lib/adventure/levels";

describe("the field manual", () => {
  it("numbers its chapters 1..n in order with unique numerals", () => {
    BOOK_CHAPTERS.forEach((c, i) => expect(c.number).toBe(i + 1));
    expect(new Set(BOOK_CHAPTERS.map((c) => c.numeral)).size).toBe(BOOK_CHAPTERS.length);
  });

  it("every chapter teaches a challenge that has beginner notes", () => {
    for (const c of BOOK_CHAPTERS) {
      expect(getBeginnerNotes(c.challengeId), c.challengeId).not.toBeNull();
    }
  });

  it("every intro level hands over exactly one chapter", () => {
    const intros = ALL_LEVELS.filter((l) => l.id.endsWith("-intro"));
    const seen = new Set<number>();
    for (const level of intros) {
      const chapter = bookChapterForLevel(level.id);
      expect(chapter, level.id).not.toBeNull();
      seen.add(chapter!.number);
    }
    expect(seen.size).toBe(intros.length);
    expect(bookChapterFor("nope")).toBeNull();
  });

  it("maya and reeves keep their voices", () => {
    for (const c of BOOK_CHAPTERS) {
      expect(c.found).toBe(c.found.toLowerCase());
      expect(c.found).not.toMatch(/!/);
      expect(c.marginNote).toBe(c.marginNote.toLowerCase());
    }
  });
});
