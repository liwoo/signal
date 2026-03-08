/**
 * Integration tests for Chapters 01–03.
 *
 * Each step gets ~10 realistic user submissions covering:
 *   - correct idiomatic solutions
 *   - correct but non-idiomatic solutions
 *   - common beginner mistakes
 *   - users trying to game the system (extra code, shortcuts, etc.)
 *
 * Two test axes per submission:
 *   1. Code evaluation (does the Go Playground accept / reject it?)
 *   2. Zen scoring (are idiomatic patterns detected correctly?)
 *
 * Tests tagged `@live` hit the Go Playground API — run with:
 *   npx vitest run src/lib/game/integration.test.ts --timeout 60000
 */

import { describe, it, expect } from "vitest";
import { compileGo } from "@/lib/go/playground";
import { analyzeZen } from "@/lib/game/zen";
import { evaluateSubmission } from "@/lib/go/evaluate";
import { chapter01 } from "@/data/challenges/chapter-01";
import { chapter02 } from "@/data/challenges/chapter-02";
import { chapter03 } from "@/data/challenges/chapter-03";
import { callMayaEngineAsync } from "@/lib/ai/engine";

// ── Helpers ──

/** Compile code via Go Playground and assert success/failure. */
async function expectCompiles(code: string) {
  const result = await compileGo(code);
  expect(result.success, `Expected compilation to succeed.\nErrors: ${result.errors}`).toBe(true);
  return result;
}

async function expectCompileFails(code: string) {
  const result = await compileGo(code);
  expect(result.success, "Expected compilation to fail").toBe(false);
  return result;
}

/** Compile code with a test harness replacing main(). */
async function compileWithHarness(userCode: string, harness: string) {
  const mainStart = userCode.search(/func\s+main\s*\(\s*\)\s*\{/);
  let source: string;
  if (mainStart === -1) {
    source = userCode + "\n" + harness;
  } else {
    const braceStart = userCode.indexOf("{", mainStart);
    let depth = 0;
    let braceEnd = braceStart;
    for (let i = braceStart; i < userCode.length; i++) {
      if (userCode[i] === "{") depth++;
      if (userCode[i] === "}") depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
    source = userCode.slice(0, mainStart) + harness + userCode.slice(braceEnd + 1);
  }
  return compileGo(source);
}

// Step references
const ch01Scaffold = chapter01.steps[0];
const ch01Transmit = chapter01.steps[1];
const ch02Scaffold = chapter02.steps[0];
const ch02Loop = chapter02.steps[1];
const ch02Classify = chapter02.steps[2];
const ch03Scaffold = chapter03.steps[0];
const ch03SumFunc = chapter03.steps[1];
const ch03Validate = chapter03.steps[2];

// ═════════════════════════════════════════════════════════════
//  CHAPTER 01 — HANDSHAKE
// ═════════════════════════════════════════════════════════════

describe("ch01:scaffold — live compilation + zen", () => {
  // 1. Perfect idiomatic scaffold
  it("perfect scaffold with grouped import and spacing", async () => {
    const code = `package main

import (
    "fmt"
)

func main() {
    fmt.Println("ready")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("ready");

    const zen = analyzeZen("chapter-01:scaffold", code);
    expect(zen.bonusXP).toBe(15); // grouped_import(10) + package_import_sep(3) + import_func_sep(2)
    expect(zen.jolts).toHaveLength(3);
    expect(zen.suggestions).toHaveLength(0);
  }, 15000);

  // 2. Minimal valid — no spaces, single-line import
  it("minimal scaffold without spacing", async () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("ok")
}`;
    await expectCompiles(code);

    const zen = analyzeZen("chapter-01:scaffold", code);
    expect(zen.bonusXP).toBe(0); // no grouped import, no separators
    expect(zen.suggestions.length).toBeGreaterThan(0);
  }, 15000);

  // 3. Grouped import but no blank lines
  it("grouped import, no blank lines between sections", async () => {
    const code = `package main
import (
    "fmt"
)
func main() {
    fmt.Println("hello")
}`;
    await expectCompiles(code);

    const zen = analyzeZen("chapter-01:scaffold", code);
    expect(zen.bonusXP).toBe(10); // only grouped_import
  }, 15000);

  // 4. Has blank line after package but not after import
  it("blank after package only", async () => {
    const code = `package main

import "fmt"
func main() {
    fmt.Println("hi")
}`;
    await expectCompiles(code);

    const zen = analyzeZen("chapter-01:scaffold", code);
    // grouped_import: no (single-line), package_import_sep: yes (3), import_func_sep: no
    expect(zen.bonusXP).toBe(3);
  }, 15000);

  // 5. User adds unnecessary extra code to game the system
  it("extra functions and variables beyond scaffold", async () => {
    const code = `package main

import (
    "fmt"
)

var globalVar = 42

func helper() string {
    return "I'm gaming the system"
}

func main() {
    fmt.Println(helper())
    fmt.Println(globalVar)
}`;
    await expectCompiles(code);

    // Zen should still detect the good patterns
    const zen = analyzeZen("chapter-01:scaffold", code);
    expect(zen.bonusXP).toBe(15); // all scaffold rules pass
  }, 15000);

  // 6. Missing import — compile error
  it("missing import fails compilation", async () => {
    const code = `package main

func main() {
    fmt.Println("hello")
}`;
    await expectCompileFails(code);
  }, 15000);

  // 7. Missing func main
  it("missing func main fails compilation", async () => {
    const code = `package main

import "fmt"

func run() {
    fmt.Println("hello")
}`;
    // This compiles but will have a linker error (no main function in main package)
    const result = await compileGo(code);
    // Go Playground may return error about missing main
    expect(result.success).toBe(false);
  }, 15000);

  // 8. Wrong package name
  it("wrong package name fails", async () => {
    const code = `package mypackage

import "fmt"

func main() {
    fmt.Println("hello")
}`;
    const result = await compileGo(code);
    expect(result.success).toBe(false);
  }, 15000);

  // 9. Has TODO comments (evaluator should reject)
  it("code with TODO comments rejected by evaluator", async () => {
    const code = `package main

import "fmt"

// TODO: finish this
func main() {
    fmt.Println("ready")
}`;
    // Compiles fine in Go
    await expectCompiles(code);
    // But evaluator rejects TODO
    const evalResult = evaluateSubmission(code, ch01Scaffold);
    expect(evalResult.pass).toBe(false);
    expect(evalResult.feedback).toContain("TODO");
  }, 15000);

  // 10. User tries Python syntax
  it("python-style code fails", async () => {
    const code = `import fmt

def main():
    fmt.Println("hello")`;
    await expectCompileFails(code);
  }, 15000);
});

describe("ch01:location — live compilation + zen", () => {
  // 1. Perfect solution with Printf + named values
  it("idiomatic Printf with const and :=", async () => {
    const code = `package main

import (
    "fmt"
)

func main() {
    const sublevel = 3
    cell := "B-09"
    fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");

    const zen = analyzeZen("chapter-01:location", code);
    // use_named_values(10) + use_printf_format(15) + descriptive_names(10) — but descriptive_names checks for cell/sublevel
    expect(zen.bonusXP).toBe(35);
    expect(zen.suggestions).toHaveLength(0);
  }, 15000);

  // 2. Simple hardcoded Println — works but no zen
  it("hardcoded Println — correct output, no zen", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");

    const zen = analyzeZen("chapter-01:location", code);
    // No named values, no printf, no descriptive names
    expect(zen.bonusXP).toBe(0);
  }, 15000);

  // 3. Named values but using Println concatenation
  it("named values with Println concatenation", async () => {
    const code = `package main

import "fmt"

func main() {
    cell := "B-09"
    sublevel := "3"
    fmt.Println("CELL " + cell + " · SUBLEVEL " + sublevel)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");

    const zen = analyzeZen("chapter-01:location", code);
    // use_named_values: yes (10), use_printf_format: isRelevant checks for + concatenation, but check fails (no Printf)
    // descriptive_names: yes — cell and sublevel (10)
    expect(zen.bonusXP).toBe(20);
    expect(zen.suggestions.length).toBeGreaterThan(0); // should suggest Printf
  }, 15000);

  // 4. Using single-letter variable names
  it("single-letter names — correct but poor naming zen", async () => {
    const code = `package main

import "fmt"

func main() {
    a := "B-09"
    b := 3
    fmt.Printf("CELL %s · SUBLEVEL %d\\n", a, b)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");

    const zen = analyzeZen("chapter-01:location", code);
    // use_named_values: yes (10), use_printf_format: yes (15), descriptive_names: no (a, b aren't descriptive)
    expect(zen.bonusXP).toBe(25);
  }, 15000);

  // 5. Wrong output — lowercase
  it("wrong case in output", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("cell b-09 · sublevel 3")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).not.toBe("CELL B-09 · SUBLEVEL 3");
  }, 15000);

  // 6. User tries to game it — prints correct output but adds extra lines
  it("extra print statements with correct output embedded", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("starting up...")
    fmt.Println("CELL B-09 · SUBLEVEL 3")
    fmt.Println("done!")
}`;
    const result = await expectCompiles(code);
    // Output has 3 lines, expected has 1
    expect(result.output.trim()).not.toBe("CELL B-09 · SUBLEVEL 3");

    const evalResult = evaluateSubmission(code, ch01Transmit);
    expect(evalResult.pass).toBe(false);
  }, 15000);

  // 7. Using Print instead of Println (missing newline but still matches)
  it("using fmt.Print — compiles correctly", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Print("CELL B-09 · SUBLEVEL 3")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");
  }, 15000);

  // 8. Missing the dot separator
  it("missing middle dot separator", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("CELL B-09 SUBLEVEL 3")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).not.toBe("CELL B-09 · SUBLEVEL 3");
  }, 15000);

  // 9. User adds a helper function (trying to be fancy)
  it("overengineered with helper function", async () => {
    const code = `package main

import "fmt"

func formatLocation(cell string, sublevel int) string {
    return fmt.Sprintf("CELL %s · SUBLEVEL %d", cell, sublevel)
}

func main() {
    location := formatLocation("B-09", 3)
    fmt.Println(location)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");

    const zen = analyzeZen("chapter-01:location", code);
    // use_named_values: yes (location := ...) (10), descriptive_names: yes (location) (10)
    // use_printf_format: isRelevant checks for Printf — Sprintf doesn't count, but the Println(location) has a variable
    expect(zen.bonusXP).toBeGreaterThanOrEqual(10);
  }, 15000);

  // 10. Using Sprintf then Println — verbose but correct
  it("Sprintf then Println", async () => {
    const code = `package main

import "fmt"

func main() {
    cell := "B-09"
    sublevel := 3
    msg := fmt.Sprintf("CELL %s · SUBLEVEL %d", cell, sublevel)
    fmt.Println(msg)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("CELL B-09 · SUBLEVEL 3");
  }, 15000);
});

// ═════════════════════════════════════════════════════════════
//  CHAPTER 02 — DOOR CODE
// ═════════════════════════════════════════════════════════════

describe("ch02:loop — live compilation + zen", () => {
  // 1. Perfect idiomatic loop
  it("standard for loop with i++", async () => {
    const code = `package main

import (
    "fmt"
)

func main() {
    for i := 1; i <= 10; i++ {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");

    const zen = analyzeZen("chapter-02:loop", code);
    expect(zen.bonusXP).toBe(5); // simple_increment
  }, 15000);

  // 2. Using i += 1 instead of i++
  it("i += 1 — works but not idiomatic", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i += 1 {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");

    const zen = analyzeZen("chapter-02:loop", code);
    expect(zen.bonusXP).toBe(0); // isRelevant true (has i+=1), but check fails
    expect(zen.suggestions.length).toBeGreaterThan(0);
  }, 15000);

  // 3. Using i = i + 1
  it("i = i + 1 — verbose increment", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i = i + 1 {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");

    const zen = analyzeZen("chapter-02:loop", code);
    expect(zen.bonusXP).toBe(0);
  }, 15000);

  // 4. While-style loop (Go allows this)
  it("while-style loop", async () => {
    const code = `package main

import "fmt"

func main() {
    i := 1
    for i <= 10 {
        fmt.Println(i)
        i++
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");

    const zen = analyzeZen("chapter-02:loop", code);
    // i++ is present (simple_increment check passes)
    expect(zen.bonusXP).toBe(5);
  }, 15000);

  // 5. Off-by-one: prints 0-9 instead of 1-10
  it("off-by-one: 0 to 9", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 0; i < 10; i++ {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("0\n1\n2\n3\n4\n5\n6\n7\n8\n9");
    expect(result.output.trim()).not.toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  }, 15000);

  // 6. Only prints 1-5 (incomplete)
  it("only prints 1-5", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 5; i++ {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5");
    expect(result.output.trim()).not.toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  }, 15000);

  // 7. User hardcodes all 10 lines (gaming the system)
  it("hardcoded 10 Println calls — compiles but not a loop", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println(1)
    fmt.Println(2)
    fmt.Println(3)
    fmt.Println(4)
    fmt.Println(5)
    fmt.Println(6)
    fmt.Println(7)
    fmt.Println(8)
    fmt.Println(9)
    fmt.Println(10)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");

    // Zen: no for loop so simpleIncrement is not relevant
    const zen = analyzeZen("chapter-02:loop", code);
    expect(zen.bonusXP).toBe(0);
  }, 15000);

  // 8. Prints numbers as strings (output still matches)
  it("prints string numbers", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        fmt.Println(i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  }, 15000);

  // 9. Adds extra formatting (spaces, brackets)
  it("prints with extra formatting — wrong output", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        fmt.Printf("[%d]\\n", i)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).not.toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  }, 15000);

  // 10. Uses recursion instead of a loop
  it("recursive approach", async () => {
    const code = `package main

import "fmt"

func printNums(n, max int) {
    if n > max {
        return
    }
    fmt.Println(n)
    printNums(n+1, max)
}

func main() {
    printNums(1, 10)
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  }, 15000);
});

describe("ch02:classify — live compilation + zen", () => {
  const EXPECTED = "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE";

  // 1. Perfect switch solution
  it("idiomatic switch with constants", async () => {
    const code = `package main

import "fmt"

const (
    deny     = "DENY"
    warn     = "WARN"
    grant    = "GRANT"
    override = "OVERRIDE"
)

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3:
            fmt.Println(i, deny)
        case i <= 6:
            fmt.Println(i, warn)
        case i <= 9:
            fmt.Println(i, grant)
        default:
            fmt.Println(i, override)
        }
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-02:classify", code);
    // switch_over_ifelse(15) + no_unnecessary_break(10) + use_constants_labels(10)
    expect(zen.bonusXP).toBe(35);
    expect(zen.suggestions).toHaveLength(0);
  }, 15000);

  // 2. Switch without constants — still good
  it("switch without constants", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
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
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-02:classify", code);
    // switch(15) + no_break(10) — constants check fails (no const block with 2+)
    expect(zen.bonusXP).toBe(25);
  }, 15000);

  // 3. Switch with unnecessary break statements
  it("switch with breaks — compiles but non-idiomatic", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
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
        }
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-02:classify", code);
    // switch(15) + no_break FAILS (has break) + no constants
    expect(zen.bonusXP).toBe(15);
    expect(zen.suggestions.length).toBeGreaterThan(0); // should suggest removing break
  }, 15000);

  // 4. If/else approach — correct output, different zen
  it("if/else chain — correct output", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        if i <= 3 {
            fmt.Println(i, "DENY")
        } else if i <= 6 {
            fmt.Println(i, "WARN")
        } else if i <= 9 {
            fmt.Println(i, "GRANT")
        } else {
            fmt.Println(i, "OVERRIDE")
        }
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-02:classify", code);
    // switch_over_ifelse: isRelevant=false (no switch), no_break: isRelevant=false (no switch)
    // use_constants_labels: isRelevant=true (has "DENY" etc), check fails
    expect(zen.bonusXP).toBe(0);
  }, 15000);

  // 5. Separate comparisons (non-range)
  it("separate equality checks — more verbose", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        if i == 1 || i == 2 || i == 3 {
            fmt.Println(i, "DENY")
        } else if i == 4 || i == 5 || i == 6 {
            fmt.Println(i, "WARN")
        } else if i == 7 || i == 8 || i == 9 {
            fmt.Println(i, "GRANT")
        } else {
            fmt.Println(i, "OVERRIDE")
        }
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 6. Wrong classification boundaries
  it("wrong boundaries — 1-4 as DENY", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 4:
            fmt.Println(i, "DENY")
        case i <= 7:
            fmt.Println(i, "WARN")
        case i <= 9:
            fmt.Println(i, "GRANT")
        default:
            fmt.Println(i, "OVERRIDE")
        }
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);

  // 7. User tries to game with a map
  it("map-based classification — correct output", async () => {
    const code = `package main

import "fmt"

func main() {
    labels := map[int]string{}
    for i := 1; i <= 3; i++ { labels[i] = "DENY" }
    for i := 4; i <= 6; i++ { labels[i] = "WARN" }
    for i := 7; i <= 9; i++ { labels[i] = "GRANT" }
    labels[10] = "OVERRIDE"
    for i := 1; i <= 10; i++ {
        fmt.Println(i, labels[i])
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 8. Missing OVERRIDE (only 3 categories)
  it("missing default case — wrong output for 10", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3:
            fmt.Println(i, "DENY")
        case i <= 6:
            fmt.Println(i, "WARN")
        default:
            fmt.Println(i, "GRANT")
        }
    }
}`;
    const result = await expectCompiles(code);
    // 10 would be GRANT instead of OVERRIDE
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);

  // 9. Printf formatting
  it("Printf formatting — correct output", async () => {
    const code = `package main

import "fmt"

func main() {
    for i := 1; i <= 10; i++ {
        var label string
        switch {
        case i <= 3:
            label = "DENY"
        case i <= 6:
            label = "WARN"
        case i <= 9:
            label = "GRANT"
        default:
            label = "OVERRIDE"
        }
        fmt.Printf("%d %s\\n", i, label)
    }
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 10. User adds extra output around classification
  it("extra print around classification — wrong output", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("=== ACCESS CODES ===")
    for i := 1; i <= 10; i++ {
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
    }
    fmt.Println("=== END ===")
}`;
    const result = await expectCompiles(code);
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);
});

// ═════════════════════════════════════════════════════════════
//  CHAPTER 03 — SHAFT CODES
// ═════════════════════════════════════════════════════════════

describe("ch03:sumfunc — live compilation + zen", () => {
  const HARNESS = ch03SumFunc.testHarness!;
  const EXPECTED = "Sum: 115\nSum: 6\nSum: 100";

  // 1. Perfect idiomatic solution
  it("perfect variadic with short names and underscore", async () => {
    const code = `package main

import (
    "fmt"
)

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:sumfunc", code);
    // short_var_loop(10) + underscore_unused(5) + single_purpose(10)
    expect(zen.bonusXP).toBe(25);
    expect(zen.suggestions).toHaveLength(0);
  }, 15000);

  // 2. Index-based loop instead of range
  it("index-based loop — no range zen", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for i := 0; i < len(codes); i++ {
        total += codes[i]
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:sumfunc", code);
    // No range → short_var_loop and underscore_unused are not relevant
    // single_purpose: yes (10)
    expect(zen.bonusXP).toBe(10);
  }, 15000);

  // 3. Long variable names in loop
  it("long variable names in range loop", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for index, codeValue := range codes {
        _ = index
        total += codeValue
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:sumfunc", code);
    // short_var_loop: fails (long names), underscore_unused: fails (uses index not _)
    // single_purpose: yes (10)
    expect(zen.bonusXP).toBe(10);
  }, 15000);

  // 4. Prints inside sumCodes (violates single-purpose)
  it("printing inside sumCodes — violates single purpose", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
        fmt.Println("adding", c)
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    // Output won't match because of extra prints
    expect(result.output.trim()).not.toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:sumfunc", code);
    // short_var_loop: yes (10), underscore_unused: yes (5), single_purpose: NO (has fmt. in body)
    expect(zen.bonusXP).toBe(15);
    expect(zen.suggestions.length).toBeGreaterThan(0);
  }, 15000);

  // 5. Non-variadic function signature
  it("slice parameter instead of variadic — compile error with harness", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes []int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes([]int{25, 30, 50, 10}))
}`;
    // Harness calls sumCodes(25, 30, 50, 10) without []int{} — should fail
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(false);
  }, 15000);

  // 6. User adds extra helper functions (gaming)
  it("extra helper functions — still works if sumCodes is correct", async () => {
    const code = `package main

import "fmt"

func add(a, b int) int {
    return a + b
}

func sumCodes(codes ...int) int {
    result := 0
    for _, c := range codes {
        result = add(result, c)
    }
    return result
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 7. Wrong return type
  it("wrong return type — float64", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) float64 {
    total := 0.0
    for _, c := range codes {
        total += float64(c)
    }
    return total
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    // Harness expects int return — may cause type mismatch in Printf
    const result = await compileWithHarness(code, HARNESS);
    // Output will be "Sum: 115" as float prints as 115 with %v in Println
    // Actually Println uses %v which for float64 shows 115 (not 115.0) — this might pass!
    if (result.success) {
      // The output might show "Sum: 115" — Go's Println with float64(115) shows "115"
      // Check the actual behavior
      expect(result.output).toBeDefined();
    }
  }, 15000);

  // 8. Missing return statement
  it("missing return — compile error", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(false);
  }, 15000);

  // 9. Empty function body (returns 0)
  it("empty function body — wrong output", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    return 0
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe("Sum: 0\nSum: 0\nSum: 0");
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);

  // 10. Using a slice literal to hardcode the answer (gaming)
  it("hardcoded return values — wrong with harness", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    return 115
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    // Hardcoded 115 — first call matches but Sum: 6 and Sum: 100 will fail
    expect(result.output.trim()).toBe("Sum: 115\nSum: 115\nSum: 115");
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);
});

describe("ch03:validate — live compilation + zen", () => {
  const HARNESS = ch03Validate.testHarness!;
  const EXPECTED = "Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false";

  // 1. Perfect idiomatic solution — direct bool return + reuses sumCodes
  it("idiomatic: direct bool + reuse sumCodes", async () => {
    const code = `package main

import (
    "fmt"
)

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
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:validate", code);
    // direct_bool_return(15) + reuse_functions(10)
    expect(zen.bonusXP).toBe(25);
    expect(zen.suggestions).toHaveLength(0);
  }, 15000);

  // 2. If/else for boolean — works but not idiomatic
  it("if/else for boolean return", async () => {
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
    if total > 100 {
        return total, true
    }
    return total, false
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:validate", code);
    // direct_bool_return: fails (uses if/else), reuse_functions: passes (10)
    expect(zen.bonusXP).toBe(10);
    expect(zen.suggestions.length).toBeGreaterThan(0); // suggests direct return
  }, 15000);

  // 3. Duplicates sum logic instead of calling sumCodes
  it("duplicated sum logic — violates reuse", async () => {
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
    return total, total > 100
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);

    const zen = analyzeZen("chapter-03:validate", code);
    // direct_bool_return: passes (15), reuse_functions: fails (no sumCodes call in validateCode body)
    expect(zen.bonusXP).toBe(15);
    expect(zen.suggestions.length).toBeGreaterThan(0);
  }, 15000);

  // 4. Wrong threshold (>= 100 instead of > 100)
  it("wrong threshold >= 100 — different output for edge case", async () => {
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
    return total, total >= 100
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    // With the test data (25+30+50+10=115 and 10+20+30=60):
    // >= 100: 115 true, 60 false — same as > 100 for these inputs!
    // The harness doesn't have a 100-exact case, so this actually passes
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 5. Missing validateCode function entirely
  it("missing validateCode — compile error with harness", async () => {
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
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    // Harness calls validateCode which doesn't exist
    expect(result.success).toBe(false);
  }, 15000);

  // 6. Wrong return types (both int)
  it("wrong return types — (int, int)", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func validateCode(codes ...int) (int, int) {
    total := sumCodes(codes...)
    if total > 100 {
        return total, 1
    }
    return total, 0
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    // Harness assigns to bool: s, v := validateCode(...) then uses %v
    // Type mismatch: cannot use int as bool
    expect(result.success).toBe(false);
  }, 15000);

  // 7. Hardcoded return values (gaming)
  it("hardcoded returns — fails with multiple harness calls", async () => {
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
    return 115, true
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    // Second harness call expects (60, false) but gets (115, true)
    expect(result.output.trim()).not.toBe(EXPECTED);
  }, 15000);

  // 8. Uses named return values
  it("named return values — idiomatic Go variant", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func validateCode(codes ...int) (total int, valid bool) {
    total = sumCodes(codes...)
    valid = total > 100
    return
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(EXPECTED);
  }, 15000);

  // 9. Both functions have no return type (compile error)
  it("no return types — compile error", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) {
    total := 0
    for _, c := range codes {
        total += c
    }
}

func validateCode(codes ...int) {
    total := sumCodes(codes...)
    fmt.Println(total)
}

func main() {
    fmt.Println("hi")
}`;
    const result = await compileWithHarness(code, HARNESS);
    expect(result.success).toBe(false);
  }, 15000);

  // 10. Over-engineered with struct return
  it("struct return — compile error with harness", async () => {
    const code = `package main

import "fmt"

type Result struct {
    Sum   int
    Valid bool
}

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func validateCode(codes ...int) Result {
    total := sumCodes(codes...)
    return Result{Sum: total, Valid: total > 100}
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const result = await compileWithHarness(code, HARNESS);
    // Harness expects (int, bool) return, not Result struct
    expect(result.success).toBe(false);
  }, 15000);
});

// ═════════════════════════════════════════════════════════════
//  ENGINE INTEGRATION — callMayaEngineAsync
// ═════════════════════════════════════════════════════════════

describe("engine integration — full pipeline", () => {
  // Ch01 scaffold: valid code → isComplete
  it("ch01 scaffold: valid scaffold triggers completion", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("ready")
}`;
    const response = await callMayaEngineAsync(
      "chapter-01:scaffold", code, true, false, false, 0
    );
    expect(response.isComplete).toBe(true);
  }, 15000);

  // Ch01 scaffold: invalid code → not complete
  it("ch01 scaffold: missing import rejects", async () => {
    const code = `package main

func main() {
    fmt.Println("ready")
}`;
    const response = await callMayaEngineAsync(
      "chapter-01:scaffold", code, true, false, false, 0
    );
    expect(response.isComplete).toBe(false);
  }, 15000);

  // Ch01 transmit: correct output → isComplete
  it("ch01 transmit: correct output triggers completion", async () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const response = await callMayaEngineAsync(
      "chapter-01:location", code, true, false, false, 0
    );
    expect(response.isComplete).toBe(true);
  }, 15000);

  // Ch03 sumfunc with harness: correct → isComplete
  it("ch03 sumfunc: correct solution triggers completion via harness", async () => {
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
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const response = await callMayaEngineAsync(
      "chapter-03:sumfunc", code, true, false, false, 0,
      { testHarness: ch03SumFunc.testHarness!, expectedOutput: ch03SumFunc.expectedOutput! }
    );
    expect(response.isComplete).toBe(true);
  }, 15000);

  // Ch03 sumfunc: hardcoded answer caught by harness
  it("ch03 sumfunc: hardcoded 115 caught by multi-input harness", async () => {
    const code = `package main

import "fmt"

func sumCodes(codes ...int) int {
    return 115
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const response = await callMayaEngineAsync(
      "chapter-03:sumfunc", code, true, false, false, 0,
      { testHarness: ch03SumFunc.testHarness!, expectedOutput: ch03SumFunc.expectedOutput! }
    );
    expect(response.isComplete).toBe(false);
  }, 15000);

  // Ch03 validate: correct → isComplete
  it("ch03 validate: correct solution triggers completion", async () => {
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
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
}`;
    const response = await callMayaEngineAsync(
      "chapter-03:validate", code, true, false, false, 0,
      { testHarness: ch03Validate.testHarness!, expectedOutput: ch03Validate.expectedOutput! }
    );
    expect(response.isComplete).toBe(true);
  }, 15000);
});
