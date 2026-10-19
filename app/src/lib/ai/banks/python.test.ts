// Offline fallback for the Python banks: when the interpreter can't load, the
// engine grades with the bank's codePatterns. Correct programs must complete;
// classic mistakes must not, and should get the targeted line.

import { beforeAll, describe, expect, it } from "vitest";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { realizeChallenge } from "@/data/challenges/realizations";
import { callMayaEngine, callMayaEngineAsync, type StepTestConfig } from "@/lib/ai/engine";
import { usePyodideInNode } from "@/lib/python/node-backend";
import { SOLUTIONS } from "@/lib/lang/act1.fixtures";
import { PYTHON_BANKS } from "./python";

const PY = SOLUTIONS.python;

function offline(stepId: string, code: string) {
  return callMayaEngine(stepId, code, true, false, false, 0, "python");
}

const STEPS = Object.keys(PYTHON_BANKS);

describe("python banks · offline reference solutions", () => {
  it("covers all nine act i steps", () => {
    expect(STEPS.sort()).toEqual(Object.keys(PY).sort());
  });

  for (const stepId of Object.keys(PY)) {
    it(`${stepId} completes on the reference solution`, () => {
      const res = offline(stepId, PY[stepId]);
      expect(res.isComplete, res.reply).toBe(true);
      expect(res.reply).not.toContain("||COMPLETE||");
    });
  }
});

/** [code, expected reply fragment] pairs that must NOT complete. */
const MISTAKES: Record<string, [string, RegExp][]> = {
  "chapter-01:scaffold": [
    ['Print("Hello World")', /lowercase/],
    ["print(Hello World)", /quotes/],
    ['print "Hello World"', /brackets/],
    ['print("hello world")', /capital H/],
    ['def main():\n    print("Hello World")', /never called/],
    ["", /nothing's printing/],
  ],
  "chapter-01:location": [
    ['print("CELL B-09 · SUBLEVEL 3")', /by hand/],
    ['print(f"CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")', /import cellblock/],
    ['import cellblock\n\nprint("CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")', /no `f`/],
    ['import cellblock\n\nprint("CELL " + cellblock.CELL + " · SUBLEVEL " + cellblock.SUBLEVEL)', /is a number/],
    ['import cellblock\n\nprint(f"CELL {cellblock.cell} · SUBLEVEL {cellblock.sublevel}")', /case-sensitive/],
    ['from cellblock import CELL, SUBLEVEL\n\nprint(f"CELL {CELL} · SUBLEVEL {SUBLEVEL}")', /pulled the names out/],
    ['import cellblock\n\nprint(f"CELL {cellblock.CELL}")', /both/],
    ["import cellblock\n\nprint(cellblock.CELL, cellblock.SUBLEVEL)", /words/],
    ['print("Hello World")', /greeting/],
  ],
  "chapter-02:scaffold": [
    ['console.log("Hello World");', /line 1/],
    ['print("Hello world")', /capital/],
  ],
  "chapter-02:loop": [
    ["for i in range(1, 10):\n    print(i)", /stops at 9/],
    ["for i in range(10):\n    print(i)", /starts at 0/],
    ["for i in range(11):\n    print(i)", /starts at 0/],
    ["for i in range(1, 11):\nprint(i)", /indented/],
    ['for i in range(1, 11):\n    print("i")', /no quotes/],
    ['for i in range(1, 11):\n    print(i, "DENY")', /just the numbers/],
    ["i = 1\nwhile i <= 10:\n    print(i)\n    i += 1", /while/],
    ["for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}", /line \d+|another language/],
    [Array.from({ length: 10 }, (_, k) => `print(${k + 1})`).join("\n"), /by hand/],
    ['print("Hello World")\n\nfor i in range(1, 11):\n    print(i)', /hello world/],
  ],
  "chapter-02:classify": [
    [
      'for i in range(1, 11):\n    if i <= 3:\n        print(i, "DENY")\n    else if i <= 6:\n        print(i, "WARN")\n    else:\n        print(i, "OVERRIDE")',
      /elif/,
    ],
    [
      'for i in range(1, 11):\n    if i <= 3:\n        print(i, "DENY")\n    elif i <= 6:\n        print(i, "WARN")\n    elif i <= 9:\n        print(i, "GRANT")',
      /OVERRIDE/,
    ],
    [
      'for i in range(1, 11):\n    if i <= 9:\n        print(i, "GRANT")\n    elif i <= 6:\n        print(i, "WARN")\n    elif i <= 3:\n        print(i, "DENY")\n    else:\n        print(i, "OVERRIDE")',
      /order and the boundaries/,
    ],
    [
      'for i in range(1, 11):\n    if i < 3:\n        print(i, "DENY")\n    elif i < 6:\n        print(i, "WARN")\n    elif i < 9:\n        print(i, "GRANT")\n    else:\n        print(i, "OVERRIDE")',
      /boundaries/,
    ],
    [PY["chapter-02:classify"].replace("range(1, 11)", "range(1, 10)"), /stops at 9/],
    [PY["chapter-02:loop"], /not classifying/],
    [
      'for i in range(1, 11):\n    if i <= 3:\n        print(i, "deny")\n    elif i <= 6:\n        print(i, "warn")\n    elif i <= 9:\n        print(i, "grant")\n    else:\n        print(i, "override")',
      /capitals/,
    ],
    [PY["chapter-02:classify"].replace('print(i, "DENY")', 'print(i + " DENY")'), /can't join/],
  ],
  "chapter-02:rewrite": [
    [PY["chapter-02:classify"], /old chain/],
    [PY["chapter-02:rewrite"].replace("10: \"OVERRIDE\",\n", ""), /missing codes/],
    [PY["chapter-02:rewrite"].replace('4: "WARN"', '4: "DENY"'), /wrong level/],
    [PY["chapter-02:rewrite"].replace(/(\d+):/g, '"$1":'), /keys are text/],
    [PY["chapter-02:rewrite"].replace("levels[i]", "levels(i)"), /square brackets/],
    [PY["chapter-02:rewrite"].replace("print(i, levels[i])", "print(i, levels)"), /now use it/],
    [PY["chapter-02:rewrite"].replace('"DENY", 2:', '"DENY" 2:'), /comma missing/],
    [
      'levels = ["DENY", "DENY", "DENY", "WARN", "WARN", "WARN", "GRANT", "GRANT", "GRANT", "OVERRIDE"]\n\nfor i in range(1, 11):\n    print(i, levels[i])',
      /list/,
    ],
  ],
  "chapter-03:scaffold": [['print("Hello World"', /line 1/], ['print("HELLO WORLD")', /capital/]],
  "chapter-03:sumfunc": [
    ["def sum_codes(codes):\n    total = 0\n    for c in codes:\n        total += c\n    return total", /star/],
    ["def sumCodes(*codes):\n    return sum(codes)", /snake_case/],
    ["def sum_codes(*codes):\n    total = 0\n    for c in codes:\n        total += c\n    print(total)", /instead of returning/],
    ["def sum_codes(*codes):\n    total = 0\n    for c in codes:\n        total += c\n        return total", /inside the loop/],
    ["def sum_codes(*codes):\n    for c in codes:\n        total += c\n    return total", /total = 0/],
    ['print("Hello World")', /`sum_codes`/],
  ],
  "chapter-03:validate": [
    [PY["chapter-03:validate"].replace("return total, total > 100", "return total > 100"), /one value/],
    [PY["chapter-03:validate"].replace("total = sum_codes(*codes)", "total = sum_codes(codes)"), /without the star/],
    [PY["chapter-03:validate"].replace("total > 100", "total >= 100"), /not `>=`/],
    [
      PY["chapter-03:validate"].replace(
        "return total, total > 100",
        "if total > 100:\n        return total, true\n    return total, false",
      ),
      /True/,
    ],
    [PY["chapter-03:sumfunc"], /validate_code/],
  ],
};

describe("python banks · offline classic mistakes", () => {
  for (const [stepId, cases] of Object.entries(MISTAKES)) {
    describe(stepId, () => {
      for (const [code, reply] of cases) {
        it(`rejects: ${code.split("\n").join(" ⏎ ").slice(0, 70)}`, () => {
          const res = offline(stepId, code);
          expect(res.isComplete, res.reply).toBe(false);
          expect(res.reply).toMatch(reply);
        });
      }
    });
  }
});

describe("python banks · offline accepts other correct shapes", () => {
  const ok: [string, string][] = [
    ["chapter-01:scaffold", "print('Hello World')"],
    ["chapter-01:scaffold", 'print("Hello", "World")  # two args, one space'],
    ["chapter-01:location", 'import cellblock\n\nprint("CELL", cellblock.CELL, "·", "SUBLEVEL", cellblock.SUBLEVEL)'],
    ["chapter-01:location", 'import cellblock\n\nprint("CELL " + cellblock.CELL + " . SUBLEVEL " + str(cellblock.SUBLEVEL))'],
    ["chapter-02:loop", "for i in range(1, 11): print(i)"],
    ["chapter-02:loop", "for i in range(10):\n    print(i + 1)"],
    [
      "chapter-02:classify",
      'for i in range(1, 11):\n    if 1 <= i <= 3:\n        print(i, "DENY")\n    if 4 <= i <= 6:\n        print(i, "WARN")\n    if i in range(7, 10):\n        print(i, "GRANT")\n    if i == 10:\n        print(i, "OVERRIDE")',
    ],
    [
      "chapter-02:classify",
      'for i in range(1, 11):\n    if i < 4:\n        print(f"{i} DENY")\n    elif i < 7:\n        print(f"{i} WARN")\n    elif i < 10:\n        print(f"{i} GRANT")\n    else:\n        print(f"{i} OVERRIDE")',
    ],
    [
      "chapter-02:rewrite",
      'levels = {1: "DENY", 2: "DENY", 3: "DENY", 4: "WARN", 5: "WARN", 6: "WARN", 7: "GRANT", 8: "GRANT", 9: "GRANT", 10: "OVERRIDE"}\nfor i in range(1, 11):\n    print(i, levels[i])',
    ],
    ["chapter-03:sumfunc", "def sum_codes(*codes):\n    return sum(codes)"],
    ["chapter-03:sumfunc", "def sum_codes(*nums):\n    total = 0\n    for n in nums:\n        total = total + n\n    return total"],
    [
      "chapter-03:validate",
      "def sum_codes(*codes):\n    return sum(codes)\n\n\ndef validate_code(*codes):\n    total = sum_codes(*codes)\n    ok = total > 100\n    return (total, ok)",
    ],
  ];
  for (const [stepId, code] of ok) {
    it(`${stepId}: ${code.split("\n").join(" ⏎ ").slice(0, 70)}`, () => {
      const res = offline(stepId, code);
      expect(res.isComplete, res.reply).toBe(true);
    });
  }
});

// ── Online: real CPython (Pyodide) output hits the targeted outputPatterns ──

describe("python banks · online wrong-output feedback", () => {
  beforeAll(() => {
    usePyodideInNode();
  });

  const steps = [chapter01, chapter02, chapter03].flatMap((c) => realizeChallenge(c, "python").steps);
  const test = (stepId: string): StepTestConfig => {
    const s = steps.find((x) => x.id === stepId)!;
    return { testHarness: s.testHarness, expectedOutput: s.expectedOutput, requiredCode: s.requiredCode, compileModule: s.compileModule };
  };
  const online = (stepId: string, code: string) =>
    callMayaEngineAsync(stepId, code, true, false, false, 0, test(stepId), "python");

  const cases: [string, string, RegExp][] = [
    ["chapter-01:location", 'import cellblock\n\nprint("CELL {cellblock.CELL} · SUBLEVEL {cellblock.SUBLEVEL}")', /missing its `f`/],
    ["chapter-02:loop", "for i in range(1, 10):\n    print(i)", /stops at 9/],
    ["chapter-02:loop", "for i in range(10):\n    print(i)", /starts at 0/],
    ["chapter-02:loop", 'print("Hello World")\nfor i in range(1, 11):\n    print(i)', /hello world/],
    ["chapter-02:classify", PY["chapter-02:classify"].replace(/print\(i, "(\w+)"\)/g, 'print(i, " $1")'), /two spaces/],
    ["chapter-02:classify", PY["chapter-02:classify"].replace(/print\(i, "(\w+)"\)/g, 'print("i $1")'), /letter i/],
    ["chapter-02:rewrite", PY["chapter-02:rewrite"].replace("levels[i]", "levels.get(i)").replace("10: \"OVERRIDE\",\n", ""), /None/],
    [
      "chapter-03:sumfunc",
      "def sum_codes(*codes):\n    total = 0\n    for c in codes:\n        total += c\n        return total",
      /inside the loop/,
    ],
    ["chapter-03:sumfunc", "def sum_codes(*codes):\n    total = sum(codes)", /Sum: None/],
    [
      "chapter-03:validate",
      PY["chapter-03:validate"].replace("return total, total > 100", 'return total, "true" if total > 100 else "false"'),
      /lowercase/,
    ],
  ];
  for (const [stepId, code, reply] of cases) {
    it(`${stepId}: ${code.split("\n").join(" ⏎ ").slice(0, 60)}`, async () => {
      const res = await online(stepId, code);
      expect(res.isComplete, res.reply).toBe(false);
      expect(res.reply).toMatch(reply);
    }, 30000);
  }
});
