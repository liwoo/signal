# Boss — Director Vasik · Terminal 2

**Act IV · Exit Corridor · Vasik's Direct Channel**

## Go Concepts (Application)

- Structs, pointer vs value receivers (ch05)
- Maps and initialization (ch04)
- Goroutines, closures, and captured variables (ch07, ch08)
- WaitGroup contracts — Add before launch, Done via defer (ch08, ch10)
- Reading and debugging someone else's hostile code

Zero new concepts. This is a semantic-debugging exam over Acts II–IV.

## Story Context

Maya has the corrected safe-house address and an armed countdown. Then every screen in the exit corridor goes black, and Vasik opens a direct channel. He has Maya's escape-route compiler — the program that sequences her hops out of the building — and he's "improved" it. Four sabotages, stitched in personally. The doors along the route stay sealed until the route program runs clean. "You fixed my SecurityProfile in two minutes," he types. "This one took me longer to break. Show me it was luck."

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  VASIK · TERMINAL 2 · ROUTE COMPILER          BUG 1/4     │
├────────────────────────────┬─────────────────────────────┤
│  VASIK'S CODE (read-only)  │  YOUR CORRECTED VERSION     │
│                            │                             │
│  [obfuscated route         │  [player edits a full       │
│   program, 45 lines,       │   copy of the program]      │
│   4 planted bugs]          │                             │
│                            │                             │
├────────────────────────────┴─────────────────────────────┤
│  ▓▓▓▓▓▓▓▓░░░░  ROUTE LOCKED · 2:20   ESCAPE WINDOW: OPEN │
└──────────────────────────────────────────────────────────┘
```

Mobile: diff panel collapses to a tab toggle (Vasik's code / Your code), per design.md §10.6.

### Vasik's Code (read-only, as delivered)

```go
package main

import (
    "fmt"
    "sync"
)

type Node struct {
    ID   int
    Name string
}

type Router struct {
    weights map[string]int
    hops    int
}

func (r Router) AddHop() { r.hops++ }

func main() {
    nodes := []Node{{0, "SERVICE-TUNNEL"}, {1, "LOADING-DOCK"}, {2, "PIER-GATE"}}
    weights := []int{4, 2, 7}

    var router Router

    results := make([]string, len(nodes))
    var wg sync.WaitGroup
    var cur Node
    for i, n := range nodes {
        cur = n
        go func(idx int) {
            wg.Add(1)
            defer wg.Done()
            results[idx] = fmt.Sprintf("hop %d: %s weight %d", idx, cur.Name, weights[idx])
        }(i)
    }
    wg.Wait()

    for _, n := range nodes {
        router.weights[n.Name] = weights[n.ID]
        router.AddHop()
    }

    for _, line := range results {
        fmt.Println(line)
    }
    fmt.Println("hops:", router.hops)
    fmt.Println("ROUTE COMPILED")
}
```

### The Four Bugs (phase structure)

Each phase surfaces one sabotage. The engine re-runs the player's current version at each submission; fixing a bug reveals the next symptom. Symptoms verified against real Go:

**Phase 1 — The Crash (0:00–0:35)**
Run as delivered: `panic: assignment to entry in nil map`. `var router Router` leaves `weights` nil — writing to a nil map panics. Fix: construct it (`router := Router{weights: make(map[string]int)}` or a `NewRouter()` helper returning `*Router`).

**Phase 2 — The Vanishing Hops (0:35–1:10)**
Program runs, but prints `hops: 0`. `func (r Router) AddHop()` has a **value receiver** — it increments a copy and discards it. Fix: pointer receiver `func (r *Router) AddHop()` (and a `*Router` to call it on). Callback to ch05's pointer-receiver drills.

**Phase 3 — The Cloned Checkpoint (1:10–1:45)**
Hops count now, but the route lines repeat one node name — usually `PIER-GATE` three times. `cur` is declared **outside** the loop; every goroutine reads the shared `cur`, which by the time they run holds the last node. (Note: Go 1.22 made `range` variables per-iteration — Vasik routed around that fix by hoisting `cur` out of the loop himself. He knows his Go.) Fix: pass the node as a goroutine parameter alongside the index.

**Phase 4 — The Missing Hop (1:45–2:20)**
Names now vary, but some runs print blank result lines. `wg.Add(1)` sits **inside** the goroutine — `wg.Wait()` can pass before any goroutine has run `Add`. The contract: Add before launch, Done via defer. Fix: `wg.Add(len(nodes))` before the loop.

### Corrected Program (target)

```go
func NewRouter() *Router {
    return &Router{weights: make(map[string]int)}
}

func (r *Router) AddHop() { r.hops++ }

// in main:
router := NewRouter()
var wg sync.WaitGroup
wg.Add(len(nodes))
for i, n := range nodes {
    go func(idx int, node Node) {
        defer wg.Done()
        results[idx] = fmt.Sprintf("hop %d: %s weight %d", idx, node.Name, weights[idx])
    }(i, n)
}
wg.Wait()
```

Expected output (exact, deterministic — results indexed, printed after Wait):
```
hop 0: SERVICE-TUNNEL weight 4
hop 1: LOADING-DOCK weight 2
hop 2: PIER-GATE weight 7
hops: 3
ROUTE COMPILED
```

### Timer

Single 140-second encounter clock. Phase boundaries above are pacing guides, not hard gates — a player who spots all four bugs immediately can submit one complete fix and clear every phase at once (this earns the under-par bonus).

### Vasik's Pressure

Every 25 seconds without a passing submission, Vasik seals one door on the exit-route minimap (top-right, 5 doors). Each sealed door = −10s on the clock. All five sealed = route dead.

### The Offer

At 0:50, if the player cleared boss-02 in under 60s (`vasik_rattled` flag), Vasik pauses the attack:

> `vasik: "An offer, before you spend your last two minutes. Work for me. NEXUS pays for hands this fast — and Ms. Chen walks. One word."`
> `maya: don't answer him. don't even type.`

Ignoring it (submitting code instead of replying) is the correct move and logs `offer_refused` — referenced in the boss-08 intro.

### Failure

Clock at zero or all doors sealed: route dead. Energy drops to 20%. Retry restarts the encounter at 100 seconds with bug phases in the same order (the code is identical — knowledge carries over, which is the point).

### Victory

All four bugs fixed, exact output matched. The doors unbolt in sequence down the corridor. Vasik goes quiet for exactly four seconds — then one line.

## XP

- **Phase 1 (nil map):** 120 base
- **Phase 2 (value receiver):** 140 base
- **Phase 3 (shared capture):** 160 base
- **Phase 4 (WaitGroup contract):** 180 base
- **Under-par bonus (clear by 1:50):** +250
- **Boss defeat bonus:** +2 AI tokens
- **Total possible:** 850 XP

## Timed Events

| Time | Event |
| --- | --- |
| 0:00 | VASIK: "Your route compiler. Improved. Four improvements, to be precise." |
| 0:35 | VASIK: "It runs now? Check your hop counter. Details matter, Ms. Chen." |
| 1:10 | Maya: "every hop says pier gate. the goroutines are all reading the same node." |
| 1:45 | Reeves: "Some runs lose a hop entirely. The WaitGroup is lying to you." |
| Every 25s idle | System: `DOOR SEALED — ROUTE SEGMENT LOST · −10s` |
| 0:50 | The Offer (only if `vasik_rattled`) |

## Twist

Post-victory. Vasik's four seconds of silence break:

- Lines:
  1. `> vasik: "Not luck, then."`
  2. `> vasik: "You should know the grid outside is mine too. Eleven checkpoints."`
  3. `> vasik: "Bring the same hands. I'll bring a keyboard."`
  4. `> system: EXIT CORRIDOR UNLOCKED · ALL SEGMENTS GREEN`
  5. `> maya: he's not defending anymore. he's challenging.`
  6. `> reeves: "Then Act Five is a duel. Rest your fingers."`

Sets up ch12 (the surveillance grid / 11 checkpoints) and boss-05 (the head-to-head race).

## UI State

- **Location label:** EXIT CORRIDOR · TERMINAL 2
- **Concept label:** Route Compiler · Debugging Duel II
- **Visual state:** Split diff panel, 5-door route minimap top-right, door-seal flash on idle penalty, screen shake on panic output
- **Audio:** tension-drone ambient, keypress-1..3 for Vasik's "typing", alert-beep on door seal, boss-hit on each cleared bug, dread-sting on The Offer

## Teaching Notes

### Semantic, not syntactic

Boss-02's bugs included a compile error — the compiler was on the player's side. Terminal 2's program **compiles cleanly and lies at runtime**. Panic, silent copy mutation, shared capture, racing WaitGroup: the escalation is from errors Go catches to errors only a programmer catches.

### Four production footguns

Every bug is a top-ten real-world Go mistake: nil map writes, value-receiver mutation, hoisted-variable capture in goroutines, `Add` inside the goroutine. A player who internalizes these four is measurably better at Go than most first-year users of the language.

### The Go 1.22 nod

Sharp players may know `range` variables became per-iteration in Go 1.22 and think phase 3 is a non-bug. Vasik hoisting `cur` out of the loop is deliberate — it teaches that the 1.22 fix covers loop *variables*, not shared variables you hoist yourself. The spec text says this out loud; it's a teaching moment disguised as villain characterization.

### Boss format ledger

Lockmaster: combat. Relay Interceptor: data waves. Vasik I: syntax-forward debugging. Kira: judgment. **Vasik II: semantic debugging under a shrinking map.** Next (Vasik III) abandons debugging entirely for a live race — each Vasik encounter removes a safety net.
