# Boss — Director Vasik (Terminal 3 of 3) — FINAL BOSS

**Act V Final Boss**

## Go Concepts (Full Application)

- Concurrent worker pool
- Context cancellation
- Generics
- WaitGroups with defer
- Goroutine leak detection

## Story Context

Split-screen. Vasik challenges you directly. A head-to-head typing/solving race. His "solution" appears on the right half of your screen, yours on the left. First complete, correct Go program wins.

## Mechanic

### Layout (Desktop)

```
┌──────────────────────────────────────────────────────┐
│              FINAL CONFRONTATION · VASIK             │
├──────────────────────────┬───────────────────────────┤
│  YOUR CODE               │  VASIK'S CODE (streaming) │
│                          │                           │
│  func main() {           │  func main() {            │
│      // implement spec   │      ctx, cancel := ...   │
│  }                       │      pool := newPool(...   │
│                          │      // typing in realtime │
│                          │                           │
│                          │                           │
├──────────────────────────┴───────────────────────────┤
│  SPEC: Worker pool with context timeout, generic     │
│  result mapper, 5 workers, 20 tasks                  │
├──────────────────────────────────────────────────────┤
│  VASIK: 14/23 lines ██████████░░░  YOU: 7/23 lines   │
└──────────────────────────────────────────────────────┘
```

### The Spec

Both sides must implement:

1. A concurrent worker pool with N workers processing M tasks
2. Generic result mapper (`func map[T, R](...)`)
3. Context with timeout — cancel all workers when context expires
4. Proper cleanup: `defer wg.Done()` inside goroutines

### Vasik's Hidden Bug

His goroutines don't call `wg.Done()` inside a `defer`. Under cancellation, his pool leaks goroutines. His code submits first but **fails evaluation**.

### Evolving Spec

Every 15 seconds, Vasik adds a new constraint:

| Time | New Constraint |
| --- | --- |
| +15s | "Add error channel for failed tasks" |
| +30s | "Rate limit workers to 3 per second" |
| +45s | "Add retry logic for failed tasks (max 2 retries)" |

Vasik's code updates to include each constraint — sometimes correctly, sometimes not. Player must also incorporate them.

### Win Condition

Player submits correct, complete solution. Vasik's code submits first but fails (goroutine leak detected by evaluator).

- Screen fractures (CSS animation)
- Vasik's terminal disconnects
- Cinematic ending plays

### Loss Condition

Player's code also has bugs, or player doesn't finish. Energy drops to 5%. Replay available.

## XP

- **Base:** 1000 XP
- **Under par (180s):** +500 XP
- **AI tokens earned:** +3

## Mobile Layout

- Split-screen collapses to single editor
- Vasik's progress shown as status bar: "Vasik: 14/23 lines complete"
- Player's editor takes full screen
- Evolving spec shown as scrolling mission brief at top

## Endings

### Ending A (Trusted Kira)

After defeating Vasik:
1. Kira broadcasts Vasik's files publicly
2. Vasik is arrested
3. Maya and Dr. Reeves reach the safe house
4. The thesis is safe
5. Credits roll with stats

### Ending B (Rejected Kira)

After defeating Vasik:
1. Kira vanishes
2. Vasik escapes
3. Maya is safe, but...
4. Final message: "Act II begins."
5. Credits roll with stats + tease

### Post-Credits

- Total stats display (XP, time, attempts, streak best, hints used)
- Feedback prompt (see `feedback.md`)
- Leaderboard position (if authenticated)
- Share button (screenshot of stats)

## UI State

- **Location label:** VASIK'S TERMINAL · FINAL
- **No chat panel** — pure focus
- **Boss music/atmosphere:** Peak tension
- **Screen fracture animation** on win: CSS `clip-path` shatter effect, 2s duration
