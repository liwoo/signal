// Golden tests for Act I across languages: every step's reference solution,
// run through the language's real backend (in-process JS, Pyodide for Python),
// must print exactly the step's expectedOutput and satisfy requiredCode — and
// the obvious hardcoded shortcut must not.

import { beforeAll, describe, expect, it } from "vitest";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { boss01 } from "@/data/challenges/boss-01";
import { realizeAdventureLevel, realizeBossLevel, realizeChallenge, isChallengeAvailable } from "@/data/challenges/realizations";
import { ALL_LEVELS } from "@/lib/adventure/levels";
import { LOCKMASTER_ARENA } from "@/lib/adventure/boss-levels";
import { getLanguageService } from "./registry";
import { usePyodideInNode } from "@/lib/python/node-backend";
import type { Challenge, ChallengeStep, LanguageId } from "@/types/game";
import { HARDCODED, SOLUTIONS } from "./act1.fixtures";

const norm = (s: string) => s.trim().replace(/[·•∙]/g, ".");

const ACT_1: Challenge[] = [chapter01, chapter02, chapter03];

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

describe.each(["javascript", "python"] as const)("Act I in %s", (language) => {
  const solutions = SOLUTIONS[language];

  it("realizes every Act I chapter, including the boss", () => {
    for (const c of [...ACT_1, boss01]) {
      expect(isChallengeAvailable(c.id, language)).toBe(true);
      expect(() => realizeChallenge(c, language)).not.toThrow();
    }
  });

  it("keeps the story spine — ids, stakes, XP, events, timers are untouched", () => {
    for (const c of ACT_1) {
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
    }
    expect(JSON.stringify(realizeAdventureLevel(ALL_LEVELS.find((l) => l.id === "chapter-01-intro")!, language))).toContain(
      `'${language}: a field manual'`,
    );
  });

  it("leaks no Go into the player-facing step text", () => {
    for (const c of ACT_1) {
      for (const s of realizeChallenge(c, language).steps) {
        const text = [s.brief, ...s.hints.map((h) => h.text), ...(s.quickCheck?.items ?? []).flatMap((q) => [q.question, q.answer])].join("\n");
        expect(text, s.id).not.toMatch(/fmt\.|func main|package main|:=|\bgo program\b/);
      }
    }
  });

  for (const c of ACT_1) {
    for (const spine of c.steps) {
      it(`${spine.id}: reference solution passes`, async () => {
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
    it(`${stepId}: the hardcoded shortcut is rejected`, async () => {
      const c = ACT_1.find((ch) => stepId.startsWith(ch.id + ":"))!;
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
        language === "javascript"
          ? s.replace("// add 90 to rate each capacitor", "rate += 90;")
          : s.replace("pass  # add 90 to rate each capacitor", "rate += 90"),
      combo: (s) =>
        language === "javascript"
          ? s.replace("// add each mod to total", "for (const m of mods) total += m;")
          : s.replace("# add each mod to total", "for m in mods:\n        total += m"),
    };

    for (const phase of arena.boss!.phases) {
      it(`${phase.id}: the starter runs but misses; the fix arms the weapon`, async () => {
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
    for (const c of [...ACT_1, boss01]) expect(realizeChallenge(c, "go")).toBe(c);
    expect(realizeBossLevel(LOCKMASTER_ARENA, "go")).toBe(LOCKMASTER_ARENA);
  });
});
