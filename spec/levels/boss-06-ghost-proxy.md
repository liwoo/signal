# Boss — GHOST Proxy

**Act VI · Safe House Basement · Hijacked Dead Drop**

## Go Concepts (Application)

- Middleware pattern `func(next http.Handler) http.Handler` (previewed here, formalized in Act VIII)
- Routing and handlers (ch13, ch14)
- Path and prefix matching (`strings.HasPrefix` — ch04.3)
- Header inspection (ch13)
- Request interception vs pass-through

Zero new concepts beyond composing what Act VI taught — the middleware wrapper is given as scaffolding; the player writes the interception logic inside it.

## Story Context

NIGHTJAR was the calling card. Now GHOST stops hiding: rogue route handlers appear inside Maya's own router — `/exfil`, `/ghost/dump` — endpoints she never wrote, wired straight into the roster and key store. She can't take the server down; forty agents depend on it staying up. So Reeves proposes the honeypot: wrap the whole router in a guard that catches GHOST's routes and feeds them logged garbage, while every legitimate route keeps working. Fight the intrusion *without dropping a single agent request*.

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  GHOST PROXY · DEAD DROP SERVER            WAVE 1/3      │
├────────────────────────────┬─────────────────────────────┤
│  ROUTER STATE              │  YOUR GUARD                 │
│  (live route table)        │                             │
│  /status          OK       │  func ghostGuard(...)       │
│  /agent/checkin   OK       │    ...player writes the     │
│  /exfil           ROGUE ⚠  │    interception logic...    │
│  /ghost/dump      ROGUE ⚠  │                             │
├────────────────────────────┴─────────────────────────────┤
│  ▓▓▓▓▓▓▓░░░░  NEXT INJECTION: 0:15 · TOTAL 2:00          │
└──────────────────────────────────────────────────────────┘
```

Left pane: the live route table — legitimate routes green, GHOST's injections flagged red as they appear. Right: the guard middleware. Every 15 seconds GHOST injects a new rogue pattern; the route table updates in real time.

### Scaffolding (given)

```go
func honeypot(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprintln(w, "HONEYPOT: request logged")
}

func ghostGuard(rogue map[string]bool, roguePrefixes []string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // YOUR INTERCEPTION LOGIC HERE
        })
    }
}
```

The wrapper shape is free; the decision logic is the fight.

### Wave Structure

**Wave 1 — Exact Path (0:00–0:40)**
GHOST injects `/exfil`. Intercept any request whose exact path is in the `rogue` set and serve the honeypot; pass everything else to `next`.

```go
if rogue[r.URL.Path] {
    honeypot(w, r)
    return
}
```

Graded probes → expected responses:
```
/status -> board: 4 agents online
/exfil -> HONEYPOT: request logged
```

**Wave 2 — Prefix Family (0:40–1:20)**
GHOST adapts: `/ghost/dump`, `/ghost/keys`, `/ghost/anything` — a whole subtree. Exact matching can't keep up. Add prefix interception:

```go
for _, p := range roguePrefixes {
    if strings.HasPrefix(r.URL.Path, p) {
        honeypot(w, r)
        return
    }
}
```

Graded probes:
```
/agent/checkin -> checkin accepted
/ghost/dump -> HONEYPOT: request logged
```

**Wave 3 — The Disguise (1:20–2:00)**
GHOST's final adaptation: it stops using its own routes and calls Maya's *legitimate* `/status` route — identifying itself only by a header, `X-Node: GHOST`. Path matching is useless. Inspect the request itself:

```go
if r.Header.Get("X-Node") == "GHOST" {
    honeypot(w, r)
    return
}
next.ServeHTTP(w, r)
```

Graded probes (same path, different caller — verified):
```
/status -> board: 4 agents online
/status (X-Node: GHOST) -> HONEYPOT: request logged
```

### Full Graded Run (engine's harness, verified output)

```
/status -> board: 4 agents online
/agent/checkin -> checkin accepted
/exfil -> HONEYPOT: request logged
/ghost/dump -> HONEYPOT: request logged
/status -> HONEYPOT: request logged
```
(the last probe carries `X-Node: GHOST`)

### Timer

120 seconds total; injection marks at 0:15 / 0:40 / 1:20 pace the waves. The wave clock is shared — clearing a wave early banks time for the next.

### Failure

Any legitimate route returning honeypot output = **collateral** — instant wave fail (the fiction: an allied agent got garbage and went dark; −15 energy, wave restarts). Timer at zero: GHOST completes the roster dump; boss fails; retry from wave 1 at 100 seconds.

### Victory

All three waves held: GHOST's every access lands in the honeypot, and the honeypot log becomes evidence — request patterns Maya will weaponize in Act VII. GHOST withdraws from the server.

## XP

- **Wave 1 (exact path):** 150 base
- **Wave 2 (prefix):** 200 base
- **Wave 3 (header disguise):** 250 base
- **No-collateral bonus (zero legit requests honeypotted):** +100
- **Boss defeat:** +2 AI tokens
- **Total possible:** 700 XP

## Timed Events

| Time | Event |
| --- | --- |
| 0:00 | Reeves: "Don't kill the server. Forty agents are on it. Catch GHOST and feed it lies." |
| 0:15 | System: `ROUTE INJECTED — /exfil` |
| 0:40 | System: `ROUTE FAMILY INJECTED — /ghost/*` · Maya: "it's spawning a subtree. match the prefix." |
| 1:20 | GHOST: `I DON'T NEED MY OWN DOORS. YOURS OPEN FOR ANYONE.` · System: `ANOMALOUS CALLS ON /status` |
| 1:45 | Maya: "same path, wrong caller. check the X-Node header." |
| T−10s | Warning: `ROSTER DUMP AT 90% — HOLD THE LINE` |

## Twist

Post-victory. The honeypot log scrolls — hundreds of GHOST requests, all logged. Then the pattern registers.

- Lines:
  1. `> honeypot log: 312 requests captured`
  2. `> maya: look at what it kept asking for. not the roster. not the keys.`
  3. `> query pattern: "REEVES, E." — 214 of 312 requests`
  4. `> reeves: "...why me?"`
  5. `> maya: ghost wasn't robbing us. it was researching YOU.`
  6. `> system: TRACE COMPLETE — QUERIES ORIGINATED: GENEVA VAULT SUBNET`

Points the team at Geneva — Act VII — and plants the "REEVES — ACTIVE ASSET" dread two chapters before ch16 detonates it.

## UI State

- **Location label:** SAFE HOUSE · DEAD DROP SERVER
- **Concept label:** GHOST Proxy · Route Interception
- **Visual state:** Live route table with green/red states, honeypot capture counter climbing, injection flash on each wave start, collateral flash (amber) if a legit route is caught
- **Audio:** boss-loop music, alert-beep on injections, hit-confirm on each honeypotted GHOST request, warning-beep on collateral, tension-drone under wave 3

## Teaching Notes

### First web boss, and a deliberate preview

The `func(next http.Handler) http.Handler` shape is Act VIII's core curriculum — here it arrives as *given scaffolding* so the player fights inside it before ever being asked to build it. When ch19 formalizes middleware, the player has already won a boss fight standing in one.

### Escalation mirrors real intrusion response

Exact-path blocking → prefix blocking → caller inspection is the actual arc of blocking a real attacker who adapts (IP bans → CIDR bans → behavioral detection). Each wave invalidates the previous wave's sufficient answer without invalidating its code — the guard *accumulates*, teaching layered defense instead of replacement.

### The collateral rule is the lesson

The hard constraint (never honeypot a legitimate request) forces the player to reason about *order of checks* and pass-through (`next.ServeHTTP`) — the two things every real middleware bug in Act VIII (and boss-08) is made of.

### Boss format ledger

Combat → data waves → debugging → judgment → semantic debugging → race → **live defense of a running service**. Part II bosses are operational, not gladiatorial: the win condition is uptime.
