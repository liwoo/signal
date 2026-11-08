import { describe, expect, it } from "vitest";
import { analyzeZen, getZenRules, type ZenRule } from "./zen";
import { PYTHON_ZEN_RULES } from "./zen-python";
import { PYTHON_ZEN_EXAMPLES } from "@/data/zen-examples.python";
import { SOLUTIONS } from "@/lib/lang/fixtures";

const PY = SOLUTIONS.python;

function rule(id: string): ZenRule {
  for (const rules of Object.values(PYTHON_ZEN_RULES)) {
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

function irrelevant(id: string, code: string): boolean {
  const r = rule(id);
  return !!r.isRelevant && !r.isRelevant(code);
}

// [rule id, code that follows it, code that misses it]
const CASES: [string, string, string][] = [
  ["py_no_semicolon", 'print("a; b")  # x; y', 'print("Hello World");'],
  ["py_no_space_before_paren", 'print("Hello World")', 'print ("Hello World")'],
  ["py_flat_top_level", 'print("Hello World")', 'def main():\n    print("Hello World")\n\nmain()'],
  ["py_no_trailing_whitespace", 'print("Hello World")\n', 'print("Hello World")   \n'],
  ["py_consistent_quotes", "print('Hello')\nprint('World')\nprint(\"it's\")", "print('Hello')\nprint(\"World\")"],
  ["py_comment_space", '# open it\nprint("Hello World")  # done', '#open it\nprint("Hello World")'],
  [
    "py_fstring",
    PY["chapter-01:location"],
    'import cellblock\n\nprint("CELL " + cellblock.CELL + " - SUBLEVEL " + str(cellblock.SUBLEVEL))',
  ],
  [
    "py_qualified_import",
    PY["chapter-01:location"],
    'from cellblock import CELL, SUBLEVEL\nimport cellblock\n\nprint(f"CELL {cellblock.CELL} - SUBLEVEL {SUBLEVEL}")',
  ],
  ["py_imports_at_top", PY["chapter-01:location"], 'import cellblock\nprint(cellblock.CELL)'],
  ["py_range_start_stop", PY["chapter-02:loop"], "for i in range(10):\n    print(i + 1)"],
  ["py_four_space_indent", PY["chapter-02:rewrite"], "for i in range(1, 11):\n  print(i)"],
  [
    "py_elif_chain",
    PY["chapter-02:classify"],
    'for i in range(1, 11):\n    if i <= 3:\n        print(i, "DENY")\n    else:\n        if i <= 6:\n            print(i, "WARN")\n        else:\n            print(i, "OVERRIDE")',
  ],
  ["py_operator_spacing", PY["chapter-02:classify"], 'for i in range(1, 11):\n    if i<=3:\n        print(i, "DENY")'],
  ["py_print_separator", PY["chapter-02:classify"], 'for i in range(1, 11):\n    print(str(i) + " DENY")'],
  ["py_data_over_branches", PY["chapter-02:rewrite"], 'levels = {1: "DENY"}\nfor i in range(1, 11):\n    if i in levels:\n        print(i, levels[i])'],
  ["py_dict_trailing_comma", PY["chapter-02:rewrite"], 'levels = {\n    1: "DENY",\n    10: "OVERRIDE"\n}'],
  ["py_pure_function", PY["chapter-03:sumfunc"], "def sum_codes(*codes):\n    total = sum(codes)\n    print(total)\n    return total"],
  ["py_sum_builtin", "def sum_codes(*codes):\n    return sum(codes)", PY["chapter-03:sumfunc"]],
  ["py_augmented_assign", PY["chapter-03:sumfunc"], "def sum_codes(*codes):\n    total = 0\n    for c in codes:\n        total = total + c\n    return total"],
  [
    "py_direct_bool_return",
    PY["chapter-03:validate"],
    PY["chapter-03:validate"].replace("return total, total > 100", "if total > 100:\n        return total, True\n    return total, False"),
  ],
  ["py_reuse_unpack", PY["chapter-03:validate"], PY["chapter-03:validate"].replace("total = sum_codes(*codes)", "total = sum(codes)")],
  [
    "py_tuple_unpacking",
    PY["chapter-03:validate"],
    PY["chapter-03:validate"].replace("s, v = validate_code(1)\nprint(s, v)", "result = validate_code(1)\nprint(result[0], result[1])"),
  ],
  // ── Act II ──
  ["py_line_length", PY["chapter-04:scaffold"], `print("${"x".repeat(90)}")`],
  ["py_dict_literal", PY["chapter-04:guardmap"], 'def build_roster():\n    roster = {}\n    roster["Chen"] = "Floor 1"\n    return roster'],
  [
    "py_one_pair_per_line",
    PY["chapter-04:guardmap"],
    'def build_roster():\n    return {"Chen": "Floor 1", "Alvarez": "Floor 2", "Volkov": "Floor 2"}',
  ],
  ["py_set_membership", PY["chapter-04:clearfloors"], PY["chapter-04:clearfloors"].replace("set(guards.values())", "list(guards.values())")],
  ["py_dict_values", PY["chapter-04:clearfloors"], PY["chapter-04:clearfloors"].replace("set(guards.values())", "set(guards[g] for g in guards)")],
  ["py_not_in", PY["chapter-04:clearfloors"], PY["chapter-04:clearfloors"].replace("if name not in occupied:", "if not name in occupied:")],
  ["py_blank_line_limit", 'print("Hello World")', 'print("a")\n\n\n\nprint("b")'],
  ["py_slice_reverse", PY["chapter-04.2:reverseword"], 'def reverse_word(s):\n    return "".join(reversed(s))'],
  [
    "py_no_range_len",
    'def reverse_word(s):\n    out = ""\n    for ch in s:\n        out = ch + out\n    return out',
    'def reverse_word(s):\n    out = ""\n    for i in range(len(s)):\n        out = s[i] + out\n    return out',
  ],
  [
    "py_join_words",
    PY["chapter-04.2:encode"],
    'def encode(msg):\n    out = ""\n    for w in msg.split():\n        out += w[::-1] + " "\n    return out',
  ],
  ["py_split_whitespace", PY["chapter-04.2:encode"], PY["chapter-04.2:encode"].replace("msg.split()", 'msg.split(" ")')],
  [
    "py_comprehension_join",
    PY["chapter-04.2:encode"],
    'def encode(msg):\n    words = []\n    for w in msg.split():\n        words.append(reverse_word(w))\n    return " ".join(words)',
  ],
  ["py_narrow_except", PY["chapter-04.2:relayheader"], PY["chapter-04.2:relayheader"].replace("except ValueError:", "except:")],
  [
    "py_small_try",
    PY["chapter-04.2:relayheader"],
    'def relay_header(floor, code):\n    try:\n        n = int(code)\n        return f"F{floor}-C{n * 2}"\n    except ValueError:\n        return f"F{floor}-ERR"',
  ],
  [
    "py_fstring_header",
    PY["chapter-04.2:relayheader"],
    'def relay_header(floor, code):\n    try:\n        n = int(code)\n    except ValueError:\n        return "F" + str(floor) + "-ERR"\n    return "F" + str(floor) + "-C" + str(n * 2)',
  ],
];

describe("python zen rules", () => {
  it("has a pass/fail case and an example for every rule", () => {
    const ids = Object.values(PYTHON_ZEN_RULES).flat().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CASES.map((c) => c[0]).sort()).toEqual([...ids].sort());
    for (const id of ids) expect(PYTHON_ZEN_EXAMPLES[id], id).toBeDefined();
  });

  for (const [id, good, bad] of CASES) {
    describe(id, () => {
      it("is followed by the idiomatic code", () => {
        expect(follows(id, good)).toBe(true);
      });
      it("suggests on the unidiomatic code", () => {
        expect(misses(id, bad)).toBe(true);
      });
    });
  }

  it("each rule's example 'after' follows the rule (where it's a whole program)", () => {
    for (const id of ["py_no_semicolon", "py_no_space_before_paren", "py_flat_top_level", "py_four_space_indent", "py_range_start_stop", "py_print_separator", "py_dict_trailing_comma"]) {
      const ex = PYTHON_ZEN_EXAMPLES[id];
      const r = rule(id);
      expect(r.check(ex.after), `${id} after`).toBe(true);
    }
  });
});

describe("python zen · relevance", () => {
  it("skips the f-string rule when print just takes separate values", () => {
    expect(irrelevant("py_fstring", 'import cellblock\n\nprint("CELL", cellblock.CELL)')).toBe(true);
  });
  it("skips sum_codes rules until sum_codes exists", () => {
    for (const id of ["py_pure_function", "py_sum_builtin"]) expect(irrelevant(id, 'print("Hello World")')).toBe(true);
  });
  it("skips the unpacking rule when the player never calls validate_code", () => {
    const defsOnly = "def sum_codes(*codes):\n    return sum(codes)\n\n\ndef validate_code(*codes):\n    total = sum_codes(*codes)\n    return total, total > 100";
    expect(irrelevant("py_tuple_unpacking", defsOnly)).toBe(true);
  });
  it("skips the elif rule with a single condition", () => {
    expect(irrelevant("py_elif_chain", "for i in range(1, 11):\n    if i == 10:\n        print(i)")).toBe(true);
  });
  it("ignores operators and semicolons inside strings and comments", () => {
    expect(follows("py_operator_spacing", 'if i <= 3:  # i<=3\n    print("a<=b")')).toBe(true);
    expect(follows("py_no_semicolon", 'print("x;")  # ;')).toBe(true);
  });
  it("doesn't count continuation lines against indentation", () => {
    expect(follows("py_four_space_indent", 'levels = {\n  1: "DENY",\n}\nfor i in range(1, 11):\n    print(i, levels[i])')).toBe(true);
  });
  it("suggests the star when sum_codes gets the tuple itself", () => {
    const code = PY["chapter-03:validate"].replace("total = sum_codes(*codes)", "total = sum_codes(codes)");
    expect(rule("py_reuse_unpack").getSuggestion!(code)).toMatch(/without the star/);
  });
});

describe("python zen · reference solutions", () => {
  // Rules each reference solution plainly follows must jolt, not suggest.
  const FOLLOWED: Record<string, string[]> = {
    "chapter-01:scaffold": ["py_no_semicolon", "py_no_space_before_paren"],
    "chapter-01:location": ["py_fstring", "py_qualified_import", "py_imports_at_top"],
    "chapter-02:scaffold": ["py_flat_top_level", "py_no_trailing_whitespace"],
    "chapter-02:loop": ["py_range_start_stop", "py_four_space_indent"],
    "chapter-02:classify": ["py_elif_chain", "py_operator_spacing", "py_print_separator"],
    "chapter-02:rewrite": ["py_data_over_branches", "py_dict_trailing_comma"],
    "chapter-03:scaffold": ["py_consistent_quotes"],
    "chapter-03:sumfunc": ["py_pure_function", "py_augmented_assign"],
    "chapter-03:validate": ["py_direct_bool_return", "py_reuse_unpack", "py_tuple_unpacking"],
    "chapter-04:scaffold": ["py_line_length"],
    "chapter-04:guardmap": ["py_dict_literal", "py_one_pair_per_line"],
    "chapter-04:clearfloors": ["py_set_membership", "py_dict_values", "py_not_in"],
    "chapter-04.2:scaffold": ["py_blank_line_limit"],
    "chapter-04.2:reverseword": ["py_slice_reverse"],
    "chapter-04.2:encode": ["py_join_words", "py_split_whitespace", "py_comprehension_join"],
    "chapter-04.2:relayheader": ["py_narrow_except", "py_small_try", "py_fstring_header"],
  };
  for (const [stepId, ids] of Object.entries(FOLLOWED)) {
    it(`${stepId} earns its jolts`, () => {
      for (const id of ids) expect(follows(id, PY[stepId]), id).toBe(true);
      const res = analyzeZen(stepId, PY[stepId], undefined, "python");
      const expected = getZenRules(stepId, "python").filter((r) => ids.includes(r.id)).reduce((n, r) => n + r.bonusXP, 0);
      expect(res.bonusXP).toBeGreaterThanOrEqual(expected);
    });
  }
});
