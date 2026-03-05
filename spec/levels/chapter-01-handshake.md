# Chapter 1 — Handshake

**Act I · Sublevel 3 · Cell B-09**

## Go Concepts

- Hello World (`fmt.Println`)
- Variables (`var`, `:=`)
- Constants (`const`)

## Story Context

Maya wakes in Cell B-09 and finds a maintenance terminal. She establishes an encrypted channel and reaches you. She needs proof you have her exact location before she trusts you.

## Challenge

Write a Go program that prints Maya's exact cell location using variables and constants.

### Starter Code

```go
package main

import "fmt"

func main() {
    // Maya needs you to confirm her location
    // Use constants and variables to print:
    // "CELL B-09 · SUBLEVEL 3"
}
```

### Expected Solution (reference)

```go
package main

import "fmt"

func main() {
    const sublevel = 3
    cell := "B-09"
    fmt.Printf("CELL %s · SUBLEVEL %d\n", cell, sublevel)
}
```

### Acceptance Criteria

- Output contains "B-09" and "3" (or "SUBLEVEL 3")
- Uses at least one `const` or `var` declaration
- Uses `fmt.Println` or `fmt.Printf`
- Code compiles (no syntax errors)

## Timed Events

| Time | Event |
| --- | --- |
| T+18s | Footsteps outside door — Maya goes silent (chat pauses 5s) |
| T+20s | Rush Mode activates — 45 second timer |

## Rush Mode

- **Duration:** 45 seconds
- **Speed bonus:** Up to +50 XP
- **On expiry:** Jeopardy — Guard Enters (chat dims 50%, locks 60s)

## XP

- **Base:** 100 XP
- **First-try bonus:** +50 XP
- **Speed bonus:** Up to +50 XP (par time: 60s)

## Hints

1. "you need `fmt.Println` to send text through the terminal. try it." (−8 energy)
2. "`const name = value` for things that don't change. `:=` for quick variables." (−12 energy)
3. "`fmt.Printf(\"CELL %s · SUBLEVEL %d\n\", cell, sublevel)` — fill in the values." (−20 energy)

## Twist (post-completion)

Guards are talking about an "encryption thesis". Maya realizes she wasn't taken at random — they want something on her laptop.

### Twist Display

- Cinematic text reveal at 22ms/char
- 900ms delay between lines
- Lines:
  1. `> intercepted guard comms...`
  2. `> "...the encryption thesis... her laptop..."`
  3. `> maya: they didn't take me at random.`
  4. `> maya: they want my research.`

## UI State

- **Location label:** CELL B-09 · SUBLEVEL 3
- **Concept label:** Hello World · Variables · Constants
- **Editor tabs:** [CODE] [MISSION]
- **Chat:** Maya introduces herself, explains the situation
