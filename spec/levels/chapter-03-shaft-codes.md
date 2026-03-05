# Chapter 3 — Shaft Codes

**Act I · Sublevel 3 · Ventilation Shaft**

## Go Concepts

- Functions (declaration, parameters, return)
- Multiple return values
- Variadic functions (`...`)

## Story Context

Maya enters the ventilation shaft. Each junction has a code panel that requires a computed response. She needs functions that handle variable-length inputs and return multiple values — the shaft code and a validity flag.

## Challenge

Write Go functions to process shaft junction codes: a variadic function that sums codes, and a function returning multiple values (result + valid flag).

### Starter Code

```go
package main

import "fmt"

// sumCodes takes any number of ints and returns their sum
func sumCodes(codes ...int) int {
    // TODO
}

// validateCode returns the code result and whether it's valid (> 100)
func validateCode(codes ...int) (int, bool) {
    // TODO
}

func main() {
    sum := sumCodes(25, 30, 50, 10)
    fmt.Println("Sum:", sum)

    result, valid := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %t\n", result, valid)
}
```

### Expected Solution (reference)

```go
package main

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
    fmt.Printf("Result: %d, Valid: %t\n", result, valid)
}
```

### Acceptance Criteria

- `sumCodes` uses variadic `...int` parameter
- `sumCodes` correctly sums all arguments
- `validateCode` returns two values (int, bool)
- `validateCode` returns `true` when sum > 100
- Both functions called in `main`

## Timed Events

| Time | Event |
| --- | --- |
| T+8s | Power Cut — full screen flicker and blackout (4s), red emergency tinge |
| T+10s | System message: `BACKUP POWER · 90 SECONDS` |
| T+11s | Rush Mode — "Backup Power Failing" |

## Rush Mode

- **Duration:** 90 seconds (generous — power cut is disorienting)
- **Speed bonus:** Up to +100 XP
- **On expiry:** Jeopardy — Power Reduced (editor drops to 40% width, line numbers disappear)

## Power Cut Sequence

1. **T+8s:** Screen flickers (CSS animation: opacity 1 -> 0 -> 0.3 -> 0 -> 0.8, 1.2s)
2. **T+8s + 1.2s:** Full black (2s)
3. **T+8s + 3.2s:** Red emergency restore (0.8s fade-in, background tinted `#1a0505`)
4. UI remains red-tinged for rest of chapter
5. System message appears in chat as `SYS` sender

## XP

- **Base:** 200 XP
- **First-try bonus:** +100 XP
- **Speed bonus:** Up to +100 XP (par time: 120s)

## Hints

1. "variadic means `func name(args ...int)` — it takes any number of ints." (−8 energy)
2. "to return two things: `func f() (int, bool) { return val, cond }`" (−12 energy)
3. "sum with `for _, c := range codes { total += c }`, validate with `total > 100`." (−20 energy)

## Twist (post-completion — cinematic)

Maya reaches Cell B-10. Dr. Eleanor Reeves is inside, alive.

### Twist Display

- Full cinematic: dark screen, text types slowly
- Lines:
  1. `> maya reached cell B-10.`
  2. `> the door opens.`
  3. `> ...`
  4. `> "Maya — I know exactly why they took us."`
  5. `> dr. eleanor reeves. alive.`
- 900ms line delay, 22ms/char
- After cinematic: transition to Act I Boss

## UI State

- **Location label:** VENTILATION SHAFT · SUBLEVEL 3
- **Concept label:** Functions · Multiple Returns · Variadic
- **Visual state:** Red emergency tinge after power cut
- **PWA prompt:** Add to Home Screen fires after this chapter completes
