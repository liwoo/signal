import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  checkMarks,
  gradeExplanation,
  informedBonus,
  isFinal,
  kiraVerdictFor,
  looksLikeCode,
  resolveVerdict,
  storyBranchFor,
  studyXP,
  tallyXP,
  usesCopy,
} from "./allegiance";
import { ALLEGIANCE, FIX_EXPECTED_OUTPUT } from "@/data/challenges/boss-03";
import { getLanguageService } from "@/lib/lang/registry";
import { usePyodideInNode } from "@/lib/python/node-backend";
import { replaceMain } from "@/lib/go/harness";

describe("study: marking the suspect lines", () => {
  it("needs both the mutation and the alias, and nothing innocent", () => {
    expect(checkMarks([2, 3], [2, 3]).correct).toBe(true);
    expect(checkMarks([3], [2, 3])).toMatchObject({ correct: false, missing: [2] });
    expect(checkMarks([0, 2, 3], [2, 3])).toMatchObject({ correct: false, extra: [0] });
    // Python: marking where the view is created is fair game.
    expect(checkMarks([1, 3, 4], [3, 4], [1]).correct).toBe(true);
  });

  it("charges nothing for two misses, then 25 each down to 50", () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(studyXP)).toEqual([100, 100, 100, 75, 50, 50, 50]);
  });
});

describe("verdict: grading the explanation", () => {
  const passes = [
    // The spec's own plain-language example: markers 1 + 2, no jargon.
    "every frame points at the same bytes and she keeps flipping those bytes after sending, so nothing already sent stays true.",
    "The slice she sends shares the backing array with data. Because the loop keeps mutating data after each send, the frames the receiver already has change. She should copy into a new slice before sending.",
    "it sends a memoryview, which is a view onto the same bytearray, so when the next iterations flip bytes the earlier frames change too. bytes() would copy it.",
    "subarray doesn't copy — it's a window into the same buffer. she never makes a copy, so every frame she sent gets rewritten by the later xors.",
    "There's no copy made: each frame is an alias of the original data, so they all end up identical to the final state.",
  ];
  for (const text of passes) {
    it(`passes: ${text.slice(0, 50)}…`, () => {
      const g = gradeExplanation(text);
      expect(g.passes, JSON.stringify(g.markers)).toBe(true);
    });
  }

  const fails = [
    "alias mutation copy shared array",
    "i don't trust her.",
    "the code is broken and corrupts stuff",
    "it uses xor which is weak encryption, anyone can reverse it so it's not secure.",
    "she's a spy, that's why the frames are bad.",
  ];
  for (const text of fails) {
    it(`fails: ${text}`, () => {
      expect(gradeExplanation(text).passes).toBe(false);
    });
  }

  it("refuses code instead of words", () => {
    const code = "for i := range data {\n  frame := make([]byte, len(data)-i)\n  copy(frame, data[i:])\n}";
    expect(looksLikeCode(code)).toBe(true);
    expect(gradeExplanation(code).passes).toBe(false);
    expect(looksLikeCode("she never copies the frame; it's the same array, so later flips change it.")).toBe(false);
  });
});

describe("verdict: outcomes", () => {
  it("follows the spec's outcome matrix", () => {
    expect(resolveVerdict({ passes: true, verdict: "reject", attempt: 1 })).toBe("informed-reject");
    expect(resolveVerdict({ passes: true, verdict: "trust", attempt: 1 })).toBe("challenge");
    expect(resolveVerdict({ passes: true, verdict: "trust", attempt: 1, confirmingTrust: true })).toBe("eyes-open-trust");
    expect(resolveVerdict({ passes: false, verdict: "reject", attempt: 1 })).toBe("lucky-guess");
    expect(resolveVerdict({ passes: false, verdict: "reject", attempt: 2 })).toBe("unproven-reject");
    expect(resolveVerdict({ passes: false, verdict: "trust", attempt: 1 })).toBe("wrong-trust");
    expect(isFinal("challenge")).toBe(false);
    expect(isFinal("lucky-guess")).toBe(false);
    expect(isFinal("wrong-trust")).toBe(true);
  });

  it("maps outcomes to the saved verdict and Act IV branch", () => {
    expect(kiraVerdictFor("informed-reject")).toBe("rejected");
    expect(kiraVerdictFor("unproven-reject")).toBe("rejected");
    expect(kiraVerdictFor("eyes-open-trust")).toBe("trusted");
    expect(kiraVerdictFor("wrong-trust")).toBe("trusted");
    expect(storyBranchFor("trusted")).toBe("a");
    expect(storyBranchFor("rejected")).toBe("b");
  });

  it("keeps the bonus whole for 300s, then decays 50 a minute to 200", () => {
    expect([0, 300, 301, 360, 361, 480, 900].map(informedBonus)).toEqual([400, 400, 350, 350, 300, 250, 200]);
  });

  it("tallies XP: only the informed read earns the bonus and tokens", () => {
    expect(tallyXP({ wrongMarks: 0, outcome: "informed-reject", verdictSeconds: 60, revisions: 0, redeemed: true })).toMatchObject({
      total: 100 + 500 + 400 + 150,
      tokens: 2,
    });
    expect(tallyXP({ wrongMarks: 3, outcome: "wrong-trust", verdictSeconds: 60, revisions: 0, redeemed: false })).toMatchObject({
      total: 75 + 500,
      bonus: 0,
      tokens: 0,
    });
    expect(tallyXP({ wrongMarks: 0, outcome: "unproven-reject", verdictSeconds: 60, revisions: 1, redeemed: false }).total).toBe(590);
  });
});

// ── The redemption harness is a lie detector in every language ──

const hasGo = (() => {
  try {
    execFileSync("go", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function runGoLocally(code: string): string {
  const dir = mkdtempSync(join(tmpdir(), "signal-kira-"));
  try {
    writeFileSync(join(dir, "main.go"), code);
    return execFileSync("go", ["run", "main.go"], { cwd: dir, encoding: "utf8", timeout: 60000 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("redemption harness", () => {
  beforeAll(() => {
    usePyodideInNode();
  });

  for (const language of ["javascript", "python"] as const) {
    const r = ALLEGIANCE[language];
    it(`${language}: Kira's encoder is caught; the copy fix passes`, async () => {
      const lang = getLanguageService(language);
      const kira = await lang.run({ code: r.fixStarter, harness: r.fixHarness });
      expect(kira.error).toBe("");
      expect(kira.stdout).toContain("CORRUPTED");
      const fixed = await lang.run({ code: r.fixReference, harness: r.fixHarness });
      expect(fixed.error).toBe("");
      expect(fixed.stdout.trim()).toBe(FIX_EXPECTED_OUTPUT);
      expect(usesCopy(r.fixReference, r.fixUsesAnyOf)).toBe(true);
      expect(usesCopy(r.fixStarter, r.fixUsesAnyOf)).toBe(false);
    }, 30000);
  }

  it.skipIf(!hasGo)("go: Kira's encoder is caught; the copy fix passes", () => {
    const r = ALLEGIANCE.go;
    expect(runGoLocally(replaceMain(r.fixStarter, r.fixHarness))).toContain("frame 0: EF DF CF BF");
    expect(runGoLocally(replaceMain(r.fixReference, r.fixHarness)).trim()).toBe(FIX_EXPECTED_OUTPUT);
    expect(usesCopy(r.fixReference, r.fixUsesAnyOf)).toBe(true);
    expect(usesCopy(r.fixStarter, r.fixUsesAnyOf)).toBe(false);
  }, 60000);
});
