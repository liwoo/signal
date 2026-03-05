# Chapter 24 — The Signal

**Act IX · Global / Distributed Signal Network**

## Go Concepts (Capstone)

- HTTP server with routing
- HTML templates
- Middleware chain (logging + auth + rate limiting)
- Session management
- Database queries
- Static file serving
- WebSocket endpoint
- Full integration of all web concepts

## Story Context

Dr. Reeves sends a message from inside NEXUS HQ: "I have the server room. Send the signal." Maya must build the war room — a complete Go web application that coordinates the final operation. Every concept from Acts VI-IX in one program. This is the capstone.

## Challenge

Build a complete web application that combines every web concept learned. No starter code — the player builds from scratch.

### Requirements Spec

```
THE SIGNAL — WAR ROOM SERVER

Endpoints:
  GET    /                    -> render dashboard template (agent status, broadcast progress)
  GET    /agents              -> query database for all active agents, return JSON
  POST   /agents/search       -> form-based search with validation
  GET    /evidence/*          -> serve static evidence files
  GET    /ws                  -> websocket endpoint for real-time agent comms

Middleware chain:
  logging -> auth (API key) -> rate limiting (10 req/s) -> handler

Sessions:
  /login (POST)  -> create session
  /logout (POST) -> destroy session
  Dashboard requires valid session

The dashboard template must show:
  - Total connected agents (from WebSocket)
  - Recent database query results
  - Broadcast status: "READY" or "TRANSMITTING"
```

### Acceptance Criteria

- HTTP server with `gorilla/mux` routing
- At least 5 distinct route handlers
- Middleware chain with minimum 2 layers (logging + auth)
- `html/template` rendering with data from multiple sources
- Session-protected route (dashboard)
- Static file serving with `http.FileServer`
- WebSocket endpoint with upgrade and read/write
- Database query (can be simulated with in-memory data)
- Form handling with input validation
- Proper error handling throughout

### Evaluation

This is the most complex challenge. The LLM evaluator checks for:
1. Structural completeness (all endpoints present)
2. Middleware applied to routes
3. Template uses dynamic data
4. WebSocket properly upgrades
5. Sessions create/destroy correctly
6. No obvious security issues (SQL injection, XSS)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Dr. Reeves: "I have the server room. Send the signal." |
| T+30s | Rush Mode — "NEXUS kill switch activated. Broadcast before shutdown." |

## Rush Mode

- **Duration:** 120 seconds (longest rush in the game — capstone deserves it)
- **On expiry:** Jeopardy — ALL effects stack: Signal Scramble + Power Reduced + Energy Drain (-30) + Hint Burned

## XP

- **Base:** 600 XP
- **First-try bonus:** +300 XP
- **Par time:** 300s (5 minutes — this is a full application)

## Hints

1. "start with the skeleton: `r := mux.NewRouter()`, register all 5 routes, wrap in middleware, `http.ListenAndServe`." (-8 energy)
2. "don't build it all at once. start with the HTTP routes, then add WebSocket, then layer middleware on top." (-12 energy)
3. "template: `tmpl.Execute(w, map[string]interface{}{\"Agents\": agents, \"Status\": status})` — pass a map with all the data sources." (-20 energy)

## Twist

No twist — pure execution under pressure. The story IS the twist: everything leads here.

### Post-completion

- Lines:
  1. `> war room server: ONLINE`
  2. `> middleware: ACTIVE`
  3. `> sessions: SECURE`
  4. `> database: CONNECTED`
  5. `> websocket: 14 AGENTS LINKED`
  6. `> static evidence: SERVED`
  7. `> maya: we're ready.`
  8. `> maya: send the signal.`

## UI State

- **Location label:** WAR ROOM · THE SIGNAL
- **Concept label:** FULL WEB APPLICATION (CAPSTONE)
- **Visual:** The editor takes up the full screen. No chat panel. No distractions. Just code.
- **HUD:** Minimal — just energy, timer, and submit button.
- **Atmosphere:** Quiet determination. The music (if any) is a single sustained note.
