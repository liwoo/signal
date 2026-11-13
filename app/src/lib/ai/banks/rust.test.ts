// Offline fallback for the Rust banks: with no compiler reachable, the engine
// grades by codePatterns — so every reference solution must complete on them,
// and the classic mistakes must get their targeted line instead.

import { describe, expect, it } from "vitest";
import { callMayaEngine } from "@/lib/ai/engine";
import { SOLUTIONS, HARDCODED } from "@/lib/lang/act1.fixtures";
import { RUST_BANKS } from "./rust";

const offline = (stepId: string, code: string) => callMayaEngine(stepId, code, true, false, false, 0, "rust");

describe("rust banks · offline completion", () => {
  for (const [stepId, code] of Object.entries(SOLUTIONS.rust)) {
    it(`${stepId}: the reference solution completes`, () => {
      const res = offline(stepId, code);
      expect(res.isComplete, res.reply).toBe(true);
    });
  }

  for (const [stepId, code] of Object.entries(HARDCODED.rust)) {
    it(`${stepId}: the hardcoded shortcut does not`, () => {
      expect(offline(stepId, code!).isComplete).toBe(false);
    });
  }

  it("covers every Act I step", () => {
    expect(Object.keys(RUST_BANKS).sort()).toEqual(Object.keys(SOLUTIONS.rust).sort());
  });
});

describe("rust banks · targeted mistakes", () => {
  const cases: [string, string, RegExp][] = [
    ["chapter-01:scaffold", `println!("Hello World");`, /fn main/],
    ["chapter-01:scaffold", `fn main() {\n    println!("hello world");\n}`, /capital H/],
    ["chapter-01:location", `fn main() {\n    println!("CELL {} - SUBLEVEL {}", cellblock::CELL, cellblock::SUBLEVEL);\n}`, /mod cellblock;/],
    ["chapter-01:location", `mod cellblock;\nfn main() {\n    println!("CELL {} - SUBLEVEL {}", cellblock.CELL, cellblock.SUBLEVEL);\n}`, /two colons/],
    ["chapter-01:location", `mod cellblock;\nfn main() {\n    println!("CELL {}", cellblock::CELL, cellblock::SUBLEVEL);\n}`, /slots/],
    ["chapter-02:loop", `fn main() {\n    for i in 1..10 {\n        println!("{}", i);\n    }\n}`, /1\.\.=10/],
    ["chapter-02:loop", `fn main() {\n    for i in 0..10 {\n        println!("{}", i + 1);\n    }\n}`, /COMPLETE|loop confirmed/],
    ["chapter-02:classify", `fn main() {\n    for i in 1..=10 {\n        if i <= 3 {\n            println!("{} DENY", i);\n        } else if i <= 5 {\n            println!("{} WARN", i);\n        } else if i <= 9 {\n            println!("{} GRANT", i);\n        } else {\n            println!("{} OVERRIDE", i);\n        }\n    }\n}`, /wrong one/],
    ["chapter-02:rewrite", `fn main() {\n    for i in 1..=10 {\n        let level = match i {\n            1..=3 => "DENY",\n            4..=6 => "WARN",\n            7..=9 => "GRANT",\n            10 => "OVERRIDE",\n        };\n        println!("{} {}", i, level);\n    }\n}`, /catch-all/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: Vec<i32>) -> i32 {\n    codes.iter().sum()\n}\nfn main() {}`, /slice, not a Vec/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: &[i32]) -> i32 {\n    let total = 0;\n    for c in codes {\n        total += c;\n    }\n    total\n}\nfn main() {}`, /let mut total/],
    ["chapter-03:sumfunc", `fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    total;\n}\nfn main() {}`, /semicolon/],
    ["chapter-03:validate", `fn sum_codes(codes: &[i32]) -> i32 {\n    codes.iter().sum()\n}\nfn validate_code(codes: &[i32]) -> (i32, bool) {\n    let total = sum_codes(codes);\n    (total, total >= 100)\n}\nfn main() {}`, />=/],
  ];
  for (const [stepId, code, expected] of cases) {
    it(`${stepId}: ${expected}`, () => {
      const res = offline(stepId, code);
      const isCompleteCase = /COMPLETE/.test(expected.source);
      expect(res.isComplete, res.reply).toBe(isCompleteCase);
      if (!isCompleteCase) expect(res.reply).toMatch(expected);
    });
  }
});
