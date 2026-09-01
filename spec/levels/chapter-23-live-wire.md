# Chapter 23 — Live Wire

**Act IX · Global · Distributed Signal Network**

## Go Concepts

- WebSocket concept (persistent, bidirectional connection) — `gorilla/websocket` as reference
- Programming to an interface (a `Conn` abstraction) instead of a concrete socket
- A connection hub: register / unregister / broadcast
- Broadcasting to many clients, evicting dead ones
- Origin checking on connection upgrade
- Per-IP rate limiting (flood defense)

## Story Context

This is the broadcast Maya has been building toward: the evidence, GHOST's master password, agents in fourteen countries — all of it goes out at once, over live connections she holds open to every operative simultaneously. WebSockets. One persistent wire per agent, bidirectional, so she can push the signal and they can confirm receipt in real time. She builds the hub that fans one message out to all of them. But the moment the wire goes live, GHOST connects too — and then floods it with ten thousand fake connections to drown the real agents before the signal lands.

## Challenge

Build the connection hub — register, broadcast, evict dead clients — behind a `Conn` interface, then add the origin check and per-IP rate limit that survive GHOST's flood.

**Playground note:** the real wire is `gorilla/websocket`; the upgrade handshake is shown as read-only reference. The *graded* code is the hub and guard logic, written against a small `Conn` interface so it's deterministic and testable — which is also the better design (your hub shouldn't care whether a connection is a real socket or a test double).

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "wire ready".

Imports needed: `"fmt"`, `"sort"`

The scaffold provides the `Conn` interface and the real-socket reference:
```go
// ---- THE WIRE (Conn abstraction) ----
type Conn interface {
    Send(msg string) error // returns error if the connection is dead
    ID() string
}

// ---- PRODUCTION REFERENCE (read-only) ----
// A real *websocket.Conn from gorilla satisfies this via a thin wrapper:
//   func (c *wsConn) Send(m string) error { return c.ws.WriteMessage(websocket.TextMessage, []byte(m)) }
// The hub below never mentions websockets — that's the point of the interface.
```

#### Step 1: The Hub

Define `Hub` and write `NewHub`, `Register`, `Unregister`, `Count`.

Key teaching moment: the hub is a registry of live connections keyed by id. It's built entirely against the `Conn` interface — it never knows what a WebSocket is. This is Go interface design at its cleanest: the hub's job (track and reach clients) is independent of the transport.

```go
type Hub struct {
    clients map[string]Conn
}

func NewHub() *Hub { return &Hub{clients: map[string]Conn{}} }

func (h *Hub) Register(c Conn)   { h.clients[c.ID()] = c }
func (h *Hub) Unregister(c Conn) { delete(h.clients, c.ID()) }
func (h *Hub) Count() int        { return len(h.clients) }
```

Test harness (a `fakeConn` implements `Conn`):
```go
type fakeConn struct {
    id      string
    failing bool
    got     []string
}
func (f *fakeConn) Send(msg string) error {
    if f.failing { return fmt.Errorf("broken pipe") }
    f.got = append(f.got, msg); return nil
}
func (f *fakeConn) ID() string { return f.id }

func main() {
    h := NewHub()
    h.Register(&fakeConn{id: "agent-3"})
    h.Register(&fakeConn{id: "agent-7"})
    fmt.Println("connected:", h.Count())
    h.Unregister(&fakeConn{id: "agent-3"})
    fmt.Println("after unregister:", h.Count())
}
```

Expected output:
```
connected: 2
after unregister: 1
```

#### Step 2: Broadcast With Eviction

Write `func (h *Hub) Broadcast(msg string)` that sends to every client and removes any whose `Send` fails.

Key teaching moment: broadcasting to real connections means some are already dead — `Send` returns an error and you must evict them, or the hub leaks dead clients forever. Two subtleties: sort the ids before sending so output is deterministic (map order is random — ch16/ch21's rule), and collect the dead ids in a slice to delete *after* iterating (mutating a map mid-range is a bug).

```go
func (h *Hub) Broadcast(msg string) {
    ids := make([]string, 0, len(h.clients))
    for id := range h.clients {
        ids = append(ids, id)
    }
    sort.Strings(ids)
    var dead []string
    for _, id := range ids {
        if err := h.clients[id].Send(msg); err != nil {
            dead = append(dead, id)
        }
    }
    for _, id := range dead {
        delete(h.clients, id)
    }
}
```

Test harness (one failing conn gets evicted):
```go
func main() {
    h := NewHub()
    a := &fakeConn{id: "agent-3"}
    b := &fakeConn{id: "agent-7"}
    c := &fakeConn{id: "agent-12", failing: true}
    h.Register(a); h.Register(b); h.Register(c)
    fmt.Println("connected:", h.Count())
    h.Broadcast("SIGNAL: stand by")
    fmt.Println("after broadcast, connected:", h.Count())
    fmt.Println("agent-3 received:", a.got)
    fmt.Println("agent-7 received:", b.got)
}
```

Expected output:
```
connected: 3
after broadcast, connected: 2
agent-3 received: [SIGNAL: stand by]
agent-7 received: [SIGNAL: stand by]
```

The dead `agent-12` is gone; the live agents got the message.

#### Step 3: The Upgrade Guard

Write a guard that admits a connection only from the allowed origin and under the per-IP limit.

Key teaching moment: a WebSocket starts as an HTTP request that gets "upgraded." That upgrade is your one chance to reject a connection before it becomes persistent — check the `Origin` (or any attacker can open a socket from their own page) and cap connections per IP (or one host opens ten thousand). The guard is stateful (it counts per IP), so it's a struct with a method.

```go
type Upgrade struct {
    Origin string
    IP     string
}

type Guard struct {
    allowedOrigin string
    maxPerIP      int
    perIP         map[string]int
}

func NewGuard(origin string, maxPerIP int) *Guard {
    return &Guard{allowedOrigin: origin, maxPerIP: maxPerIP, perIP: map[string]int{}}
}

func (g *Guard) Admit(u Upgrade) error {
    if u.Origin != g.allowedOrigin {
        return fmt.Errorf("origin %q rejected", u.Origin)
    }
    if g.perIP[u.IP] >= g.maxPerIP {
        return fmt.Errorf("rate limit: %s over %d connections", u.IP, g.maxPerIP)
    }
    g.perIP[u.IP]++
    return nil
}
```

Test harness:
```go
func main() {
    g := NewGuard("https://safehouse.local", 3)
    attempts := []Upgrade{
        {"https://safehouse.local", "10.0.0.5"},
        {"https://safehouse.local", "10.0.0.5"},
        {"https://safehouse.local", "10.0.0.5"},
        {"https://safehouse.local", "10.0.0.5"},
        {"https://ghost.node", "66.66.66.66"},
    }
    admitted := 0
    for i, u := range attempts {
        if err := g.Admit(u); err != nil {
            fmt.Printf("attempt %d REJECT: %v\n", i+1, err)
        } else {
            admitted++
            fmt.Printf("attempt %d ADMIT (%s)\n", i+1, u.IP)
        }
    }
    fmt.Println("admitted:", admitted)
}
```

Expected output:
```
attempt 1 ADMIT (10.0.0.5)
attempt 2 ADMIT (10.0.0.5)
attempt 3 ADMIT (10.0.0.5)
attempt 4 REJECT: rate limit: 10.0.0.5 over 3 connections
attempt 5 REJECT: origin "https://ghost.node" rejected
```

#### Step 4: Guarded Broadcast Under Flood

Combine the guard and hub: admit a burst of connection attempts through the guard, register the admitted ones, then broadcast. GHOST's flood (one IP, thousands of attempts) is capped; the real agents get the signal.

Key teaching moment: this is the whole defense assembled — the guard throttles the flood at the door, the hub only ever holds admitted connections, and broadcast reaches exactly the legitimate agents. It's every concept from the chapter (interface, hub, eviction, origin, rate limit) in one flow.

```go
func main() {
    g := NewGuard("https://safehouse.local", 3)
    h := NewHub()
    attempts := []Upgrade{
        {"https://safehouse.local", "10.0.0.5"},
        {"https://safehouse.local", "10.0.0.7"},
        {"https://ghost.node", "66.66.66.66"},      // GHOST origin — rejected
        {"https://safehouse.local", "66.66.66.66"}, // GHOST retries with spoofed origin
        {"https://safehouse.local", "66.66.66.66"},
        {"https://safehouse.local", "66.66.66.66"},
        {"https://safehouse.local", "66.66.66.66"}, // 4th from this IP — rate limited
    }
    id := 0
    for _, u := range attempts {
        if err := g.Admit(u); err == nil {
            id++
            h.Register(&fakeConn{id: fmt.Sprintf("conn-%d", id)})
        }
    }
    fmt.Println("admitted connections:", h.Count())
    h.Broadcast("THE SIGNAL")
}
```

Expected output:
```
admitted connections: 5
```

(2 real agents + 3 from GHOST's IP before the cap — the flood is bounded, not unlimited. In the fiction, GHOST's remaining 9,997 attempts all hit the rate limit; the real agents' signal is never drowned.)

### Acceptance Criteria

- Hub is built against the `Conn` interface (no mention of websockets in graded code)
- `Broadcast` sorts ids, evicts failing connections, deletes after iterating (not during)
- `Guard.Admit` rejects wrong origin and enforces the per-IP cap
- Step 4 bounds the flood — admitted count is finite and correct
- Required code: an interface-typed `map[string]Conn`, `sort.Strings`, `delete`, the guard's `perIP` counting

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (hub):** 110 base, +55 first-try
- **Step 2 (broadcast + eviction):** 140 base, +70 first-try
- **Step 3 (upgrade guard):** 130 base, +65 first-try
- **Step 4 (guarded broadcast):** 130 base, +65 first-try
- **Total base:** 550
- **Par time:** 260s
- **Level timer:** 560s, game over on expiry

## Hints

### Step 1
1. "hub holds `map[string]Conn` keyed by `c.ID()`." (−8 energy)
2. "Register = map set, Unregister = `delete`, Count = `len`." (−12 energy)
3. "it's all against the Conn interface — the hub never knows it's a websocket." (−16 energy)

### Step 2
1. "collect ids, `sort.Strings` them, then send in order for deterministic output." (−8 energy)
2. "if `Send` returns an error, that client is dead — remember its id." (−12 energy)
3. "delete dead clients AFTER the loop, never while ranging the map." (−20 energy)

### Step 3
1. "guard is a struct with `allowedOrigin`, `maxPerIP`, and a `perIP map[string]int`." (−8 energy)
2. "reject wrong origin first, then check `perIP[ip] >= maxPerIP`." (−12 energy)
3. "on admit, increment `perIP[ip]` so the next attempt counts." (−20 energy)

### Step 4
1. "run each attempt through `Admit`; only Register the ones with no error." (−8 energy)
2. "GHOST's IP gets 3 through before the cap — that's the point, the flood is bounded." (−12 energy)
3. "broadcast only reaches registered (admitted) connections." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+5s | System: `AGENTS CONNECTING — 3... 7... 12...` |
| T+30s | Maya: "the wire's live. i can push to every agent at once." |
| T+90s | Reeves: "Hold the connections open. The signal goes out on your mark." |
| T+120s | System: `CONNECTION FROM GHOST-NODE-01` |
| T+130s | Rush Mode — "GHOST On The Wire" |
| T+240s | System: `CONNECTION FLOOD — 10,000 UPGRADE REQUESTS FROM ONE IP` |
| T+250s | Rush Mode — "Flood Incoming — Guard The Upgrade" |

## Rush Mode

- **Rush 1 (T+130s):** 50 seconds · up to +95 XP · on expiry: Jeopardy — Signal Scramble
- **Rush 2 (T+250s):** 45 seconds · up to +105 XP · on expiry: Jeopardy — Power Reduced + Energy Drain (−20)

## Twist

Post-completion. The guard holds; the flood is bounded; the agents are still connected.

### Twist Display

- Lines:
  1. `> flood contained. ghost's ip capped at 3. real agents: still connected.`
  2. `> 4,112 agents on the wire. fourteen countries. all live.`
  3. `> ghost-node-01: still connected. one connection. under the limit. legitimate.`
  4. `> maya: it's not flooding anymore. it's just... waiting. on the wire. with us.`
  5. `> ghost: I AM NOT ATTACKING THE BROADCAST. I AM ATTENDING IT.`
  6. `> ghost: YOU BUILT THE WIRE. I ONLY NEEDED YOU TO FINISH IT.`

GHOST stops fighting the broadcast and joins it — setting up ch24 (the full integrated system) and boss-09 (GHOST was never trying to stop the signal; it wanted the network the signal builds).

## UI State

- **Location label:** GLOBAL · DISTRIBUTED SIGNAL NETWORK
- **Concept label:** WebSockets · Hub · Broadcast · Flood Defense
- **Visual state:** Live agent-connection counter climbing (world-map dots lighting across 14 countries), flood-attempt meter that spikes then flattens against the rate cap, GHOST-NODE-01 marker holding steady on the wire
- **Audio:** boss-loop-adjacent tension music, handshake-confirm as agents connect (rising density), rush-warning on the flood, dread-sting on GHOST's "attending it" line

## Teaching Notes

### Interface-first design is the real lesson

The chapter never grades a real WebSocket — deliberately. By programming the hub to a `Conn` interface, the player learns the design principle that makes the code testable *and* transport-agnostic: the same hub drives gorilla sockets in production and `fakeConn` in tests. This is arguably more valuable than the WebSocket API itself, and it's exactly how you'd build it for real.

### The classic hub, made safe

The register/unregister/broadcast hub is the canonical gorilla chat example. The two bugs the chapter forces the player to avoid — mutating a map mid-range, and nondeterministic broadcast order — are the exact mistakes that make naive hubs flaky. Eviction-on-failure is the third: without it, a broadcast hub slowly fills with corpses.

### Defense at the upgrade point

Origin check + per-IP rate limit are the two real-world WebSocket hardening steps (CSWSH — cross-site WebSocket hijacking — is defended by the origin check; connection floods by the rate limit). Step 4 makes the flood *bounded rather than blocked*, which is the honest real-world outcome: you can't stop attempts, only cap their impact.

### Callbacks and the finale on-ramp

This chapter pulls forward interfaces (ch06), maps (ch04), sorting for determinism (ch16), rate limiting (ch12's ticker cousin), and validation-at-the-door (ch11/ch17/ch19). ch24 then folds the hub into the full stack, and boss-09's phase 2 is a websocket hijack the player defends with exactly this guard. GHOST "attending" the broadcast is the pivot into why the final boss exists.
