# Chapter 12 — Scout Network

**Act V · City Streets / District 7**

## Go Concepts

- Worker pools (jobs channel + results channel, `for cp := range jobs`, `close(jobs)`)
- Buffered channels as result collectors (`make(chan string, n)`)
- `context.WithTimeout`, `ctx.Done()`, `ctx.Err()`, `defer cancel()`
- Rate limiting with `time.NewTicker`, `ticker.C`, `defer ticker.Stop()`
- Generics: type parameters (`func mapResults[T, U any](...)`), the `any` constraint, type inference
- `sort.Strings` for deterministic collection of concurrent results (callback to ch04.3)

## Story Context

The building is behind them. Vasik's answer was to wake the city: District 7's surveillance grid is coming online sector by sector, and GHOST's twelve-hour deadline is inside its final hour. Reeves has eight scouts on the street and eleven checkpoints between here and the river. The checkpoints must be cleared concurrently — one scout at a time is an hour they don't have. More than two grid pings per second trips the sweep. Any scout still transmitting five seconds after dispatch gets triangulated. Maya needs a worker pool with a rate limiter and a hard context deadline — the exact machine Go was built for. If one scout hangs past the deadline, the grid takes them all.

## Challenge

Build the scout network: a worker pool that clears checkpoints through a jobs/results pipeline, a context deadline that abandons slow sweeps cleanly, a ticker that keeps dispatches under the grid's rate threshold, and a generic result mapper that formats every report the same way.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "scout net online".

Imports for this chapter: `"fmt"` now; `"sync"` and `"sort"` arrive in step 1, `"context"` and `"time"` in step 2. (Go refuses to compile unused imports — add them only when a step needs them.)

#### Step 1: The Worker Pool

Write `func clearCheckpoints(scouts int, checkpoints []int) []string` — launch one goroutine per scout, feed checkpoint IDs through a `jobs` channel, collect confirmations through a `results` channel, and return them sorted.

Key teaching moment: this is THE Go concurrency pattern — more common in production than anything from ch08 or ch09 alone. Workers `range` over the jobs channel: the loop pulls a job, processes it, and loops — and it ends automatically when the channel is **closed and drained**. That's what `close(jobs)` is for: it's not destruction, it's a broadcast that says "no more work is coming." Eight scouts, eleven checkpoints — the pool balances itself; whichever scout is free takes the next job. Nobody is assigned anything. The results channel is buffered to `len(checkpoints)` so no worker ever blocks on delivery. And because the scheduler decides who finishes first, the results arrive in random order — collect them all after `wg.Wait()`, then `sort.Strings` before returning. Deterministic output from nondeterministic execution.

```go
func clearCheckpoints(scouts int, checkpoints []int) []string {
    jobs := make(chan int, len(checkpoints))
    results := make(chan string, len(checkpoints))

    var wg sync.WaitGroup
    for s := 0; s < scouts; s++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for cp := range jobs {
                results <- fmt.Sprintf("checkpoint %02d: cleared", cp)
            }
        }()
    }

    for _, cp := range checkpoints {
        jobs <- cp
    }
    close(jobs)

    wg.Wait()
    close(results)

    cleared := []string{}
    for line := range results {
        cleared = append(cleared, line)
    }
    sort.Strings(cleared)
    return cleared
}
```

Test harness:
```go
func main() {
    checkpoints := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}
    for _, line := range clearCheckpoints(8, checkpoints) {
        fmt.Println(line)
    }
    fmt.Printf("%d/11 checkpoints cleared\n", len(checkpoints))
}
```

Expected output:
```
checkpoint 01: cleared
checkpoint 02: cleared
checkpoint 03: cleared
checkpoint 04: cleared
checkpoint 05: cleared
checkpoint 06: cleared
checkpoint 07: cleared
checkpoint 08: cleared
checkpoint 09: cleared
checkpoint 10: cleared
checkpoint 11: cleared
11/11 checkpoints cleared
```

(The `%02d` matters: without zero-padding, `sort.Strings` would put "checkpoint 10" before "checkpoint 2". Formatting for sortability is a real production trick.)

#### Step 2: The Hard Deadline

Write `func sweepSector(ctx context.Context, sector string, sweep time.Duration) string` — the sweep either finishes inside the context deadline (`<sector>: swept`) or gets abandoned the instant the context expires (`<sector>: abandoned (<reason>)`).

Key teaching moment: `context.Context` is Go's universal cancellation standard — every serious Go API (`net/http`, databases, gRPC) takes one as its first argument. `context.WithTimeout(parent, 5*time.Second)` returns a context and a `cancel` function; `defer cancel()` is non-negotiable — it releases the context's timer even if you finish early. The magic is `ctx.Done()`: a channel that closes when the deadline hits. Which makes cancellation a `select` — the exact shape from ch09, except one case is the work and the other is the deadline. `ctx.Err()` tells you *why*: `context deadline exceeded` for timeouts, `context canceled` for manual cancels. A scout that checks `ctx.Done()` stops transmitting the moment the grid deadline lands. A scout that doesn't is a goroutine leak with a radio.

```go
func sweepSector(ctx context.Context, sector string, sweep time.Duration) string {
    select {
    case <-time.After(sweep):
        return sector + ": swept"
    case <-ctx.Done():
        return sector + ": abandoned (" + ctx.Err().Error() + ")"
    }
}
```

Test harness:
```go
func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    sectors := []string{"market", "transit", "riverside", "old-town", "harbor"}
    sweeps := []time.Duration{1 * time.Second, 2 * time.Second, 3 * time.Second, 6 * time.Second, 8 * time.Second}

    results := make([]string, len(sectors))
    var wg sync.WaitGroup
    for i, s := range sectors {
        wg.Add(1)
        go func(idx int, name string, d time.Duration) {
            defer wg.Done()
            results[idx] = sweepSector(ctx, name, d)
        }(i, s, sweeps[i])
    }
    wg.Wait()

    for _, r := range results {
        fmt.Println(r)
    }
    fmt.Println("hard deadline enforced: 5s")
}
```

Expected output:
```
market: swept
transit: swept
riverside: swept
old-town: abandoned (context deadline exceeded)
harbor: abandoned (context deadline exceeded)
hard deadline enforced: 5s
```

(The harness reuses ch08's results-by-index fan-out — all five sweeps share ONE context, so one deadline kills every slow sweep simultaneously. That's the point of context: cancellation propagates to everything holding it. Playground's virtual clock makes the 5-second timeout exact and deterministic.)

#### Step 3: The Rate Limiter

Write `func dispatch(scouts []string, every time.Duration) []string` — release one scout per ticker tick, logging each dispatch as `T+<elapsed> <name> dispatched`.

Key teaching moment: `time.NewTicker(500 * time.Millisecond)` delivers a tick on the channel `ticker.C` every 500ms — one scout per tick is two per second, exactly the grid's threshold. This is the canonical Go rate-limiting idiom: block on `<-ticker.C` before each unit of work. Why not `time.Sleep`? A sleep measures from *now*, so processing time between sleeps accumulates drift; a ticker fires on a fixed schedule regardless of what you do between ticks. Two rules: `defer ticker.Stop()` — an unstopped ticker leaks its timer forever — and if you need clean elapsed values, `time.Since(start).Round(every)` snaps the measurement to the tick grid.

```go
func dispatch(scouts []string, every time.Duration) []string {
    ticker := time.NewTicker(every)
    defer ticker.Stop()

    start := time.Now()
    log := []string{}
    for _, s := range scouts {
        <-ticker.C
        elapsed := time.Since(start).Round(every)
        log = append(log, fmt.Sprintf("T+%v %s dispatched", elapsed, s))
    }
    return log
}
```

Test harness:
```go
func main() {
    scouts := []string{"Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"}
    for _, line := range dispatch(scouts, 500*time.Millisecond) {
        fmt.Println(line)
    }
    fmt.Println("rate: 2 scouts per second — grid quiet")
}
```

Expected output:
```
T+500ms Alpha dispatched
T+1s Bravo dispatched
T+1.5s Charlie dispatched
T+2s Delta dispatched
T+2.5s Echo dispatched
T+3s Foxtrot dispatched
T+3.5s Golf dispatched
T+4s Hotel dispatched
rate: 2 scouts per second — grid quiet
```

(Deterministic on the playground's virtual clock — ticks land at exact 500ms multiples, and `Round(every)` makes it exact on a real clock too. `%v` on a `time.Duration` prints `500ms`, `1s`, `1.5s` — Go's duration formatting for free.)

#### Step 4: The Generic Mapper

Write `func mapResults[T, U any](items []T, fn func(T) U) []U` — one function that transforms any slice of anything into any slice of anything else.

Key teaching moment: those square brackets are **type parameters** — Go generics. `T` and `U` are placeholder types; `any` is the constraint ("no restrictions"). Before Go 1.18 you wrote this function once per type pair, or used `interface{}` and prayed through type assertions. Now you write it once and the compiler *infers* the types at each call site — note the harness never writes `mapResults[string, string]`; it just passes a `[]string` and a `func(string) string` and Go works it out. The function body is nothing special — make, loop, append — which is the lesson: generics don't change how code runs, they change how many times you write it. The harness proves it by instantiating the SAME function at two different type pairs.

```go
func mapResults[T, U any](items []T, fn func(T) U) []U {
    out := make([]U, 0, len(items))
    for _, item := range items {
        out = append(out, fn(item))
    }
    return out
}
```

Test harness (uses `clearCheckpoints` from step 1 — code carries forward):
```go
func main() {
    cleared := clearCheckpoints(8, []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11})
    tagged := mapResults(cleared, func(line string) string {
        return "[GRID-SAFE] " + line
    })
    for _, l := range tagged {
        fmt.Println(l)
    }

    home := mapResults([]int{4, 9}, func(id int) string {
        return fmt.Sprintf("scout-%02d: home", id)
    })
    for _, l := range home {
        fmt.Println(l)
    }
    fmt.Println("network stood down")
}
```

Expected output:
```
[GRID-SAFE] checkpoint 01: cleared
[GRID-SAFE] checkpoint 02: cleared
[GRID-SAFE] checkpoint 03: cleared
[GRID-SAFE] checkpoint 04: cleared
[GRID-SAFE] checkpoint 05: cleared
[GRID-SAFE] checkpoint 06: cleared
[GRID-SAFE] checkpoint 07: cleared
[GRID-SAFE] checkpoint 08: cleared
[GRID-SAFE] checkpoint 09: cleared
[GRID-SAFE] checkpoint 10: cleared
[GRID-SAFE] checkpoint 11: cleared
scout-04: home
scout-09: home
network stood down
```

(First call: `[]string → []string`. Second call: `[]int → []string`. One function, two instantiations — that's the whole argument for generics in fourteen lines.)

### Acceptance Criteria

- Step 1: workers consume via `for ... range jobs` (not manual counting); `close(jobs)` called after feeding; `defer wg.Done()` first line in the worker; results channel buffered; `sort.Strings` before returning; no `fmt.Println` inside any goroutine
- Step 1: worker count comes from the `scouts` parameter, checkpoints from the slice — output not hardcoded
- Step 2: `select` with a `ctx.Done()` case; abandoned message built from `ctx.Err()` (not a hardcoded string); harness keeps `defer cancel()`
- Step 3: uses `time.NewTicker` and blocks on `ticker.C` (a `time.Sleep` loop fails the pattern check); `defer ticker.Stop()` present
- Step 4: declares type parameters `[T, U any]` (a `[]string`-only version fails the pattern check); harness instantiates it at two different type pairs
- All steps: goroutine output made deterministic before printing (collect + sort, or results-by-index)

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (worker pool):** 120 base, +60 first-try
- **Step 2 (context deadline):** 120 base, +60 first-try
- **Step 3 (rate limiter):** 100 base, +50 first-try
- **Step 4 (generic mapper):** 120 base, +60 first-try
- **Par time:** 240s total
- **Level timer:** 520s, game over on expiry

## Hints

### Step 0
1. "start with `package main` and import `\"fmt\"`. the rest of the imports come when the steps need them." (−5 energy)
2. "write `func main()` and call `fmt.Println(\"scout net online\")`." (−8 energy)
3. "full scaffold: `package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"scout net online\") }`" (−12 energy)

### Step 1
1. "two channels: `jobs := make(chan int, len(checkpoints))` and a buffered `results`. workers `for cp := range jobs` — the loop ends when the channel closes." (−8 energy)
2. "launch `scouts` goroutines with the ch08 ritual: `wg.Add(1)` before, `defer wg.Done()` inside. feed all the checkpoints in, then `close(jobs)` — that's how workers know to go home." (−12 energy)
3. "after `wg.Wait()`: `close(results)`, drain with `for line := range results`, then `sort.Strings(cleared)`. the scheduler picks the finish order — sorting makes it yours again." (−20 energy)

### Step 2
1. "`ctx.Done()` is a channel that closes when the deadline hits. that makes cancellation a `select` — same shape as ch09's extraction teams." (−8 energy)
2. "two cases: `case <-time.After(sweep):` for the work finishing, `case <-ctx.Done():` for the grid deadline landing first. whichever fires first wins." (−12 energy)
3. "on the done branch, `ctx.Err().Error()` gives you the reason string — \"context deadline exceeded\". build the message from it, don't hardcode it." (−20 energy)

### Step 3
1. "`ticker := time.NewTicker(every)` then `defer ticker.Stop()` — always. an unstopped ticker leaks its timer forever." (−8 energy)
2. "block on `<-ticker.C` before each dispatch. one scout per tick, 500ms per tick — that's 2 per second, right at the grid threshold." (−12 energy)
3. "for the log line: `elapsed := time.Since(start).Round(every)` snaps the elapsed time to the tick grid, then `fmt.Sprintf(\"T+%v %s dispatched\", elapsed, s)`." (−20 energy)

### Step 4
1. "type parameters go in square brackets before the arguments: `func mapResults[T, U any](items []T, fn func(T) U) []U`. `any` means no constraint." (−8 energy)
2. "the body is ordinary Go: `out := make([]U, 0, len(items))`, then loop and `out = append(out, fn(item))`." (−12 energy)
3. "you never name the types at the call site — `mapResults(cleared, func(line string) string {...})` and the compiler infers `[string, string]`. write it once, it works for every type pair." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "eight scouts, eleven checkpoints, five seconds each. one at a time gets us all caught. they move together or not at all." |
| T+45s | System message: "SURVEILLANCE GRID — SECTOR 1/6 ONLINE" |
| T+80s | Reeves message: "The grid samples the spectrum twice a second, Maya. Stay under two dispatches per second and we are noise. Go over it once and we are a pattern." |
| T+110s | System message: "SURVEILLANCE GRID — SECTOR 2/6 ONLINE" |
| T+130s | Rush Mode 1 — "Sector Sweep Inbound" |
| T+200s | GHOST broadcast: "T-MINUS 52 MINUTES. ASSET OUTSIDE CONTAINMENT. MUNICIPAL GRID AUTHORITY GRANTED TO DIRECTOR VASIK." |
| T+250s | System message: "SURVEILLANCE GRID — SECTOR 3/6 ONLINE · SECTOR 4/6 CALIBRATING" |
| T+320s | Vasik types in chat: "Eight little workers in one little pool. I can see the ripples, Maya. I only need one of them to hang." |
| T+350s | System message: "SURVEILLANCE GRID — SECTOR 5/6 ONLINE" |
| T+380s | Rush Mode 2 — "Grid Closing" |
| T+450s | GHOST broadcast: "T-MINUS 31 MINUTES. FINAL SECTOR CALIBRATING. THE DEADLINE WAS NEVER A METAPHOR." |
| T+490s | System message: "SECTOR 6/6 ONLINE IN 08:00 — DISTRICT 7 COVERAGE: TOTAL" |

## Rush Mode

Two rushes — Act V pressure.

**Rush 1 — "Sector Sweep Inbound" (T+130s)**
- **Duration:** 60 seconds
- **Speed bonus:** Up to +90 XP
- **On expiry:** Jeopardy — Dead Zone (power_reduced: a drone sweep forces them under a transit bridge; Maya's terminal browns out on scavenged power — screen dims for 10s, energy −15)

**Rush 2 — "Grid Closing" (T+380s)**
- **Duration:** 50 seconds
- **Speed bonus:** Up to +100 XP
- **On expiry:** Jeopardy — Triangulation (signal_scramble + energy_drain stacked: the grid gets a partial fix — editor characters scramble for 6s while the uplink bleeds energy −20. Act V does not forgive.)

## Twist

The network stands down clean — eleven checkpoints cleared, all eight scouts home, the grid blind to every one of them. Then a ninth handshake opens on the scout channel. Nobody registered a ninth scout.

### Twist Display

Lines (types at 22ms/char):

1. `> network stood down. 8/8 scouts home. grid: blind.`
2. `> ninth handshake on scout channel — origin: MUNICIPAL GRID AUTHORITY`
3. `> VASIK: A pool, a deadline, a rate limit. Textbook. I taught that textbook.`
4. `> VASIK: My terminal. One spec, two editors. First correct program walks out of District 7.`
5. `> VASIK: Lose, and the grid learns eight new faces.`
6. `> maya: he's challenging me to a race.`
7. `> reeves: Then let him hurry. You write it correctly.`

## UI State

- **Location label:** DISTRICT 7 · CITY GRID
- **Concept label:** Worker Pools · Context · Rate Limiting · Generics
- **Visual state:** Scout status board on the right panel — 8 scout badges flipping DISPATCHED → CLEAR → HOME as steps complete; 11-checkpoint route map filling in; grid-sector indicator (1/6 … 6/6) advancing with the timed events; dispatch rate needle that hovers at the 2/sec redline during step 3
- **Audio:** dark-drone-2 ambient (the city at night), alert-beep on each SECTOR ONLINE event, tension-drone under rush 1, siren-loop (distant) + heartbeat-fast under rush 2, keypad-beep on each scout dispatch

## Teaching Notes

### Why this order

The pool comes first because it's pure synthesis — ch08's WaitGroup ritual plus ch09's channels, arranged into the single most-used concurrency shape in production Go. Context comes second because cancellation only means something once you have workers worth cancelling. The ticker is third — a small idiom, but it needs `select`-fluency to read. Generics close the chapter because they're the one non-concurrent concept: a breather step that still lands a big idea, and the last new Go syntax in Part I.

### The pool is ch08 + ch09, not a new machine

Players should feel the assembly: `wg.Add(1)` / `defer wg.Done()` / `wg.Wait()` is verbatim ch08. Channels carrying work instead of just signals is the ch09 upgrade. The only genuinely new moves are `for cp := range jobs` and `close(jobs)` as a "no more work" broadcast. Teach close-as-broadcast explicitly — the #1 novice deadlock is forgetting `close(jobs)`, which leaves every worker parked in the range loop forever and `wg.Wait()` parked behind them. The playground reports it honestly: `all goroutines are asleep - deadlock!`. Let players hit it once; it's the most instructive error message in Go.

### Context is a select — the ch09 callback

`sweepSector` is ch09's extraction-team select wearing a uniform: `time.After` on one branch, `ctx.Done()` on the other. Naming that continuity collapses the learning curve — context stops being a mysterious framework object and becomes "a channel that closes on a schedule." Also teach the two hygiene rules as reflexes: `defer cancel()` always (even on timeout paths — it frees the timer), and pass `ctx` as the first parameter, because every real Go API from `http.NewRequestWithContext` to `sql.QueryContext` does.

### No mutex anywhere — the ch10 contrast

Ch10 protected a shared slice with a mutex because ten goroutines wrote to one place. The pool needs no lock at all: the channels own the data in transit, and each value has exactly one owner at a time. This is "share memory by communicating" made concrete. Worth one sentence in Maya's voice — players who just learned mutexes will reach for one here, and the zen rules should nudge them off it.

### The Vasik foreshadow — plant it deliberately

Step 1's `defer wg.Done()` is not just style. A worker that returns early without `defer` leaks the WaitGroup count, and `wg.Wait()` blocks forever — under cancellation this is the classic production goroutine leak. Say it plainly in the step 1 zen feedback: "an un-deferred Done is a leak waiting for a cancel." The final boss is built on exactly this bug, in Vasik's own code, and players who internalized the ritual here will spot it on his screen there.

### Common mistakes to catch

- Forgetting `close(jobs)` → total deadlock (see above)
- `wg.Done()` at the bottom of the worker instead of deferred → correct today, leak the day a `return` or panic path appears
- Printing inside workers → scheduler-ordered stdout, fails grading; collect-then-sort is the discipline
- `time.Sleep` loop instead of a ticker in step 3 → passes casual inspection, drifts in reality; the acceptance pattern check requires `NewTicker`
- Missing `defer ticker.Stop()` / `defer cancel()` → resource leaks with no visible symptom — exactly what zen rules exist to reward
- Writing `mapResults[string, string](...)` explicitly at call sites → legal but noise; teach inference

### What the zen rules should reward

`defer cancel()` immediately after `WithTimeout`; `defer wg.Done()` as worker line one; buffered result channels sized to the job count; `close` called by the sender, never the receiver; error text sourced from `ctx.Err()` instead of string literals; a single generic mapper reused at two type pairs instead of two hand-written loops.
