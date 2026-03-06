import { describe, it, expect } from "vitest";
import { diagnose } from "./diagnostics";

// ── Helper ──

function errors(source: string) {
  return diagnose(source).filter((d) => d.severity === "error");
}

function warnings(source: string) {
  return diagnose(source).filter((d) => d.severity === "warning");
}

function hasError(source: string, messageFragment: string) {
  return errors(source).some((d) => d.message.includes(messageFragment));
}

function hasWarning(source: string, messageFragment: string) {
  return warnings(source).some((d) => d.message.includes(messageFragment));
}

// ═══════════════════════════════════════════════
//  BRACKET MATCHING
// ═══════════════════════════════════════════════

describe("bracket matching", () => {
  it("passes valid brackets", () => {
    const code = `package main
func main() {
    fmt.Println("hello")
}`;
    const bracketErrors = errors(code).filter(
      (d) => d.message.includes("bracket") || d.message.includes("unclosed") || d.message.includes("unexpected")
    );
    expect(bracketErrors).toHaveLength(0);
  });

  it("detects unclosed {", () => {
    const code = `package main
func main() {
    fmt.Println("hello")
`;
    expect(hasError(code, "unclosed '{'")).toBe(true);
  });

  it("detects unclosed (", () => {
    const code = `package main
func main() {
    fmt.Println("hello"
}`;
    // The ) is missing, so ( is unclosed and } mismatches
    const errs = errors(code);
    const bracketIssues = errs.filter(
      (d) => d.message.includes("unclosed") || d.message.includes("mismatched")
    );
    expect(bracketIssues.length).toBeGreaterThan(0);
  });

  it("detects unexpected }", () => {
    const code = `package main
func main() {
}}`;
    expect(hasError(code, "unexpected '}'")).toBe(true);
  });

  it("detects mismatched brackets", () => {
    const code = `package main
func main() {
    x := [1, 2, 3)
}`;
    expect(hasError(code, "mismatched bracket")).toBe(true);
  });

  it("ignores brackets inside strings", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("{not a real bracket}")
}`;
    const bracketErrors = errors(code).filter(
      (d) => d.message.includes("bracket") || d.message.includes("unclosed '{") || d.message.includes("unexpected")
    );
    expect(bracketErrors).toHaveLength(0);
  });

  it("ignores brackets inside comments", () => {
    const code = `package main
import "fmt"
// { this bracket is in a comment
func main() {
    fmt.Println("hi")
}`;
    const bracketErrors = errors(code).filter(
      (d) => d.message.includes("unclosed '{") || d.message.includes("unexpected '}'")
    );
    expect(bracketErrors).toHaveLength(0);
  });

  it("handles nested brackets", () => {
    const code = `package main
import "fmt"
func main() {
    if x := f(a[0]); x > 0 {
        fmt.Println(x)
    }
}`;
    const bracketErrors = errors(code).filter(
      (d) => d.message.includes("bracket") || d.message.includes("unclosed") || d.message.includes("unexpected")
    );
    expect(bracketErrors).toHaveLength(0);
  });

  it("reports line and col for unclosed bracket", () => {
    const code = `package main
func main() {`;
    const errs = errors(code).filter((d) => d.message.includes("unclosed"));
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].line).toBeGreaterThan(0);
    expect(errs[0].col).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
//  PACKAGE MAIN
// ═══════════════════════════════════════════════

describe("package main check", () => {
  it("passes with package main", () => {
    const code = `package main
func main() {}`;
    expect(hasError(code, "package main")).toBe(false);
  });

  it("errors without package declaration", () => {
    const code = `func main() {}`;
    expect(hasError(code, "package main")).toBe(true);
  });

  it("errors with wrong package name", () => {
    const code = `package utils
func main() {}`;
    expect(hasError(code, "package main")).toBe(true);
  });

  it("errors with empty file", () => {
    expect(hasError("", "package main")).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  FUNC MAIN
// ═══════════════════════════════════════════════

describe("func main() check", () => {
  it("passes with func main()", () => {
    const code = `package main
func main() {}`;
    expect(hasError(code, "func main()")).toBe(false);
  });

  it("errors without func main", () => {
    const code = `package main
func doSomething() {}`;
    expect(hasError(code, "func main()")).toBe(true);
  });

  it("errors with only package declaration", () => {
    const code = `package main`;
    expect(hasError(code, "func main()")).toBe(true);
  });

  it("passes with func main() and other functions", () => {
    const code = `package main
func helper() int { return 1 }
func main() {
    helper()
}`;
    expect(hasError(code, "func main()")).toBe(false);
  });
});

// ═══════════════════════════════════════════════
//  UNCLOSED STRINGS
// ═══════════════════════════════════════════════

describe("unclosed string detection", () => {
  it("passes valid strings", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello world")
}`;
    expect(hasError(code, "unclosed string")).toBe(false);
  });

  it("detects unclosed string at end of line", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello
}`;
    expect(hasError(code, "unclosed string")).toBe(true);
  });

  it("handles escaped quotes correctly", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("say \\"hi\\"")
}`;
    expect(hasError(code, "unclosed string")).toBe(false);
  });

  it("ignores strings in comments", () => {
    const code = `package main
import "fmt"
// this "is not a real string
func main() {
    fmt.Println("hi")
}`;
    expect(hasError(code, "unclosed string")).toBe(false);
  });

  it("reports correct line number for unclosed string", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("unclosed
}`;
    const stringErrors = errors(code).filter((d) => d.message.includes("unclosed string"));
    expect(stringErrors).toHaveLength(1);
    expect(stringErrors[0].line).toBe(4);
  });

  it("handles empty strings", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("")
}`;
    expect(hasError(code, "unclosed string")).toBe(false);
  });

  it("handles raw strings spanning multiple lines", () => {
    // Raw strings (backtick) are allowed to span lines — should not be flagged
    const code = "package main\nimport \"fmt\"\nfunc main() {\n    fmt.Println(`raw\nstring`)\n}";
    // The unclosed string check skips backtick strings
    expect(hasError(code, "unclosed string")).toBe(false);
  });
});

// ═══════════════════════════════════════════════
//  UNUSED IMPORTS
// ═══════════════════════════════════════════════

describe("unused import detection", () => {
  it("no warning when import is used", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hi")
}`;
    expect(hasWarning(code, "imported and not used")).toBe(false);
  });

  it("warns for unused import", () => {
    const code = `package main
import "os"
func main() {}`;
    expect(hasWarning(code, 'imported and not used: "os"')).toBe(true);
  });

  it("handles grouped imports", () => {
    const code = `package main
import (
    "fmt"
    "os"
)
func main() {
    fmt.Println("hi")
}`;
    expect(hasWarning(code, '"os"')).toBe(true);
    expect(hasWarning(code, '"fmt"')).toBe(false);
  });

  it("handles import with path (uses last segment)", () => {
    const code = `package main
import "net/http"
func main() {
    http.ListenAndServe(":8080", nil)
}`;
    expect(hasWarning(code, "net/http")).toBe(false);
  });

  it("warns for unused path import", () => {
    const code = `package main
import "net/http"
func main() {}`;
    expect(hasWarning(code, "net/http")).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  NEAR-MISS KEYWORDS (TYPO DETECTION)
// ═══════════════════════════════════════════════

describe("typo detection", () => {
  it("detects 'fnuc' as func typo", () => {
    const code = `package main
fnuc main() {}`;
    expect(hasWarning(code, "did you mean 'func'")).toBe(true);
  });

  it("detects 'retrun' as return typo", () => {
    const code = `package main
func main() {
    retrun 0
}`;
    expect(hasWarning(code, "did you mean 'return'")).toBe(true);
  });

  it("detects 'pritnln' as println typo", () => {
    const code = `package main
func main() {
    pritnln("hi")
}`;
    expect(hasWarning(code, "did you mean 'println'")).toBe(true);
  });

  it("detects 'swtich' as switch typo", () => {
    const code = `package main
func main() {
    swtich x {
    }
}`;
    expect(hasWarning(code, "did you mean 'switch'")).toBe(true);
  });

  it("detects 'cosnt' as const typo", () => {
    const code = `package main
func main() {
    cosnt x = 1
}`;
    expect(hasWarning(code, "did you mean 'const'")).toBe(true);
  });

  it("does not warn for valid identifiers", () => {
    const code = `package main
func main() {
    myVariable := 1
    anotherThing := "hello"
}`;
    const typoWarnings = warnings(code).filter((d) => d.message.includes("did you mean"));
    expect(typoWarnings).toHaveLength(0);
  });

  it("reports correct line for typo", () => {
    const code = `package main
func main() {
    retrun 0
}`;
    const typo = warnings(code).find((d) => d.message.includes("return"));
    expect(typo).toBeDefined();
    expect(typo!.line).toBe(3);
  });
});

// ═══════════════════════════════════════════════
//  FULL PROGRAM DIAGNOSTICS
// ═══════════════════════════════════════════════

describe("full program — clean code", () => {
  it("ch01 reference solution has no errors", () => {
    const code = `package main
import "fmt"
func main() {
    const sublevel = 3
    cell := "B-09"
    fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`;
    expect(errors(code)).toHaveLength(0);
  });

  it("ch02 reference solution has no errors", () => {
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
    expect(errors(code)).toHaveLength(0);
  });

  it("ch03 reference solution has no errors", () => {
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
    result, valid := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %t\\n", result, valid)
}`;
    expect(errors(code)).toHaveLength(0);
  });
});

describe("full program — multiple errors", () => {
  it("reports all errors at once", () => {
    // Missing package, missing func main, unclosed bracket
    const code = `fnuc doStuff() {
    x := "unclosed
}`;
    const allDiags = diagnose(code);
    expect(allDiags.length).toBeGreaterThanOrEqual(3);
  });

  it("reports errors and warnings together", () => {
    const code = `package main
import "os"
func main() {
    retrun
}`;
    const errs = errors(code);
    const warns = warnings(code);
    // "os" unused (warning) + "retrun" typo (warning), no bracket errors
    expect(warns.length).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════
//  EDGE CASES
// ═══════════════════════════════════════════════

describe("edge cases", () => {
  it("handles empty input", () => {
    const diags = diagnose("");
    // Should have: missing package main + missing func main
    expect(errors("").length).toBeGreaterThanOrEqual(2);
  });

  it("handles whitespace-only input", () => {
    expect(errors("   \n\n  ").length).toBeGreaterThanOrEqual(2);
  });

  it("handles single keyword", () => {
    const diags = diagnose("package");
    // package without main → missing package main + missing func main
    expect(diags.length).toBeGreaterThanOrEqual(2);
  });

  it("handles very long single line", () => {
    const code = `package main
func main() {
    x := "${"a".repeat(5000)}"
}`;
    // Should not crash
    const diags = diagnose(code);
    expect(Array.isArray(diags)).toBe(true);
  });
});
