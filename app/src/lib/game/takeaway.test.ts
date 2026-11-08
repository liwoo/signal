import { describe, expect, it } from "vitest";
import { extractSnippet } from "./takeaway";
import { TAKEAWAYS } from "@/data/takeaways";
import { REALIZED_CHAPTERS, SOLUTIONS } from "@/lib/lang/fixtures";
import type { LanguageId } from "@/types/game";

const LANGS: LanguageId[] = ["go", "python", "javascript"];

describe("extractSnippet", () => {
  it("lifts a multi-line call that reads the package", () => {
    const code = `package main

import (
    "fmt"
    "terminal/cellblock"
)

func main() {
    fmt.Println("CELL", cellblock.Cell,
        "- SUBLEVEL", cellblock.Sublevel)
}`;
    expect(extractSnippet(code, TAKEAWAYS["chapter-01"].snippet.go)).toBe(
      'fmt.Println("CELL", cellblock.Cell,\n    "- SUBLEVEL", cellblock.Sublevel)',
    );
  });

  it("skips a print that doesn't contain the pattern", () => {
    const code = `fmt.Println("Hello World")\nfmt.Println(cellblock.Cell)`;
    expect(extractSnippet(code, TAKEAWAYS["chapter-01"].snippet.go)).toBe("fmt.Println(cellblock.Cell)");
  });

  it("takes a whole braced function", () => {
    const code = `func sumCodes(codes ...int) int {\n\treturn 0\n}\n\nfunc validateCode(codes ...int) (int, bool) {\n\ttotal := sumCodes(codes...)\n\treturn total, total > 100\n}\n\nfunc main() {}`;
    expect(extractSnippet(code, TAKEAWAYS["chapter-03"].snippet.go)).toBe(
      "func validateCode(codes ...int) (int, bool) {\n\ttotal := sumCodes(codes...)\n\treturn total, total > 100\n}",
    );
  });

  it("takes a python suite by indentation", () => {
    const code = `def validate_code(*codes):\n    total = sum(codes)\n\n    return total, total > 100\n\n\nprint(validate_code(1))`;
    expect(extractSnippet(code, TAKEAWAYS["chapter-03"].snippet.python, true)).toBe(
      "def validate_code(*codes):\n    total = sum(codes)\n\n    return total, total > 100",
    );
  });

  it("ignores brackets inside strings", () => {
    const code = `fmt.Println("(", cellblock.Cell)\nfmt.Println("after")`;
    expect(extractSnippet(code, TAKEAWAYS["chapter-01"].snippet.go)).toBe('fmt.Println("(", cellblock.Cell)');
  });

  it("returns null when nothing matches", () => {
    expect(extractSnippet(`print("hi")`, TAKEAWAYS["chapter-03"].snippet.python, true)).toBeNull();
  });
});

describe("chapter takeaways", () => {
  it("every realized chapter has a takeaway", () => {
    for (const chapter of REALIZED_CHAPTERS) expect(TAKEAWAYS[chapter.id], chapter.id).toBeDefined();
  });

  it("each fallback satisfies its own snippet rule", () => {
    for (const [id, t] of Object.entries(TAKEAWAYS)) {
      for (const lang of LANGS) {
        expect(extractSnippet(t.fallback[lang], t.snippet[lang], lang === "python"), `${id} ${lang}`).not.toBeNull();
      }
    }
  });

  it("finds the pattern in every reference solution's final step", () => {
    for (const chapter of REALIZED_CHAPTERS) {
      const last = chapter.steps[chapter.steps.length - 1].id;
      for (const lang of ["python", "javascript"] as const) {
        const snippet = extractSnippet(SOLUTIONS[lang][last], TAKEAWAYS[chapter.id].snippet[lang], lang === "python");
        expect(snippet, `${last} ${lang}`).not.toBeNull();
      }
    }
  });

  it("each transfer question has exactly one right answer", () => {
    for (const [id, t] of Object.entries(TAKEAWAYS)) {
      expect(t.transfer.options.filter((o) => o.correct).length, id).toBe(1);
    }
  });

  it("speaks in maya's register: lowercase, no exclamation marks", () => {
    for (const [id, t] of Object.entries(TAKEAWAYS)) {
      for (const line of [t.why, t.useIt, t.transfer.question, ...t.transfer.options.map((o) => o.reply)]) {
        expect(line, id).not.toMatch(/!/);
        expect(line[0], `${id}: ${line}`).toBe(line[0].toLowerCase());
      }
    }
  });
});
