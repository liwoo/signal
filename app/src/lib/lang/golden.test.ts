// Golden tests for every realized chapter across languages: every step's reference solution,
// run through the language's real backend (in-process JS, Pyodide for Python,
// a local rustc for Rust),
// must print exactly the step's expectedOutput and satisfy requiredCode — and
// the obvious hardcoded shortcut must not.

import { beforeAll, describe, expect, it } from "vitest";
import { boss01 } from "@/data/challenges/boss-01";
import { realizeAdventureLevel, realizeBossLevel, realizeChallenge, isChallengeAvailable } from "@/data/challenges/realizations";
import { ALL_LEVELS } from "@/lib/adventure/levels";
import { LOCKMASTER_ARENA } from "@/lib/adventure/boss-levels";
import { getLanguageService } from "./registry";
import { usePyodideInNode } from "@/lib/python/node-backend";
import { installLocalRustc } from "@/lib/rust/node-backend";
import type { Challenge, ChallengeStep, LanguageId } from "@/types/game";
import { chaptersRealizedIn, HARDCODED, NON_GO_LANGUAGES, REALIZED_CHAPTERS, SOLUTIONS } from "./fixtures";

const norm = (s: string) => s.trim().replace(/[·•∙]/g, "-");

// Rust compiles with a local rustc in tests; without one its run checks skip.
const HAS_RUSTC = installLocalRustc();
const cannotRun = (language: LanguageId) => language === "rust" && !HAS_RUSTC;

// Paste is disabled in the editor, so every character a step requires the
// player to print must be on an ordinary keyboard. (Playtest 2 Nov 2026: the
// `·` in Ch1's "CELL B-09 · SUBLEVEL 3" stopped players cold.)
describe.each(["go", ...NON_GO_LANGUAGES] as const)("required output is typeable · %s", (language) => {
  it("every realized expectedOutput is printable ASCII", () => {
    for (const c of [...chaptersRealizedIn(language), boss01]) {
      for (const step of realizeChallenge(c, language).steps) {
        for (const text of [step.expectedOutput, step.expectedBehavior]) {
          if (!text || text === "valid-go-scaffold") continue;
          expect(text, `${step.id} (${language})`).toMatch(/^[\x20-\x7E\n\t]*$/);
        }
      }
    }
  });
});

async function runStep(language: LanguageId, step: ChallengeStep, code: string) {
  const lang = getLanguageService(language);
  return lang.run({ code, harness: step.testHarness, module: step.compileModule });
}

function passesRequired(language: LanguageId, step: ChallengeStep, code: string): boolean {
  const checked = getLanguageService(language).codeForRequiredCheck(code);
  return (step.requiredCode ?? []).every((p) => checked.includes(p));
}

beforeAll(() => {
  usePyodideInNode();
});

describe.each(NON_GO_LANGUAGES)("realized chapters in %s", (language) => {
  const solutions = SOLUTIONS[language];
  const CHAPTERS: Challenge[] = chaptersRealizedIn(language);

  it("realizes at least Act I", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(expect.arrayContaining(["chapter-01", "chapter-02", "chapter-03"]));
  });

  it("realizes every chapter, including the boss", () => {
    for (const c of [...CHAPTERS, boss01]) {
      expect(isChallengeAvailable(c.id, language)).toBe(true);
      expect(() => realizeChallenge(c, language)).not.toThrow();
    }
  });

  it("keeps the story spine — ids, stakes, XP, events, timers are untouched", () => {
    for (const c of CHAPTERS) {
      const r = realizeChallenge(c, language);
      expect(r.steps.map((s) => s.id)).toEqual(c.steps.map((s) => s.id));
      expect(r.timer).toEqual(c.timer);
      r.steps.forEach((s, i) => {
        expect(s.xp).toEqual(c.steps[i].xp);
        expect(s.events).toEqual(c.steps[i].events);
        expect(s.rushMode).toEqual(c.steps[i].rushMode);
        expect(s.stake).toEqual(c.steps[i].stake);
      });
    }
  });

  it("names this language's field manual in the story levels", () => {
    for (const level of ALL_LEVELS) {
      const text = JSON.stringify(realizeAdventureLevel(level, language));
      expect(text, level.id).not.toMatch(/'go: a field manual'/);
      expect(text, level.id).not.toMatch(/\bmaps — |\brunes?\b/);
    }
    expect(JSON.stringify(realizeAdventureLevel(ALL_LEVELS.find((l) => l.id === "chapter-01-intro")!, language))).toContain(
      `'${language}: a field manual'`,
    );
  });

  it("leaks no Go into the player-facing step text", () => {
    for (const c of CHAPTERS) {
      for (const s of realizeChallenge(c, language).steps) {
        const text = [s.brief, ...s.hints.map((h) => h.text), ...(s.quickCheck?.items ?? []).flatMap((q) => [q.question, q.answer])].join("\n");
        expect(text, s.id).not.toMatch(/fmt\.|func main|package main|:=|\bgo program\b/);
      }
    }
  });

  for (const c of CHAPTERS) {
    for (const spine of c.steps) {
      it.skipIf(cannotRun(language))(`${spine.id}: reference solution passes`, async () => {
        const step = realizeChallenge(c, language).steps.find((s) => s.id === spine.id)!;
        const code = solutions[step.id];
        expect(code, `missing ${language} solution`).toBeDefined();
        expect(step.expectedOutput, "every non-Go step grades by output").toBeDefined();

        const lang = getLanguageService(language);
        expect(lang.diagnose(code).filter((d) => d.severity === "error")).toEqual([]);
        const res = await runStep(language, step, code);
        expect(res.error).toBe("");
        expect(res.status).toBe("ok");
        expect(norm(res.stdout)).toBe(norm(step.expectedOutput!));
        expect(passesRequired(language, step, code)).toBe(true);
      }, 30000);
    }
  }

  for (const [stepId, code] of Object.entries(HARDCODED[language])) {
    it.skipIf(cannotRun(language))(`${stepId}: the hardcoded shortcut is rejected`, async () => {
      const c = CHAPTERS.find((ch) => stepId.startsWith(ch.id + ":"))!;
      const step = realizeChallenge(c, language).steps.find((s) => s.id === stepId)!;
      const res = await runStep(language, step, code!);
      const outputOk = res.status === "ok" && norm(res.stdout) === norm(step.expectedOutput!);
      expect(outputOk && passesRequired(language, step, code!)).toBe(false);
    }, 30000);
  }

  describe("LOCKMASTER rearm phases", () => {
    const arena = realizeBossLevel(LOCKMASTER_ARENA, language);
    const fixes: Record<string, (starter: string) => string> = {
      sight: (s) => s.replace(/damage = 0/, "damage = 12").replace(/(fireRate|fire_rate) = 0/, "$1 = 500").replace(/reach = 0/, "reach = 6"),
      charge: (s) =>
        language === "python"
          ? s.replace("pass  # add 90 to rate each capacitor", "rate += 90")
          : s.replace("// add 90 to rate each capacitor", "rate += 90;"),
      combo: (s) =>
        language === "javascript"
          ? s.replace("// add each mod to total", "for (const m of mods) total += m;")
          : language === "rust"
            ? s.replace("// add each mod to total", "for m in mods {\n        total += m;\n    }")
            : s.replace("# add each mod to total", "for m in mods:\n        total += m"),
    };

    for (const phase of arena.boss!.phases) {
      it.skipIf(cannotRun(language))(`${phase.id}: the starter runs but misses; the fix arms the weapon`, async () => {
        const lang = getLanguageService(language);
        expect(phase.starterCode).not.toMatch(/package main|fmt\./);
        const starter = await lang.run({ code: phase.starterCode });
        expect(starter.error).toBe("");
        expect(starter.stdout.trim()).not.toBe(phase.expectedOutput);
        const fixed = await lang.run({ code: fixes[phase.id](phase.starterCode) });
        expect(fixed.error).toBe("");
        expect(fixed.stdout.trim()).toBe(phase.expectedOutput);
      }, 30000);
    }
  });
});

describe("Go is the spine's own realization", () => {
  it("returns every Go chapter unchanged", () => {
    for (const c of [...REALIZED_CHAPTERS, boss01]) expect(realizeChallenge(c, "go")).toBe(c);
    expect(realizeBossLevel(LOCKMASTER_ARENA, "go")).toBe(LOCKMASTER_ARENA);
  });
});
