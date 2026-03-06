import { describe, it, expect } from "vitest";
import { callMayaEngine } from "./engine";

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
  it("accepts valid scaffold with package + import + func main", () => {
    const code = `package main

import "fmt"

func main() {
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
}`;
    const r = call("chapter-01:scaffold", code, { isCode: true });
    expect(r.isComplete).toBe(true);
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
func main() {}`;
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
    expect(r.reply).toContain("ventilation shaft");
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
