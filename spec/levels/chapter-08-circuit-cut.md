# Chapter 8 — Circuit Cut

**Act III · Power Plant**

## Go Concepts

- Goroutines (`go func()`)
- WaitGroups (`sync.WaitGroup`)

## Story Context

Maya needs to simultaneously kill 4 circuits before the alarm triggers. All 4 must go down at the same time — goroutines are the only way to coordinate this.

## Challenge

Launch 4 goroutines, each disabling a circuit. Use a WaitGroup to ensure all complete before printing the result.

### Starter Code

```go
package main

import (
    "fmt"
    "sync"
)

// Disable 4 circuits concurrently
// Each circuit takes a different amount of "time" (simulated with a loop)
// Use goroutines and a WaitGroup to run them in parallel
// Print "ALL CIRCUITS DOWN" only after all 4 are complete

var circuits = []string{"North", "South", "East", "West"}

func main() {
    // TODO: launch goroutines for each circuit
    // TODO: wait for all to complete
    // TODO: print result
}
```

### Acceptance Criteria

- Uses `go func()` to launch goroutines
- Uses `sync.WaitGroup` with `Add`, `Done`, `Wait`
- All 4 circuit names appear in output
- "ALL CIRCUITS DOWN" prints last (after `wg.Wait()`)
- `wg.Done()` called via `defer` (best practice)

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 150s

## Hints

1. "`go func() { ... }()` launches a goroutine. don't forget the `()` at the end." (−8 energy)
2. "`var wg sync.WaitGroup; wg.Add(4)` — then `defer wg.Done()` inside each goroutine." (−12 energy)
3. "loop over circuits, launch `go func(name string) { defer wg.Done(); fmt.Println(name, \"down\") }(c)` — pass the variable!" (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+5s | Rush Mode — "Alarm triggers in 40 seconds" |

## Rush Mode

- **Duration:** 40 seconds
- **On expiry:** Jeopardy — Signal Scramble + Energy Drain (−20)

## Twist (post-completion)

Kira sends a file. It contains a decryption key — but also a zero-day exploit aimed at Maya's terminal.

### Twist Display

- Lines:
  1. `> incoming file from K.VOLKOV...`
  2. `> file contains: decryption key [VERIFIED]`
  3. `> file also contains: zero-day exploit [DETECTED]`
  4. `> maya: is it a gift or a trap?`
  5. `> dr. reeves: both. that's how kira works.`

## UI State

- **Location label:** POWER PLANT · CIRCUIT ARRAY
- **Concept label:** Goroutines · WaitGroups
- **Visual:** Each circuit shows a status indicator that flips to "DOWN" as goroutines complete
