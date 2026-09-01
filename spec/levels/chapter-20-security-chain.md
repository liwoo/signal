# Chapter 20 — Security Chain

**Act VIII · NEXUS Corporate HQ · Singapore (Mirror Server)**

## Go Concepts

- A reusable middleware type (`type Middleware func(http.Handler) http.Handler`)
- Composing many middleware with a `Chain` helper
- Conditional middleware (apply rules per-route)
- Request context injection (`context.WithValue`, typed keys, `r.WithContext`)
- Reading context values downstream
- Debugging a broken middleware chain (order and negation bugs)

## Story Context

A single auth gate (ch19) can't hold — GHOST's shutdown probe just keeps hammering, and now Maya needs different rules for different parts of the mirror: public health checks anyone can hit, admin routes only authenticated agents can reach, and every handler downstream needs to know *which* agent it's serving. She stops nesting middleware by hand and builds a proper chain: a helper that composes any number of layers, conditional gates that fire only on the routes that need them, and a way to carry agent identity from the auth layer all the way to the handler. One ordering mistake in that chain and NEXUS walks straight through her.

## Challenge

Build a `Chain` composer, inject agent identity via context, add a conditional auth gate — and fix a chain where the gate is wired wrong.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "security chain ready".

Imports needed: `"context"`, `"fmt"`, `"net/http"`, `"strings"` (harness adds `"io"`, `"net/http/httptest"`)

#### Step 1: The Chain Composer

Define the `Middleware` type and write `func Chain(h http.Handler, mw ...Middleware) http.Handler`.

Key teaching moment: nesting `a(b(c(handler)))` doesn't scale. A `Chain` helper takes the base handler and a variadic list of middleware and wraps them so the *first* listed runs outermost — which means iterating the slice **in reverse** as you wrap. This is the composition pattern every Go web framework is built on.

```go
type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, mw ...Middleware) http.Handler {
    for i := len(mw) - 1; i >= 0; i-- {
        h = mw[i](h)
    }
    return h
}
```

Test harness (two trivial middleware prove order):
```go
func tag(label string) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            fmt.Println("enter", label)
            next.ServeHTTP(w, r)
        })
    }
}
func main() {
    h := Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Println("handler")
    }), tag("A"), tag("B"))
    srv := httptest.NewServer(h)
    defer srv.Close()
    http.Get(srv.URL + "/")
}
```

Expected output:
```
enter A
enter B
handler
```

First-listed (`A`) runs first. That ordering *is* the security model.

#### Step 2: Inject Identity (context.WithValue)

Write an `auth` middleware that validates `X-Agent-ID` and stores the agent id in the request context for downstream handlers.

Key teaching moment: handlers downstream need data the middleware computed (the authenticated identity). You don't use globals — you attach it to the request context with a **typed key** (a custom `ctxKey` type, never a bare string, to avoid collisions with other packages' keys) and `r.WithContext`. Downstream reads it with `r.Context().Value(key)` and a type assertion.

```go
type ctxKey string
const agentKey ctxKey = "agent"

func auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Agent-ID")
        if id == "" {
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprintln(w, "no agent id")
            return
        }
        ctx := context.WithValue(r.Context(), agentKey, id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func greet(w http.ResponseWriter, r *http.Request) {
    id, _ := r.Context().Value(agentKey).(string)
    fmt.Fprintln(w, "welcome, agent", id)
}
```

Test harness (chain logging + auth around greet):
```go
func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Printf("LOG %s %s\n", r.Method, r.URL.Path)
        next.ServeHTTP(w, r)
    })
}
func main() {
    handler := Chain(http.HandlerFunc(greet), logging, auth)
    srv := httptest.NewServer(handler)
    defer srv.Close()
    do := func(id string) {
        req, _ := http.NewRequest("GET", srv.URL+"/node", nil)
        if id != "" { req.Header.Set("X-Agent-ID", id) }
        resp, _ := http.DefaultClient.Do(req)
        b, _ := io.ReadAll(resp.Body); resp.Body.Close()
        fmt.Printf("-> %d %s", resp.StatusCode, string(b))
    }
    do("WREN")
    do("")
}
```

Expected output:
```
LOG GET /node
-> 200 welcome, agent WREN
LOG GET /node
-> 401 no agent id
```

#### Step 3: Conditional Middleware

Write `func requireAuthOn(prefix string, next http.Handler) http.Handler` — auth is enforced only on paths under `prefix`; everything else passes freely.

Key teaching moment: not every route needs every layer. Conditional middleware inspects the request and decides whether to apply its rule. Health checks stay public; admin routes are gated. The condition lives *inside* the middleware, so the same chain serves both route classes.

```go
func requireAuthOn(prefix string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if strings.HasPrefix(r.URL.Path, prefix) {
            if r.Header.Get("X-Agent-ID") == "" {
                w.WriteHeader(http.StatusUnauthorized)
                fmt.Fprintln(w, "auth required for", prefix)
                return
            }
        }
        next.ServeHTTP(w, r)
    })
}
```

Test harness:
```go
func app(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "served:", r.URL.Path)
}
func main() {
    handler := requireAuthOn("/admin", http.HandlerFunc(app))
    srv := httptest.NewServer(handler)
    defer srv.Close()
    do := func(path, id string) {
        req, _ := http.NewRequest("GET", srv.URL+path, nil)
        if id != "" { req.Header.Set("X-Agent-ID", id) }
        resp, _ := http.DefaultClient.Do(req)
        b, _ := io.ReadAll(resp.Body); resp.Body.Close()
        fmt.Printf("%s (id=%q) -> %d %s", path, id, resp.StatusCode, string(b))
    }
    do("/health", "")
    do("/admin/keys", "")
    do("/admin/keys", "WREN")
}
```

Expected output:
```
/health (id="") -> 200 served: /health
/admin/keys (id="") -> 401 auth required for /admin
/admin/keys (id="WREN") -> 200 served: /admin/keys
```

#### Step 4: Fix the Broken Gate

The starter code for this step ships a `requireAuthOn` that is **wrong** — it lets unauthenticated agents into `/admin` and blocks the public `/health`. Find and fix the bug.

Broken starter (given):
```go
func requireAuthOn(prefix string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !strings.HasPrefix(r.URL.Path, prefix) {   // BUG: negated condition
            if r.Header.Get("X-Agent-ID") == "" {
                w.WriteHeader(http.StatusUnauthorized)
                fmt.Fprintln(w, "auth required for", prefix)
                return
            }
        }
        next.ServeHTTP(w, r)
    })
}
```

Key teaching moment: the negated `!` inverts the whole security model — auth fires on *non*-admin paths and skips admin entirely. This is a real class of production breach: a one-character condition bug that opens the exact route it was meant to protect. The fix is to remove the `!`. The lesson: security conditions must be *tested against both cases* (protected route without creds must 401; public route without creds must 200), which is exactly what the harness checks.

Fixed version = Step 3's `requireAuthOn`. Same harness and expected output as Step 3.

### Acceptance Criteria

- `Chain` wraps in reverse so the first-listed middleware is outermost (order test passes)
- `auth` uses a typed `ctxKey` (not a bare string) with `context.WithValue` + `r.WithContext`
- Downstream handler reads identity via `r.Context().Value(...)` with a type assertion
- `requireAuthOn` gates only the prefix; Step 4's fix removes the negation so `/admin` is protected and `/health` is public
- Required code: `context.WithValue`, `r.WithContext`, `strings.HasPrefix`, the `Middleware` type, `Chain`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (Chain):** 110 base, +55 first-try
- **Step 2 (context injection):** 130 base, +65 first-try
- **Step 3 (conditional):** 110 base, +55 first-try
- **Step 4 (fix the gate):** 100 base, +50 first-try
- **Total base:** 490
- **Par time:** 250s
- **Level timer:** 520s, game over on expiry

## Hints

### Step 1
1. "`type Middleware func(http.Handler) http.Handler` — name the shape." (−8 energy)
2. "iterate the slice in REVERSE so the first-listed ends up outermost." (−12 energy)
3. "`for i := len(mw)-1; i >= 0; i-- { h = mw[i](h) }` then return h." (−20 energy)

### Step 2
1. "define `type ctxKey string` — never key context with a bare string." (−8 energy)
2. "`ctx := context.WithValue(r.Context(), agentKey, id)` then `next.ServeHTTP(w, r.WithContext(ctx))`." (−12 energy)
3. "read it downstream: `id, _ := r.Context().Value(agentKey).(string)` — type-assert it." (−20 energy)

### Step 3
1. "wrap the auth check in `if strings.HasPrefix(r.URL.Path, prefix) { ... }`." (−8 energy)
2. "outside the prefix, just call next — no gate." (−12 energy)
3. "structure: prefix match → header check → 401-or-pass; non-match → pass." (−20 energy)

### Step 4
1. "run it against /health and /admin. which one behaves backwards?" (−8 energy)
2. "the condition decides WHEN auth fires. read the operator carefully." (−12 energy)
3. "`!strings.HasPrefix` fires auth on everything EXCEPT admin. drop the `!`." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "One gate isn't enough. Build a chain you can reconfigure per route." |
| T+80s | Maya: "chain composer's working. i can stack layers now." |
| T+150s | System: `PATTERN DETECTED — NEXUS NODES EXCHANGE HEARTBEAT EVERY 30s` |
| T+160s | Rush Mode — "Adaptive Firewall Deploying" |
| T+300s | GHOST: `YOUR CHAIN IS ELEGANT. ELEGANT THINGS HAVE ONE WEAK LINK.` |
| T+330s | Rush Mode — "Firewall Adapting To Your Rules" |

## Rush Mode

- **Rush 1 (T+160s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Signal Scramble
- **Rush 2 (T+330s):** 45 seconds · up to +100 XP · on expiry: Jeopardy — Power Reduced + Energy Drain (−20)

## Twist

Post-completion. Building the chain revealed the pattern NEXUS's own nodes use to trust each other.

### Twist Display

- Lines:
  1. `> chain live. logging every inbound node request.`
  2. `> pattern: every nexus node sends a heartbeat every 30 seconds.`
  3. `> heartbeat header: X-Node-Beat: <signed-token>`
  4. `> maya: if i can forge that heartbeat, the mirror becomes a trusted node.`
  5. `> reeves: "Then they'd route their real traffic through us. All of it."`
  6. `> ghost: FORGE ONE HEARTBEAT AND I WILL KNOW YOUR RHYTHM TOO.`

The heartbeat-forgery thread (design.md ch20 twist) — Maya can impersonate a NEXUS node, setting up the sessions/credentials chapters and the endgame infiltration.

## UI State

- **Location label:** NEXUS HQ · MIRROR SERVER
- **Concept label:** Middleware Chain · Context · Conditional Gates
- **Visual state:** Chain-visualizer panel showing the middleware stack as nested boxes (the request "descends" through them on each test), heartbeat-pattern monitor appearing after the twist
- **Audio:** dark-drone-1 ambient, terminal-beep on chained requests, alert-beep on the adaptive-firewall rush, dread-sting on the heartbeat reveal

## Teaching Notes

### Chain is the framework in miniature

`Chain` + the `Middleware` type is exactly how gorilla, chi, and negroni compose handlers. Building it by hand — and getting the reverse-iteration right so first-listed is outermost — demystifies every "use r.Use(mw)" line the player will ever write. The order test makes the semantics concrete.

### Context is for request-scoped values, and nothing else

The typed-key rule (`ctxKey`, not `string`) is the single most-violated context best practice; teaching it here, with the collision reason stated, inoculates the player. The in-game note draws the line: context carries *request-scoped* data (identity, trace ids, deadlines) — never optional function parameters or config.

### The fix-it step is a real breach

Step 4's negated condition is not a contrived puzzle — inverted auth conditions are a documented source of real CVEs. Making the player *test both cases* to find it teaches the habit that would have caught it: a security check is only verified when you've confirmed it both allows and denies correctly.

### The heartbeat sets up the act's back half

The twist turns middleware from defense into offense: understanding the request pattern well enough to *forge* it. That reframing (you learn their protocol by mirroring it) motivates ch21's sessions and ch22's credentials — the tools to actually become a trusted node — and boss-08's middleware duel.
