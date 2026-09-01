# Boss — Director Vasik · Terminal 3 (PART I FINAL BOSS)

**Act V · District 7 Rooftop · The Duel**

## Go Concepts (Application)

- Worker pools with jobs channels (ch12)
- `context.WithTimeout`, cancellation propagation (ch12)
- Generics — type-parameterized pool (ch12)
- WaitGroup contracts under cancellation (ch08, ch10, boss-04)
- `select` across work and cancellation (ch09)

Zero new concepts. This is the Part I concurrency capstone, played as a race.

## Story Context

Maya and Reeves are out of the building — and the city's surveillance grid snaps awake around them. Eleven checkpoints between the rooftop uplink and Pier 9. Vasik's promised keyboard arrives as a split screen: his terminal, live, streaming code. Same spec, same deadline, two programmers. Whoever's grid-clearance program runs correct first owns the checkpoints. He types faster than anyone Maya has ever watched. "First clean run wins, Ms. Chen. I don't intend to read your code afterward. There won't be an afterward."

## Mechanic

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  VASIK · TERMINAL 3 · THE DUEL            SPEC v1 → v4    │
├─────────────────────────────┬─────────────────────────────┤
│  YOUR EDITOR                │  VASIK (live stream)        │
│                             │                             │
│  [player writes the         │  [pre-scripted solution     │
│   grid-clearance pool]      │   types itself in real      │
│                             │   time — readable]          │
│                             │                             │
├─────────────────────────────┴─────────────────────────────┤
│  MISSION BRIEF (scrolling): spec constraints appear here  │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░  VASIK: 61% COMPLETE · 2:40 REMAINING   │
└───────────────────────────────────────────────────────────┘
```

Mobile (design.md §10.6): Vasik's pane collapses to a status bar — `VASIK: 14/23 LINES · 61%` — player's editor takes the full screen.

### The Spec (player-facing mission brief, v1)

Write a generic worker pool that clears surveillance checkpoints:

```go
func clearGrid[T any, U any](ctx context.Context, jobs []T, workers int, fn func(context.Context, T) U) []U
```

Requirements v1:
1. Exactly `workers` goroutines consume from a shared jobs channel.
2. Results land at the **same index** as their job (order-stable output).
3. A checkpoint that outlasts the context deadline reports `TIMEOUT`, not a hang.
4. The pool must fully drain and return — no goroutine leaks under cancellation.

Checkpoint data and per-checkpoint clear function are provided in the starter file:

```go
type Checkpoint struct {
    ID      int
    Name    string
    Latency time.Duration
}

type Result struct {
    Name   string
    Status string
}

func clear(ctx context.Context, cp Checkpoint) Result {
    select {
    case <-time.After(cp.Latency):
        return Result{cp.Name, "CLEARED"}
    case <-ctx.Done():
        return Result{cp.Name, "TIMEOUT"}
    }
}
```

### Constraint Injections (scripted, mission brief scrolls)

| Time | Injection | Effect on spec | Vasik's stream |
| --- | --- | --- | --- |
| 0:45 | `SPEC v2 — grid added RAIL-SPUR (2.6s latency)` | A job now exceeds the 2s context — the TIMEOUT path stops being theoretical | Adapts correctly, faster than you |
| 1:30 | `SPEC v3 — workers capped at 3 (surveillance heat)` | Pool size becomes a parameter check, not a constant | Adapts correctly |
| 2:15 | `SPEC v4 — pool must survive cancellation cleanly` | The leak requirement is now explicit and graded | **He doesn't change anything.** His workers already return on `ctx.Done()` — without calling `wg.Done()` |

### Vasik's Code (streams in full by 2:50 — readable, and wrong)

His worker loop, as the stream renders it:

```go
go func() {
    for {
        select {
        case idx, ok := <-jobCh:
            if !ok {
                wg.Done()   // Done only on the clean-close path
                return
            }
            results[idx] = fn(ctx, jobs[idx])
        case <-ctx.Done():
            return          // ← leaves without Done. The pool never Waits out.
        }
    }
}()
```

Verified behavior: under the RAIL-SPUR timeout his `wg.Wait()` hangs forever — a watchdog kills his run at evaluation. The player's version must instead register `defer wg.Done()` at goroutine start (or Done on every exit path).

### Reference Solution (player side, verified)

```go
func clearGrid[T any, U any](ctx context.Context, jobs []T, workers int, fn func(context.Context, T) U) []U {
    jobCh := make(chan int)
    results := make([]U, len(jobs))
    var wg sync.WaitGroup
    wg.Add(workers)
    for w := 0; w < workers; w++ {
        go func() {
            defer wg.Done()
            for idx := range jobCh {
                results[idx] = fn(ctx, jobs[idx])
            }
        }()
    }
    for i := range jobs {
        select {
        case jobCh <- i:
        case <-ctx.Done():
        }
    }
    close(jobCh)
    wg.Wait()
    return results
}
```

### Test Harness (engine appends; 2-second context, 3 workers)

```go
func main() {
    checkpoints := []Checkpoint{
        {0, "NORTH-BRIDGE", 400 * time.Millisecond},
        {1, "TRAM-JUNCTION", 300 * time.Millisecond},
        {2, "MARKET-ARCH", 500 * time.Millisecond},
        {3, "CANAL-LOCK", 200 * time.Millisecond},
        {4, "RAIL-SPUR", 2600 * time.Millisecond},
        {5, "PIER-NINE", 100 * time.Millisecond},
    }

    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    results := clearGrid(ctx, checkpoints, 3, clear)
    for _, r := range results {
        fmt.Println(r.Name+":", r.Status)
    }
    fmt.Println("GRID RUN COMPLETE")
}
```

Expected output (exact — verified deterministic across runs; the playground's virtual clock makes it exact there too):
```
NORTH-BRIDGE: CLEARED
TRAM-JUNCTION: CLEARED
MARKET-ARCH: CLEARED
CANAL-LOCK: CLEARED
RAIL-SPUR: TIMEOUT
PIER-NINE: CLEARED
GRID RUN COMPLETE
```

(The harness shown to the player lists 6 checkpoints for readability; the fiction says 11 — the remaining 5 are "already streaming on Vasik's side." Same code path.)

### Timer & Race Dynamics

- **Total clock: 180 seconds.** Vasik's stream is scripted to *submit* at 2:50.
- His submission runs first — and hangs on the leak. The watchdog fails him at evaluation. The screen shows it happen: `VASIK RUN: WATCHDOG KILL — GOROUTINE LEAK`.
- The player wins by submitting a **correct** run any time before the clock dies — even after Vasik submits. Racing his 2:50 mark earns the under-par bonus; beating the clock at all wins the duel.
- Wrong submissions: −10s each (his grid tightens).

### Failure

Clock reaches zero with no clean run: checkpoints lock, Maya and Reeves are pinned on the rooftop. Energy to 20%. Retry restarts at 150 seconds; constraint injections arrive pre-applied (spec v4 from the start) — less reading, same code to write.

### Victory

Player's run prints the exact grid output. Vasik's terminal fractures mid-taunt (screen shatter effect). Eleven checkpoints flip green in sequence on the city map. Part I ends.

## XP

- **Duel won:** 700 base
- **Won before Vasik submits (2:50):** +250 under-par
- **First-try clean submission:** +50
- **Boss defeat:** +2 AI tokens
- **Total possible:** 1000+ XP

## Timed Events

| Time | Event |
| --- | --- |
| 0:00 | VASIK: "Same spec. First clean run. I've cleared my calendar for the next three minutes." |
| 0:45 | System: `SPEC v2 — RAIL-SPUR ADDED · LATENCY 2.6s` |
| 1:30 | System: `SPEC v3 — WORKER CAP: 3` |
| 2:15 | System: `SPEC v4 — CLEAN SHUTDOWN REQUIRED` · Maya: "look at his workers. look at the ctx.Done path. he never calls Done." |
| 2:50 | System: `VASIK SUBMITTED` → `VASIK RUN: WATCHDOG KILL — GOROUTINE LEAK` |
| T−20s | Reeves: "Correct beats fast. Breathe. Finish it." |

## Twist

Post-victory — the Part I finale and Interlude handoff.

- Lines (branch: **Trusted Kira / Ending A**):
  1. `> vasik terminal: DISCONNECTED`
  2. `> kira: broadcast is live. his files are everywhere. watch the news.`
  3. `> system: DIRECTOR A. VASIK — DETAINED · PIER 9 CLEAR`
  4. `> maya: we made it. we actually made it.`
  5. `> ghost: YOU ESCAPED THE BUILDING.`
  6. `> ghost: YOU HAVEN'T ESCAPED THE NETWORK.`
  7. `> reeves: "Maya... we need to talk about NEXUS."`

- Lines (branch: **Rejected Kira / Ending B**):
  1. `> vasik terminal: DISCONNECTED`
  2. `> system: PIER 9 CLEAR · CONTACT: FERRYMAN CONFIRMED`
  3. `> maya: kira's channel is gone. wiped. like she was never here.`
  4. `> system: DIRECTOR A. VASIK — LOCATION UNKNOWN`
  5. `> ghost: YOU ESCAPED THE BUILDING.`
  6. `> ghost: YOU HAVEN'T ESCAPED THE NETWORK.`
  7. `> reeves: "He'll run to them. To NEXUS. And so must we — after them."`

Both branches converge on the Interlude: 72 hours later, the safe house, Reeves' NEXUS briefing, and Maya's line into Part II — *"then I need to learn to code for the web."*

## UI State

- **Location label:** DISTRICT 7 · ROOFTOP UPLINK
- **Concept label:** The Duel · Worker Pools · Context · Generics
- **Visual state:** Split-screen editors, Vasik progress percentage bar, scrolling mission brief, city-grid checkpoint map that flips green on victory, screen-shatter on his disconnect
- **Audio:** boss-loop music, keypress-1..3 at high rate for Vasik's stream, countdown-tick under 30s, explosion-small + shield-break on the watchdog kill, handshake-confirm ×11 as checkpoints clear

## Teaching Notes

### Correctness beats speed — mechanically, not rhetorically

The entire encounter is engineered so the player **cannot win by typing fast**: Vasik always submits first. The only path to victory is the thing his code lacks — a leak-free shutdown. The game's thesis about concurrency ("the bug you can't see is the one that kills you") becomes the win condition itself.

### Capstone coverage

One function exercises the whole Part I concurrency track: goroutines and WaitGroup discipline (ch08), `select` with cancellation (ch09), shared results without data races via index ownership (ch10's lesson inverted — partitioning instead of locking), pools/context/generics (ch12). Teaching Notes in-game should name these callbacks explicitly on the victory screen.

### Reading hostile code, final form

Boss-02 gave the player broken code to fix. Boss-04 gave them obfuscated code to debug. Boss-05 gives them **correct-looking code they must merely notice is wrong** — while writing their own. That's the actual job of a senior engineer in a code review, and it's the skill the three Vasik terminals were silently building.

### Boss format ledger

Combat (Lockmaster) → data waves (Interceptor) → debugging (Vasik I) → judgment (Kira) → semantic debugging (Vasik II) → **live race (Vasik III)**. Part II's bosses move to web-native formats; this closes the terminal-era arc.
