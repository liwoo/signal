# Boss — Director Vasik (Terminal 1 of 3)

**Act II Boss**

## Go Concepts (Debugging)

- Structs
- Methods
- Error handling

## Story Context

Vasik detects Maya on the network and opens a direct terminal channel. He taunts her. He sends a broken Go struct — a `SecurityProfile` — and says the building's doors will stay sealed until his own code compiles cleanly. He's deliberately introduced three errors.

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────┐
│         DIRECTOR VASIK · TERMINAL 1 · 02:00          │
├─────────────────────────┬────────────────────────────┤
│  VASIK'S CODE (read-only)│  YOUR CORRECTED VERSION   │
│                         │                            │
│  type SecurityProfile   │  type SecurityProfile      │
│    struct {             │    struct {                │
│    Name string          │    // Fix the 3 errors     │
│    Level int            │                            │
│    clearance() string   │                            │
│  }                      │                            │
│                         │                            │
│  func (s SecurityProfile│                            │
│    Validate() error     │                            │
│    if s.Level < 0 {     │                            │
│      return nil         │                            │
│    }                    │                            │
│    return nil           │                            │
│  }                      │                            │
├─────────────────────────┴────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  WINGS SHUTTING DOWN · 1:42       │
└──────────────────────────────────────────────────────┘
[Building minimap in top-right showing wings closing]
```

### The Three Errors

1. `clearance() string` — method signature in struct definition (should be a field: `Clearance string`)
2. Missing `)` after receiver — `func (s SecurityProfile` needs closing `)`
3. Logic error: `Validate()` returns `nil` when `Level < 0` — should return an error for invalid levels

### Player Task

Write a corrected version of Vasik's struct in the right-side editor. The original is read-only on the left.

### Timer

- **Duration:** 120 seconds
- **Every 20s without submission:** Vasik shuts off another wing (minimap visual)
- **No time penalty per wrong attempt** — but wings keep closing

### Win Condition

All 3 errors corrected, code compiles.

### Loss Condition

Timer reaches 0 or all wings shut. Energy drops to 20%. Replay with 90s timer.

### Plot Pivot

If solved in under 60 seconds, Vasik is visibly rattled:
- Chat message from SYS: `VASIK: "Faster than expected."`
- Unlocks a dialogue branch in Act IV where Vasik makes an offer

## XP

- **Base:** 500 XP
- **Under par (60s):** +250 XP
- **AI tokens earned:** +2

## Mobile Layout

- Diff panel becomes a collapsible drawer
- Tab toggle: "Vasik's Code" / "Your Code"
- Minimap hidden on mobile — wing count shown as text: "Wings open: 3/5"

## UI State

- **Location label:** VASIK'S TERMINAL
- **Boss atmosphere:** Vasik's taunting messages appear in chat periodically
- **Chat messages from Vasik:** "Amusing.", "Tick tock.", "The building has five wings. Four now."
