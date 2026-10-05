import { describe, it, expect } from "vitest";
import { summarizeCurriculum } from "./curriculum";
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
