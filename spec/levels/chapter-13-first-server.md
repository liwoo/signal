# Chapter 13 — First Server

**Act VI · Safe House · Basement Server Room**

## Go Concepts

- `net/http` handler functions (`func(w http.ResponseWriter, r *http.Request)`)
- Request anatomy: `r.Method`, `r.URL.Path`, `r.Header.Get`
- Response anatomy: `w.WriteHeader`, status codes, writing bodies with `fmt.Fprint` / `fmt.Fprintf`
- `http.HandlerFunc` (the adapter that turns a function into a Handler)
- `http.NewServeMux`, `mux.HandleFunc` (routing table)
- `http.ListenAndServe` (reference — the switch Maya flips *after* the harness passes)
- `net/http/httptest` (`NewRequest`, `NewRecorder`) for exercising handlers off-network

## Story Context

Seventy-two hours after the building. The safe house basement hums with scavenged rack hardware — this is where Part II begins. Vasik was one node of NEXUS, a private intelligence consortium across 14 countries, and GHOST's last broadcast still glows on Reeves' terminal: *"You escaped the building. You haven't escaped the network."* Allied agents need a dead drop: a covert Go server they can ping to prove they're alive and be recognized. But NEXUS sweeps this subnet for open ports. Maya cannot bind a listener until every handler is verified cold — `httptest` drives requests through the code with the network cable unplugged. If a broken handler goes live, the first port scan maps them.

## Challenge

Build the dead drop server: a health handler, an identity handler that reads the `X-Agent` header, and a `ServeMux` that routes them — all proven against `httptest` before the port ever opens.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "basement rig online".

Imports for this chapter: `"fmt"` now; `"net/http"` arrives in step 1, `"net/http/httptest"` is used by the harnesses. (Go refuses to compile unused imports — add them only when a step needs them.)

Reference declarations shown in the brief (Act VI+ pattern — the shape of what you'll build):

```go
// A handler is just a function with this exact signature:
//   func name(w http.ResponseWriter, r *http.Request)
// w is the pen you write the response with. r is the request that came in.
```

#### Step 1: The Health Handler

Write `func healthHandler(w http.ResponseWriter, r *http.Request)` that writes `SIGNAL ALIVE` to the response.

Key teaching moment: this signature IS web programming in Go. No framework, no class — a plain function that receives the parsed request (`r`) and a writer for the response (`w`). `fmt.Fprint(w, ...)` works because `http.ResponseWriter` is an `io.Writer` — the same `Fprint` family from Part I, pointed at the network instead of stdout. The first byte you write triggers an implicit `200 OK` status. The harness proves the anatomy: it builds a fake request with `httptest.NewRequest`, hands the handler a recording response writer, then inspects what came back — no port, no listener, no NEXUS scan.

```go
func healthHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "SIGNAL ALIVE")
}
```

Test harness:
```go
func main() {
    req := httptest.NewRequest("GET", "/health", nil)
    rec := httptest.NewRecorder()
    healthHandler(rec, req)
    fmt.Println(req.Method, req.URL.Path)
    fmt.Println(rec.Code, rec.Body.String())
}
```

Expected output:
```
GET /health
200 SIGNAL ALIVE
```

#### Step 2: The Identity Handler

Write `func identityHandler(w http.ResponseWriter, r *http.Request)` that reads the `X-Agent` request header. If the header is present, respond `AGENT: <value>`. If it's missing, set status `401` with `w.WriteHeader(http.StatusUnauthorized)` and respond `AGENT: UNKNOWN`.

Key teaching moment: `r.Header.Get("X-Agent")` returns the header value or `""` if absent — no error, no panic, just the zero value (the map-lookup idiom from ch04 wearing HTTP clothes). Status codes must be sent **before** the body: `w.WriteHeader(401)` first, then write. If you write the body first, Go has already committed `200` and the `WriteHeader` call is a no-op (with a server-side warning). This ordering rule bites every Go web developer exactly once — let it bite in the basement, not in production.

```go
func identityHandler(w http.ResponseWriter, r *http.Request) {
    agent := r.Header.Get("X-Agent")
    if agent == "" {
        w.WriteHeader(http.StatusUnauthorized)
        fmt.Fprint(w, "AGENT: UNKNOWN")
        return
    }
    fmt.Fprintf(w, "AGENT: %s", agent)
}
```

Test harness:
```go
func probe(agent string) {
    req := httptest.NewRequest("GET", "/identity", nil)
    if agent != "" {
        req.Header.Set("X-Agent", agent)
    }
    rec := httptest.NewRecorder()
    identityHandler(rec, req)
    fmt.Printf("%d %s\n", rec.Code, rec.Body.String())
}

func main() {
    probe("ECHO-4")
    probe("HAVEN-2")
    probe("")
}
```

Expected output:
```
200 AGENT: ECHO-4
200 AGENT: HAVEN-2
401 AGENT: UNKNOWN
```

#### Step 3: The Routing Table

Write `func newDeadDrop() *http.ServeMux` that creates a `ServeMux` with `http.NewServeMux()`, registers `/health` → `healthHandler` and `/identity` → `identityHandler` via `mux.HandleFunc`, and returns it.

Key teaching moment: a `ServeMux` is a routing table — it maps paths to handlers and answers `404 page not found` for anything unregistered, for free. `mux.HandleFunc(path, f)` is sugar for `mux.Handle(path, http.HandlerFunc(f))`: `http.HandlerFunc` is a type conversion, not a call — it adapts your plain function into the `http.Handler` interface (the ch06 interface lesson, load-bearing at last). Returning the mux instead of calling `http.ListenAndServe(":4433", mux)` inside is the professional move: a constructor you can test. The real `main` — the one that flips the switch — is one line, and Maya only runs it after this harness prints clean:

```go
// The switch — NOT run until the harness passes:
// func main() {
//     http.ListenAndServe(":4433", newDeadDrop())
// }
```

```go
func newDeadDrop() *http.ServeMux {
    mux := http.NewServeMux()
    mux.HandleFunc("/health", healthHandler)
    mux.HandleFunc("/identity", identityHandler)
    return mux
}
```

Test harness:
```go
func hit(mux *http.ServeMux, method, path, agent string) {
    req := httptest.NewRequest(method, path, nil)
    if agent != "" {
        req.Header.Set("X-Agent", agent)
    }
    rec := httptest.NewRecorder()
    mux.ServeHTTP(rec, req)
    fmt.Printf("%s %s -> %d %s\n", method, path, rec.Code, strings.TrimSpace(rec.Body.String()))
}

func main() {
    mux := newDeadDrop()
    hit(mux, "GET", "/health", "")
    hit(mux, "GET", "/identity", "ECHO-4")
    hit(mux, "GET", "/identity", "")
    hit(mux, "GET", "/vault", "")
    fmt.Println("dead drop verified — safe to open the port")
}
```

Expected output:
```
GET /health -> 200 SIGNAL ALIVE
GET /identity -> 200 AGENT: ECHO-4
GET /identity -> 401 AGENT: UNKNOWN
GET /vault -> 404 404 page not found
dead drop verified — safe to open the port
```

The `/vault` probe is the point: the mux answers 404 for routes that don't exist. Unknown paths get nothing — exactly what a port-scanning stranger should see.

### Acceptance Criteria

- `healthHandler` and `identityHandler` have the exact handler signature `(w http.ResponseWriter, r *http.Request)`
- Handlers write bodies with `fmt.Fprint`/`fmt.Fprintf` (or `w.Write`) — no `fmt.Println` to stdout
- `identityHandler` reads the header via `r.Header.Get("X-Agent")` and handles the missing case
- `w.WriteHeader(http.StatusUnauthorized)` is called **before** the body on the 401 path
- `newDeadDrop` uses `http.NewServeMux()` + `mux.HandleFunc` and **returns** the mux (no `ListenAndServe` inside — harness must be able to drive it)
- No hardcoded harness output — handlers must produce responses from the request data

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (healthHandler):** 90 base, +45 first-try
- **Step 2 (identityHandler):** 100 base, +50 first-try
- **Step 3 (newDeadDrop):** 120 base, +60 first-try
- **Par time:** 180s total

Level timer: 420s, gameOverOnExpiry: **true**.

## Hints

### Step 1
1. "the signature is fixed: `func healthHandler(w http.ResponseWriter, r *http.Request)`. w is where the response goes." (−5 energy)
2. "`http.ResponseWriter` is an `io.Writer`. the same `fmt.Fprint` you know already works on it." (−8 energy)
3. "one line inside: `fmt.Fprint(w, \"SIGNAL ALIVE\")`. first write auto-sends status 200." (−12 energy)

### Step 2
1. "`r.Header.Get(\"X-Agent\")` returns the value, or `\"\"` if the header isn't there. no error to check." (−5 energy)
2. "status before body. `w.WriteHeader(http.StatusUnauthorized)` first — if you write the body first, 200 is already locked in." (−8 energy)
3. "empty check, then: `w.WriteHeader(http.StatusUnauthorized); fmt.Fprint(w, \"AGENT: UNKNOWN\"); return` — else `fmt.Fprintf(w, \"AGENT: %s\", agent)`." (−12 energy)

### Step 3
1. "`mux := http.NewServeMux()` makes the routing table. `mux.HandleFunc(\"/health\", healthHandler)` fills it." (−8 energy)
2. "register both routes, `return mux`. don't call ListenAndServe — the harness drives the mux directly with fake requests." (−12 energy)
3. "three lines: `mux := http.NewServeMux()`, two `mux.HandleFunc(...)` calls, `return mux`. HandleFunc is sugar for `Handle(path, http.HandlerFunc(f))`." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+12s | System message: "INBOUND ICMP — UNKNOWN ORIGIN — LOGGED" — a ping from an unknown IP. Friend or foe? |
| T+40s | Maya message: "someone pinged the subnet before we even have a port open. we test everything cold before i flip that switch." |
| T+90s | Reeves message: "NEXUS sweeps this block for listeners on a schedule. The handlers must be provably correct first." |
| T+150s | System message: "PORT SCAN DETECTED — 22, 80, 443, 4433 — NO RESPONSE SENT" |
| T+210s | Rush Mode — "Scanner Returning for Second Pass" |
| T+300s | GHOST broadcast: "I DO NOT NEED A DOOR. I AM THE STREET." |

## Rush Mode

- **Duration:** 60 seconds
- **Speed bonus:** Up to +80 XP
- **On expiry:** Jeopardy — Signal Scramble (the scanner fingerprints the rig; editor text scrambles for 5s while Maya rotates the MAC address)

## Twist

After step 3 passes, Maya opens the port. The first real request arrives in under a minute — a clean `GET /identity`. The dead drop answers exactly as built. Then she reads the header.

### Twist Display

> `> port 4433 open. listening.`
> `> inbound request: GET /identity`
> `> X-Agent: KIRA`
> `> 200 AGENT: KIRA`
> `> maya: ...she's alive.`
> `> maya: and she already knows where we are.`

## UI State

- **Location label:** SAFE HOUSE · BASEMENT SERVER
- **Concept label:** net/http · Handlers · ServeMux · httptest
- **Visual state:** New Part II palette — warmer basement amber over the terminal green; rack LEDs blink in the scene header; a PORT: CLOSED badge in the top bar flips to OPEN on chapter completion
- **Audio:** facility-hum ambient (the rig), dark-drone-1 under timed events, warning-beep on the port-scan event, terminal-beep on the twist ping
- **Tone shift:** Maya isn't whispering anymore. Still max 2 sentences, but steadier — the safe house is hers.

## Teaching Notes

### The handler signature is the whole framework

Go's standard library IS the web framework. One function shape — `func(w http.ResponseWriter, r *http.Request)` — and two ideas (a writer and a request) cover everything from this chapter to ch24's capstone. Players should leave knowing that `w` is an `io.Writer` (callback to `fmt.Fprintf` from Part I) and that `r` is just a struct they can read fields off, like every struct since ch05.

### httptest is the fiction, not a workaround

The engine can't open real sockets — but neither can Maya, and for the same reason: something hostile is watching the network. `httptest.NewRequest` + `NewRecorder` is exactly how production Go engineers unit-test handlers, so the game constraint, the story constraint, and the real-world idiom are the same thing. `ListenAndServe` is shown as the one-line switch that gets flipped *after* verification — which is the professional deployment posture anyway.

### WriteHeader ordering

The 401 path in step 2 exists to teach the implicit-200 rule: the first body write commits the status. Zen rules should reward calling `WriteHeader` before `Fprint` and flag the reversed order even when the output accidentally looks right.

### Interface payoff (composition callback)

`http.HandlerFunc` is the ch06 interface lesson made concrete: a named function type with a `ServeHTTP` method, adapting plain functions into the `http.Handler` interface. Players don't need to write the adapter — but the teaching moment in step 3 names it, because ch19's middleware (and this act's boss) is built entirely out of wrapping `http.Handler`s.

### Difficulty posture

Act VI is a tonal reset, not a difficulty reset. Players arrive fluent in functions, structs, interfaces, errors, and concurrency — so no hand-holding on syntax, and the timer (420s, game over on expiry) stays at late-Part-I pressure. The threat just changed shape: port scans instead of boots in the corridor.
