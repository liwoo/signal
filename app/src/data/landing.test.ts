import { describe, expect, it } from "vitest";
import { CURRICULUM_ACTS } from "./curriculum";
import { displayTitle, landingCurriculum } from "./landing";

describe("displayTitle", () => {
  it("keeps acronyms upper-case", () => {
    expect(displayTitle("HTTP CLIENT")).toBe("HTTP Client");
    expect(displayTitle("JSON & I/O")).toBe("JSON & I/O");
    expect(displayTitle("CLI TOOLS")).toBe("CLI Tools");
  });

  it("title-cases everything else", () => {
    expect(displayTitle("VASIK · TERMINAL 1")).toBe("Vasik · Terminal 1");
    expect(displayTitle("FIRST CONTACT")).toBe("First Contact");
  });
});

describe("landingCurriculum", () => {
  const landing = landingCurriculum();

  it("matches the in-game roadmap", () => {
    expect(landing.actCount).toBe(CURRICULUM_ACTS.length);
    const chapters = CURRICULUM_ACTS.flatMap((a) => a.chapters).filter((c) => !c.isBoss);
    expect(landing.chapterCount).toBe(chapters.length);
  });

  it("marks Act I playable and counts playable chapters per language", () => {
    expect(landing.acts[0].chapters.every((c) => c.playable)).toBe(true);
    expect(landing.playableByLanguage.go).toBeGreaterThanOrEqual(landing.playableByLanguage.python);
    expect(landing.playableByLanguage.python).toBeGreaterThan(0);
  });
});
