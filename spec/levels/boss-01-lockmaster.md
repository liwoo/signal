# Boss — The Lockmaster

**Act I Boss · Sublevel 3 · Master Lock Controller**

## Go Concepts (Applied)

- For loops
- If/else (pattern detection)

## Story Context

The building's master lock controller starts cycling through 6-digit access codes. It will lock the entire sublevel in 90 seconds. The code pattern follows a mathematical rule Maya can see but can't compute fast enough manually.

## Mechanic

### Layout

```
┌─────────────────────────────────────────────────┐
│                 LOCKMASTER · 01:22              │
├────────────────────┬────────────────────────────┤
│  CURRENT CODE      │  func predictNext(         │
│                    │      codes []int) int {     │
│  ▸ 102847          │      // TODO                │
│  ▸ 104694          │  }                          │
│  ▸ 106541          │                             │
│  ▸ [next: ???]     │                             │
│                    │                             │
│  Updates every 3s  │                             │
├────────────────────┴────────────────────────────┤
│  ██████████████░░░░░░  SUBLEVEL LOCKDOWN · 1:22 │
└─────────────────────────────────────────────────┘
```

### Code Cycling

- A sequence of 6-digit numbers appears on the left panel
- New code appears every 3 seconds
- The pattern follows a consistent arithmetic rule (e.g., each code = previous + 1847)
- Pattern randomized per attempt from a pool of rules

### Pattern Pool

| Pattern | Rule | Example Sequence |
| --- | --- | --- |
| Linear | +N (constant delta) | 102847, 104694, 106541, 108388 |
| Alternating | +A, +B, +A, +B | 100000, 103000, 104500, 107500 |
| Quadratic | delta increases by N | 100000, 100100, 100300, 100600 |

### Player Task

Write a Go function `predictNext(codes []int) int` that takes the visible codes and returns the next value.

### Timer

- **Duration:** 90 seconds
- **Wrong submission penalty:** −10 seconds from boss timer (not rush timer)
- **No energy drain** — timer is the only pressure

### Win Condition

Correct predicted code submitted before timer hits 0.

### Loss Condition

Timer reaches 0. Sublevel locks.
- Energy drops to 10%
- Chapter replays with a 60-second timer instead of 90

## XP

- **Base:** 500 XP
- **Under par (60s):** +250 XP
- **AI tokens earned:** +2

## Mobile Layout

- Timer + cycling code: top 30% of screen
- Editor: bottom 70%
- Cycling code scrolls horizontally if needed

## UI State

- **Location label:** MASTER LOCK CONTROLLER
- **No chat panel** — Maya is watching silently
- **Boss music/atmosphere:** Tension-building (if audio implemented)
- **Timer bar:** Full-width at bottom, red, shrinks left-to-right
