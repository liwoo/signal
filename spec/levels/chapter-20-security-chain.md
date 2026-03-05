# Chapter 20 — Security Chain

**Act VIII · NEXUS Corporate HQ / Singapore**

## Go Concepts

- Advanced middleware composition
- Conditional middleware (route-specific rules)
- Request context (`context.WithValue`, `r.Context().Value()`)
- Middleware chains / stacks
- `func(http.Handler) http.Handler` chaining patterns

## Story Context

NEXUS doesn't use a single middleware — they chain five layers deep. Maya must replicate their full security chain to intercept traffic. But she also discovers that GHOST sends a heartbeat every 30 seconds to all NEXUS nodes. If Maya can forge a heartbeat by injecting values into the request context, she can impersonate a NEXUS node.

## Challenge

Build a middleware chain with context injection: logging -> rate check -> auth -> role injection -> handler. Use `context.WithValue` to pass data between middleware layers.

### Starter Code

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
)

type contextKey string

const (
    keyRole    contextKey = "role"
    keyAgentID contextKey = "agentID"
)

// Build a middleware chain:
// 1. loggingMW: log method + path + duration
// 2. rateLimitMW: reject if more than 10 requests per minute (simplified: check header X-Request-Count)
// 3. authMW: validate X-API-Key header, inject agentID into context
// 4. roleMW: check agentID, inject role ("admin" or "agent") into context
// 5. Handler: read role from context, respond differently per role

func chain(handler http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    // TODO: apply middlewares in reverse order
}

func main() {
    // TODO: build chain and serve
}
```

### Acceptance Criteria

- Implements a `chain` function that composes middleware in correct order
- Uses `context.WithValue(r.Context(), key, value)` to inject data
- Uses `r.Context().Value(key)` to retrieve injected data
- At least 3 middleware functions in the chain
- Context values flow from outer middleware to inner handler
- Rate limiting middleware returns 429 when limit exceeded
- Final handler reads `role` from context and responds differently

## Timed Events

| Time | Event |
| --- | --- |
| T+22s | Rush Mode — "NEXUS deploying adaptive firewall" |

## Rush Mode

- **Duration:** 40 seconds
- **On expiry:** Jeopardy — Power Reduced + Hint Burned

## XP

- **Base:** 400 XP
- **First-try bonus:** +200 XP
- **Par time:** 150s

## Hints

1. "`ctx := context.WithValue(r.Context(), keyRole, \"admin\")` — inject into context. `r = r.WithContext(ctx)` — attach to request." (-8 energy)
2. "the chain function loops in reverse: `for i := len(mw) - 1; i >= 0; i-- { handler = mw[i](handler) }`" (-12 energy)
3. "in the handler: `role := r.Context().Value(keyRole).(string)` — type assert the value back from context." (-20 energy)

## Twist (post-completion)

Maya's middleware chain catches GHOST's heartbeat pattern — a request every 30 seconds to all NEXUS nodes. If Maya can forge a heartbeat, she can impersonate a NEXUS node.

### Twist Display

- Lines:
  1. `> middleware chain active. intercepting all traffic.`
  2. `> pattern detected: heartbeat every 30s to all nodes`
  3. `> heartbeat contains: encrypted payload`
  4. `> dr. reeves: that encryption... it's MY algorithm.`
  5. `> dr. reeves: they weaponized my thesis.`
  6. `> maya: can you forge the heartbeat?`
  7. `> dr. reeves: if you build the right middleware... yes.`

## UI State

- **Location label:** NEXUS HQ · SECURITY CHAIN
- **Concept label:** Advanced Middleware · Context · Composition
