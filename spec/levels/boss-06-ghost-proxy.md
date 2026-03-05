# Boss — GHOST Proxy

**Act VI Boss · Safe House**

## Go Concepts (Applied)

- HTTP middleware pattern
- Route interception
- Request inspection (headers, paths)
- Handler wrapping

## Story Context

GHOST hijacks Maya's server by injecting rogue route handlers. The player sees their clean router config and GHOST's corrupted requests. They must write middleware that detects GHOST's injected routes by header signature and redirects them to a honeypot endpoint — while keeping legitimate agent routes functional.

## Mechanic

### Layout

```
+------------------------------------------------------+
|            GHOST PROXY · 01:48                       |
+----------------------------+-------------------------+
| INCOMING REQUESTS          | YOUR MIDDLEWARE         |
|                            |                         |
| GET /agent/ALPHA-7/status  | func ghostFilter(       |
|   X-Agent: ALPHA-7   [OK] |   next http.Handler)    |
| GET /agent/GHOST-1/inject  |   http.Handler {        |
|   X-Ghost-Cmd: INJECT [!!]|   // TODO               |
| POST /agent/BRAVO/checkin  | }                       |
|   X-Agent: BRAVO     [OK] |                         |
| GET /admin/dump            |                         |
|   X-Ghost-Cmd: DUMP  [!!] |                         |
+----------------------------+-------------------------+
| GHOST ROUTES INJECTED: 3/8 | BLOCKED: 0/3           |
+------------------------------------------------------+
```

### Detection Rules

GHOST's requests are identifiable by:
1. Presence of `X-Ghost-Cmd` header
2. Paths containing `/admin/`, `/inject`, or `/dump`
3. Agent IDs starting with `GHOST-`

### Player Task

Write a middleware function `func ghostFilter(next http.Handler) http.Handler` that:
- Inspects each request for GHOST signatures
- Returns 403 Forbidden for GHOST requests
- Passes legitimate requests through to `next.ServeHTTP(w, r)`

### Escalation

Every 15 seconds, GHOST injects a new rogue route with a more subtle signature:
- **Round 1 (0s):** Obvious `X-Ghost-Cmd` header
- **Round 2 (15s):** No header, but path contains `/ghost/`
- **Round 3 (30s):** Normal-looking path but User-Agent is `GHOST-CRAWLER/1.0`
- **Round 4 (45s):** Everything looks normal except the request body contains `ghost_payload`

### Timer

- **Duration:** 120 seconds
- **No time penalty per wrong attempt** — but GHOST keeps injecting

### Win Condition

Block all GHOST requests while passing all 4+ legitimate requests through. Evaluated after timer expires or player submits.

### Loss Condition

Timer expires with < 50% GHOST requests blocked. Energy drops to 20%. Replay with 90s timer.

## XP

- **Base:** 600 XP
- **Under par (60s):** +300 XP
- **AI tokens earned:** +2

## Mobile Layout

- Incoming requests shown as a scrolling feed at top (30%)
- Editor takes bottom 70%
- GHOST injection count as text badge: "GHOST: 5 injected, 3 blocked"

## UI State

- **Location label:** SAFE HOUSE · GHOST INTERCEPT
- **No chat panel** — pure focus
- **Visual:** Incoming requests flash green (legitimate) or red (GHOST) as they arrive
- **SFX concept:** Static/interference noise when GHOST injects
