# Chapter 19 — Access Layer

**Act VIII · NEXUS Corporate HQ · Singapore (Mirror Server)**

## Go Concepts

- The middleware pattern: `func(next http.Handler) http.Handler`
- Wrapping a handler (decorator over `http.Handler`)
- `http.HandlerFunc` adapter
- Logging middleware (observing every request)
- Auth middleware (gating on a header), `401 Unauthorized`
- Chaining two middleware by nesting

## Story Context

Singapore. Reeves' evidence points at NEXUS's own HQ, and Maya's plan is audacious: not break in, but build a *mirror* — a server that replicates NEXUS's security stack layer by layer, so their traffic routes through her and she can read it. Every NEXUS request passes through the same gauntlet: it's logged, authenticated, rate-limited, session-checked. To intercept them, Maya has to reconstruct that gauntlet. It starts with the two outermost layers — a logger that sees everything, and an auth gate that turns away anything without a valid key. GHOST is already probing the mirror; the log will show it arrive.

## Challenge

Build logging and auth middleware in the canonical `func(next http.Handler) http.Handler` shape, then chain them around the mirror handler.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "mirror server ready".

Imports needed: `"fmt"`, `"net/http"` (harness adds `"io"`, `"net/http/httptest"`)

#### Step 1: The Mirror Handler

Write the base handler `func mirror(w http.ResponseWriter, r *http.Request)` that the middleware will wrap.

Key teaching moment: middleware wraps *handlers*, so you need one to wrap. A plain `func(w, r)` becomes an `http.Handler` via `http.HandlerFunc(mirror)` — that adapter is the bridge between "a function" and "the Handler interface." Everything in this act is layers around this one handler.

```go
func mirror(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "mirror node: request served")
}
```

Test harness:
```go
func main() {
    srv := httptest.NewServer(http.HandlerFunc(mirror))
    defer srv.Close()
    resp, _ := http.Get(srv.URL + "/mirror")
    b, _ := io.ReadAll(resp.Body)
    fmt.Printf("-> %d %s", resp.StatusCode, string(b))
}
```

Expected output:
```
-> 200 mirror node: request served
```

#### Step 2: Logging Middleware

Write `func logging(next http.Handler) http.Handler` that logs method + path, then calls the next handler.

Key teaching moment: the middleware shape reads as "given the next handler, return a new handler that does something *and then* calls next." The returned `http.HandlerFunc` closes over `next`. Do your work (log), then `next.ServeHTTP(w, r)` — forgetting that call is the #1 middleware bug (the request silently dies). Log method + path only — no timestamp — so behavior is observable and deterministic.

```go
func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Printf("LOG %s %s\n", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}
```

Test harness:
```go
func main() {
    srv := httptest.NewServer(logging(http.HandlerFunc(mirror)))
    defer srv.Close()
    resp, _ := http.Get(srv.URL + "/mirror")
    b, _ := io.ReadAll(resp.Body)
    fmt.Printf("-> %d %s", resp.StatusCode, string(b))
}
```

Expected output:
```
LOG GET /mirror
-> 200 mirror node: request served
```

#### Step 3: Auth Middleware

Write `func auth(key string, next http.Handler) http.Handler` that rejects requests without the correct `X-API-Key` header (`401`), and passes valid ones through.

Key teaching moment: auth middleware is a *gate* — unlike logging, it can decide **not** to call next. On failure it writes its own response (`401 Unauthorized`) and returns without calling next; the wrapped handler never runs. Taking a `key` parameter shows middleware can be configured (a closure over config) rather than hardcoded.

```go
func auth(key string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.Header.Get("X-API-Key") != key {
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprintln(w, "denied")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

Test harness:
```go
func main() {
    srv := httptest.NewServer(auth("agent-key-42", http.HandlerFunc(mirror)))
    defer srv.Close()
    do := func(key string) {
        req, _ := http.NewRequest("GET", srv.URL+"/mirror", nil)
        if key != "" {
            req.Header.Set("X-API-Key", key)
        }
        resp, _ := http.DefaultClient.Do(req)
        b, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        fmt.Printf("-> %d %s", resp.StatusCode, string(b))
    }
    do("agent-key-42")
    do("wrong")
}
```

Expected output:
```
-> 200 mirror node: request served
-> 401 denied
```

#### Step 4: Chain Them

Wrap the mirror handler in both: logging on the outside, auth inside. Observe that the logger sees *every* request — even the ones auth rejects.

Key teaching moment: chaining is nesting — `logging(auth(key, handler))` runs logging first (outermost), then auth, then the handler. Order matters: logging outside means the log records rejected requests too (you want to see attackers get turned away). Reverse the order and rejected requests never reach the logger — a real observability gap.

```go
handler := logging(auth("agent-key-42", http.HandlerFunc(mirror)))
```

Test harness:
```go
func main() {
    handler := logging(auth("agent-key-42", http.HandlerFunc(mirror)))
    srv := httptest.NewServer(handler)
    defer srv.Close()
    do := func(key string) {
        req, _ := http.NewRequest("GET", srv.URL+"/mirror", nil)
        if key != "" {
            req.Header.Set("X-API-Key", key)
        }
        resp, _ := http.DefaultClient.Do(req)
        b, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        fmt.Printf("-> %d %s", resp.StatusCode, string(b))
    }
    do("agent-key-42")
    do("wrong")
}
```

Expected output:
```
LOG GET /mirror
-> 200 mirror node: request served
LOG GET /mirror
-> 401 denied
```

Both requests logged; only the keyed one served. The second `LOG` line is GHOST's probe getting turned away — and recorded.

### Acceptance Criteria

- `logging` and `auth` both have the `func(...) http.Handler` shape and return `http.HandlerFunc`
- `logging` calls `next.ServeHTTP`; `auth` calls it only on valid key, writes `401` otherwise
- Chained `logging(auth(...))` logs rejected requests (logging is outermost)
- Required code: `func(next http.Handler) http.Handler` shape, `http.HandlerFunc`, `next.ServeHTTP`, `http.StatusUnauthorized`, `r.Header.Get`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (mirror handler):** 80 base, +40 first-try
- **Step 2 (logging):** 110 base, +55 first-try
- **Step 3 (auth):** 120 base, +60 first-try
- **Step 4 (chain):** 110 base, +55 first-try
- **Total base:** 460
- **Par time:** 240s
- **Level timer:** 510s, game over on expiry

## Hints

### Step 1
1. "just a `func(w http.ResponseWriter, r *http.Request)` writing one line." (−5 energy)
2. "`fmt.Fprintln(w, ...)` writes to the response." (−8 energy)
3. "wrap it with `http.HandlerFunc(mirror)` to get an http.Handler." (−12 energy)

### Step 2
1. "shape: `func logging(next http.Handler) http.Handler { return http.HandlerFunc(func(w,r){...}) }`." (−8 energy)
2. "log, THEN `next.ServeHTTP(w, r)`. drop that call and the request dies silently." (−12 energy)
3. "`fmt.Printf(\"LOG %s %s\\n\", r.Method, r.URL.Path)` — no timestamp, keep it deterministic." (−20 energy)

### Step 3
1. "read the header: `r.Header.Get(\"X-API-Key\")` and compare to key." (−8 energy)
2. "on mismatch: `w.WriteHeader(http.StatusUnauthorized); return` — do NOT call next." (−12 energy)
3. "the `key` parameter lets the closure capture config — that's why auth takes it as an arg." (−20 energy)

### Step 4
1. "nest them: `logging(auth(key, http.HandlerFunc(mirror)))`." (−8 energy)
2. "outermost runs first. logging outside = it sees rejected requests too." (−12 energy)
3. "think about what you'd lose if auth were outside logging: no log line for attacks." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+8s | System: `INBOUND FROM 10.0.0.1 — NEXUS INTERNAL GATEWAY` |
| T+20s | Reeves: "They know something is mirroring them. Log everything. Trust nothing without a key." |
| T+90s | Maya: "logger's up. i can see their requests hitting the mirror." |
| T+150s | System: `LOG CAPTURE — HEADER: X-Ghost-Cmd: SHUTDOWN` |
| T+160s | Rush Mode — "GHOST Attempting Mirror Shutdown" |
| T+300s | GHOST: `YOUR LOG IS THOROUGH. IT WILL MAKE A COMPLETE RECORD OF YOUR FAILURE.` |
| T+310s | Rush Mode — "Firewall Closing" |

## Rush Mode

- **Rush 1 (T+160s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Signal Scramble (the SHUTDOWN command bleeds into the editor)
- **Rush 2 (T+310s):** 45 seconds · up to +100 XP · on expiry: Jeopardy — Power Reduced + Energy Drain (−20)

## Twist

Post-completion. The logging middleware catches a command aimed at killing the mirror.

### Twist Display

- Lines:
  1. `> log capture — inbound request:`
  2. `> GET /mirror · header: X-Ghost-Cmd: SHUTDOWN`
  3. `> auth rejected it. 401. but it keeps coming. every 8 seconds.`
  4. `> maya: ghost is trying to shut down my mirror with a header command.`
  5. `> reeves: "It's automated. And it's patient. We need more than a gate."`
  6. `> ghost: I HAVE ALL NIGHT. YOU HAVE UNTIL THE FIREWALL CLOSES.`

Sets up ch20's advanced middleware (the single gate isn't enough — Maya needs a configurable chain to handle GHOST's evolving probes).

## UI State

- **Location label:** NEXUS HQ · MIRROR SERVER
- **Concept label:** Middleware · Logging · Auth · Chaining
- **Visual state:** Live request-log panel scrolling beside the editor (rejected requests in amber, the X-Ghost-Cmd line in red), firewall-closing progress bar in the top bar
- **Audio:** dark-drone-1 ambient, terminal-beep on logged requests, alert-beep on the SHUTDOWN header, machinery hum under rush

## Teaching Notes

### The pattern, now built for real

boss-06 gave the player a middleware wrapper to fill in; ch18 had them write one guarding a file server. ch19 makes the pattern the explicit subject: build two, understand *why* the shape is `func(next) next`, and see the closure-over-config trick (`auth(key, ...)`). This is the foundation the entire act composes on.

### Logging observes, auth decides

The two middleware demonstrate the two fundamental middleware roles: pass-through observers (always call next) and gates (may not call next). Every real middleware is one or the other; naming the distinction here makes ch20's conditional middleware and boss-08's five buggy layers legible.

### Order matters, taught by consequence

Step 4 makes chain order a *visible* behavior difference (do rejected requests get logged?), not a rule to memorize. This is the exact reasoning boss-08's "wrong wrap order" bug will test — the player meets the concept as a design choice before meeting it as a planted bug.

### Determinism discipline

Logging method+path with no timestamp is a real-world compromise (you'd want a timestamp in production) made for gradeability — the in-game note says so, and points at Go's `log` package / structured logging as the production answer. Honest about the teaching simplification.
