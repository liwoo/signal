// Content contract for every realized chapter in each non-Go language: Maya's answer banks,
// zen rules, and the field-manual notes must exist for every step, speak in
// Maya's voice, contain no Go, and drive the real engine end to end.

import { beforeAll, describe, expect, it } from "vitest";
import { realizeChallenge } from "@/data/challenges/realizations";
import { callMayaEngine, callMayaEngineAsync, getStepBank, type StepTestConfig } from "@/lib/ai/engine";
import { analyzeZen, getZenRules } from "@/lib/game/zen";
import { ZEN_EXAMPLES } from "@/data/zen-examples";
import { getBeginnerNotes } from "@/data/beginner-notes";
import { bookChapterFor, bookFor } from "@/data/book";
import { usePyodideInNode } from "@/lib/python/node-backend";
import { installLocalRustc } from "@/lib/rust/node-backend";
import { chaptersRealizedIn, HARDCODED, NON_GO_LANGUAGES, SOLUTIONS } from "./fixtures";
import type { ChallengeStep, LanguageId } from "@/types/game";

const GOISMS = /fmt\.|func main|package main|:=|go vet|gofmt|\bgo (program|code|compiler|file)\b|\bgolang\b/i;
const LANGS = NON_GO_LANGUAGES;
const PREFIX: Record<(typeof LANGS)[number], string> = { javascript: "js_", python: "py_", rust: "rs_" };

// Rust compiles with a local rustc in tests (no network); without one, the
// steps that have to actually run are skipped.
const HAS_RUSTC = installLocalRustc();
const cannotRun = (language: LanguageId) => language === "rust" && !HAS_RUSTC;

const STEPS = (language: LanguageId): ChallengeStep[] =>
  chaptersRealizedIn(language).flatMap((c) => realizeChallenge(c, language).steps);

const BROKEN: Record<(typeof LANGS)[number], string> = {
  javascript: `console.log("Hello World";`,
  python: `print("Hello World"`,
  rust: `fn main() {\n    println!("Hello World";\n}`,
};

function stepTest(step: ChallengeStep): StepTestConfig {
  return {
    testHarness: step.testHarness,
    expectedOutput: step.expectedOutput,
    requiredCode: step.requiredCode,
    compileModule: step.compileModule,
  };
}

/** Maya's voice: no exclamation marks, no bullet lists, no bold. */
function expectMayaVoice(text: string, where: string) {
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/``[\s\S]*?``/g, "").replace(/`[^`]*`/g, "");
  expect(prose, where).not.toMatch(/!(?!=)/);
  expect(prose, where).not.toMatch(/^\s*[-*•] /m);
  expect(prose, where).not.toMatch(/\*\*/);
}

beforeAll(() => {
  usePyodideInNode();
});

describe.each(LANGS)("Maya's banks · %s", (language) => {
  for (const step of STEPS(language)) {
    describe(step.id, () => {
      it("has a complete bank in maya's voice with no go in it", () => {
        const bank = getStepBank(step.id, language);
        expect(bank, "bank missing").toBeDefined();
        expect(bank!.intro.length).toBeGreaterThan(20);
        expect(bank!.correctResponse).toContain("||COMPLETE||");
        expect(bank!.conceptFAQ.length).toBeGreaterThanOrEqual(3);
        expect(bank!.genericWrong.length).toBeGreaterThanOrEqual(2);
        expect(bank!.stuckResponses.length).toBeGreaterThanOrEqual(2);
        expect(bank!.deflections.length).toBeGreaterThanOrEqual(1);
        const all = [
          bank!.intro,
          bank!.correctResponse,
          ...bank!.conceptFAQ.map((c) => c.response),
          ...bank!.codePatterns.map((p) => p.response),
          ...(bank!.outputPatterns ?? []).map((p) => p.response),
          ...bank!.genericWrong,
          ...bank!.rushDialogue,
          ...bank!.stuckResponses,
          ...bank!.deflections,
        ];
        for (const line of all) {
          expect(line, line).not.toMatch(GOISMS);
          expectMayaVoice(line, line);
        }
      });

      it("greets with the intro and answers a concept question", () => {
        const bank = getStepBank(step.id, language)!;
        expect(callMayaEngine(step.id, "hi", false, true, false, 0, language).reply).toBe(bank.intro);
        const chat = callMayaEngine(step.id, "how do i print", false, false, false, 0, language);
        expect(chat.reply).not.toMatch(/signal lost/);
        expect(chat.isComplete).toBe(false);
      });

      it.skipIf(cannotRun(language))("completes on the reference solution", async () => {
        const res = await callMayaEngineAsync(step.id, SOLUTIONS[language][step.id], true, false, false, 0, stepTest(step), language);
        expect(res.reply).not.toContain("||COMPLETE||");
        expect(res.isComplete, res.reply).toBe(true);
      }, 30000);

      it("rejects a broken program with a line number", async () => {
        const res = await callMayaEngineAsync(step.id, BROKEN[language], true, false, false, 0, stepTest(step), language);
        expect(res.isComplete).toBe(false);
        expect(res.reply).toMatch(/line \d+/);
      }, 30000);

      const shortcut = HARDCODED[language][step.id];
      if (shortcut) {
        it.skipIf(cannotRun(language))("rejects the hardcoded shortcut", async () => {
          const res = await callMayaEngineAsync(step.id, shortcut, true, false, false, 0, stepTest(step), language);
          expect(res.isComplete).toBe(false);
        }, 30000);
      }
    });
  }
});

describe.each(LANGS)("zen rules · %s", (language) => {
  const steps = STEPS(language);

  it("coaches every step except the rewrite", () => {
    for (const step of steps) {
      if (step.id === "chapter-02:rewrite") continue;
      expect(getZenRules(step.id, language).length, step.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses unique, prefixed rule ids with a before/after example each", () => {
    const seen = new Set<string>();
    for (const step of steps) {
      for (const rule of getZenRules(step.id, language)) {
        expect(rule.id.startsWith(PREFIX[language]), rule.id).toBe(true);
        expect(seen.has(rule.id), `duplicate ${rule.id}`).toBe(false);
        seen.add(rule.id);
        expect(ZEN_EXAMPLES[rule.id], `example for ${rule.id}`).toBeDefined();
        expect(rule.bonusXP).toBeGreaterThan(0);
        for (const line of [rule.jolt, rule.suggestion]) {
          expect(line, rule.id).not.toMatch(GOISMS);
          expectMayaVoice(line, rule.id);
        }
      }
    }
  });

  it("analyzes the reference solutions without throwing", () => {
    for (const step of steps) {
      const result = analyzeZen(step.id, SOLUTIONS[language][step.id], undefined, language);
      expect(result.bonusXP).toBeGreaterThanOrEqual(0);
    }
  });
});

describe.each(LANGS)("field manual · %s", (language) => {
  const book = bookFor(language);

  it("is re-skinned for the language", () => {
    expect(book.title).toBe(language.toUpperCase());
    expect(bookChapterFor("chapter-01", language)!.found).toContain(`'${language}: a field manual'`);
  });

  for (const id of [...chaptersRealizedIn(language).map((c) => c.id), "boss-01"]) {
    it(`${id}: has notes with no go in the code`, () => {
      const notes = getBeginnerNotes(id, language);
      expect(notes, "notes missing").not.toBeNull();
      expect(notes!.notesBlocks?.length ?? 0, "quick-reference notesBlocks").toBeGreaterThan(0);
      for (const blocks of [notes!.blocks, notes!.notesBlocks ?? []]) {
        const sections = [...new Set(blocks.map((b) => b.section))].sort((a, b) => a - b);
        expect(sections, "sections run 0..n").toEqual(sections.map((_, i) => i));
        for (const block of blocks) {
          expect(block.type, "no go-specific diagrams").not.toBe("diagram");
          if (block.type === "code") {
            expect(block.content, block.content).not.toMatch(GOISMS);
            for (const hs of block.hotspots ?? []) {
              expect(block.content.includes(hs.text), `hotspot "${hs.text}" must appear in its code`).toBe(true);
            }
          } else {
            expect(block.content, block.content).not.toMatch(/fmt\.|func main|package main/);
          }
        }
      }
    });
  }
});
