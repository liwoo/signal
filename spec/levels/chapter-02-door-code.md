# Chapter 2 — Door Code

**Act I · Sublevel 3 · Cell B-09 Keypad**

## Go Concepts

- For loops (`for i := 0; i < n; i++`)
- Switch/case
- If/else

## Story Context

The keypad on Maya's cell door uses a 1-10 classification sequence. She needs you to write the logic that maps codes to door actions.

## Challenge

Write a Go program that classifies numbers 1-10 using a loop and switch statement to generate the correct keypad sequence.

### Starter Code

```go
package main

import "fmt"

func main() {
    // The keypad cycles through codes 1-10
    // For each code, print the door action:
    // 1-3: "DENY"
    // 4-6: "WARN"
    // 7-9: "GRANT"
    // 10:  "OVERRIDE"
}
```

### Expected Solution (reference)

```go
package main

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
}
```

### Acceptance Criteria

- Uses a `for` loop iterating through 1-10
- Uses `switch` or `if/else` for classification
- Output contains correct mapping for all 10 codes
- Prints "OVERRIDE" for code 10

## Timed Events

| Time | Event |
| --- | --- |
| T+12s | Two slow knocks from Cell B-10 |
| T+28s | Three knocks — a distress signal |
| T+30s | Rush Mode — "Cell B-10 in Danger" |

## Rush Mode

- **Duration:** 40 seconds
- **Speed bonus:** Up to +75 XP
- **On expiry:** Jeopardy — Energy Drain (−20 energy)

## XP

- **Base:** 150 XP
- **First-try bonus:** +75 XP
- **Speed bonus:** Up to +75 XP (par time: 90s)

## Hints

1. "use `for i := 1; i <= 10; i++` to loop through the codes." (−8 energy)
2. "`switch { case i <= 3: ... }` — no variable after switch for ranges." (−12 energy)
3. "loop 1-10, switch on ranges: 1-3 DENY, 4-6 WARN, 7-9 GRANT, 10 default OVERRIDE." (−20 energy)

## Twist (post-completion)

A voice from Cell B-10 says Maya's name. Someone in there knows her.

### Twist Display

- Audio: two knocks, then three knocks (sound effect)
- Lines:
  1. `> ...`
  2. `> "Maya? Maya Chen?"`
  3. `> maya: ...someone knows my name.`
  4. `> maya: i need to get to B-10.`

## UI State

- **Location label:** CELL B-09 · SUBLEVEL 3
- **Concept label:** For Loops · Switch · If/Else
- **Chat state:** Maya is tense, mentions the knocking
