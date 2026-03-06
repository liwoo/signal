import { describe, test, expect } from "vitest";
import { analyzeZen, buildZenMessage, calculateMissedXP, ZEN_RULES } from "./zen";

// ── Registry Tests ──

describe("zen rules registry", () => {
  test("has rules for all 6 steps", () => {
    const stepIds = [
      "chapter-01:scaffold",
      "chapter-01:location",
      "chapter-02:loop",
      "chapter-02:classify",
      "chapter-03:sumfunc",
      "chapter-03:validate",
    ];
    for (const id of stepIds) {
      expect(ZEN_RULES[id]).toBeDefined();
      expect(ZEN_RULES[id].length).toBeGreaterThan(0);
    }
  });

  test("returns empty for unknown step", () => {
    const result = analyzeZen("unknown:step", "any code");
    expect(result.bonusXP).toBe(0);
    expect(result.jolts).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  test("every rule has required fields", () => {
    for (const [stepId, rules] of Object.entries(ZEN_RULES)) {
      for (const rule of rules) {
        expect(rule.id, `${stepId}/${rule.id} missing id`).toBeTruthy();
        expect(rule.principle, `${stepId}/${rule.id} missing principle`).toBeTruthy();
        expect(rule.bonusXP, `${stepId}/${rule.id} bonusXP must be > 0`).toBeGreaterThan(0);
        expect(rule.jolt, `${stepId}/${rule.id} missing jolt`).toBeTruthy();
        expect(rule.suggestion, `${stepId}/${rule.id} missing suggestion`).toBeTruthy();
        expect(typeof rule.check, `${stepId}/${rule.id} check not function`).toBe("function");
      }
    }
  });

  test("max possible XP per step", () => {
    const maxXP: Record<string, number> = {
      "chapter-01:scaffold": 15,   // 10 + 3 + 2
      "chapter-01:location": 35,   // 10 + 15 + 10
      "chapter-02:loop": 5,        // 5
      "chapter-02:classify": 25,   // 15 + 10
      "chapter-03:sumfunc": 25,    // 10 + 5 + 10
      "chapter-03:validate": 25,   // 15 + 10
    };
    for (const [stepId, expected] of Object.entries(maxXP)) {
      const total = ZEN_RULES[stepId].reduce((sum, r) => sum + r.bonusXP, 0);
      expect(total, `${stepId} max XP`).toBe(expected);
    }
  });
});

// ── Chapter 01: Scaffold ──

describe("chapter-01:scaffold — zen detection", () => {
  const STEP = "chapter-01:scaffold";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "perfect: grouped import + blank after package + blank after import",
      code: `package main

import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`,
      expectedXP: 15,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "grouped import, no blank lines (crammed)",
      code: `package main
import (
  "fmt"
)
func main() {
  fmt.Println("hello")
}`,
      expectedXP: 10,
      joltCount: 1,
      suggestionCount: 2,
    },
    {
      name: "non-grouped import, with all blank lines",
      code: `package main

import "fmt"

func main() {
  fmt.Println("hello")
}`,
      expectedXP: 5,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "minimal: non-grouped, no blank lines",
      code: `package main
import "fmt"
func main() {}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 3,
    },
    {
      name: "grouped with multiple imports + clean structure",
      code: `package main

import (
  "fmt"
  "strings"
)

func main() {
  fmt.Println(strings.ToUpper("hello"))
}`,
      expectedXP: 15,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "tab-indented grouped import + clean structure",
      code: `package main

import (
\t"fmt"
)

func main() {
\tfmt.Println("hello")
}`,
      expectedXP: 15,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "grouped import + blank after package only (no blank after import)",
      code: `package main

import (
  "fmt"
)
func main() {
  fmt.Println("hello")
}`,
      expectedXP: 13,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "grouped import + blank after import only (no blank after package)",
      code: `package main
import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`,
      expectedXP: 12,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "starter code comments then clean code",
      code: `// write a valid Go program skeleton
// every .go file needs three things:
// 1. package declaration
// 2. import statement (we need "fmt")
// 3. func main() { }
package main

import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`,
      expectedXP: 15,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "starter code comments, player skips blank after package",
      code: `// 3. func main() { }
package main
import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`,
      expectedXP: 12,
      joltCount: 2,
      suggestionCount: 1,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }

  test("suggestion for package sep is specific, not generic", () => {
    const code = `package main
import (
  "fmt"
)

func main() {}`;
    const result = analyzeZen(STEP, code);
    // Should suggest blank after package, NOT "add blank lines between everything"
    const packageSugg = result.suggestions.find(s => s.includes("package"));
    expect(packageSugg).toBeTruthy();
    expect(packageSugg).toContain("blank line after");
  });

  test("suggestion for import sep is specific, not generic", () => {
    const code = `package main

import (
  "fmt"
)
func main() {}`;
    const result = analyzeZen(STEP, code);
    const importSugg = result.suggestions.find(s => s.includes("import") && s.includes("func"));
    expect(importSugg).toBeTruthy();
  });
});

// ── Chapter 01: Location ──

describe("chapter-01:location — zen detection", () => {
  const STEP = "chapter-01:location";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "perfect: const + Printf + descriptive names",
      code: `package main

import "fmt"

func main() {
  const cell = "B-09"
  const sublevel = 3
  fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`,
      expectedXP: 35,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "const + Println (no Printf) + descriptive names",
      code: `package main

import "fmt"

func main() {
  const cell = "B-09"
  const sublevel = "3"
  fmt.Println("CELL " + cell + " · SUBLEVEL " + sublevel)
}`,
      expectedXP: 20,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "var with := + Printf + descriptive names",
      code: `package main

import "fmt"

func main() {
  cell := "B-09"
  level := 3
  fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, level)
}`,
      expectedXP: 35,  // := counts as named values
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "single-letter vars + Println concatenation",
      code: `package main

import "fmt"

func main() {
  x := "B-09"
  fmt.Println("CELL " + x + " · SUBLEVEL 3")
}`,
      expectedXP: 10,  // := with literal triggers use_named_values
      joltCount: 1,
      suggestionCount: 2,  // misses printf + descriptive_names
    },
    {
      name: "hard-coded string, no variables at all",
      code: `package main

import "fmt"

func main() {
  fmt.Println("CELL B-09 · SUBLEVEL 3")
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 3,
    },
    {
      name: "const + Printf with %v verb + descriptive name",
      code: `package main

import "fmt"

func main() {
  const cell = "B-09"
  const floor = 3
  fmt.Printf("CELL %v · SUBLEVEL %v\\n", cell, floor)
}`,
      expectedXP: 35,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "const + Printf + 'location' in variable name",
      code: `package main

import "fmt"

func main() {
  const location = "B-09"
  const sub = 3
  fmt.Printf("CELL %s · SUBLEVEL %d\\n", location, sub)
}`,
      expectedXP: 35,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "mixed: var for one, const for other",
      code: `package main

import "fmt"

func main() {
  const cell = "B-09"
  sublevel := 3
  fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`,
      expectedXP: 35,
      joltCount: 3,
      suggestionCount: 0,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }
});

// ── Chapter 02: Loop ──

describe("chapter-02:loop — zen detection", () => {
  const STEP = "chapter-02:loop";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "idiomatic: i++",
      code: `package main

import "fmt"

func main() {
  for i := 1; i <= 10; i++ {
    fmt.Println(i)
  }
}`,
      expectedXP: 5,
      joltCount: 1,
      suggestionCount: 0,
    },
    {
      name: "non-idiomatic: i += 1",
      code: `package main

import "fmt"

func main() {
  for i := 1; i <= 10; i += 1 {
    fmt.Println(i)
  }
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 1,
    },
    {
      name: "non-idiomatic: i = i + 1",
      code: `package main

import "fmt"

func main() {
  for i := 1; i <= 10; i = i + 1 {
    fmt.Println(i)
  }
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 1,
    },
    {
      name: "while-style loop with i++",
      code: `package main

import "fmt"

func main() {
  i := 1
  for i <= 10 {
    fmt.Println(i)
    i++
  }
}`,
      expectedXP: 5,
      joltCount: 1,
      suggestionCount: 0,
    },
    {
      name: "while-style loop without i++",
      code: `package main

import "fmt"

func main() {
  i := 1
  for i <= 10 {
    fmt.Println(i)
    i += 1
  }
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 1,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }
});

// ── Chapter 02: Classify ──

describe("chapter-02:classify — zen detection", () => {
  const STEP = "chapter-02:classify";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "perfect: switch without break",
      code: `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
  case i <= 6:
    fmt.Println(i, "WARN")
  case i <= 9:
    fmt.Println(i, "GRANT")
  default:
    fmt.Println(i, "OVERRIDE")
  }
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "switch WITH break (C-style habit)",
      code: `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
    break
  case i <= 6:
    fmt.Println(i, "WARN")
    break
  case i <= 9:
    fmt.Println(i, "GRANT")
    break
  default:
    fmt.Println(i, "OVERRIDE")
    break
  }
}`,
      expectedXP: 15,
      joltCount: 1,
      suggestionCount: 1,
    },
    {
      name: "switch on variable (switch i)",
      code: `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
  case i <= 6:
    fmt.Println(i, "WARN")
  case i <= 9:
    fmt.Println(i, "GRANT")
  default:
    fmt.Println(i, "OVERRIDE")
  }
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "if-else chain (no switch)",
      code: `for i := 1; i <= 10; i++ {
  if i <= 3 {
    fmt.Println(i, "DENY")
  } else if i <= 6 {
    fmt.Println(i, "WARN")
  } else if i <= 9 {
    fmt.Println(i, "GRANT")
  } else {
    fmt.Println(i, "OVERRIDE")
  }
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 2,
    },
    {
      name: "if-else with break keyword elsewhere (string matching edge)",
      code: `for i := 1; i <= 10; i++ {
  if i <= 3 {
    fmt.Println(i, "DENY")
  } else {
    // don't break here
    fmt.Println(i, "GRANT")
  }
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 2,
    },
    {
      name: "switch with one case having break, others not",
      code: `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
    break
  case i <= 6:
    fmt.Println(i, "WARN")
  default:
    fmt.Println(i, "OVERRIDE")
  }
}`,
      expectedXP: 15,
      joltCount: 1,
      suggestionCount: 1,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }
});

// ── Chapter 03: Sum Function ──

describe("chapter-03:sumfunc — zen detection", () => {
  const STEP = "chapter-03:sumfunc";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "perfect: _, c := range, pure function",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total
}`,
      expectedXP: 25,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "range with _, v (single letter v)",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for _, v := range codes {
    total += v
  }
  return total
}`,
      expectedXP: 25,
      joltCount: 3,
      suggestionCount: 0,
    },
    {
      name: "C-style loop, no range, pure function",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for index := 0; index < len(codes); index++ {
    total += codes[index]
  }
  return total
}`,
      expectedXP: 10,
      joltCount: 1,
      suggestionCount: 2,
    },
    {
      name: "range with long variable names",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for index, codeValue := range codes {
    _ = index
    total += codeValue
  }
  return total
}`,
      expectedXP: 10,
      joltCount: 1,
      suggestionCount: 2,
    },
    {
      name: "prints inside function (not single purpose)",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  fmt.Println("Sum:", total)
  return total
}`,
      expectedXP: 15,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "Printf inside function (not single purpose)",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
    fmt.Printf("Running total: %d\\n", total)
  }
  return total
}`,
      expectedXP: 15,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "worst case: C-style, prints, long names",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for index := 0; index < len(codes); index++ {
    total += codes[index]
    fmt.Println(total)
  }
  return total
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 3,
    },
    {
      name: "range with _, but uses Println (2 of 3 rules)",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  fmt.Println(total)
  return total
}`,
      expectedXP: 15,
      joltCount: 2,
      suggestionCount: 1,
    },
    {
      name: "range without underscore: i, c := range",
      code: `func sumCodes(codes ...int) int {
  total := 0
  for i, c := range codes {
    _ = i
    total += c
  }
  return total
}`,
      expectedXP: 20,
      joltCount: 2,
      suggestionCount: 1,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }
});

// ── Chapter 03: Validate ──

describe("chapter-03:validate — zen detection", () => {
  const STEP = "chapter-03:validate";

  const entries: Array<{
    name: string;
    code: string;
    expectedXP: number;
    joltCount: number;
    suggestionCount: number;
  }> = [
    {
      name: "perfect: direct bool return + calls sumCodes",
      code: `func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  return total, total > 100
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "calls sumCodes but uses if/else for bool",
      code: `func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  if total > 100 {
    return total, true
  }
  return total, false
}`,
      expectedXP: 10,
      joltCount: 1,
      suggestionCount: 1,
    },
    {
      name: "direct bool return but reimplements sum",
      code: `func validateCode(codes ...int) (int, bool) {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total, total > 100
}`,
      expectedXP: 15,
      joltCount: 1,
      suggestionCount: 1,
    },
    {
      name: "worst: if/else + reimplements sum",
      code: `func validateCode(codes ...int) (int, bool) {
  total := 0
  for _, c := range codes {
    total += c
  }
  if total > 100 {
    return total, true
  }
  return total, false
}`,
      expectedXP: 0,
      joltCount: 0,
      suggestionCount: 2,
    },
    {
      name: "direct bool with >= comparison + sumCodes",
      code: `func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  return total, total >= 100
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "direct bool with != comparison + sumCodes",
      code: `func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  return total, total != 0
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "named return values with direct bool + sumCodes",
      code: `func validateCode(codes ...int) (total int, valid bool) {
  total = sumCodes(codes...)
  return total, total > 100
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
    {
      name: "passes codes... to sumCodes correctly",
      code: `func validateCode(codes ...int) (int, bool) {
  s := sumCodes(codes...)
  return s, s > 100
}`,
      expectedXP: 25,
      joltCount: 2,
      suggestionCount: 0,
    },
  ];

  for (const entry of entries) {
    test(entry.name, () => {
      const result = analyzeZen(STEP, entry.code);
      expect(result.bonusXP, "bonusXP").toBe(entry.expectedXP);
      expect(result.jolts.length, "jolt count").toBe(entry.joltCount);
      expect(result.suggestions.length, "suggestion count").toBe(entry.suggestionCount);
    });
  }
});

// ── Full Program Tests (realistic end-to-end submissions) ──

describe("full program submissions — realistic player code", () => {
  test("ch01 scaffold: beginner pastes from tutorial", () => {
    const code = `package main
import "fmt"
func main() { fmt.Println("hello") }`;
    const result = analyzeZen("chapter-01:scaffold", code);
    expect(result.bonusXP).toBe(0);
    expect(result.suggestions.length).toBe(3);
  });

  test("ch01 scaffold: experienced dev writes clean go", () => {
    const code = `package main

import (
\t"fmt"
)

func main() {
\tfmt.Println("hello")
}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    expect(result.bonusXP).toBe(15);
    expect(result.suggestions.length).toBe(0);
  });

  test("ch01 scaffold: player groups import but skips blank after package", () => {
    const code = `package main
import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    // Should get credit for grouped import + import/func sep
    expect(result.bonusXP).toBe(12); // 10 + 0 + 2
    expect(result.jolts.length).toBe(2);
    expect(result.suggestions.length).toBe(1);
    // Suggestion should be specific to package spacing
    expect(result.suggestions[0]).toContain("package");
  });

  test("ch01 scaffold: player groups import but skips blank after import", () => {
    const code = `package main

import (
  "fmt"
)
func main() {
  fmt.Println("hello")
}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    // Should get credit for grouped import + package sep
    expect(result.bonusXP).toBe(13); // 10 + 3 + 0
    expect(result.jolts.length).toBe(2);
    expect(result.suggestions.length).toBe(1);
    // Suggestion should be specific to import/func spacing
    expect(result.suggestions[0]).toContain("import");
  });

  test("ch01 location: player uses string interpolation via Sprintf", () => {
    const code = `package main

import "fmt"

func main() {
  const cell = "B-09"
  const sublevel = 3
  msg := fmt.Sprintf("CELL %s · SUBLEVEL %d", cell, sublevel)
  fmt.Println(msg)
}`;
    const result = analyzeZen("chapter-01:location", code);
    // has const + descriptive names, but Sprintf not Printf (no format verb in Printf call)
    expect(result.bonusXP).toBe(20);
  });

  test("ch02 classify: Python dev writes if-elif style", () => {
    const code = `for i := 1; i <= 10; i++ {
  if i <= 3 {
    fmt.Println(i, "DENY")
  } else if i <= 6 {
    fmt.Println(i, "WARN")
  } else if i <= 9 {
    fmt.Println(i, "GRANT")
  } else {
    fmt.Println(i, "OVERRIDE")
  }
}`;
    const result = analyzeZen("chapter-02:classify", code);
    expect(result.bonusXP).toBe(0);
    expect(result.suggestions.length).toBe(2);
  });

  test("ch02 classify: Java dev writes switch with breaks", () => {
    const code = `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
    break
  case i <= 6:
    fmt.Println(i, "WARN")
    break
  default:
    fmt.Println(i, "OVERRIDE")
  }
}`;
    const result = analyzeZen("chapter-02:classify", code);
    expect(result.bonusXP).toBe(15);
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0]).toContain("break");
  });

  test("ch03 sumfunc: player writes textbook idiomatic Go", () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total
}

func main() {
  sum := sumCodes(25, 30, 50, 10)
  fmt.Println("Sum:", sum)
}`;
    const result = analyzeZen("chapter-03:sumfunc", code);
    expect(result.bonusXP).toBe(25);
    expect(result.jolts.length).toBe(3);
  });

  test("ch03 validate: full program with both functions, max zen", () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total
}

func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  return total, total > 100
}

func main() {
  sum := sumCodes(25, 30, 50, 10)
  fmt.Println("Sum:", sum)
  total, valid := validateCode(25, 30, 50, 10)
  fmt.Printf("Result: %d, Valid: %v\\n", total, valid)
}`;
    const result = analyzeZen("chapter-03:validate", code);
    expect(result.bonusXP).toBe(25);
    expect(result.jolts.length).toBe(2);
    expect(result.suggestions.length).toBe(0);
  });

  test("ch03 validate: full program, non-idiomatic validate", () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total
}

func validateCode(codes ...int) (int, bool) {
  total := 0
  for _, c := range codes {
    total += c
  }
  if total > 100 {
    return total, true
  }
  return total, false
}

func main() {
  sum := sumCodes(25, 30, 50, 10)
  fmt.Println("Sum:", sum)
  total, valid := validateCode(25, 30, 50, 10)
  fmt.Println(total, valid)
}`;
    const result = analyzeZen("chapter-03:validate", code);
    expect(result.bonusXP).toBe(0);
    expect(result.suggestions.length).toBe(2);
  });
});

// ── XP Accumulation Across Steps ──

describe("cumulative zen XP across a full chapter", () => {
  test("chapter 1: perfect code on both steps", () => {
    const scaffoldCode = `package main

import (
  "fmt"
)

func main() {
}`;
    const locationCode = `package main

import (
  "fmt"
)

func main() {
  const cell = "B-09"
  const sublevel = 3
  fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`;
    const r1 = analyzeZen("chapter-01:scaffold", scaffoldCode);
    const r2 = analyzeZen("chapter-01:location", locationCode);
    const total = r1.bonusXP + r2.bonusXP;
    expect(total).toBe(50); // 15 + 35
  });

  test("chapter 1: minimal code on both steps", () => {
    const scaffoldCode = `package main
import "fmt"
func main() {}`;
    const locationCode = `package main
import "fmt"
func main() {
  fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r1 = analyzeZen("chapter-01:scaffold", scaffoldCode);
    const r2 = analyzeZen("chapter-01:location", locationCode);
    const total = r1.bonusXP + r2.bonusXP;
    expect(total).toBe(0);
  });

  test("chapter 2: perfect code on both steps", () => {
    const loopCode = `for i := 1; i <= 10; i++ {
  fmt.Println(i)
}`;
    const classifyCode = `for i := 1; i <= 10; i++ {
  switch {
  case i <= 3:
    fmt.Println(i, "DENY")
  case i <= 6:
    fmt.Println(i, "WARN")
  case i <= 9:
    fmt.Println(i, "GRANT")
  default:
    fmt.Println(i, "OVERRIDE")
  }
}`;
    const r1 = analyzeZen("chapter-02:loop", loopCode);
    const r2 = analyzeZen("chapter-02:classify", classifyCode);
    const total = r1.bonusXP + r2.bonusXP;
    expect(total).toBe(30); // 5 + 25
  });

  test("chapter 3: perfect code on both steps", () => {
    const sumCode = `func sumCodes(codes ...int) int {
  total := 0
  for _, c := range codes {
    total += c
  }
  return total
}`;
    const validateCode = `func validateCode(codes ...int) (int, bool) {
  total := sumCodes(codes...)
  return total, total > 100
}`;
    const r1 = analyzeZen("chapter-03:sumfunc", sumCode);
    const r2 = analyzeZen("chapter-03:validate", validateCode);
    const total = r1.bonusXP + r2.bonusXP;
    expect(total).toBe(50); // 25 + 25
  });

  test("all chapters perfect = 130 total zen XP", () => {
    const maxPerStep: Record<string, number> = {
      "chapter-01:scaffold": 15,
      "chapter-01:location": 35,
      "chapter-02:loop": 5,
      "chapter-02:classify": 25,
      "chapter-03:sumfunc": 25,
      "chapter-03:validate": 25,
    };
    const grandTotal = Object.values(maxPerStep).reduce((a, b) => a + b, 0);
    expect(grandTotal).toBe(130);
  });
});

// ── buildZenMessage Tests ──

describe("buildZenMessage", () => {
  test("returns null for empty result", () => {
    expect(buildZenMessage({ bonusXP: 0, jolts: [], suggestions: [] })).toBeNull();
  });

  test("includes XP label when bonus > 0", () => {
    const msg = buildZenMessage({
      bonusXP: 15,
      jolts: ["some jolt"],
      suggestions: [],
    });
    expect(msg).toContain("[ZEN +15 XP]");
  });

  test("includes ALL jolts, not just the first", () => {
    const msg = buildZenMessage({
      bonusXP: 20,
      jolts: ["first jolt about imports", "second jolt about structure"],
      suggestions: [],
    });
    expect(msg).toContain("first jolt about imports");
    expect(msg).toContain("second jolt about structure");
  });

  test("includes three jolts when all rules pass", () => {
    const msg = buildZenMessage({
      bonusXP: 15,
      jolts: ["jolt one", "jolt two", "jolt three"],
      suggestions: [],
    });
    expect(msg).toContain("jolt one");
    expect(msg).toContain("jolt two");
    expect(msg).toContain("jolt three");
  });

  test("frames suggestion as memory trying to return when no jolts", () => {
    const msg = buildZenMessage({
      bonusXP: 0,
      jolts: [],
      suggestions: ["try this instead"],
    });
    expect(msg).toContain("something's trying to come back");
    expect(msg).toContain("try this instead");
    expect(msg).not.toContain("[ZEN");
  });

  test("adds suggestion as 'one more thing' when jolts exist", () => {
    const msg = buildZenMessage({
      bonusXP: 10,
      jolts: ["nice work on the switch"],
      suggestions: ["but remove the breaks"],
    });
    expect(msg).toContain("nice work on the switch");
    expect(msg).toContain("one more thing");
    expect(msg).toContain("but remove the breaks");
    expect(msg).toContain("[ZEN +10 XP]");
  });

  test("no XP label when bonus is 0 but suggestions exist", () => {
    const msg = buildZenMessage({
      bonusXP: 0,
      jolts: [],
      suggestions: ["use switch"],
    });
    expect(msg).not.toContain("[ZEN");
  });

  test("only one suggestion even when multiple exist", () => {
    const msg = buildZenMessage({
      bonusXP: 0,
      jolts: [],
      suggestions: ["first suggestion", "second suggestion", "third suggestion"],
    });
    expect(msg).toContain("first suggestion");
    expect(msg).not.toContain("second suggestion");
    expect(msg).not.toContain("third suggestion");
  });

  test("includes missedXP when provided", () => {
    const msg = buildZenMessage(
      { bonusXP: 10, jolts: ["nice"], suggestions: [] },
      5
    );
    expect(msg).toContain("+5 more XP");
  });

  test("excludes missedXP when 0", () => {
    const msg = buildZenMessage(
      { bonusXP: 15, jolts: ["nice"], suggestions: [] },
      0
    );
    expect(msg).not.toContain("more XP");
  });
});

// ── calculateMissedXP Tests ──

describe("calculateMissedXP", () => {
  test("returns 0 when all rules pass", () => {
    const code = `package main

import (
  "fmt"
)

func main() {
  fmt.Println("hello")
}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    expect(calculateMissedXP("chapter-01:scaffold", result)).toBe(0);
  });

  test("returns max XP when no rules pass", () => {
    const result = analyzeZen("chapter-01:scaffold", "package main\nimport \"fmt\"\nfunc main() {}");
    expect(calculateMissedXP("chapter-01:scaffold", result)).toBe(15);
  });

  test("returns difference for partial pass", () => {
    const code = `package main
import (
  "fmt"
)

func main() {}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    // grouped import (10) + import sep (2) = 12, missed package sep (3)
    expect(calculateMissedXP("chapter-01:scaffold", result)).toBe(3);
  });

  test("returns 0 for unknown step", () => {
    const result = analyzeZen("unknown:step", "any");
    expect(calculateMissedXP("unknown:step", result)).toBe(0);
  });
});

// ── Edge Cases ──

describe("edge cases", () => {
  test("empty code string", () => {
    const result = analyzeZen("chapter-01:scaffold", "");
    expect(result.bonusXP).toBe(0);
    expect(result.suggestions.length).toBe(3);
  });

  test("code with only comments", () => {
    const result = analyzeZen("chapter-01:scaffold", "// just a comment\n// another one");
    expect(result.bonusXP).toBe(0);
  });

  test("code with extra whitespace everywhere", () => {
    const code = `package main

import (
  "fmt"
)

func main() {


  fmt.Println("hello")


}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    // grouped import + both seps still pass with extra whitespace
    expect(result.bonusXP).toBe(15);
  });

  test("code with windows line endings", () => {
    const code = "package main\r\n\r\nimport (\r\n  \"fmt\"\r\n)\r\n\r\nfunc main() {\r\n}";
    const result = analyzeZen("chapter-01:scaffold", code);
    // grouped import should still be detected
    expect(result.jolts.length).toBeGreaterThanOrEqual(1);
  });

  test("validateCode without closing brace on own line", () => {
    // The regex expects \n} — inline closing won't match
    const code = `func validateCode(codes ...int) (int, bool) { total := sumCodes(codes...); return total, total > 100 }`;
    const result = analyzeZen("chapter-03:validate", code);
    // regex won't match the inline form
    expect(result.bonusXP).toBe(0);
  });

  test("sumCodes regex doesn't match different function names", () => {
    const code = `func addNumbers(nums ...int) int {
  total := 0
  for _, n := range nums {
    total += n
  }
  return total
}`;
    const result = analyzeZen("chapter-03:sumfunc", code);
    // short_var_loop and underscore_unused pass, but single_purpose checks sumCodes specifically
    expect(result.bonusXP).toBe(15); // 10 + 5, not 25 (single_purpose fails)
  });

  test("single-line grouped import still detects grouped import", () => {
    const code = `package main

import ("fmt")

func main() {}`;
    const result = analyzeZen("chapter-01:scaffold", code);
    // groupedImport passes, but import sep depends on detection
    expect(result.bonusXP).toBeGreaterThanOrEqual(10); // at minimum grouped import
  });
});

// ── Jolt/Suggestion Content Quality ──

describe("jolt and suggestion content", () => {
  test("jolts affirm what the player did (not suggest)", () => {
    for (const [stepId, rules] of Object.entries(ZEN_RULES)) {
      for (const rule of rules) {
        // Jolts should contain affirmative language
        const lower = rule.jolt.toLowerCase();
        const hasAffirmation =
          lower.includes("you ") ||
          lower.includes("good") ||
          lower.includes("that's") ||
          lower.includes("the ") ||
          lower.includes("...") ||
          lower.includes("no ");
        expect(hasAffirmation, `${stepId}/${rule.id} jolt should affirm, got: "${rule.jolt.substring(0, 50)}..."`).toBe(true);
      }
    }
  });

  test("suggestions contain actionable advice (not vague)", () => {
    for (const [stepId, rules] of Object.entries(ZEN_RULES)) {
      for (const rule of rules) {
        const lower = rule.suggestion.toLowerCase();
        const hasAction =
          lower.includes("try") ||
          lower.includes("use") ||
          lower.includes("add") ||
          lower.includes("remove") ||
          lower.includes("call") ||
          lower.includes("keep") ||
          lower.includes("but") ||
          lower.includes("instead");
        expect(hasAction, `${stepId}/${rule.id} suggestion should be actionable, got: "${rule.suggestion.substring(0, 50)}..."`).toBe(true);
      }
    }
  });

  test("suggestions contain code examples", () => {
    for (const [stepId, rules] of Object.entries(ZEN_RULES)) {
      for (const rule of rules) {
        const hasCode = rule.suggestion.includes("`");
        expect(hasCode, `${stepId}/${rule.id} suggestion should include code example`).toBe(true);
      }
    }
  });
});
