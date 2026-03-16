# Chapter 6.2 — Test Chamber

**Act II · Floor 3 · Kira's Lab**

## Go Concepts

- `testing` package
- Test functions (`func TestXxx(t *testing.T)`)
- `t.Errorf`, `t.Fatalf`, `t.Run` (subtests)
- Table-driven tests (slice of test cases)
- Test naming conventions

## Story Context

Kira (revealed in ch06) shows Maya her private lab. She explains that GHOST can't detect code that passes its own test suite — the security scanner skips "verified" modules. To make Maya's code invisible to GHOST, she needs to write tests for it. Kira: "If it passes, GHOST ignores it. If it doesn't... well, you've seen what GHOST does."

This is the first time the player writes Go test code. The twist: they're writing tests for functions they built in previous chapters — the `reverseWord` function from ch04.2 and the `Guard` struct from ch05. This creates a satisfying callback loop.

## Challenge

Write a test suite that makes Maya's code invisible to GHOST's module scanner. Start with a basic test function, refactor into idiomatic table-driven tests, then prove a struct method works across edge cases.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "ready".

Teach that test files use the `_test.go` suffix and the same package. Import `"testing"`. In a real project the test code lives in a separate file, but for this exercise everything is in one file.

Imports needed: `"fmt"`, `"testing"`

```go
package main

import (
    "fmt"
    "testing"
)

func main() {
    fmt.Println("test suite ready")
}
```

Expected output:
```
test suite ready
```

#### Step 1: First Test

Write `func TestReverseWord(t *testing.T)` that tests reversing `"hello"` to `"olleh"` and `"Go"` to `"oG"`. Use `t.Errorf` when the result doesn't match expected.

The `reverseWord` function is provided as starter code (carried forward from ch04.2). The player only writes the test.

```go
func reverseWord(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

func TestReverseWord(t *testing.T) {
    got := reverseWord("hello")
    if got != "olleh" {
        t.Errorf("reverseWord(\"hello\") = %q, want %q", got, "olleh")
    }
    got = reverseWord("Go")
    if got != "oG" {
        t.Errorf("reverseWord(\"Go\") = %q, want %q", got, "oG")
    }
}
```

Expected output:
```
PASS: TestReverseWord
```

#### Step 2: Table-Driven Tests

Refactor the test into table-driven style using a slice of anonymous structs. Add edge cases: empty string, single char, palindrome.

Key teaching moment: the table-driven pattern is THE idiomatic Go testing pattern. A slice of structs defines inputs and expected outputs. `range` iterates the cases. `t.Run` creates named subtests so failures pinpoint the exact case.

```go
func TestReverseWordTable(t *testing.T) {
    tests := []struct {
        name  string
        input string
        want  string
    }{
        {"normal word", "hello", "olleh"},
        {"short word", "Go", "oG"},
        {"single char", "a", "a"},
        {"empty", "", ""},
        {"palindrome", "kayak", "kayak"},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := reverseWord(tt.input)
            if got != tt.want {
                t.Errorf("reverseWord(%q) = %q, want %q", tt.input, got, tt.want)
            }
        })
    }
}
```

Expected output:
```
PASS: TestReverseWordTable/normal_word
PASS: TestReverseWordTable/short_word
PASS: TestReverseWordTable/single_char
PASS: TestReverseWordTable/empty
PASS: TestReverseWordTable/palindrome
```

#### Step 3: Test a Method

Write `func TestIsOnDuty(t *testing.T)` using table-driven tests for the `Guard` struct's `IsOnDuty` method from ch05. Test normal shift, overnight shift, and off-duty cases.

The `Guard` struct and its methods are provided as starter code (carried forward from ch05). The player only writes the test.

Teaching moment: `t.Fatalf` vs `t.Errorf`. Use `t.Fatalf` when a failure makes subsequent checks meaningless (e.g., nil pointer would panic). Use `t.Errorf` when you want to see all failures at once. This test uses `t.Fatalf` because each case is independent inside `t.Run` — a fatal inside a subtest only stops that subtest, not the whole suite.

```go
type Guard struct {
    Name       string
    Floor      int
    ShiftStart int
    ShiftHours int
}

func (g Guard) EndHour() int {
    return (g.ShiftStart + g.ShiftHours) % 24
}

func (g Guard) IsOnDuty(hour int) bool {
    end := g.EndHour()
    if end > g.ShiftStart {
        return hour >= g.ShiftStart && hour < end
    }
    return hour >= g.ShiftStart || hour < end
}

func TestIsOnDuty(t *testing.T) {
    tests := []struct {
        name  string
        guard Guard
        hour  int
        want  bool
    }{
        {"day shift on duty", Guard{"Chen", 1, 8, 6}, 10, true},
        {"day shift off duty", Guard{"Chen", 1, 8, 6}, 15, false},
        {"night shift on duty late", Guard{"Park", 3, 22, 6}, 23, true},
        {"night shift on duty early", Guard{"Park", 3, 22, 6}, 2, true},
        {"night shift off duty", Guard{"Park", 3, 22, 6}, 10, false},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := tt.guard.IsOnDuty(tt.hour)
            if got != tt.want {
                t.Fatalf("%s.IsOnDuty(%d) = %t, want %t",
                    tt.guard.Name, tt.hour, got, tt.want)
            }
        })
    }
}
```

Expected output:
```
PASS: TestIsOnDuty/day_shift_on_duty
PASS: TestIsOnDuty/day_shift_off_duty
PASS: TestIsOnDuty/night_shift_on_duty_late
PASS: TestIsOnDuty/night_shift_on_duty_early
PASS: TestIsOnDuty/night_shift_off_duty
```

### Acceptance Criteria

- Test functions follow `TestXxx` naming convention
- Uses `t.Errorf` or `t.Fatalf` for failures (teach difference: Errorf continues, Fatalf stops)
- Table-driven tests use slice of anonymous structs
- `t.Run` used for subtests with descriptive names
- Tests cover edge cases (empty, single char, overnight shifts)

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (first test):** 80 base, +40 first-try
- **Step 2 (table-driven):** 100 base, +50 first-try
- **Step 3 (test a method):** 100 base, +50 first-try
- **Par time:** 180s total

## Hints

### Step 0
1. "start with `package main` and import `\"fmt\"` and `\"testing\"`." (−5 energy)
2. "your main function just needs `fmt.Println(\"test suite ready\")`." (−8 energy)
3. "full scaffold: `package main` / `import (\"fmt\"; \"testing\")` / `func main() { fmt.Println(\"test suite ready\") }`" (−12 energy)

### Step 1
1. "test functions must start with `Test` and take `(t *testing.T)` as the only parameter." (−5 energy)
2. "call `reverseWord(\"hello\")`, store in `got`, compare with `\"olleh\"`. if not equal, call `t.Errorf`." (−8 energy)
3. "full pattern: `got := reverseWord(\"hello\")` / `if got != \"olleh\" { t.Errorf(\"reverseWord(\\\"hello\\\") = %q, want %q\", got, \"olleh\") }`" (−12 energy)

### Step 2
1. "declare a slice of anonymous structs: `tests := []struct{ name, input, want string }{ ... }`" (−5 energy)
2. "range over the slice and use `t.Run(tt.name, func(t *testing.T) { ... })` for each case." (−8 energy)
3. "add edge cases to the table: `{\"empty\", \"\", \"\"}`, `{\"single char\", \"a\", \"a\"}`, `{\"palindrome\", \"kayak\", \"kayak\"}`" (−12 energy)

### Step 3
1. "the struct literal for a test case needs a `guard` field of type `Guard` — `Guard{\"Chen\", 1, 8, 6}`." (−5 energy)
2. "use `t.Fatalf` instead of `t.Errorf` — inside a `t.Run` subtest, Fatalf only stops that one case." (−8 energy)
3. "test overnight wrap: `Guard{\"Park\", 3, 22, 6}` is on duty at hour 23 AND hour 2, but off duty at hour 10." (−12 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Kira message: "GHOST scans every module that doesn't have a test suite. Write the tests, become invisible." |
| T+50s | System message: "GHOST MODULE SCAN IN PROGRESS — VERIFIED MODULES BYPASSED" |
| T+100s | Rush Mode — "Scan Approaching" |

## Rush Mode

- **Duration:** 80 seconds
- **Speed bonus:** Up to +90 XP
- **On expiry:** Jeopardy — Module Flagged (GHOST detects Maya's code, energy drain 15 + warning flash)

## Twist

After completing the tests, Kira reveals she's been writing tests for her own infiltration tools the same way — that's how she stayed hidden inside GHOST's network for 6 months. "Tests aren't just quality. They're camouflage."

## UI State

- **Location label:** FLOOR 3 · KIRA'S LAB
- **Concept label:** Testing · Table-Driven · Subtests
- **Visual state:** Lab environment, test runner output panel, GHOST scan progress bar in top bar

## Teaching Notes

### Testing is a first-class citizen

Go's testing package is built into the language — no third-party framework needed. `go test` just works. The `_test.go` file convention means tests live alongside the code they test. This is Go's "batteries included" philosophy.

### Table-driven tests are THE Go pattern

Every serious Go project uses table-driven tests. The pattern (slice of structs + range + t.Run) is idiomatic to the point where code reviewers will ask "why isn't this table-driven?" if you don't use it. Teaching it here means the player has the pattern for every future chapter.

### Callback to previous chapters

Writing tests for `reverseWord` (ch04.2) and `Guard.IsOnDuty` (ch05) reinforces those concepts while teaching the new one. The player sees their old code in a new light — "I built that, now I'm proving it works." Powerful learning loop.

### t.Errorf vs t.Fatalf

`Errorf` logs the failure but continues running the rest of the test. `Fatalf` stops the test function immediately. Use `Fatalf` when a failure makes subsequent checks meaningless (e.g., a nil pointer that would panic on the next line). Use `Errorf` when you want to see all failures at once. Inside a `t.Run` subtest, `Fatalf` only stops that subtest — the other subtests still run. This nuance is demonstrated in Step 3.

### Naming conventions matter

Go enforces `TestXxx` — the function must start with `Test` followed by an uppercase letter. Subtest names passed to `t.Run` become part of the test path (spaces replaced with underscores). Good names make failure output self-documenting: `TestIsOnDuty/night_shift_on_duty_late` tells you exactly what broke without reading the code.
