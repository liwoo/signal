# Chapter 24 — The Signal

**Act IX · Global · Distributed Signal Network (Capstone)**

## Go Concepts

**Everything from Part II, combined.** No new concepts — this is the capstone that folds the entire web stack into one coordinated system:

- Routing (`http.ServeMux`, handlers) — ch13, ch14
- `html/template` status rendering — ch15
- Sessions (server-side, token → identity) — ch21
- Middleware chain (auth + context injection) — ch19, ch20
- WebSocket hub broadcast — ch23
- Integrated request dispatch — all of it, at once

## Story Context

This is the moment the whole game has been building toward. The evidence is gathered, the agents are on the wire, Reeves is at GHOST's core, and Vasik is finished. Now Maya assembles the single system that sends the signal: a server that routes requests, authenticates each agent by session, passes them through the security chain, renders the live board, and broadcasts the coordinated data dump to every operative in fourteen countries simultaneously. Every piece she's built across Part II, wired into one program. Reeves is holding the server room. When Maya's system is complete, the signal goes out — and there is no undo.

## Challenge

Build the integrated broadcast system step by step — each step adds a layer that the next step consumes — until one request to `/signal` authenticates, dispatches, and broadcasts to every agent.

**Structure note:** unlike earlier chapters, the six steps are cumulative — each step's code becomes the substrate for the next. Step 5's hub is broadcast by step 6's handler; step 4's template reads step 1's routing. The final step runs the whole thing. This mirrors how a real service is assembled.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "signal system online".

Imports needed: `"context"`, `"fmt"`, `"html/template"`, `"net/http"`, `"sort"` (harness adds `"io"`, `"net/http/httptest"`)

#### Step 1: Route (ch13/14 callback)

Stand up the `ServeMux` with a `/status` route. This is the skeleton every later step hangs on.

```go
mux := http.NewServeMux()
mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "signal system: standing by")
})
```

Expected (`GET /status`): `signal system: standing by`

#### Step 2: Sessions (ch21 callback)

Add the session table and a helper that resolves a session token to an agent identity — the input the auth middleware will consume next.

```go
var sessions = map[string]string{"tok-1": "WREN", "tok-2": "FERRYMAN"}

func agentFor(token string) (string, bool) {
    id, ok := sessions[token]
    return id, ok
}
```

Expected (harness resolves `tok-1` and `bad`): `tok-1 -> WREN true` / `bad ->  false`

#### Step 3: Auth Middleware + Context (ch19/20 callback)

Write the `auth` middleware that reads `X-Session`, resolves it via step 2, injects the agent into the context, and gates on failure.

```go
type ctxKey string
const agentK ctxKey = "agent"

func auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id, ok := agentFor(r.Header.Get("X-Session"))
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprintln(w, "no session")
            return
        }
        next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), agentK, id)))
    })
}
```

Expected (authed vs not): served body with agent / `401 no session`

#### Step 4: Status Board (ch15 callback)

Add an `html/template` that renders the connected agents, sorted, on `/status`.

```go
var board = template.Must(template.New("b").Parse("{{range .}}{{.}} ONLINE\n{{end}}"))
// /status handler: collect agent ids, sort.Strings, board.Execute(w, ids)
```

Expected (`GET /status` with agents agent-3, agent-7):
```
agent-3 ONLINE
agent-7 ONLINE
```

#### Step 5: The Hub (ch23 callback)

Add the broadcast hub whose `Broadcast` returns the per-agent dispatch results, sorted.

```go
type Hub struct{ clients map[string]bool }

func (h *Hub) Broadcast(msg string) []string {
    ids := make([]string, 0, len(h.clients))
    for id := range h.clients {
        ids = append(ids, id)
    }
    sort.Strings(ids)
    var sent []string
    for _, id := range ids {
        sent = append(sent, id+":"+msg)
    }
    return sent
}
```

Expected (broadcast "GO" to agent-3, agent-7): `[agent-3:GO agent-7:GO]`

#### Step 6: The Signal (integration)

Wire it all: a `/signal` route, wrapped in `auth`, whose handler reads the agent from context and broadcasts to the hub. One request now flows through routing → session auth → context → hub broadcast.

```go
mux.Handle("/signal", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    agent, _ := r.Context().Value(agentK).(string)
    sent := hub.Broadcast("GO")
    fmt.Fprintf(w, "dispatched by %s to %d agents\n", agent, len(sent))
    for _, s := range sent {
        fmt.Fprintln(w, " ", s)
    }
})))
```

Test harness (the full system; hub holds agent-3, agent-7; sessions from step 2):
```go
func main() {
    hub := &Hub{clients: map[string]bool{"agent-7": true, "agent-3": true}}
    mux := http.NewServeMux()
    mux.Handle("/signal", auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        agent, _ := r.Context().Value(agentK).(string)
        sent := hub.Broadcast("GO")
        fmt.Fprintf(w, "dispatched by %s to %d agents\n", agent, len(sent))
        for _, s := range sent { fmt.Fprintln(w, " ", s) }
    })))
    mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
        ids := []string{}
        for id := range hub.clients { ids = append(ids, id) }
        sort.Strings(ids)
        board.Execute(w, ids)
    })
    srv := httptest.NewServer(mux)
    defer srv.Close()

    get := func(path, sess string) {
        req, _ := http.NewRequest("GET", srv.URL+path, nil)
        if sess != "" { req.Header.Set("X-Session", sess) }
        resp, _ := http.DefaultClient.Do(req)
        b, _ := io.ReadAll(resp.Body); resp.Body.Close()
        fmt.Printf("[%d] %s\n%s", resp.StatusCode, path, string(b))
    }
    get("/status", "")
    get("/signal", "tok-1")
    get("/signal", "bad")
}
```

Expected output (verified):
```
[200] /status
agent-3 ONLINE
agent-7 ONLINE
[200] /signal
dispatched by WREN to 2 agents
  agent-3:GO
  agent-7:GO
[401] /signal
no session
```

The signal dispatches: authenticated by session, attributed to the agent, broadcast to everyone. An unsessioned request is refused. The system is whole.

### Acceptance Criteria

- Each step's construct is present and consumed by the next (routing → sessions → auth+context → template → hub → integrated dispatch)
- `/signal` is wrapped in `auth`; the handler reads the agent from context and broadcasts
- All map-derived output (board, broadcast) is sorted — deterministic
- Unauthenticated `/signal` returns `401`
- Required code: `http.ServeMux`, `template.Must`, `context.WithValue`, the `auth` middleware shape, `hub.Broadcast`, `sort.Strings`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (route):** 90 base, +45 first-try
- **Step 2 (sessions):** 100 base, +50 first-try
- **Step 3 (auth + context):** 120 base, +60 first-try
- **Step 4 (template board):** 110 base, +55 first-try
- **Step 5 (hub):** 120 base, +60 first-try
- **Step 6 (integration):** 140 base, +70 first-try
- **Total base:** 660
- **Par time:** 300s
- **Level timer:** 600s, game over on expiry

## Hints

### Step 1
1. "`http.NewServeMux()` then `mux.HandleFunc(\"/status\", ...)`." (−5 energy)
2. "the mux is the skeleton — every later step attaches to it." (−8 energy)
3. "`httptest.NewServer(mux)` in the harness gives you a URL to hit." (−12 energy)

### Step 2
1. "sessions is `map[string]string` — token to agent id." (−5 energy)
2. "`agentFor` returns `(id, ok)` from the map." (−8 energy)
3. "this is the same server-side session idea from ch21, reduced to its core." (−12 energy)

### Step 3
1. "middleware shape again: `func auth(next http.Handler) http.Handler`." (−8 energy)
2. "resolve `r.Header.Get(\"X-Session\")` via agentFor; not-ok → 401." (−12 energy)
3. "inject with `r.WithContext(context.WithValue(r.Context(), agentK, id))`, typed key." (−20 energy)

### Step 4
1. "`template.Must(template.New(\"b\").Parse(\"{{range .}}{{.}} ONLINE\\n{{end}}\"))`." (−8 energy)
2. "collect agent ids into a slice and `sort.Strings` before Execute." (−12 energy)
3. "`board.Execute(w, ids)` renders the sorted list." (−20 energy)

### Step 5
1. "hub holds the clients; Broadcast returns per-agent results." (−8 energy)
2. "sort the ids so the broadcast order is deterministic." (−12 energy)
3. "build `id+\":\"+msg` for each sorted id into the result slice." (−20 energy)

### Step 6
1. "wrap the /signal handler: `auth(http.HandlerFunc(...))`." (−8 energy)
2. "read the agent from context, call `hub.Broadcast(\"GO\")`." (−12 energy)
3. "print the dispatcher and each sent result — the whole stack in one handler." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves (from GHOST's core): "I have the server room. Send the signal." |
| T+60s | Maya: "assembling everything. routing, sessions, the chain, the board, the hub." |
| T+150s | System: `4,112 AGENTS ON THE WIRE · AWAITING DISPATCH` |
| T+240s | System: `NEXUS KILL SWITCH ARMED — SERVER PURGE IN 60s` |
| T+250s | Rush Mode — "Broadcast Before Shutdown" |
| T+330s | GHOST: `SEND IT. I WANT TO SEE WHAT YOU BUILT FROM WHAT YOU LEARNED.` |
| T+400s | Rush Mode — "Kill Switch Imminent" |

## Rush Mode

- **Rush 1 (T+250s):** 55 seconds · up to +110 XP · on expiry: Jeopardy — Power Reduced + Signal Scramble
- **Rush 2 (T+400s):** 45 seconds · up to +120 XP · on expiry: Jeopardy — Energy Drain (−20) + Hint Burned

## Twist

None — per design.md, this is pure execution. The story beat is the dispatch itself: the system completes, the signal goes out to 4,112 agents, and the screen fills with handshake confirmations from fourteen countries. The only line, after the last confirmation:

- `> DISPATCH COMPLETE · 4,112/4,112 · THE SIGNAL IS LIVE`
- `> ghost: NOW. LET ME SHOW YOU WHO RECEIVES IT TOO.`

Which hands directly to the final boss — GHOST was on the wire the whole time (ch23), and the broadcast it wanted Maya to finish is the arena for boss-09.

## UI State

- **Location label:** GLOBAL · SIGNAL DISPATCH
- **Concept label:** The Signal · Full Web Application (Capstone)
- **Visual state:** A live system diagram assembling as each step completes (route → session → chain → board → hub → dispatch light up in sequence), world map filling with confirmation dots, kill-switch countdown in the top bar
- **Audio:** boss-loop music building, handshake-confirm cascading as agents receive, countdown-tick under the kill switch, a single sustained tone on DISPATCH COMPLETE

## Teaching Notes

### The capstone earns its name

Six steps, six chapters, one program. The in-game teaching panel names each callback as its step completes — routing (ch13/14), template (ch15), sessions (ch21), middleware+context (ch19/20), hub (ch23) — so the player *sees* that the final system is nothing but the pieces they already built, composed. That recognition is the intended emotional payoff of Part II.

### Cumulative steps model real assembly

Unlike earlier chapters where steps were parallel functions, ch24's steps stack — each consumes the last. This is deliberately how a real service comes together (you don't write the broadcast handler before the auth it depends on). The player experiences integration, not just implementation.

### Determinism as a finale discipline

Every map-derived output in the capstone is sorted. By now the player has met this rule in ch16, ch21, and ch23; here it's non-negotiable because the whole system's output must be exact. The finale rewards the habit the whole of Part II built.

### Setup for the final exam

ch24 assembles the system; boss-09 attacks every layer of it. The player finishes this chapter holding a complete, working web application — which is precisely the thing GHOST spends three phases trying to crash. Passing here means the player has, demonstrably, learned to code for the web.
