// Offline fallback for the Python banks: when the interpreter can't load, the
// engine grades with the bank's codePatterns. Correct programs must complete;
// classic mistakes must not, and should get the targeted line.

import { beforeAll, describe, expect, it } from "vitest";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { chapter07 } from "@/data/challenges/chapter-07";
import { chapter08 } from "@/data/challenges/chapter-08";
import { chapter09 } from "@/data/challenges/chapter-09";
import { realizeChallenge } from "@/data/challenges/realizations";
import { callMayaEngine, callMayaEngineAsync, type StepTestConfig } from "@/lib/ai/engine";
import { usePyodideInNode } from "@/lib/python/node-backend";
import { SOLUTIONS } from "@/lib/lang/fixtures";
import { ACT3_HARDCODED } from "@/lib/lang/act3.fixtures";
import { PYTHON_BANKS } from "./python";

const PY = SOLUTIONS.python;

function offline(stepId: string, code: string) {
  return callMayaEngine(stepId, code, true, false, false, 0, "python");
}

const STEPS = Object.keys(PYTHON_BANKS);

describe("python banks · offline reference solutions", () => {
  it("covers every realized step", () => {
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
    ['print("CELL B-09 - SUBLEVEL 3")', /by hand/],
    ['print(f"CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")', /import cellblock/],
    ['import cellblock\n\nprint("CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")', /no `f`/],
    ['import cellblock\n\nprint("CELL " + cellblock.CELL + " - SUBLEVEL " + cellblock.SUBLEVEL)', /is a number/],
    ['import cellblock\n\nprint(f"CELL {cellblock.cell} - SUBLEVEL {cellblock.sublevel}")', /case-sensitive/],
    ['from cellblock import CELL, SUBLEVEL\n\nprint(f"CELL {CELL} - SUBLEVEL {SUBLEVEL}")', /pulled the names out/],
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
  // ── Act III ──
  "chapter-07:scaffold": [['print("Hello World"', /line 1/], ['print("hello world")', /capital H/]],
  "chapter-07:scan": [
    [PY["chapter-07:scan"].replace("        nonlocal count\n", ""), /nonlocal count/],
    [PY["chapter-07:scan"].replace("nonlocal count", "global count"), /`global`/],
    [PY["chapter-07:scan"].replace("scan(entry[:-1])", "scan(entry)"), /slash/],
    [PY["chapter-07:scan"].replace("                    scan(entry[:-1])\n", "                    pass\n"), /deeper/],
    [
      "def scan_archive(archive, root):\n    count = 0\n\n    def scan(d):\n        nonlocal count\n        for entry in archive[d]:\n            if entry.endswith(\"/\"):\n                scan(entry[:-1])\n            else:\n                count += 1\n        print(\"scanned:\", d)\n\n    scan(root)\n    return count",
      /finally/,
    ],
    [PY["chapter-07:scan"].replace("    scan(root)\n    return count", "    return count"), /never set it off/],
    [PY["chapter-07:scan"].replace("def scan_archive(", "def scanArchive("), /snake_case/],
  ],
  "chapter-07:recover": [
    [PY["chapter-07:scan"], /safe_scan/],
    [PY["chapter-07:recover"].replace('                raise RuntimeError("corrupted directory")\n', "                pass\n"), /raise RuntimeError/],
    [
      PY["chapter-07:recover"]
        .replace('        try:\n            if archive[d] is None:\n                raise RuntimeError("corrupted directory")\n', '        if archive[d] is None:\n            raise RuntimeError("corrupted directory")\n        try:\n'),
      /outside the `try`/,
    ],
    [PY["chapter-07:recover"].replace("except Exception as e:", "except Exception:"), /as e/],
    [PY["chapter-07:recover"].replace('            errors.append(f"{d}: {e}")', "            pass"), /errors.append/],
    [PY["chapter-07:recover"].replace("return count, errors", "return errors"), /return both/],
  ],
  "chapter-08:scaffold": [['print("Hello World"', /line 1/]],
  "chapter-08:goroutine": [
    [PY["chapter-08:goroutine"].replace("return asyncio.create_task(cut(name))", "return cut(name)"), /coroutine/],
    [PY["chapter-08:goroutine"].replace("def cut_async", "async def cut_async"), /plain `def`/],
    [PY["chapter-08:goroutine"].replace("async def cut(name)", "def cut(name)"), /async def cut/],
    [PY["chapter-08:goroutine"].replace("return asyncio.create_task(cut(name))", "asyncio.run(cut(name))"), /asyncio.run/],
    [PY["chapter-08:goroutine"].replace("import asyncio\n", ""), /import asyncio/],
  ],
  "chapter-08:fanout": [
    [
      "import asyncio\n\n\nasync def trip(name):\n    return f\"{name} circuit: DOWN\"\n\n\nasync def cut_all(circuits):\n    lines = []\n    for n in circuits:\n        lines.append(await trip(n))\n    return lines",
      /one after another/,
    ],
    [PY["chapter-08:fanout"].replace("gather(*(trip(n) for n in circuits))", "gather([trip(n) for n in circuits])"), /star/],
    [PY["chapter-08:fanout"].replace("return await asyncio.gather", "return asyncio.gather"), /`await`/],
    [PY["chapter-08:fanout"].replace("async def cut_all", "def cut_all"), /async def cut_all/],
    [PY["chapter-08:fanout"].replace("gather(*(trip(n)", "gather(*(cut(n)"), /`None`/],
  ],
  "chapter-08:window": [
    [ACT3_HARDCODED.python["chapter-08:window"]!, /one after another/],
    [PY["chapter-08:window"].replace("await asyncio.sleep(d / 1000)", "time.sleep(d / 1000)"), /time.sleep/],
    [PY["chapter-08:window"].replace("d / 1000", "d"), /seconds/],
    [PY["chapter-08:window"].replace("d / 1000", "d // 1000"), /rounds down/],
    [PY["chapter-08:window"].replace(" ({d}ms)", ""), /\(\{d\}ms\)/],
  ],
  "chapter-09:scaffold": [['print("Hello World"', /line 1/]],
  "chapter-09:hail": [
    [PY["chapter-09:hail"].replace("def hail(", "async def hail("), /plain `def`/],
    [PY["chapter-09:hail"].replace("return asyncio.create_task(respond())", "return respond()"), /hasn't started/],
    [PY["chapter-09:hail"].replace("await asyncio.sleep(delay_ms / 1000)", "time.sleep(delay_ms / 1000)"), /time.sleep/],
    [PY["chapter-09:hail"].replace("delay_ms / 1000", "delay_ms // 1000"), /rounds down/],
    [PY["chapter-09:hail"].replace('return f"{team} responding"', 'print(f"{team} responding")'), /prints instead/],
  ],
  "chapter-09:first": [
    [ACT3_HARDCODED.python["chapter-09:first"]!, /waits for alpha/],
    [PY["chapter-09:first"].replace("return done.pop().result()", "return done.pop()"), /\.result\(\)/],
    [PY["chapter-09:first"].replace(", return_when=asyncio.FIRST_COMPLETED", ""), /FIRST_COMPLETED/],
    [PY["chapter-09:first"].replace("[alpha, bravo, charlie]", "alpha, bravo, charlie"), /one list/],
    [PY["chapter-09:hail"], /first_responder/],
  ],
  "chapter-09:timeout": [
    [PY["chapter-09:timeout"].replace("timeout=timeout_ms / 1000", "timeout=0.2"), /a number you picked/],
    [PY["chapter-09:timeout"].replace("timeout=timeout_ms / 1000", "timeout=timeout_ms"), /counts seconds/],
    [PY["chapter-09:timeout"].replace("timeout=timeout_ms / 1000, ", ""), /deadlock/],
    [PY["chapter-09:timeout"].replace("def sweep(task)", "async def sweep(task)"), /can't be `async def`/],
    [PY["chapter-09:timeout"].replace("    if task.done():\n        return task.result()\n", ""), /task.done\(\)/],
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
    ["chapter-01:location", 'import cellblock\n\nprint("CELL", cellblock.CELL, "-", "SUBLEVEL", cellblock.SUBLEVEL)'],
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

  const steps = [chapter01, chapter02, chapter03, chapter07, chapter08, chapter09].flatMap((c) => realizeChallenge(c, "python").steps);
  const test = (stepId: string): StepTestConfig => {
    const s = steps.find((x) => x.id === stepId)!;
    return { testHarness: s.testHarness, expectedOutput: s.expectedOutput, requiredCode: s.requiredCode, compileModule: s.compileModule };
  };
  const online = (stepId: string, code: string) =>
    callMayaEngineAsync(stepId, code, true, false, false, 0, test(stepId), "python");

  const cases: [string, string, RegExp][] = [
    ["chapter-01:location", 'import cellblock\n\nprint("CELL {cellblock.CELL} - SUBLEVEL {cellblock.SUBLEVEL}")', /missing its `f`/],
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
    // ── Act III ──
    [
      "chapter-07:scan",
      PY["chapter-07:scan"].replace(
        'if entry.endswith("/"):\n                    scan(entry[:-1])\n                else:\n                    count += 1',
        'count += 1\n                if entry.endswith("/"):\n                    scan(entry[:-1])',
      ),
      /directories too/,
    ],
    ["chapter-07:scan", PY["chapter-07:scan"].replace('            for entry', '            print("scanned:", d)\n            for entry').replace('            print("scanned:", d)\n\n', "            pass\n\n"), /on the way in/],
    ["chapter-07:recover", PY["chapter-07:recover"].replace('            if archive[d] is None:\n                raise RuntimeError("corrupted directory")\n', ""), /raise your own/],
    ["chapter-08:goroutine", ACT3_HARDCODED.python["chapter-08:goroutine"]!, /never dropped/],
    ["chapter-08:fanout", PY["chapter-08:fanout"].replace("return await asyncio.gather(*(trip(n) for n in circuits))", "return [trip(n) for n in circuits]"), /nobody ran/],
    ["chapter-08:window", ACT3_HARDCODED.python["chapter-08:window"]!, /two power cycles/],
    ["chapter-09:first", ACT3_HARDCODED.python["chapter-09:first"]!, /waited on alpha/],
    ["chapter-09:timeout", PY["chapter-09:timeout"].replace("timeout=timeout_ms / 1000", "timeout=0.2"), /timeout_ms/],
  ];
  for (const [stepId, code, reply] of cases) {
    it(`${stepId}: ${code.split("\n").join(" ⏎ ").slice(0, 60)}`, async () => {
      const res = await online(stepId, code);
      expect(res.isComplete, res.reply).toBe(false);
      expect(res.reply).toMatch(reply);
    }, 30000);
  }
});
