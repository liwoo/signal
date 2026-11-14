import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CURRICULUM_ACTS } from "./curriculum";
import { chapter02 } from "./challenges/chapter-02";
import { realizeChallenge } from "./challenges/realizations";
import { SOLUTIONS } from "@/lib/lang/act1.fixtures";
import { LANGUAGE_OPTIONS } from "@/lib/lang/registry";
import {
  LANDING_DEMO,
  displayTitle,
  landingCurriculum,
  landingOutcomes,
  pricePerChapter,
} from "./landing";

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

describe("pricePerChapter", () => {
  it("divides the license price across the chapters", () => {
    expect(pricePerChapter("19.99", 25)).toBe("0.80");
    expect(pricePerChapter("9.99", 24)).toBe("0.42");
  });

  it("falls back to the price when it can't divide", () => {
    expect(pricePerChapter("free", 25)).toBe("free");
    expect(pricePerChapter("9.99", 0)).toBe("9.99");
  });
});

describe("landingOutcomes", () => {
  const outcomes = landingOutcomes(landingCurriculum());

  it("has one outcome per act, Act I free", () => {
    expect(outcomes).toHaveLength(CURRICULUM_ACTS.length);
    expect(outcomes[0].status).toBe("free");
    expect(outcomes.slice(1).some((o) => o.status === "playable")).toBe(true);
  });

  it("dedupes each act's concepts", () => {
    for (const o of outcomes) expect(new Set(o.concepts).size).toBe(o.concepts.length);
  });
});

describe("LANDING_DEMO", () => {
  const step = chapter02.steps.find((s) => s.id === "chapter-02:classify")!;

  it("shows the step's real expected output in every language", () => {
    expect(LANDING_DEMO.output).toBe(step.expectedOutput);
    for (const { id } of LANGUAGE_OPTIONS) {
      const realized = realizeChallenge(chapter02, id).steps.find((s) => s.id === step.id)!;
      expect(realized.expectedOutput, id).toBe(LANDING_DEMO.output);
    }
  });

  it("has a tab for every language", () => {
    expect(Object.keys(LANDING_DEMO.code).sort()).toEqual(LANGUAGE_OPTIONS.map((o) => o.id).sort());
  });

  it("shows the reference solutions the golden tests run", () => {
    expect(LANDING_DEMO.code.python).toBe(SOLUTIONS.python["chapter-02:classify"]);
    expect(LANDING_DEMO.code.javascript).toBe(SOLUTIONS.javascript["chapter-02:classify"]);
    expect(LANDING_DEMO.code.rust).toBe(SOLUTIONS.rust["chapter-02:classify"]);
  });

  it("uses Go's switch, the idiom the step teaches", () => {
    expect(LANDING_DEMO.code.go).toMatch(/switch \{/);
    expect(LANDING_DEMO.code.go).toMatch(/default:/);
  });

  it("quotes Maya's real success line, in her voice", () => {
    // The step's bank lives in the Go engine; the line must be quoted verbatim.
    const engine = readFileSync(join(__dirname, "../lib/ai/engine.ts"), "utf8");
    expect(engine).toContain(LANDING_DEMO.reply);
    expect(LANDING_DEMO.reply).toBe(LANDING_DEMO.reply.toLowerCase());
  });
});
