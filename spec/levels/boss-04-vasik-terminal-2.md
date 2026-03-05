# Boss — Director Vasik (Terminal 2 of 3)

**Act IV Boss**

## Go Concepts (Debugging)

- Interfaces
- Goroutines
- Error handling

## Story Context

Vasik sends a malformed Go struct and asks you to find the bug that would crash Maya's escape route program. His code is deliberately obfuscated.

## Mechanic

### Vasik's Code (pre-filled, read-only)

```go
type EscapeRoute interface {
    Calculate() ([]string, error)
}

type DirectRoute struct {
    checkpoints []string
    verified    bool
}

func (d DirectRoute) Calculate() ([]string, error) {
    results := make(chan string)
    var routes []string

    for _, cp := range d.checkpoints {
        go func() {
            results <- process(cp)  // Bug 1: closure captures loop var
        }()
    }

    for i := 0; i < len(d.checkpoints); i++ {
        routes = append(routes, <-results)
    }

    if !d.verified {
        return routes, nil  // Bug 2: should return error when not verified
    }

    return routes, nil
}

func process(cp string) string {
    return "ROUTE-" + cp
}
```

### The Bugs

1. **Closure captures loop variable:** `go func()` captures `cp` by reference — all goroutines see the last value. Fix: pass `cp` as parameter.
2. **Logic error:** Returns `nil` error even when `!d.verified` — should return an error for unverified routes.

### Player Task

Identify both bugs in a corrected version. Write the fixed code in the editor.

### Timer

- **Duration:** 120 seconds
- **Every 15s:** Vasik taunts via chat
- **No time penalty per wrong attempt**

### Win Condition

Both bugs identified and corrected.

### Loss Condition

Timer expires. Energy drops to 15%. Replay with 90s timer.

## XP

- **Base:** 600 XP
- **Under par (60s):** +300 XP
- **AI tokens earned:** +2

## Mobile Layout

- Tab toggle: "Vasik's Code" / "Your Fix"
- Vasik's taunts appear as toast notifications instead of chat

## UI State

- **Location label:** VASIK'S TERMINAL · ROUND 2
- **Chat messages from Vasik:** "This one's subtle.", "Running out of time.", "Closer... but no."
