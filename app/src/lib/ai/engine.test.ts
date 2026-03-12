import { describe, it, expect, vi } from "vitest";
import { callMayaEngine, callMayaEngineAsync, type StepTestConfig } from "./engine";
import * as playground from "@/lib/go/playground";

// ── Helper ──

function call(
  stepId: string,
  msg: string,
  opts: {
    isCode?: boolean;
    isFirst?: boolean;
    inRush?: boolean;
    attempts?: number;
  } = {}
) {
  return callMayaEngine(
    stepId,
    msg,
    opts.isCode ?? false,
    opts.isFirst ?? false,
    opts.inRush ?? false,
    opts.attempts ?? 0
  );
}

// ═══════════════════════════════════════════════
//  UNKNOWN STEP
// ═══════════════════════════════════════════════

describe("unknown step", () => {
  it("returns signal lost for unregistered step ID", () => {
    const r = call("chapter-99:foo", "hello");
    expect(r.reply).toContain("signal lost");
    expect(r.isComplete).toBe(false);
  });

  it("returns signal lost for empty string step ID", () => {
    const r = call("", "hello");
    expect(r.reply).toContain("signal lost");
    expect(r.isComplete).toBe(false);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 1 · STEP 1 — SCAFFOLD
// ═══════════════════════════════════════════════

describe("ch01 scaffold — intro", () => {
  it("returns intro on first message", () => {
    const r = call("chapter-01:scaffold", "i'm here", { isFirst: true });
    expect(r.reply).toContain("signal received");
    expect(r.reply).toContain("maya");
    expect(r.reply).toContain("package");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch01 scaffold — concept FAQ", () => {
  it("answers 'what is package main'", () => {
    const r = call("chapter-01:scaffold", "what is package main?");
    expect(r.reply).toContain("package main");
  });

  it("answers 'what does import do'", () => {
    const r = call("chapter-01:scaffold", "how do imports work?");
    expect(r.reply).toContain("import");
  });

  it("answers 'what is func main'", () => {
    const r = call("chapter-01:scaffold", "what is the main function?");
    expect(r.reply).toContain("func main()");
  });

  it("answers 'what is go'", () => {
    const r = call("chapter-01:scaffold", "tell me about golang");
    expect(r.reply).toContain("go");
  });
});

describe("ch01 scaffold — code evaluation", () => {
  it("accepts valid scaffold with package + import + func main + fmt usage", () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("I'm in")
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("terminal accepted");
  });

  it("accepts scaffold with grouped imports", () => {
    const code = `package main

import (
    "fmt"
)

func main() {
    fmt.Println("ready")
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects scaffold with import fmt but no fmt usage", () => {
    const code = `package main

import "fmt"

func main() {
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt");
  });

  it("rejects code without package main", () => {
    const code = `import "fmt"
func main() {}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("package main");
  });

  it("rejects code with package but no import", () => {
    const code = `package main
func main() {}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("import");
  });

  it("rejects code with package + import but no func main", () => {
    const code = `package main
import "fmt"`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("func main()");
  });

  it("strips ||COMPLETE|| from reply", () => {
    const code = `package main
import "fmt"
func main() { fmt.Println("hi") }`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.reply).not.toContain("||COMPLETE||");
    expect(r.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 1 · STEP 2 — LOCATION
// ═══════════════════════════════════════════════

describe("ch01 location — intro", () => {
  it("returns intro message", () => {
    const r = call("chapter-01:location", "ready", { isFirst: true });
    expect(r.reply).toContain("CELL B-09");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch01 location — concept FAQ", () => {
  it("answers 'how do I print'", () => {
    const r = call("chapter-01:location", "how do I print something?");
    expect(r.reply).toContain("fmt.Println");
  });

  it("answers 'what is a variable'", () => {
    const r = call("chapter-01:location", "what is a variable?");
    expect(r.reply).toContain(":=");
  });

  it("answers 'what is a constant'", () => {
    const r = call("chapter-01:location", "explain constants");
    expect(r.reply).toContain("const");
  });

  it("appends rush urgency when in rush", () => {
    const r = call("chapter-01:location", "how do I print?", { inRush: true });
    expect(r.reply).toContain("now hurry.");
  });
});

describe("ch01 location — code evaluation", () => {
  it("accepts correct solution using Printf", () => {
    const code = `package main
import "fmt"
func main() {
    const sublevel = 3
    cell := "B-09"
    fmt.Printf("CELL %s · SUBLEVEL %d\\n", cell, sublevel)
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("you actually got through");
  });

  it("accepts correct solution using Println", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("accepts B09 without hyphen", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("accepts different casing", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("Cell b-09 · sublevel 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects code with no fmt/print", () => {
    const code = `package main
func main() {
    x := 42
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt.Println");
  });

  it("rejects hello world", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("Hello World")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("location");
  });

  it("rejects missing B-09", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL A-01 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("B-09");
  });

  it("rejects B-09 without sublevel", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("strips ||COMPLETE|| from reply", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.reply).not.toContain("||COMPLETE||");
    expect(r.isComplete).toBe(true);
  });
});

describe("ch01 location — chat interactions", () => {
  it("responds to help requests", () => {
    const r = call("chapter-01:location", "I'm stuck, can you help?");
    expect(r.isComplete).toBe(false);
    expect(r.reply.length).toBeGreaterThan(10);
  });

  it("handles acknowledgements", () => {
    const r = call("chapter-01:location", "ok got it");
    expect(r.isComplete).toBe(false);
    const possible = ["good. get to it.", "go.", "show me the code.", "waiting on you.", "the terminal's ready."];
    expect(possible).toContain(r.reply);
  });

  it("handles greetings", () => {
    const r = call("chapter-01:location", "hello!");
    expect(r.isComplete).toBe(false);
  });

  it("handles 'who are you'", () => {
    const r = call("chapter-01:location", "who are you?");
    expect(r.reply).toContain("maya chen");
  });

  it("handles 'where are we'", () => {
    const r = call("chapter-01:location", "where are we?");
    expect(r.reply).toContain("B-09");
  });

  it("deflects unrecognized questions", () => {
    const r = call("chapter-01:location", "what is the meaning of life?");
    expect(r.isComplete).toBe(false);
  });

  it("never marks chat as complete", () => {
    const messages = ["how do I print?", "help", "hello", "ok", "who are you?", "random xyz"];
    for (const msg of messages) {
      const r = call("chapter-01:location", msg);
      expect(r.isComplete).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 2 · STEP 0 — SCAFFOLD
// ═══════════════════════════════════════════════

describe("ch02 scaffold", () => {
  it("returns intro message", () => {
    const r = call("chapter-02:scaffold", "ready", { isFirst: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/keypad|skeleton|program/);
  });

  it("accepts valid scaffold with package, import, and main", () => {
    const code = `package main

import "fmt"

func main() {
    fmt.Println("ready")
}`;
    const r = call("chapter-02:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects code without package main", () => {
    const code = `import "fmt"
func main() {
    fmt.Println("test")
}`;
    const r = call("chapter-02:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("rejects code without import", () => {
    const code = `package main
func main() { }`;
    const r = call("chapter-02:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/import|fmt/);
  });

  it("rejects code without func main", () => {
    const code = `package main
import "fmt"`;
    const r = call("chapter-02:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("answers FAQ about skeleton", () => {
    const r = call("chapter-02:scaffold", "how do I set up the skeleton?");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/package|import|main/);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 2 · STEP 1 — LOOP
// ═══════════════════════════════════════════════

describe("ch02 loop — intro", () => {
  it("returns intro message", () => {
    const r = call("chapter-02:loop", "ready", { isFirst: true });
    expect(r.reply).toContain("keypad");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch02 loop — code evaluation", () => {
  it("accepts for loop that prints", () => {
    const code = `package main
import "fmt"
func main() {
    for i := 1; i <= 10; i++ {
        fmt.Println(i)
    }
}`;
    const r = call("chapter-02:loop", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("loop confirmed");
  });

  it("rejects code without for loop", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println(1)
}`;
    const r = call("chapter-02:loop", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("loop");
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 2 · STEP 2 — CLASSIFY
// ═══════════════════════════════════════════════

describe("ch02 classify — intro", () => {
  it("returns intro with action mapping", () => {
    const r = call("chapter-02:classify", "ready", { isFirst: true });
    expect(r.reply).toContain("DENY");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch02 classify — concept FAQ", () => {
  it("answers 'how does switch work'", () => {
    const r = call("chapter-02:classify", "how does switch work?");
    expect(r.reply).toContain("case");
  });

  it("answers 'how does if/else work'", () => {
    const r = call("chapter-02:classify", "how does if else work?");
    expect(r.reply).toContain("if");
  });
});

describe("ch02 classify — code evaluation", () => {
  it("accepts correct solution with switch", () => {
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
    const r = call("chapter-02:classify", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("keypad");
  });

  it("accepts correct solution with if/else", () => {
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
    const r = call("chapter-02:classify", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects missing OVERRIDE", () => {
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
    const r = call("chapter-02:classify", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("OVERRIDE");
  });

  it("strips ||COMPLETE|| from reply", () => {
    const code = `package main
import "fmt"
func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3: fmt.Println(i, "DENY")
        case i <= 6: fmt.Println(i, "WARN")
        case i <= 9: fmt.Println(i, "GRANT")
        default: fmt.Println(i, "OVERRIDE")
        }
    }
}`;
    const r = call("chapter-02:classify", code, { isCode: true });
    expect(r.reply).not.toContain("||COMPLETE||");
    expect(r.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 3 · STEP 1 — SUM FUNCTION
// ═══════════════════════════════════════════════

describe("ch03 sum — intro", () => {
  it("returns intro", () => {
    const r = call("chapter-03:sumfunc", "ready", { isFirst: true });
    expect(r.reply).toContain("sumCodes");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch03 sum — concept FAQ", () => {
  it("answers 'what is variadic'", () => {
    const r = call("chapter-03:sumfunc", "what does variadic mean?");
    expect(r.reply).toContain("...int");
  });

  it("answers 'how do functions work'", () => {
    const r = call("chapter-03:sumfunc", "how do I write a function?");
    expect(r.reply).toContain("func");
  });
});

describe("ch03 sum — code evaluation", () => {
  it("accepts correct sumCodes", () => {
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
    const r = call("chapter-03:sumfunc", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("sum function works");
  });

  it("rejects without variadic", () => {
    const code = `package main
import "fmt"
func sumCodes(codes []int) int {
    total := 0
    for _, c := range codes { total += c }
    return total
}
func main() { fmt.Println("done") }`;
    const r = call("chapter-03:sumfunc", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("...int");
  });
});

// ═══════════════════════════════════════════════
//  CHAPTER 3 · STEP 2 — VALIDATE
// ═══════════════════════════════════════════════

describe("ch03 validate — intro", () => {
  it("returns intro about validateCode", () => {
    const r = call("chapter-03:validate", "ready", { isFirst: true });
    expect(r.reply).toContain("validateCode");
    expect(r.isComplete).toBe(false);
  });
});

describe("ch03 validate — code evaluation", () => {
  it("accepts correct full solution", () => {
    const code = `package main
import "fmt"
func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes { total += c }
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
    const r = call("chapter-03:validate", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).toContain("junction");
  });

  it("rejects without multi-return", () => {
    const code = `package main
import "fmt"
func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes { total += c }
    return total
}
func validateCode(codes ...int) int {
    return sumCodes(codes...)
}
func main() { fmt.Println(sumCodes(1, 2, 3)) }`;
    const r = call("chapter-03:validate", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("two values");
  });

  it("strips ||COMPLETE|| from reply", () => {
    const code = `package main
import "fmt"
func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes { total += c }
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
    const r = call("chapter-03:validate", code, { isCode: true });
    expect(r.reply).not.toContain("||COMPLETE||");
    expect(r.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  CROSS-CUTTING: RUSH MODE
// ═══════════════════════════════════════════════

describe("rush mode behavior", () => {
  it("appends rush urgency to concept answers", () => {
    const r = call("chapter-01:location", "how do I use a variable?", { inRush: true });
    expect(r.reply).toContain("now hurry.");
  });

  it("still marks correct code as complete during rush", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true, inRush: true });
    expect(r.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  CROSS-CUTTING: ATTEMPTS & STUCK HELP
// ═══════════════════════════════════════════════

describe("attempt-based stuck help", () => {
  it("appends stuck help on attempt 3+", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Print()
}`;
    const r = call("chapter-01:location", code, { isCode: true, attempts: 4 });
    expect(r.isComplete).toBe(false);
    expect(r.reply.length).toBeGreaterThan(30);
  });
});

// ═══════════════════════════════════════════════
//  CROSS-CUTTING: RESPONSE INVARIANTS
// ═══════════════════════════════════════════════

describe("response invariants", () => {
  it("all responses are non-empty strings", () => {
    const scenarios = [
      call("chapter-01:scaffold", "hello"),
      call("chapter-01:scaffold", "what is package main?"),
      call("chapter-01:scaffold", "asdf"),
      call("chapter-01:location", "help"),
      call("chapter-01:location", "ok"),
      call("chapter-01:location", `fmt.Println("test")`, { isCode: true }),
      call("chapter-01:scaffold", "x", { isFirst: true }),
      call("chapter-02:loop", "ready", { isFirst: true }),
      call("chapter-03:sumfunc", "ready", { isFirst: true }),
    ];
    for (const r of scenarios) {
      expect(typeof r.reply).toBe("string");
      expect(r.reply.length).toBeGreaterThan(0);
      expect(typeof r.isComplete).toBe("boolean");
    }
  });

  it("isComplete is only true for correct code, never for chat", () => {
    const chatCases = [
      call("chapter-01:location", "CELL B-09 · SUBLEVEL 3"),
      call("chapter-02:classify", "DENY WARN GRANT OVERRIDE"),
      call("chapter-03:validate", "func sumCodes(codes ...int) int"),
    ];
    for (const r of chatCases) {
      expect(r.isComplete).toBe(false);
    }
  });

  it("||COMPLETE|| token never appears in any reply", () => {
    const cases = [
      call("chapter-01:location", `fmt.Println("CELL B-09 · SUBLEVEL 3")`, { isCode: true }),
      call("chapter-01:scaffold", "hello"),
      call("chapter-01:scaffold", "ready", { isFirst: true }),
    ];
    for (const r of cases) {
      expect(r.reply).not.toContain("||COMPLETE||");
    }
  });
});

// ═══════════════════════════════════════════════
//  EDGE CASES
// ═══════════════════════════════════════════════

describe("edge cases", () => {
  it("handles empty string message", () => {
    const r = call("chapter-01:location", "");
    expect(r.isComplete).toBe(false);
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it("handles very long message", () => {
    const longMsg = "a".repeat(10000);
    const r = call("chapter-01:location", longMsg);
    expect(r.isComplete).toBe(false);
  });

  it("handles special characters", () => {
    const r = call("chapter-01:location", "!@#$%^&*(){}[]<>");
    expect(r.isComplete).toBe(false);
  });

  it("handles newlines in message", () => {
    const r = call("chapter-01:location", "how\ndo\nI\nprint?");
    expect(r.reply).toContain("fmt");
  });

  it("handles unicode in code", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3") // コメント
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("handles case-insensitive keywords", () => {
    const r = call("chapter-01:location", "HOW DO I PRINT?");
    expect(r.reply).toContain("fmt.Println");
  });

  it("isFirstMessage + isCode evaluates code, not intro", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isFirst: true, isCode: true });
    expect(r.isComplete).toBe(true);
  });
});

// ═══════════════════════════════════════════════
//  DIAGNOSTICS GATE — BAD CODE REJECTED BY MAYA
// ═══════════════════════════════════════════════

describe("ch01 scaffold — diagnostics catch bad code", () => {
  it("rejects unclosed brace", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello")
`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("unclosed");
  });

  it("rejects mismatched brackets", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello"]
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("mismatched");
  });

  it("rejects unclosed string literal", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("mismatched bracket");
  });
});

describe("ch01 location — diagnostics catch bad code", () => {
  it("rejects fmt.WriteLine (not a real Go function)", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.WriteLine("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt.WriteLine");
    expect(r.reply).toContain("not a known function");
  });

  it("rejects fmt.PrintLine (not a real Go function)", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.PrintLine("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt.PrintLine");
    expect(r.reply).toContain("not a known function");
  });

  it("rejects fmt.Log (not a real fmt function)", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Log("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt.Log");
  });

  it("rejects fmt.console (not a real fmt function)", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.console("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("not a known function");
  });

  it("still accepts valid fmt.Println", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("still accepts valid fmt.Printf", () => {
    const code = `package main
import "fmt"
func main() {
    cell := "B-09"
    fmt.Printf("CELL %s · SUBLEVEL 3\\n", cell)
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("reports line number of the error", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.WriteLine("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.reply).toContain("line 4");
  });

  it("prefixes with rush urgency during rush mode", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.WriteLine("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true, inRush: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("no time for bugs");
    expect(r.reply).toContain("fmt.WriteLine");
  });

  it("rejects extra closing brace", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("unexpected");
  });

  it("rejects missing package main", () => {
    const code = `import "fmt"
func main() {
    fmt.Println("CELL B-09 · SUBLEVEL 3")
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("package main");
  });

  it("rejects missing func main", () => {
    const code = `package main
import "fmt"
fmt.Println("CELL B-09 · SUBLEVEL 3")`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("func main()");
  });

  it("rejects multiple errors — reports the first one", () => {
    const code = `import "fmt"
func main() {
    fmt.WriteLine("CELL B-09 · SUBLEVEL 3"
}`;
    const r = call("chapter-01:location", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    // Should report at least one error (whichever fires first)
    expect(r.reply).toMatch(/line \d+/);
  });
});

describe("ch02 — diagnostics catch bad code", () => {
  it("rejects fmt.Printline in loop", () => {
    const code = `package main
import "fmt"
func main() {
    for i := 1; i <= 10; i++ {
        fmt.Printline(i)
    }
}`;
    const r = call("chapter-02:loop", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("not a known function");
  });

  it("rejects unclosed for loop", () => {
    const code = `package main
import "fmt"
func main() {
    for i := 1; i <= 10; i++ {
        fmt.Println(i)
}`;
    const r = call("chapter-02:loop", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("unclosed");
  });
});

// ═══════════════════════════════════════════════
//  BOSS 1 — SCAFFOLD
// ═══════════════════════════════════════════════

describe("boss-01:scaffold", () => {
  it("returns intro message", () => {
    const r = call("boss-01:scaffold", "ready", { isFirst: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/lock|scaffold|interface|program/);
  });

  it("accepts valid scaffold with predictNext, main, and import", () => {
    const code = `package main

import "fmt"

func predictNext(codes []int) int {
    return 0
}

func main() {
    codes := []int{1, 2, 3}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects code without predictNext function", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println("hello")
}`;
    const r = call("boss-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/predictNext/);
  });

  it("rejects code with predictNext but no main", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    return 0
}`;
    const r = call("boss-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("rejects code with predictNext but without []int param", () => {
    const code = `package main
import "fmt"
func predictNext(n int) int {
    return n
}
func main() {
    fmt.Println(predictNext(5))
}`;
    const r = call("boss-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/slice|int/i);
  });

  it("rejects code where main doesn't call predictNext", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    return 0
}
func main() {
    fmt.Println("hello")
}`;
    const r = call("boss-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("answers FAQ about function signature", () => {
    const r = call("boss-01:scaffold", "what's the function signature?");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/predictNext|slice|int/i);
  });

  it("answers FAQ about slices", () => {
    const r = call("boss-01:scaffold", "what is []int?");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/slice/i);
  });
});

// ═══════════════════════════════════════════════
//  BOSS 1 — PREDICT NEXT CODE
// ═══════════════════════════════════════════════

describe("boss-01:predict", () => {
  it("returns intro message", () => {
    const r = call("boss-01:predict", "ready", { isFirst: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/lock|pattern|cycling/);
  });

  it("accepts valid predictNext with delta computation", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    delta := 0
    for i := 1; i < len(codes); i++ {
        delta = codes[i] - codes[i-1]
    }
    return codes[len(codes)-1] + delta
}
func main() {
    codes := []int{102847, 104694, 106541}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(true);
  });

  it("rejects code without predictNext function", () => {
    const code = `package main
import "fmt"
func main() {
    fmt.Println(42)
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("predictNext");
  });

  it("rejects code without a loop or slice indexing", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    return 999
}
func main() {
    codes := []int{1, 2, 3}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("rejects fmt.Writeln (diagnostics gate)", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    delta := codes[1] - codes[0]
    return codes[len(codes)-1] + delta
}
func main() {
    codes := []int{102847, 104694, 106541}
    fmt.Writeln(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("not a known function");
  });

  it("rejects missing package main (diagnostics gate)", () => {
    const code = `import "fmt"
func predictNext(codes []int) int {
    delta := codes[1] - codes[0]
    return codes[len(codes)-1] + delta
}
func main() {
    codes := []int{102847, 104694, 106541}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(false);
  });

  it("rejects unclosed brace", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    delta := codes[1] - codes[0]
    return codes[len(codes)-1] + delta
func main() {
    codes := []int{102847, 104694, 106541}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/mismatched|unclosed/);
  });

  it("responds to pattern/delta concept question", () => {
    const r = call("boss-01:predict", "what is the pattern?");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/delta|difference/);
  });

  it("responds to function signature question", () => {
    const r = call("boss-01:predict", "what function do I write?");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("predictNext");
  });

  it("handles help/stuck request", () => {
    const r = call("boss-01:predict", "I'm stuck");
    expect(r.isComplete).toBe(false);
    expect(r.reply).toMatch(/delta/);
  });

  it("never marks chat as complete", () => {
    const messages = [
      "what is the pattern?",
      "what function do I write?",
      "I'm stuck",
      "hello",
      "ok",
      "random xyz",
    ];
    for (const msg of messages) {
      const r = call("boss-01:predict", msg);
      expect(r.isComplete).toBe(false);
    }
  });

  it("strips ||COMPLETE|| from reply", () => {
    const code = `package main
import "fmt"
func predictNext(codes []int) int {
    delta := 0
    for i := 1; i < len(codes); i++ {
        delta = codes[i] - codes[i-1]
    }
    return codes[len(codes)-1] + delta
}
func main() {
    codes := []int{102847, 104694, 106541}
    fmt.Println(predictNext(codes))
}`;
    const r = call("boss-01:predict", code, { isCode: true });
    expect(r.isComplete).toBe(true);
    expect(r.reply).not.toContain("||COMPLETE||");
  });
});

describe("ch03 — diagnostics catch bad code", () => {
  it("rejects fmt.Writef in sumCodes", () => {
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
    fmt.Writef("Sum: %d\\n", sum)
}`;
    const r = call("chapter-03:sumfunc", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("fmt.Writef");
    expect(r.reply).toContain("not a known function");
  });

  it("rejects mismatched parens in function call", () => {
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
    sum := sumCodes(25, 30, 50, 10
    fmt.Println("Sum:", sum)
}`;
    const r = call("chapter-03:sumfunc", code, { isCode: true });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("mismatched bracket");
  });
});

// ═══════════════════════════════════════════════
//  ASYNC ENGINE — OUTPUT VALIDATOR (compiled output)
// ═══════════════════════════════════════════════

// Valid Go code that passes local diagnostics
const VALID_GO = `package main
import "fmt"
func main() {
    fmt.Println("test")
}`;

function mockCompile(output: string) {
  vi.spyOn(playground, "compileGo").mockResolvedValue({
    success: true,
    errors: "",
    output,
    vetErrors: "",
  });
}

async function callAsync(
  stepId: string,
  opts: { inRush?: boolean; attempts?: number; stepTest?: StepTestConfig } = {}
) {
  return callMayaEngineAsync(
    stepId,
    VALID_GO,
    true,
    false,
    opts.inRush ?? false,
    opts.attempts ?? 0,
    opts.stepTest
  );
}

const ch02LoopTest: StepTestConfig = {
  expectedOutput: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10",
};

describe("ch02 loop — exact output (async)", () => {
  it("accepts correct sequential output 1-10", async () => {
    mockCompile("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n");
    const r = await callAsync("chapter-02:loop", { stepTest: ch02LoopTest });
    expect(r.isComplete).toBe(true);
  });

  it("rejects hardcoded single Println with all numbers", async () => {
    mockCompile("1 2 3 4 5 6 7 8 9 10\n");
    const r = await callAsync("chapter-02:loop", { stepTest: ch02LoopTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects output with only 5 numbers", async () => {
    mockCompile("1\n2\n3\n4\n5\n");
    const r = await callAsync("chapter-02:loop", { stepTest: ch02LoopTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects output with extra text per line", async () => {
    mockCompile("Code 1\nCode 2\nCode 3\nCode 4\nCode 5\nCode 6\nCode 7\nCode 8\nCode 9\nCode 10\n");
    const r = await callAsync("chapter-02:loop", { stepTest: ch02LoopTest });
    expect(r.isComplete).toBe(false);
  });
});

const ch02ClassifyTest: StepTestConfig = {
  expectedOutput:
    "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE",
};

describe("ch02 classify — exact output (async)", () => {
  it("accepts correct mapping", async () => {
    mockCompile(
      "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 OVERRIDE\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(true);
  });

  it("rejects hardcoded fmt.Println with all four labels on one line", async () => {
    mockCompile("DENY WARN GRANT OVERRIDE\n");
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects wrong mapping (all DENY)", async () => {
    mockCompile(
      "1 DENY\n2 DENY\n3 DENY\n4 DENY\n5 DENY\n6 DENY\n7 DENY\n8 DENY\n9 DENY\n10 DENY\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects swapped ranges (4-6 GRANT instead of WARN)", async () => {
    mockCompile(
      "1 DENY\n2 DENY\n3 DENY\n4 GRANT\n5 GRANT\n6 GRANT\n7 WARN\n8 WARN\n9 WARN\n10 OVERRIDE\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects missing OVERRIDE for code 10", async () => {
    mockCompile(
      "1 DENY\n2 DENY\n3 DENY\n4 WARN\n5 WARN\n6 WARN\n7 GRANT\n8 GRANT\n9 GRANT\n10 GRANT\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects different formatting (colon separator)", async () => {
    mockCompile(
      "1: DENY\n2: DENY\n3: DENY\n4: WARN\n5: WARN\n6: WARN\n7: GRANT\n8: GRANT\n9: GRANT\n10: OVERRIDE\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
  });

  it("gives targeted feedback when labels present but mapping wrong", async () => {
    mockCompile(
      "1 GRANT\n2 DENY\n3 WARN\n4 OVERRIDE\n5 DENY\n6 WARN\n7 GRANT\n8 DENY\n9 WARN\n10 OVERRIDE\n"
    );
    const r = await callAsync("chapter-02:classify", { stepTest: ch02ClassifyTest });
    expect(r.isComplete).toBe(false);
    expect(r.reply).toContain("mapping");
  });
});

// ═══════════════════════════════════════════════
//  TEST HARNESS — replaceMain + exact output
// ═══════════════════════════════════════════════

describe("test harness — replaceMain via compilation", () => {
  it("harness replaces user main with test calls", async () => {
    // The harness swaps main() before sending to compiler
    // We verify by checking that when compiler returns the expected output, it completes
    mockCompile("Sum: 115\nSum: 6\nSum: 100\n");
    const r = await callAsync("chapter-03:sumfunc", {
      stepTest: {
        testHarness: `func main() { fmt.Println("Sum:", sumCodes(25, 30, 50, 10)); fmt.Println("Sum:", sumCodes(1, 2, 3)); fmt.Println("Sum:", sumCodes(100)) }`,
        expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
      },
    });
    expect(r.isComplete).toBe(true);
  });

  it("harness rejects when any test case fails", async () => {
    mockCompile("Sum: 115\nSum: 7\nSum: 100\n");  // second case wrong
    const r = await callAsync("chapter-03:sumfunc", {
      stepTest: {
        testHarness: `func main() { fmt.Println("test") }`,
        expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
      },
    });
    expect(r.isComplete).toBe(false);
  });
});

const ch03SumTest: StepTestConfig = {
  testHarness: `func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    fmt.Println("Sum:", sumCodes(1, 2, 3))
    fmt.Println("Sum:", sumCodes(100))
}`,
  expectedOutput: "Sum: 115\nSum: 6\nSum: 100",
};

const ch03ValidateTest: StepTestConfig = {
  testHarness: `func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    s, v := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %v\\n", s, v)
    s2, v2 := validateCode(10, 20, 30)
    fmt.Printf("Result: %d, Valid: %v\\n", s2, v2)
}`,
  expectedOutput: "Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false",
};

describe("ch03 sum — test harness (async)", () => {
  it("accepts correct output from harness", async () => {
    mockCompile("Sum: 115\nSum: 6\nSum: 100\n");
    const r = await callAsync("chapter-03:sumfunc", { stepTest: ch03SumTest });
    expect(r.isComplete).toBe(true);
  });

  it("rejects wrong sum", async () => {
    mockCompile("Sum: 100\nSum: 6\nSum: 100\n");
    const r = await callAsync("chapter-03:sumfunc", { stepTest: ch03SumTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects partial output (only one test case)", async () => {
    mockCompile("Sum: 115\n");
    const r = await callAsync("chapter-03:sumfunc", { stepTest: ch03SumTest });
    expect(r.isComplete).toBe(false);
  });
});

describe("ch03 validate — test harness (async)", () => {
  it("accepts correct multi-test output", async () => {
    mockCompile("Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: false\n");
    const r = await callAsync("chapter-03:validate", { stepTest: ch03ValidateTest });
    expect(r.isComplete).toBe(true);
  });

  it("rejects if second test case says valid: true", async () => {
    mockCompile("Sum: 115\nResult: 115, Valid: true\nResult: 60, Valid: true\n");
    const r = await callAsync("chapter-03:validate", { stepTest: ch03ValidateTest });
    expect(r.isComplete).toBe(false);
  });

  it("rejects missing test case lines", async () => {
    mockCompile("Sum: 115\nResult: 115, Valid: true\n");
    const r = await callAsync("chapter-03:validate", { stepTest: ch03ValidateTest });
    expect(r.isComplete).toBe(false);
  });
});
