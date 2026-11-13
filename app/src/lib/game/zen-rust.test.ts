import { describe, expect, it } from "vitest";
import { analyzeZen, getZenRules, type ZenRule } from "./zen";
import { fnBody, maskRs, RUST_ZEN_RULES } from "./zen-rust";
import { RUST_ZEN_EXAMPLES } from "@/data/zen-examples.rust";
import { SOLUTIONS } from "@/lib/lang/fixtures";

const RS = SOLUTIONS.rust;

function rule(id: string): ZenRule {
  for (const rules of Object.values(RUST_ZEN_RULES)) {
    const r = rules.find((x) => x.id === id);
    if (r) return r;
  }
  throw new Error(`no rule ${id}`);
}

/** Relevant and followed. */
function follows(id: string, code: string): boolean {
  const r = rule(id);
  return (!r.isRelevant || r.isRelevant(code)) && r.check(code);
}

/** Relevant but not followed (so Maya suggests). */
function misses(id: string, code: string): boolean {
  const r = rule(id);
  return (!r.isRelevant || r.isRelevant(code)) && !r.check(code);
}

const main = (body: string) => `fn main() {\n${body.split("\n").map((l) => (l ? `    ${l}` : l)).join("\n")}\n}`;

const SUM_LOOP = RS["chapter-03:sumfunc"];
const VALIDATE = RS["chapter-03:validate"];

// [rule id, code that follows it, code that misses it]
const CASES: [string, string, string][] = [
  ["rs_brace_same_line", RS["chapter-01:scaffold"], 'fn main()\n{\n    println!("Hello World");\n}'],
  ["rs_four_space_indent", RS["chapter-02:rewrite"], 'fn main() {\n  println!("Hello World");\n}'],
  [
    "rs_one_println",
    RS["chapter-01:location"],
    'mod cellblock;\n\nfn main() {\n    print!("CELL {}", cellblock::CELL);\n    println!(" - SUBLEVEL {}", cellblock::SUBLEVEL);\n}',
  ],
  ["rs_mod_at_top", RS["chapter-01:location"], 'mod cellblock;\nfn main() {\n    println!("{}", cellblock::CELL);\n}'],
  [
    "rs_no_glob_import",
    RS["chapter-01:location"],
    'mod cellblock;\nuse cellblock::*;\n\nfn main() {\n    println!("CELL {} - SUBLEVEL {}", CELL, SUBLEVEL);\n}',
  ],
  ["rs_statement_semicolon", RS["chapter-02:scaffold"], 'fn main() {\n    println!("Hello World")\n}'],
  ["rs_no_trailing_whitespace", RS["chapter-02:scaffold"], 'fn main() {  \n    println!("Hello World");\n}'],
  ["rs_inclusive_range", RS["chapter-02:loop"], main('for i in 1..11 {\n    println!("{}", i);\n}')],
  ["rs_inclusive_range", RS["chapter-02:loop"], main('for i in 0..10 {\n    println!("{}", i + 1);\n}')],
  ["rs_for_over_while", RS["chapter-02:loop"], main('let mut i = 1;\nwhile i <= 10 {\n    println!("{}", i);\n    i += 1;\n}')],
  [
    "rs_else_if_chain",
    RS["chapter-02:classify"],
    main('for i in 1..=10 {\n    if i <= 3 {\n        println!("{} DENY", i);\n    } else {\n        if i <= 6 {\n            println!("{} WARN", i);\n        } else {\n            println!("{} OVERRIDE", i);\n        }\n    }\n}'),
  ],
  ["rs_no_paren_condition", RS["chapter-02:classify"], main('for i in 1..=10 {\n    if (i <= 3) {\n        println!("{} DENY", i);\n    }\n}')],
  ["rs_operator_spacing", RS["chapter-02:classify"], main('for i in 1..=10 {\n    if i<=3 {\n        println!("{} DENY", i);\n    }\n}')],
  [
    "rs_match_expression",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    match i {\n        1..=3 => println!("{} DENY", i),\n        _ => println!("{} OVERRIDE", i),\n    }\n}'),
  ],
  [
    "rs_range_patterns",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    let level = match i {\n        1 | 2 | 3 => "DENY",\n        _ => "OVERRIDE",\n    };\n    println!("{} {}", i, level);\n}'),
  ],
  [
    "rs_range_patterns",
    RS["chapter-02:rewrite"],
    main('for i in 1..=10 {\n    let level = match i {\n        n if n <= 3 => "DENY",\n        _ => "OVERRIDE",\n    };\n    println!("{} {}", i, level);\n}'),
  ],
  ["rs_comment_space", `// open the panel\n${RS["chapter-03:scaffold"]}`, `//open the panel\n${RS["chapter-03:scaffold"]}`],
  ["rs_single_blank_lines", RS["chapter-03:sumfunc"], 'fn main() {\n\n\n    println!("Hello World");\n}'],
  ["rs_iter_sum", VALIDATE, SUM_LOOP],
  [
    "rs_tail_expression",
    SUM_LOOP,
    "fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = 0;\n    for c in codes {\n        total += c;\n    }\n    return total;\n}",
  ],
  ["rs_needless_mut", SUM_LOOP, "fn sum_codes(codes: &[i32]) -> i32 {\n    let mut total = codes.iter().sum();\n    total\n}"],
  [
    "rs_direct_bool",
    VALIDATE,
    VALIDATE.replace("(total, total > 100)", "if total > 100 {\n        (total, true)\n    } else {\n        (total, false)\n    }"),
  ],
  [
    "rs_reuse_sum",
    VALIDATE,
    VALIDATE.replace("let total = sum_codes(codes);", "let total: i32 = codes.iter().sum();"),
  ],
  ["rs_borrow_slice", VALIDATE, VALIDATE.replace("fn validate_code(codes: &[i32])", "fn validate_code(codes: Vec<i32>)")],
  ["rs_snake_case", VALIDATE, VALIDATE.replaceAll("validate_code", "validateCode")],
];

describe("rust zen rules", () => {
  it.each(CASES)("%s: follows the good code, misses the bad", (id, good, bad) => {
    expect(follows(id, good), "good").toBe(true);
    expect(misses(id, bad), "bad").toBe(true);
  });

  it("every rule has a test case and an example", () => {
    const tested = new Set(CASES.map(([id]) => id));
    for (const rules of Object.values(RUST_ZEN_RULES)) {
      for (const r of rules) {
        expect(tested.has(r.id), r.id).toBe(true);
        expect(RUST_ZEN_EXAMPLES[r.id], r.id).toBeDefined();
      }
    }
    for (const id of Object.keys(RUST_ZEN_EXAMPLES)) expect(() => rule(id)).not.toThrow();
  });

  it("the reference solutions draw no suggestions except where the loop could be iter().sum()", () => {
    for (const [stepId, rules] of Object.entries(RUST_ZEN_RULES)) {
      const code = RS[stepId];
      for (const r of rules) {
        if (stepId === "chapter-03:sumfunc" && r.id === "rs_iter_sum") continue;
        expect(misses(r.id, code), `${stepId} ${r.id}`).toBe(false);
      }
    }
  });

  it("analyzes through the shared engine and respects mastery", () => {
    const step = "chapter-03:validate";
    expect(getZenRules(step, "rust").map((r) => r.id)).toContain("rs_direct_bool");
    const full = analyzeZen(step, VALIDATE, undefined, "rust");
    expect(full.bonusXP).toBeGreaterThan(0);
    const mastered = analyzeZen(step, VALIDATE, new Set(getZenRules(step, "rust").map((r) => r.id)), "rust");
    expect(mastered.bonusXP).toBe(0);
    expect(mastered.jolts).toEqual([]);
  });

  it("never trips on strings or comments", () => {
    const code = 'fn main() {\n    // if (x) { while\n    println!("if (i <= 3) {{ return 1; }}");\n}';
    expect(maskRs(code)).not.toMatch(/while|return/);
    expect(misses("rs_no_paren_condition", code)).toBe(false);
    expect(fnBody('fn a() { let s = "}"; s }', "a")).toBe(' let s = "x"; s ');
  });
});
