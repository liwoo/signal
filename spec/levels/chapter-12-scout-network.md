# Chapter 12 — Scout Network

**Act V · City Streets / District 7**

## Go Concepts

- Worker pools
- Context (`context.WithTimeout`)
- Rate limiting (`time.Ticker`)
- Generics (`[T any]`)

## Story Context

Maya and Dr. Reeves are out of the building but Vasik has activated the city's surveillance grid. 8 scouts must be coordinated concurrently, rate-limited to avoid surveillance triggers, with a hard 5-second context timeout.

## Challenge

Build a concurrent worker pool with generics, rate limiting, and context cancellation.

### Starter Code

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Coordinate 8 scouts concurrently
// Rate limit: max 2 scouts dispatched per second
// Context timeout: 5 seconds
// Use generics for the result mapper

type Scout struct {
    ID   int
    Zone string
}

// Generic result mapper
func mapResult[T any, R any](items []T, fn func(T) R) []R {
    // TODO
}

// Worker pool with rate limiting and context
func dispatchScouts(ctx context.Context, scouts []Scout) []string {
    // TODO
}

func main() {
    scouts := []Scout{
        {1, "Alpha"}, {2, "Bravo"}, {3, "Charlie"}, {4, "Delta"},
        {5, "Echo"}, {6, "Foxtrot"}, {7, "Golf"}, {8, "Hotel"},
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    results := dispatchScouts(ctx, scouts)
    fmt.Printf("Scouts reported: %d/8\n", len(results))
}
```

### Acceptance Criteria

- Generic function `mapResult[T, R]` correctly implemented
- Worker pool launches goroutines for scouts
- Rate limiting via `time.Ticker` or `time.Sleep` (max 2/second)
- Context cancellation handled (check `ctx.Done()`)
- WaitGroup or channel-based synchronization
- All 8 scouts report within timeout

## XP

- **Base:** 400 XP
- **First-try bonus:** +200 XP
- **Par time:** 240s (most complex chapter)

## Hints

1. "generics: `func mapResult[T any, R any](items []T, fn func(T) R) []R` — loop and apply fn to each." (−8 energy)
2. "rate limit: `ticker := time.NewTicker(500 * time.Millisecond)` — wait for tick before each dispatch." (−12 energy)
3. "in worker: `select { case <-ctx.Done(): return; default: // do work }` — respect cancellation." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Rush Mode — "Surveillance grid activating" |

## Rush Mode

- **Duration:** 60 seconds
- **On expiry:** Jeopardy — Signal Scramble + Power Reduced + Energy Drain (triple stack — Act V is brutal)

## UI State

- **Location label:** DISTRICT 7 · CITY GRID
- **Concept label:** Worker Pools · Context · Rate Limiting · Generics
- **Visual:** Scout status board showing 8 scouts with live status updates
