// Act III's Go spine against the real Go toolchain: every step's reference
// solution, with the step's harness swapped in for main, prints exactly the
// expectedOutput and uses what requiredCode demands — and the shortcut each
// step exists to catch does not. Skipped when `go` isn't installed (CI without
// a toolchain still runs the Python/JS goldens).

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chapter07 } from "@/data/challenges/chapter-07";
import { chapter08 } from "@/data/challenges/chapter-08";
import { chapter09 } from "@/data/challenges/chapter-09";
import { replaceMain } from "@/lib/go/harness";
import { getLanguageService } from "./registry";
import type { ChallengeStep } from "@/types/game";
import { GO_ACT3_SOLUTIONS, GO_ACT3_WRONG } from "./act3.go.fixtures";

const hasGo = (() => {
  try {
    execFileSync("go", ["version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

function runGo(code: string): { stdout: string; ok: boolean } {
  const dir = mkdtempSync(join(tmpdir(), "signal-go-"));
  try {
    writeFileSync(join(dir, "main.go"), code);
    const stdout = execFileSync("go", ["run", "main.go"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
    return { stdout, ok: true };
  } catch (e) {
    return { stdout: String((e as { stdout?: string }).stdout ?? ""), ok: false };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const withHarness = (step: ChallengeStep, code: string) => (step.testHarness ? replaceMain(code, step.testHarness) : code);
const required = (step: ChallengeStep, code: string) =>
  (step.requiredCode ?? []).every((p) => getLanguageService("go").codeForRequiredCheck(code).includes(p));

describe.skipIf(!hasGo)("Act III in Go (local toolchain)", () => {
  for (const chapter of [chapter07, chapter08, chapter09]) {
    for (const step of chapter.steps) {
      it(`${step.id}: reference solution passes`, () => {
        const code = GO_ACT3_SOLUTIONS[step.id];
        expect(code, "missing Go solution").toBeDefined();
        const res = runGo(withHarness(step, code));
        expect(res.ok).toBe(true);
        expect(res.stdout.trim()).toBe(step.expectedOutput);
        expect(required(step, code)).toBe(true);
      }, 60000);
    }
  }

  for (const [id, code] of Object.entries(GO_ACT3_WRONG)) {
    it(`${id}: the shortcut fails`, () => {
      const step = [chapter07, chapter08, chapter09].flatMap((c) => c.steps).find((s) => s.id === id)!;
      const res = runGo(withHarness(step, code));
      expect(res.ok && res.stdout.trim() === step.expectedOutput && required(step, code)).toBe(false);
    }, 60000);
  }
});
