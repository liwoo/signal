# Chapter 8 — Circuit Cut

**Act III · Power Plant · Circuit Array**

## Go Concepts

- Goroutines (`go` keyword, `go func(){}()`)
- `sync.WaitGroup` (`Add`, `Wait`, `defer wg.Done()`)
- Closures over loop variables — the classic pitfall (callback to ch07 closures)
- Passing loop variables as goroutine arguments
- Race-free fan-out: writing results by index into a pre-sized slice
- `time.Sleep` / `time.Duration` for simulated work

## Story Context

The thesis is on the gamma server — but the archive cage is wired into the alarm grid. Four circuits feed it: North, South, East, West, all reporting to the same self-check. Cut them one at a time and the grid notices the imbalance and seals the facility. Kill all four inside a single power cycle and the alarm goes blind. Maya can't throw four breakers at once — but Go can. One goroutine per circuit, a WaitGroup to hold the door until every breaker confirms. GHOST's deadline is nine hours out, and Kira has suddenly become very generous with grid schematics she shouldn't have.

## Challenge

Cut all four circuits concurrently. Launch one goroutine per breaker, collect confirmations race-free, and only report "ALL CIRCUITS DOWN" after every goroutine finishes — inside one power cycle.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "breaker console ready".

Imports for this chapter: `"fmt"` now; `"time"` arrives in step 1, `"sync"` in step 2. (Go refuses to compile unused imports — add them only when a step needs them.)

#### Step 1: First Goroutine

Write `func cut(name string)` that prints `<name> circuit: DOWN`, and `func cutAsync(name string) ` that launches it as a goroutine.

Key teaching moment: the `go` keyword in front of any call runs it concurrently — the caller doesn't wait. But `main` is a goroutine too, and when `main` returns, the runtime kills every other goroutine mid-flight. Delete the harness's `time.Sleep` and South never goes down: "power cycle complete" prints and the program exits before the goroutine runs. Sleeping is a crude way to wait — step 2 replaces it with the real tool.

```go
func cut(name string) {
    fmt.Println(name + " circuit: DOWN")
}

func cutAsync(name string) {
    go cut(name)
}
```

Test harness:
```go
func main() {
    cut("North")
    cutAsync("South")
    time.Sleep(100 * time.Millisecond)
    fmt.Println("power cycle complete")
}
```

Expected output:
```
North circuit: DOWN
South circuit: DOWN
power cycle complete
```

#### Step 2: WaitGroup Fan-Out

Write `func cutAll(circuits []string) []string` that launches one goroutine per circuit, waits for all of them with a `sync.WaitGroup`, and returns the confirmations in circuit order.

Key teaching moment — three rules and a trap:
1. `wg.Add(1)` **before** launching each goroutine (adding inside the goroutine races against `Wait`).
2. `defer wg.Done()` as the goroutine's first line — the count drops even if the goroutine exits early.
3. `wg.Wait()` blocks until the count hits zero. That's the single power cycle: nothing prints until every breaker confirms.

The trap is the closure-over-loop-variable pitfall, a direct callback to ch07: closures capture variables by reference. Before Go 1.22, `i` and `name` were one shared variable per loop — every goroutine saw the final values and all four breakers reported "West". Go 1.22 made loop variables per-iteration, but any variable declared *outside* the loop is still shared, so idiomatic Go passes loop state in as arguments. Do it that way — always.

Goroutines writing `fmt.Println` directly would interleave in random order. Instead, each goroutine writes into its own index of a pre-sized slice — disjoint elements, no race, no lock — and printing happens after `Wait`, in order.

```go
func cutAll(circuits []string) []string {
    results := make([]string, len(circuits))
    var wg sync.WaitGroup
    for i, name := range circuits {
        wg.Add(1)
        go func(idx int, n string) {
            defer wg.Done()
            results[idx] = n + " circuit: DOWN"
        }(i, name)
    }
    wg.Wait()
    return results
}
```

Test harness:
```go
func main() {
    for _, line := range cutAll([]string{"North", "South", "East", "West"}) {
        fmt.Println(line)
    }
    fmt.Println("ALL CIRCUITS DOWN")
}
```

Expected output:
```
North circuit: DOWN
South circuit: DOWN
East circuit: DOWN
West circuit: DOWN
ALL CIRCUITS DOWN
```

#### Step 3: One Power Cycle

Each breaker has a different trip delay. Write `func cutTimed(circuits []string, delays []int) []string` — same fan-out as step 2, but each goroutine sleeps its breaker's delay (milliseconds) before recording `<name> circuit: DOWN (<delay>ms)`.

Key teaching moment: this is where concurrency stops being syntax and becomes physics. Sequential cuts take the **sum** of the delays (300+150+450+200 = 1100ms — a second power cycle starts, the grid self-check catches the imbalance, alarm). Concurrent cuts take the **max** (450ms — one cycle, alarm blind). The harness measures the window and prints the verdict: the fiction and the scheduler are the same system. The delay rides into the goroutine as a third argument — never reach out of the closure for loop state.

```go
func cutTimed(circuits []string, delays []int) []string {
    results := make([]string, len(circuits))
    var wg sync.WaitGroup
    for i, name := range circuits {
        wg.Add(1)
        go func(idx int, n string, d int) {
            defer wg.Done()
            time.Sleep(time.Duration(d) * time.Millisecond)
            results[idx] = fmt.Sprintf("%s circuit: DOWN (%dms)", n, d)
        }(i, name, delays[i])
    }
    wg.Wait()
    return results
}
```

Test harness:
```go
func main() {
    circuits := []string{"North", "South", "East", "West"}
    delays := []int{300, 150, 450, 200}
    start := time.Now()
    lines := cutTimed(circuits, delays)
    elapsed := time.Since(start)
    for _, line := range lines {
        fmt.Println(line)
    }
    if elapsed < 1100*time.Millisecond {
        fmt.Println("window: SINGLE CYCLE — alarm blind")
    } else {
        fmt.Println("window: MULTI CYCLE — alarm tripped")
    }
    fmt.Println("ALL CIRCUITS DOWN")
}
```

Expected output:
```
North circuit: DOWN (300ms)
South circuit: DOWN (150ms)
East circuit: DOWN (450ms)
West circuit: DOWN (200ms)
window: SINGLE CYCLE — alarm blind
ALL CIRCUITS DOWN
```

(The playground's virtual clock makes this fully deterministic: all four goroutines sleep concurrently, so elapsed is exactly 450ms. A sequential loop measures 1100ms and prints "alarm tripped" — the harness itself proves the concurrency.)

### Acceptance Criteria

- Step 1: `cutAsync` contains the `go` keyword (pattern-checked — a synchronous call produces identical output but fails the pattern check)
- Step 2: uses `sync.WaitGroup` with `Add`, `Wait`, and `defer wg.Done()`
- Step 2–3: `wg.Add(1)` called outside the goroutine, before launch
- Step 2–3: loop variables passed into the goroutine as arguments (`}(i, name)` / `}(i, name, delays[i])`), not captured
- Step 2–3: results written by index into a slice pre-sized with `make([]string, len(circuits))`; no `fmt.Println` inside any goroutine
- Step 3: `time.Sleep` runs inside the goroutines; harness must print "SINGLE CYCLE" (a sequential implementation prints "MULTI CYCLE" and fails)
- Output is not hardcoded — names and delays come from the parameters

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (goroutine):** 100 base, +50 first-try
- **Step 2 (WaitGroup fan-out):** 120 base, +60 first-try
- **Step 3 (one power cycle):** 120 base, +60 first-try
- **Par time:** 180s total
- **Level timer:** 420s, game over on expiry

## Hints

### Step 1
1. "`go cut(name)` — the `go` keyword in front of any call launches it as a goroutine. that's the whole syntax." (−5 energy)
2. "goroutines die when main returns. the harness sleeps 100ms to hold the door open — that's why South still prints." (−8 energy)
3. "two functions: `cut` prints `name + \" circuit: DOWN\"`. `cutAsync` is one line: `go cut(name)`." (−12 energy)

### Step 2
1. "`var wg sync.WaitGroup`, then `wg.Add(1)` before each launch. `wg.Wait()` blocks until the count is zero." (−8 energy)
2. "first line inside every goroutine: `defer wg.Done()`. even if it bails early, the count still drops. and pre-size the results: `make([]string, len(circuits))`." (−12 energy)
3. "launch `go func(idx int, n string) { defer wg.Done(); results[idx] = n + \" circuit: DOWN\" }(i, name)` — pass i and name IN. reach out of the closure and the breakers get crossed." (−20 energy)

### Step 3
1. "same skeleton as step 2. each goroutine sleeps first: `time.Sleep(time.Duration(d) * time.Millisecond)`." (−8 energy)
2. "the delay is loop state too — pass it as a third argument: `go func(idx int, n string, d int) { ... }(i, name, delays[i])`." (−12 energy)
3. "after the sleep: `results[idx] = fmt.Sprintf(\"%s circuit: DOWN (%dms)\", n, d)`. all four sleep at once, so the window is the slowest breaker — not the sum." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Maya message: "four circuits, one self-check. cut them one at a time and the grid sees the imbalance. they go down together or not at all." |
| T+45s | Kira message: "The grid self-checks every power cycle. You get one cycle. Four breakers, one window. You're welcome." |
| T+75s | Reeves message: "How does she have plant schematics? Don't answer her, Maya. Just write the code." |
| T+100s | GHOST broadcast: "T-MINUS 9 HOURS. ASSET CONTAINMENT REMAINS PRIORITY. SUBLEVEL SWEEPS EXPANDING." |
| T+120s | Rush Mode — "GRID SELF-CHECK IMMINENT" |

## Rush Mode

- **Trigger:** T+120s
- **Duration:** 65 seconds
- **Speed bonus:** Up to +90 XP
- **On expiry:** Jeopardy — Grid Retaliation (power_reduced: the plant reroutes load through Maya's junction — her terminal browns out, screen dims for 10s, energy −15)

## Twist

Kira sends a file the moment the grid goes dark.

### Twist Display

Lines (types at 22ms/char):

1. `> ALL CIRCUITS DOWN — ALARM GRID BLIND`
2. `> incoming file transfer — K.VOLKOV — 4.7 MB`
3. `> contents: decryption key for thesis_v2.enc [VERIFIED]`
4. `> contents: unsigned binary, obfuscated [ZERO-DAY SIGNATURE DETECTED]`
5. `> maya: she sent the key. and a gun aimed at my terminal. in the same file.`
6. `> reeves: A gift and a trap, priced as one. That is how Kira negotiates.`
7. `> file quarantined. key extracted. remember this.`

## UI State

- **Location label:** POWER PLANT · CIRCUIT ARRAY
- **Concept label:** Goroutines · WaitGroups
- **Visual state:** Four circuit indicators (N/S/E/W) flip to DOWN as results land after `wg.Wait()`; grid self-check bar sweeps across the top during rush; single-cycle window gauge on step 3
- **Audio:** facility-hum ambient, machinery sting on each circuit confirmation, warning-beep at rush trigger, tension-drone during rush, alert-beep on rush expiry
- **Kira's messages** render in her distinct color (established in ch07)

## Teaching Notes

### The fiction IS the mechanic

Sequential = sum of delays = alarm. Concurrent = max of delays = blind spot. The step 3 harness doesn't take the player's word for it — it measures the window and prints the verdict, so a `for` loop that fakes the output still fails. When the concept and the fiction are the same physics, the lesson sticks.

### The WaitGroup ritual

Teach it as a fixed three-beat ritual: `Add(1)` before launch, `defer wg.Done()` first line inside, `Wait()` at the join point. The common mistakes are all ordering mistakes: `Add` inside the goroutine (races `Wait`), `Done` without `defer` (leaks the count on early return), `Wait` inside the loop (serializes everything back down). Zen rules should reward `defer wg.Done()` and `Add` outside the goroutine.

### Closures over loop variables — the ch07 callback

Ch07 taught that closures capture by reference (`count++` mutated the outer variable). Here that same power becomes the most famous bug in Go's history: goroutines capturing the loop variable saw only its final value, so all four breakers reported "West". Go 1.22 made loop variables per-iteration and killed the classic form — but any variable declared outside the loop is still shared, and codebases full of pre-1.22 Go still exist. Passing loop state as goroutine arguments is the idiom that is correct in every version. Zen rules should reward argument-passing over capture.

### Results-by-index: fan-out without locks

Pre-sizing a slice and letting goroutine *i* own element *i* is a real production pattern — disjoint writes need no mutex and no channel, and order is preserved for free. It's also what makes the output gradable: print inside goroutines and stdout is scheduler roulette; print after `Wait` and it's deterministic. This pattern returns in ch10 as the contrast case for when writes *do* overlap and a mutex becomes necessary.

### Common mistakes to catch

- `wg.Add(4)` hardcoded instead of `Add(1)` per iteration (breaks when the slice changes — acceptance data uses `len(circuits)`)
- Forgetting the trailing `(i, name)` call arguments — compiles pre-1.22-style, subtly wrong mental model
- `time.Sleep` outside the goroutine in step 3 (serializes; the harness window check catches it)
