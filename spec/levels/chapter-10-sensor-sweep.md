# Chapter 10 — Sensor Sweep

**Act IV · Exit Corridor · Sensor Grid**

## Go Concepts

- `sync.Mutex` — `Lock()`, `Unlock()`, `defer mu.Unlock()`
- Mutex as a struct field guarding the fields beside it (pointer receivers required — ch05 callback)
- Critical sections — hold the lock briefly, release it always
- Copy-under-lock snapshots (`make` + `copy` before returning shared data — boss-03's idiom, now defensive)
- `sync/atomic` — `atomic.AddInt64`, `atomic.LoadInt64`
- When atomics beat mutexes (single integer) and when they can't (compound state)
- `sort.Strings` for deterministic output from concurrent writers (ch04.3 callback)

## Story Context

Act IV opens on the verdict. Trusted or rejected, Kira's answer changed the building: the exit corridor is the only way out, and it is sown with ten pressure sensors, all streaming into one log GHOST reads. Maya taps the feed lines and mirrors the stream — ten goroutines, one shared slice. Ch08's trick of one-slot-per-goroutine dies here: entries arrive in bursts, the log *grows*, every writer touches the same `append`. Two colliding writes tear the mirror, and a torn mirror shows Reeves an empty corridor that isn't. The lock is not bureaucracy. The lock is the difference between a map and a lie.

## Branch Variations

Per the Act III verdict (boss-03), this chapter runs in one of two tunings:

- **Trusted Kira:** three corridor cameras are dark — easier timing: level timer 480s, both rush windows +15s. But Kira raises the bar — harder code: `sweep` runs **20** sensors and acceptance additionally requires `pulse` to survive a second harness wave (`pulse(&total, 10, 2500)` → `readings: 25000`). Her comment: "If it only works for ten, it doesn't work."
- **Rejected Kira:** lockdown active — tighter timing: level timer 450s, both rush windows −10s, rush 2 jeopardy stacks. Code as written below (10 sensors, single wave) — more direct problems, less air.

All reference solutions, harnesses, and expected outputs below are the **rejected-branch baseline**; the trusted branch only changes the harness constants noted above (expected output scales accordingly: `entries: 20`, sensors `01`–`20` sorted).

## Challenge

Mirror the sensor grid safely: build a mutex-guarded `SensorLog`, hammer it with ten concurrent sensor feeds, snapshot it deterministically, then count raw sensor pulses with an atomic counter — and know why each tool is the right one.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "sensor grid tapped".

Imports for this chapter: `"fmt"` now; `"sync"` arrives in step 1, `"sort"` in step 3, `"sync/atomic"` in step 4. (Go refuses to compile unused imports — add them only when a step needs them.)

#### Step 1: The Lock Ritual

Write the shared log type and its guarded writer:

```go
type SensorLog struct {
    mu      sync.Mutex
    entries []string
}
```

plus `func (s *SensorLog) Record(entry string)` and `func (s *SensorLog) Count() int`, both taking the lock.

Key teaching moment: a mutex guards data by *convention* — Go doesn't tie the lock to the slice; the struct layout does. Put `mu` directly above the fields it protects and touch those fields only while holding it. The ritual is fixed: `s.mu.Lock()`, then `defer s.mu.Unlock()` on the very next line — deferred, so the lock releases even on early return or panic (ch07's `defer` guarantee). And the receivers **must** be pointers: copying a struct copies its mutex, and a copied mutex guards nothing — two copies, two locks, zero protection. `go vet` flags it; ch05 taught why value receivers get copies.

```go
func (s *SensorLog) Record(entry string) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.entries = append(s.entries, entry)
}

func (s *SensorLog) Count() int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return len(s.entries)
}
```

Test harness:
```go
func main() {
    log := &SensorLog{}
    log.Record("sensor 03: motion in stairwell")
    log.Record("sensor 07: corridor clear")
    log.Record("sensor 01: door cycled")
    fmt.Println("entries:", log.Count())
}
```

Expected output:
```
entries: 3
```

(Sequential for now — the lock looks like overkill until step 2 brings the other nine writers.)

#### Step 2: Ten Writers, One Log

Write `func sweep(log *SensorLog, sensors int)` — launch one goroutine per sensor, each recording `sensor %02d: clear` through the guarded `Record`, and return only after `wg.Wait()`.

Key teaching moment: this is ch08's fan-out with one crucial difference — the goroutines *share* a growing slice instead of owning disjoint slots. Look at what happens without the lock (read-only reference — **never submit this**):

```go
// WHAT GOES WRONG — unguarded version (read-only reference)
// entries = append(entries, e)   // called from 10 goroutines
//
// $ go run -race sweep.go
// WARNING: DATA RACE
// Write at 0x00c000112018 by goroutine 8:
//   main.sweep.func1()
// Previous write at 0x00c000112018 by goroutine 7:
//   main.sweep.func1()
// entries: 7   ← three writes vanished
```

Two goroutines read the same slice header, both append, both write the header back — last writer wins, the other's entry evaporates. `append` is not atomic. The playground's single CPU can *mask* this race on a lucky run; the race detector never lucks out. Correctness by design, not by scheduler mood. WaitGroup ritual is unchanged from ch08: `Add(1)` before launch, `defer wg.Done()` first line, pass the loop variable in as an argument.

```go
func sweep(log *SensorLog, sensors int) {
    var wg sync.WaitGroup
    for i := 1; i <= sensors; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            log.Record(fmt.Sprintf("sensor %02d: clear", id))
        }(i)
    }
    wg.Wait()
}
```

Test harness:
```go
func main() {
    log := &SensorLog{}
    sweep(log, 10)
    fmt.Println("entries:", log.Count())
    if log.Count() == 10 {
        fmt.Println("mirror intact: no writes lost")
    } else {
        fmt.Println("mirror torn: writes lost")
    }
}
```

Expected output:
```
entries: 10
mirror intact: no writes lost
```

(Only the count prints — entry *order* is scheduler roulette. Step 3 makes the log itself printable.)

#### Step 3: Deterministic Snapshot

Write `func (s *SensorLog) Snapshot() []string` — under the lock, copy the entries into a fresh slice, sort the copy, return it.

Key teaching moment: two lessons fused. **One:** never hand out the internal slice — the caller would hold a live alias into memory ten goroutines are still appending to. That is exactly the aliasing Kira weaponized in her `transmit.go` (boss-03); here the `make` + `copy` freeze-at-the-boundary idiom is armor instead of evidence. **Two:** concurrent arrival order is nondeterministic, so `sort.Strings` (ch04.3) imposes an order before anyone reads. Sorted-after-wait is how concurrent Go produces gradable, diffable, *trustable* output.

```go
func (s *SensorLog) Snapshot() []string {
    s.mu.Lock()
    defer s.mu.Unlock()
    out := make([]string, len(s.entries))
    copy(out, s.entries)
    sort.Strings(out)
    return out
}
```

Test harness:
```go
func main() {
    log := &SensorLog{}
    sweep(log, 10)
    fmt.Println("entries:", log.Count())
    for _, e := range log.Snapshot() {
        fmt.Println(e)
    }
    fmt.Println("grid mirror: STABLE")
}
```

Expected output:
```
entries: 10
sensor 01: clear
sensor 02: clear
sensor 03: clear
sensor 04: clear
sensor 05: clear
sensor 06: clear
sensor 07: clear
sensor 08: clear
sensor 09: clear
sensor 10: clear
grid mirror: STABLE
```

#### Step 4: Pulse Counter — Atomics

Each sensor also emits a raw pulse stream — 1,000 pulses per sensor, 10,000 total, and the mirror is only trusted if not one goes missing. Write `func pulse(total *int64, sensors, readings int)` — one goroutine per sensor, each adding `readings` pulses to a shared counter with `atomic.AddInt64`.

Key teaching moment: `total++` is three operations — load, add, store — and ten goroutines interleaving them silently lose increments (the read-only reference below). You *could* wrap a mutex around one integer, but that's a padlock on a single bit: `sync/atomic` does the load-add-store as one indivisible CPU instruction, no lock, no contention. The decision rule to keep forever — **atomic for one machine word, mutex for anything compound** (the slice + its length in steps 1–3 could never be atomic: two fields, one invariant). Reads pair with writes: `atomic.LoadInt64` — mixing atomic writes with plain reads is still a race.

```go
// WHAT GOES WRONG — naive counter (read-only reference, never graded)
// total++            // from 10 goroutines × 1000 iterations
// readings: 8347     // one run
// readings: 9112     // another run — increments vanish, silently
```

```go
func pulse(total *int64, sensors, readings int) {
    var wg sync.WaitGroup
    for i := 0; i < sensors; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for r := 0; r < readings; r++ {
                atomic.AddInt64(total, 1)
            }
        }()
    }
    wg.Wait()
}
```

Test harness:
```go
func main() {
    var total int64
    pulse(&total, 10, 1000)
    fmt.Println("readings:", atomic.LoadInt64(&total))
    if atomic.LoadInt64(&total) == 10000 {
        fmt.Println("grid image: COMPLETE")
    } else {
        fmt.Println("grid image: TORN")
    }
}
```

Expected output:
```
readings: 10000
grid image: COMPLETE
```

### Acceptance Criteria

- Step 1: `mu sync.Mutex` declared as a `SensorLog` field; `Record` and `Count` use **pointer receivers** (value receivers fail — copied mutex)
- Step 1–3: every access to `entries` happens between `Lock()` and `Unlock()`; `defer s.mu.Unlock()` pattern-checked
- Step 2: `sweep` uses `sync.WaitGroup` with `Add(1)` before launch and `defer wg.Done()`; sensor id passed in as an argument, not captured; all writes go through `Record` (no direct `entries` access outside the methods)
- Step 3: `Snapshot` returns a **copy** (`make` + `copy` pattern-checked — returning `s.entries` directly fails), sorted with `sort.Strings`, and printing happens only after `sweep` returns
- Step 4: counter updated with `atomic.AddInt64` and read with `atomic.LoadInt64`; no mutex around the counter; `total++` anywhere fails the pattern check
- Output is not hardcoded — counts and entries derive from the parameters (trusted-branch harness runs 20 sensors / 25,000 readings to prove it)

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (lock ritual):** 90 base, +45 first-try
- **Step 2 (ten writers):** 110 base, +55 first-try
- **Step 3 (snapshot):** 100 base, +50 first-try
- **Step 4 (atomic pulse counter):** 110 base, +55 first-try
- **Par time:** 210s total
- **Level timer:** 460s (480s trusted / 450s rejected), game over on expiry

## Hints

### Step 0
1. "start with `package main` and import `\"fmt\"`. the sync packages come when the lock does." (−5 energy)
2. "write `func main()` and call `fmt.Println(\"sensor grid tapped\")`." (−8 energy)
3. "full scaffold: `package main` / `import \"fmt\"` / `func main() { fmt.Println(\"sensor grid tapped\") }`" (−12 energy)

### Step 1
1. "put the mutex in the struct, right above what it guards: `mu sync.Mutex` then `entries []string`." (−5 energy)
2. "the ritual is two lines: `s.mu.Lock()` then `defer s.mu.Unlock()`. deferred, so it releases even if the function bails." (−8 energy)
3. "pointer receivers — `func (s *SensorLog) Record(...)`. copy the struct and you copy the mutex, and a copied lock guards nothing." (−12 energy)

### Step 2
1. "ch08's skeleton exactly: `wg.Add(1)` before `go`, `defer wg.Done()` inside, pass `i` in as an argument." (−8 energy)
2. "each goroutine just calls `log.Record(fmt.Sprintf(\"sensor %02d: clear\", id))` — the lock inside Record does all the protecting." (−12 energy)
3. "`go func(id int) { defer wg.Done(); log.Record(fmt.Sprintf(\"sensor %02d: clear\", id)) }(i)` — then `wg.Wait()` before returning." (−20 energy)

### Step 3
1. "never return `s.entries` itself — that's kira's bug in reverse. make a fresh slice and copy into it, while holding the lock." (−8 energy)
2. "`out := make([]string, len(s.entries))` then `copy(out, s.entries)` — same freeze-at-the-boundary move from her transmit.go, used honestly." (−12 energy)
3. "lock, copy, `sort.Strings(out)`, return out. sorted output is the only kind ten goroutines can be graded on." (−20 energy)

### Step 4
1. "`total++` is load-add-store — three steps ten goroutines can interleave. `atomic.AddInt64(total, 1)` is one indivisible step." (−8 energy)
2. "no mutex here. one integer = atomic. slice plus its bookkeeping = mutex. that's the whole decision rule." (−12 energy)
3. "inner loop `for r := 0; r < readings; r++ { atomic.AddInt64(total, 1) }` inside the ch08 fan-out skeleton. read it back with `atomic.LoadInt64`." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | (Trusted) Kira: "Three cameras down, as promised. The sensors are your problem — impress me." · (Rejected) Maya message: "she locked everything down on her way out. the sensor grid is the only door left, and it's watching." |
| T+45s | Maya message: "ten feeds, one log. if my mirror tears i'm walking reeves into a sweep team blind." |
| T+90s | Reeves message: "GHOST reads this same log, Maya. If your copy disagrees with its copy, believe neither. Lock it down." |
| T+140s | Rush Mode 1 — "SWEEP TEAM ON THE GRID" |
| T+230s | GHOST broadcast: "T-MINUS 7 HOURS. CORRIDOR SENSOR NET: ELEVATED. ASSET PAIR LAST INDEXED: SUBLEVEL EXIT." |
| T+280s | Maya message: "the entry timestamps look wrong. later. mirror first." |
| T+320s | Rush Mode 2 — "GRID RECALIBRATION SWEEP" |

## Rush Mode

- **Rush 1 (T+140s):** 65 seconds (80s trusted / 55s rejected) — sweep team walking the corridor; the mirror must hold. **Speed bonus:** up to +90 XP. **On expiry:** Jeopardy — Signal Scramble (sensor feed garbles; editor gutter flickers corrupted glyphs for 8s).
- **Rush 2 (T+320s):** 55 seconds (70s trusted / 45s rejected) — GHOST recalibrates the grid; pulse counts must reconcile before the recount. **Speed bonus:** up to +100 XP. **On expiry (rejected branch stacks):** Jeopardy — Signal Scramble + Energy Drain (−20 energy) — the lockdown grid bites back. Trusted branch: Signal Scramble only.

## Twist

The mirror holds — ten sensors, ten entries, ten thousand pulses, nothing lost. Then Maya reads what she mirrored. The entries carry GHOST-format timestamps, and they don't add up: sensor 06 logged a sweep team *forty minutes from now*. Either the grid clock is broken — or the schedule Maya has been navigating by was never running on the clock she thinks it is. GHOST's twelve hours suddenly have an asterisk. The security hub two doors down holds the master countdown. (Leads directly into ch10.2 — Countdown Clock.)

### Twist Display

Lines (types at 22ms/char):

1. `> grid mirror: STABLE — 10/10 sensors · 10000/10000 pulses`
2. `> parsing mirrored entries...`
3. `> sensor 06: sweep team delta — logged 2024-03-15 15:10:00`
4. `> maya: that's forty minutes from now. sensors don't log the future.`
5. `> reeves: Then the grid is not on our clock. Which raises the question of what clock GHOST is on.`
6. `> security hub · two doors east: MASTER COUNTDOWN TERMINAL`
7. `> maya: we need to do the math ourselves. every timestamp. now.`

## UI State

- **Location label:** EXIT CORRIDOR · SENSOR GRID
- **Concept label:** Mutexes · Atomic Counters
- **Visual state:** Ten sensor nodes strung along a corridor schematic, each blinking as its goroutine records; a mirror-integrity bar that fills to STABLE after `wg.Wait()`; pulse counter odometer spinning to 10000 on step 4; the read-only "what goes wrong" panels render in red-tinted terminal frames
- **Branch dressing:** trusted — three camera icons dark, Kira's messages in her color; rejected — lockdown chevrons on the corridor edges, alarm-loop low in the mix
- **Audio:** facility-hum ambient, keypad-beep per sensor confirmation, warning-beep at rush triggers, tension-drone during rushes, alert-beep on rush expiry, dread-sting on twist line 4
- **Auth prompt** appears between chapter brief and editor (dismissable) — see `authentication.md`

## Teaching Notes

### Why ch08's pattern isn't enough anymore

Ch08 dodged locking honestly: pre-sized slice, goroutine *i* owns index *i*, disjoint writes need no lock — and its teaching notes promised the contrast case would arrive "when writes *do* overlap." This is that chapter. A growing log has no pre-sizable indexes; every writer contends for the same `append`, the same header, the same backing array. The progression is deliberate: first learn when you don't need a lock, then learn the lock. Players who ask "why not results-by-index?" are asking exactly the right question — the answer (the log grows; writers don't know their slot) is the lesson.

### The mutex ritual and the copied-lock trap

Like ch08's WaitGroup ritual, teach the mutex as a fixed choreography: field beside the data, `Lock` then `defer Unlock` on adjacent lines, pointer receivers only. The copied-mutex bug (value receiver → copied struct → independent lock) is invisible until production and is precisely the pointer-vs-value distinction ch05 taught — now with stakes. It is also a planted bug in the next boss; players who internalize it here will recognize Vasik's version of it on sight. Zen rules should reward `defer mu.Unlock()`, pointer receivers on any mutex-bearing struct, and no naked `entries` access outside methods.

### Copy-under-lock: Kira's move, inverted

Boss-03's entire verdict hinged on a missing `copy` — slices handed out while the backing array kept mutating. `Snapshot` is the same idiom worn as armor: freeze shared state at the boundary before it leaves the lock's protection. Calling this out explicitly ("her bug, your fix") converts a story memory into an engineering reflex.

### Atomic vs mutex — teach the decision, not just the API

The chapter's real payload is a decision rule: one machine word → atomic; compound state with an invariant → mutex. Show why the log could never be atomic (slice header + intent are multiple words) and why a mutex on the pulse counter is wasteful but *correct* — atomics are an optimization of a correct idea, not a different idea. Mention `sync.RWMutex` exists for read-heavy locks but defer it; one tool per chapter.

### The playground masks races — the detector doesn't

The playground runs GOMAXPROCS=1, so the naive counter and the unguarded append may accidentally produce correct output on a given run. Say this out loud: "it worked when I ran it" is not evidence of race-freedom; `go run -race` is. That's why the racy versions appear only as read-only exhibits with detector output attached, and are never gradable — the harnesses grade the *guaranteed* behavior (exact counts after `wg.Wait()`), which only synchronized code can promise on every run, every machine.

### Common mistakes to catch

- Value receiver on `Record`/`Snapshot` (copied mutex — `go vet` catches it; so should the pattern check)
- `Unlock` without `defer`, then an early return leaks the lock and the next `Lock` deadlocks
- Locking around the *loop* in `sweep` (serializes the whole sweep — hold locks briefly, inside `Record`, not around the fan-out)
- `atomic.AddInt64` for writes but a plain read at the end — still a race; pair with `LoadInt64`
- Sorting `s.entries` in place inside `Snapshot` (mutates shared state as a side effect; sort the copy)
