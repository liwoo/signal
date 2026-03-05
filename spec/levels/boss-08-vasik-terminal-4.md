# Boss — Director Vasik (Terminal 4 of 4)

**Act VIII Boss · NEXUS Corporate HQ / Singapore**

## Go Concepts (Debugging)

- Middleware chains (5 layers)
- Handler composition bugs
- Context propagation errors
- Authentication bypass
- Race conditions in middleware

## Story Context

Vasik is alive. He was never truly arrested (Ending A) or never truly gone (Ending B). He's in Singapore, at NEXUS HQ, and he's rebuilt his defenses — this time with five chained middleware layers. Maya must debug all five simultaneously while Vasik adds new layers in real time.

## Mechanic

### Layout

```
+------------------------------------------------------+
|          DIRECTOR VASIK · TERMINAL 4 · 02:30         |
+----------------------------+-------------------------+
| VASIK'S MIDDLEWARE CHAIN   | YOUR CORRECTED CHAIN    |
|                            |                         |
| Layer 1: Logging           | // Fix all 5 bugs       |
|   Bug: logs AFTER handler  |                         |
| Layer 2: Auth              |                         |
|   Bug: checks == instead   |                         |
|   of constant-time compare |                         |
| Layer 3: Rate Limit        |                         |
|   Bug: counter not atomic  |                         |
| Layer 4: Session           |                         |
|   Bug: no session.Save()   |                         |
| Layer 5: CSRF              |                         |
|   Bug: compares with ==    |                         |
|   (timing side-channel)    |                         |
+----------------------------+-------------------------+
| VASIK LAYERS: 5  YOU FIXED: 0/5  TIME: 02:12        |
+------------------------------------------------------+
```

### The Five Bugs

1. **Logging middleware:** Logs request details AFTER calling `next.ServeHTTP` — should log before (or both before and after with timing)
2. **Auth middleware:** Compares API key with `==` — vulnerable to timing attack. Should use `subtle.ConstantTimeCompare`
3. **Rate limiter:** Increments a shared counter with `counter++` — not goroutine-safe. Should use `atomic.AddInt64`
4. **Session middleware:** Modifies session values but never calls `session.Save(r, w)` — changes are lost
5. **CSRF middleware:** Compares CSRF tokens with `==` — should use `subtle.ConstantTimeCompare` (same class of bug as #2 but different context)

### Escalation

Every 20 seconds, Vasik adds a new middleware layer to his chain (pre-scripted):
- **+20s:** Layer 6 — Content-Type validator (bug: doesn't check for nil body)
- **+40s:** Layer 7 — Request ID injector (bug: uses `math/rand` instead of `crypto/rand`)
- **+60s:** Layer 8 — Compression middleware (bug: doesn't close the gzip writer)

If the player falls behind by 3+ unfixed layers, Maya's connection drops and the boss must be retried.

### Timer

- **Duration:** 150 seconds
- **No time penalty per wrong attempt**

### Win Condition

All original 5 bugs fixed. Bonus layers (6-8) are optional for extra XP.

### Loss Condition

Timer expires with < 5 bugs fixed, or connection drops (3+ layers behind). Energy drops to 10%. Replay with 120s timer.

## XP

- **Base:** 800 XP
- **Under par (90s):** +400 XP
- **Bonus layers fixed:** +150 XP each
- **AI tokens earned:** +2

## Mobile Layout

- Tab toggle: "Vasik's Chain" / "Your Fix"
- Layer count as badge: "Vasik: 7 layers, You: 4 fixed"
- Vasik's taunts as toast notifications

## Vasik's Dialogue

- "Back again. You'd think you'd learn."
- "Five layers. Five bugs. Elegant, isn't it?"
- "Here's another. Keeping up?"
- "Your middleware is... adequate. For a student."
- [If player is fast]: "...impressive. But layer 6 should slow you down."
- [If player is slow]: "Tick tock. The building is mine."

## UI State

- **Location label:** VASIK'S TERMINAL · ROUND 4
- **Atmosphere:** Cold fury. Vasik is no longer taunting — he's testing.
- **Post-victory:** Vasik's terminal displays: "CONNECTION TERMINATED BY REMOTE HOST." He doesn't get a last word this time.
