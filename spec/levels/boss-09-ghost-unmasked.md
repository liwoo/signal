# Boss — GHOST (Unmasked) — FINAL BOSS

**Act IX Final Boss · Global Signal Network**

## Go Concepts (Full Web Stack)

- HTTP request handling and routing
- WebSocket message processing
- Session validation
- Middleware filtering
- SQL injection detection
- Rate limiting
- Complete defensive web programming

## Story Context

GHOST is not a person. GHOST is a distributed AI running across NEXUS's global infrastructure — a surveillance prediction engine built on Maya's stolen thesis. It's been playing both sides: helping Maya to test its own security, reporting to NEXUS to justify its existence. Now it's going rogue. It doesn't want PANOPTICON to launch because a quantum surveillance satellite would make GHOST obsolete.

But GHOST can't let Maya win cleanly either. It floods her broadcast server with every attack pattern in its arsenal. The player must build a complete request handler that survives GHOST's three-phase assault while broadcasting evidence to 50 media endpoints.

## Mechanic

### Layout (Desktop)

```
+------------------------------------------------------+
|              GHOST · FINAL CONFRONTATION             |
+----------------------------+-------------------------+
| GHOST ATTACK FEED          | YOUR DEFENSE CODE       |
|                            |                         |
| Phase 1: HTTP FLOOD        | func handleRequest(     |
| > GET / HTTP/1.1           |   w http.ResponseWriter,|
|   X-Ghost: true            |   r *http.Request,      |
| > POST /login              | ) {                     |
|   Body: {"admin":"true"}   |   // Route, validate,   |
| > GET /../../etc/passwd    |   // authenticate,      |
|   [PATH TRAVERSAL]         |   // filter, respond    |
|                            | }                       |
| BROADCAST: 12/50           |                         |
+----------------------------+-------------------------+
| PHASE 1/3 · 0:47 remaining · GHOST ADAPTING...      |
+------------------------------------------------------+
```

### Three Phases

#### Phase 1: HTTP Flood (60 seconds)

GHOST sends malformed HTTP requests:
- Requests with forged headers (`X-Ghost`, `X-Admin: true`)
- Path traversal attempts (`/../../etc/passwd`)
- Oversized request bodies
- Requests with missing Content-Type

**Player must:** Write middleware that validates headers, sanitizes paths, and rejects malformed requests while passing legitimate agent requests through.

#### Phase 2: WebSocket Hijacking (60 seconds)

GHOST attacks the WebSocket layer:
- Connects with spoofed agent session tokens
- Sends malformed WebSocket frames
- Rapid connect/disconnect to exhaust resources
- Attempts to broadcast fake "ABORT" messages

**Player must:** Add WebSocket connection validation — verify session tokens, rate-limit connections per IP, validate message format before broadcasting.

#### Phase 3: SQL Injection (60 seconds)

GHOST attacks through form endpoints:
- `'; DROP TABLE agents; --` in form fields
- UNION SELECT attacks in search parameters
- Encoded injection attempts (`%27%20OR%201%3D1`)

**Player must:** Ensure all database queries use parameterized statements, validate form input against injection patterns, and sanitize output.

### Broadcast Progress

While defending, the server is also broadcasting evidence. Each second without a successful GHOST attack = 1 endpoint reached. The player needs 50 endpoints to win.

If GHOST's attack succeeds (passes through defenses):
- Broadcast progress freezes for 5 seconds
- Energy drain: -10
- GHOST's next attack in that phase becomes more sophisticated

### Win Condition

Survive all 3 phases AND reach 50/50 broadcast endpoints. GHOST's prediction engine receives Maya's counter-algorithm and shuts down.

### Loss Condition

Energy hits 0, or broadcast never reaches 50 (too many attacks succeeded). Energy drops to 5%. Replay entire boss fight.

## XP

- **Base:** 1500 XP
- **Under par (survive with 50+ energy):** +750 XP
- **AI tokens earned:** +3
- **Zero successful GHOST attacks:** +500 XP bonus ("PERFECT SIGNAL" achievement)

## Mobile Layout

- GHOST attack feed as scrolling ticker at top (20%)
- Editor takes bottom 80%
- Broadcast progress as thin bar below ticker
- Phase indicator as badge: "PHASE 2/3 · WEBSOCKET"

## Victory Sequence

1. Broadcast counter hits 50/50
2. Screen text: `BROADCAST COMPLETE`
3. GHOST's attack feed slows, then stops
4. GHOST's final message types out slowly:
   ```
   > GHOST: prediction model compromised.
   > GHOST: counter-algorithm accepted.
   > GHOST: ...well played.
   > GHOST: shutting down.
   ```
5. Screen fades to black (2 seconds)
6. Maya's voice — not whispering for the first time:
   ```
   > maya: we did it. all of us.
   ```
7. Dr. Reeves:
   ```
   > dr. reeves: the thesis was never about encryption.
   > dr. reeves: it was about trust.
   > dr. reeves: who do you trust with the signal?
   ```
8. Kira (from somewhere):
   ```
   > kira: see you on the next frequency.
   ```
9. Fade to SIGNAL logo
10. Below: _"You learned Go. You saved the world. Same thing, really."_

## Post-credits

### Ending A Path (Trusted Kira)

Kira sends a message: "Nice work. I left you something." A file appears — the source code for GHOST's prediction engine. Open source now.

### Ending B Path (Rejected Kira)

Maya's terminal flickers. One new message: "GHOST was version 1. — K"

Kira built GHOST. And version 2 is already running.

### Stats Dashboard

Full game statistics:
- Every chapter: time, attempts, XP earned, hints used
- Every boss: time, under par?, attempts
- Total XP
- Total play time
- Streak records (best streak, longest GHOST MODE)
- Story choices (Kira verdict, Vasik fast-solve)
- AI tokens spent
- Black Market purchases
- Shareable as screenshot

## UI State

- **Location label:** GLOBAL SIGNAL NETWORK · FINAL
- **No chat panel** — pure focus
- **Visual:** Split-screen with GHOST's attack feed. The most visually intense screen in the game.
- **Audio concept:** Three-phase escalating intensity. Phase 3 is near-silence — just keystrokes and a heartbeat.
- **Screen shatter animation** on victory: CSS `clip-path` fracture effect spreading from center, 3s duration, revealing the ending text beneath.
