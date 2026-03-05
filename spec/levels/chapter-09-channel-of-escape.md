# Chapter 9 — Channel of Escape

**Act III · Server Room**

## Go Concepts

- Channels (`chan`, `<-`)
- Select statement
- Timeouts (`time.After`)
- Non-blocking channel operations

## Story Context

Three extraction teams respond at different speeds. Maya needs to pick the first contact. Use channels and select to listen for the fastest response.

## Challenge

Create channels for 3 extraction teams, simulate different response times, and use `select` with a timeout to pick the first responder.

### Starter Code

```go
package main

import (
    "fmt"
    "time"
)

// Three extraction teams will respond at different times:
// Alpha: 2 seconds
// Bravo: 1 second
// Charlie: 3 seconds
// Timeout: 4 seconds

// Use channels and select to pick the first team that responds
// If no team responds before timeout, print "NO CONTACT"

func main() {
    // TODO: create channels
    // TODO: launch goroutines simulating team responses
    // TODO: use select to pick first response or timeout
}
```

### Acceptance Criteria

- Creates at least one `chan string`
- Uses goroutines to send on channels after delays
- Uses `select` with multiple `case` branches
- Uses `time.After` for timeout
- Correctly selects Bravo (fastest at 1s) or handles timeout
- Output identifies the responding team

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 180s

## Hints

1. "`ch := make(chan string)` creates a channel. `ch <- \"message\"` sends, `msg := <-ch` receives." (−8 energy)
2. "`select { case msg := <-ch1: ... case msg := <-ch2: ... case <-time.After(4 * time.Second): ... }`" (−12 energy)
3. "launch 3 goroutines with different `time.Sleep` durations, each sending team name on a shared channel. select picks the first." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | Rush Mode — "Extraction window closing" |

## Rush Mode

- **Duration:** 50 seconds
- **On expiry:** Jeopardy — Guard Enters (chat dims 50%, locks 60s)

## UI State

- **Location label:** SERVER ROOM · COMMS ARRAY
- **Concept label:** Channels · Select · Timeouts
- **Visual:** Three signal indicators for Alpha/Bravo/Charlie, lighting up when they respond
