# Chapter 10 — Sensor Sweep

**Act IV · Exit Corridor**

## Go Concepts

- Mutexes (`sync.Mutex`)
- Atomic counters (`sync/atomic`)

## Story Context

10 goroutines write to a shared sensor log simultaneously. Without proper synchronization, the log corrupts and Maya loses her escape route.

## Challenge

Protect a shared slice with a mutex and use an atomic counter to track total sensor readings.

### Starter Code

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

// 10 goroutines each write a sensor reading to a shared log
// Protect the log with a mutex
// Track total readings with an atomic counter
// Print the final log length and total count

var (
    sensorLog []string
    mu        sync.Mutex
    count     int64
)

func main() {
    var wg sync.WaitGroup

    for i := 0; i < 10; i++ {
        wg.Add(1)
        // TODO: launch goroutine that:
        // 1. Locks mutex
        // 2. Appends to sensorLog
        // 3. Unlocks mutex
        // 4. Atomically increments count
        // 5. Calls wg.Done()
    }

    wg.Wait()
    fmt.Printf("Log entries: %d, Count: %d\n", len(sensorLog), count)
}
```

### Acceptance Criteria

- Uses `sync.Mutex` with `Lock()` and `Unlock()`
- Uses `atomic.AddInt64` or similar for counter
- 10 goroutines all write successfully
- Final log length == 10 and count == 10
- `defer` used for `Unlock()` and/or `wg.Done()`

## Story Branch Effects

| Branch | Effect on This Chapter |
| --- | --- |
| **Trusted Kira** | 3 cameras disabled — no rush mode, but harder acceptance criteria (must also sort the log) |
| **Rejected Kira** | Lockdown active — rush mode with 35s timer, simpler acceptance (no sort required) |

## XP

- **Base:** 300 XP
- **First-try bonus:** +150 XP
- **Par time:** 120s

## Hints

1. "`mu.Lock()` before writing, `mu.Unlock()` after. always use `defer mu.Unlock()`." (−8 energy)
2. "`atomic.AddInt64(&count, 1)` — no mutex needed for atomics." (−12 energy)
3. "in goroutine: `defer wg.Done(); mu.Lock(); defer mu.Unlock(); sensorLog = append(sensorLog, reading); atomic.AddInt64(&count, 1)`" (−20 energy)

## Auth Prompt

This is where the authentication prompt appears (if user hasn't already signed in). See `authentication.md` for details.

## UI State

- **Location label:** EXIT CORRIDOR · SENSOR GRID
- **Concept label:** Mutexes · Atomic Counters
- **Auth prompt appears** between chapter brief and editor (dismissable)
