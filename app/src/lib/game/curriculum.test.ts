import { describe, it, expect } from "vitest";
import { partialConcepts, summarizeCurriculum } from "./curriculum";
import { CURRICULUM_ACTS, PLAYABLE_CONCEPTS, PLANNED_CONCEPTS } from "@/data/curriculum";

const allChapters = () => CURRICULUM_ACTS.flatMap((a) => a.chapters);

describe("summarizeCurriculum", () => {
  it("is 0% with every built chapter upcoming/current at the start", () => {
    const s = summarizeCurriculum([], "chapter-01");
    expect(s.covered).toBe(0);
    expect(s.pct).toBe(0);
    expect(s.playable).toBe(PLAYABLE_CONCEPTS);
    expect(s.planned).toBe(PLANNED_CONCEPTS);
    const flat = s.acts.flatMap((a) => a.chapters);
    expect(flat.find((c) => c.key === "ch1")?.status).toBe("current");
  });

  it("shows unbuilt chapters as planned so the road ahead is visible", () => {
    const s = summarizeCurriculum([], "chapter-01");
    const flat = s.acts.flatMap((a) => a.chapters);
    // ch5 (ACCESS STRUCT) is not built yet.
    expect(flat.find((c) => c.key === "ch5")?.status).toBe("planned");
    expect(s.planned).toBeGreaterThan(0);
  });

  it("marks completed chapters covered and counts their concepts", () => {
    const s = summarizeCurriculum(["chapter-01"], "chapter-02");
    const flat = s.acts.flatMap((a) => a.chapters);
    const ch1 = allChapters().find((c) => c.key === "ch1")!;
    expect(flat.find((c) => c.key === "ch1")?.status).toBe("covered");
    expect(flat.find((c) => c.key === "ch2")?.status).toBe("current");
    expect(s.covered).toBe(ch1.concepts.length);
    expect(s.pct).toBe(Math.round((ch1.concepts.length / PLAYABLE_CONCEPTS) * 100));
  });

  it("reaches 100% when every BUILT chapter is complete (planned don't count)", () => {
    const builtIds = allChapters()
      .map((c) => c.chapterId)
      .filter((id): id is string => Boolean(id));
    const s = summarizeCurriculum(builtIds, null);
    expect(s.covered).toBe(s.playable);
    expect(s.pct).toBe(100);
    // Planned concepts still exist and are surfaced separately.
    expect(s.planned).toBe(PLANNED_CONCEPTS);
  });

  it("marks an act covered only when all its built chapters are done", () => {
    const s = summarizeCurriculum(["chapter-01", "chapter-02", "chapter-03", "boss-01"], "chapter-04");
    const act1 = s.acts.find((a) => a.act === "I")!;
    expect(act1.covered).toBe(true);
    const act2 = s.acts.find((a) => a.act === "II")!;
    expect(act2.covered).toBe(false);
  });

  it("dedupes concepts so none repeats across the whole game", () => {
    const names = allChapters().flatMap((c) => c.concepts.map((n) => n.toLowerCase()));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("summarizeCurriculum · partial credit for cleared steps", () => {
  const ch1 = () => allChapters().find((c) => c.key === "ch1")!;

  it("moves off 0% once a step of the current chapter is cleared (Nov 2026 playtest)", () => {
    // Chapter 1 has 2 steps; clearing Hello World is half the chapter.
    const s = summarizeCurriculum([], "chapter-01", "go", { done: 1, total: 2 });
    const expected = Math.floor(ch1().concepts.length / 2);
    expect(s.covered).toBe(expected);
    expect(s.pct).toBeGreaterThan(0);
    const summary = s.acts.flatMap((a) => a.chapters).find((c) => c.key === "ch1")!;
    expect(summary.status).toBe("current");
    expect(summary.coveredConcepts).toBe(expected);
  });

  it("no cleared steps is still 0%", () => {
    expect(summarizeCurriculum([], "chapter-01", "go", { done: 0, total: 2 }).pct).toBe(0);
    expect(summarizeCurriculum([], "chapter-01", "go").pct).toBe(0);
  });

  it("a completed chapter counts in full and ignores step progress", () => {
    const s = summarizeCurriculum(["chapter-01"], "chapter-01", "go", { done: 0, total: 2 });
    const summary = s.acts.flatMap((a) => a.chapters).find((c) => c.key === "ch1")!;
    expect(summary.status).toBe("covered");
    expect(summary.coveredConcepts).toBe(ch1().concepts.length);
    expect(s.covered).toBe(ch1().concepts.length);
  });

  it("finishing chapter 1 is strictly more than any partial state of it", () => {
    const partial = summarizeCurriculum([], "chapter-01", "go", { done: 1, total: 2 });
    const full = summarizeCurriculum(["chapter-01"], "chapter-02", "go", { done: 0, total: 4 });
    expect(full.pct).toBeGreaterThan(partial.pct);
  });

  it("works for every language's realized concepts", () => {
    for (const lang of ["python", "javascript"] as const) {
      const s = summarizeCurriculum([], "chapter-01", lang, { done: 1, total: 2 });
      expect(s.covered).toBeGreaterThan(0);
    }
  });

  it("partialConcepts floors and clamps", () => {
    expect(partialConcepts(6, { done: 1, total: 2 })).toBe(3);
    expect(partialConcepts(3, { done: 1, total: 4 })).toBe(0);
    expect(partialConcepts(3, { done: 9, total: 4 })).toBe(3);
    expect(partialConcepts(3, { done: -1, total: 4 })).toBe(0);
    expect(partialConcepts(3, { done: 1, total: 0 })).toBe(0);
    expect(partialConcepts(3, null)).toBe(0);
  });
});
