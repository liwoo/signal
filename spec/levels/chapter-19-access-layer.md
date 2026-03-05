# Chapter 19 — Access Layer

**Act VIII · NEXUS Corporate HQ / Singapore**

## Go Concepts

- Basic middleware pattern (`func(http.Handler) http.Handler`)
- Handler wrapping
- Request logging (method, path, duration)
- `time.Since` for timing
- `http.Handler` interface

## Story Context

The evidence from Geneva points to NEXUS's corporate headquarters in Singapore. Their systems are layered with security middleware — every request passes through logging, authentication, rate limiting. To infiltrate, Maya must build a mirror of their security stack. First layer: logging.

## Challenge

Write a logging middleware that wraps any HTTP handler to record request method, path, and response time.

### Starter Code

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

// Write a logging middleware that:
// 1. Records the start time
// 2. Calls the next handler
// 3. Logs: METHOD PATH DURATION
//    e.g., "GET /ping 2.3ms"

// Then write an auth middleware that:
// 1. Checks for "X-API-Key" header
// 2. If missing or != "NEXUS-7291", return 401 Unauthorized
// 3. If valid, call the next handler

// Chain them: logging -> auth -> handler

func loggingMiddleware(next http.Handler) http.Handler {
    // TODO
}

func authMiddleware(next http.Handler) http.Handler {
    // TODO
}

func main() {
    finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "ACCESS GRANTED")
    })

    // TODO: chain middlewares and serve
    http.ListenAndServe(":8080", nil)
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    "time"
)

func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        key := r.Header.Get("X-API-Key")
        if key != "NEXUS-7291" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func main() {
    finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "ACCESS GRANTED")
    })

    chain := loggingMiddleware(authMiddleware(finalHandler))
    http.Handle("/", chain)
    http.ListenAndServe(":8080", nil)
}
```

### Acceptance Criteria

- `loggingMiddleware` returns `http.Handler`
- Wraps next handler with `http.HandlerFunc`
- Records time with `time.Now()` and `time.Since(start)`
- Calls `next.ServeHTTP(w, r)` to pass to next handler
- `authMiddleware` checks header and returns 401 on failure
- Middlewares are chained: `loggingMiddleware(authMiddleware(handler))`

## Timed Events

| Time | Event |
| --- | --- |
| T+8s | Logs show a request from `10.0.0.1` — NEXUS's internal gateway |
| T+10s | Rush Mode — "Firewall closing in 35 seconds" |

## Rush Mode

- **Duration:** 35 seconds
- **On expiry:** Jeopardy — Signal Scramble + Energy Drain (-15)

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 120s

## Hints

1. "middleware signature: `func(next http.Handler) http.Handler` — takes a handler, returns a handler." (-8 energy)
2. "`return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { ... })` — wrap the closure as a HandlerFunc." (-12 energy)
3. "chain by nesting: `loggingMiddleware(authMiddleware(finalHandler))` — logging runs first, auth second, handler last." (-20 energy)

## Twist (post-completion)

The logging middleware captures a request with header `X-Ghost-Cmd: SHUTDOWN`. GHOST is trying to kill Maya's mirror server.

### Twist Display

- Lines:
  1. `> middleware active. logging all requests.`
  2. `> captured: X-Ghost-Cmd: SHUTDOWN`
  3. `> source: 10.0.0.1 (NEXUS gateway)`
  4. `> maya: ghost is trying to shut us down.`
  5. `> maya: but now we can see everything it sends.`

## UI State

- **Location label:** NEXUS HQ · SECURITY MIRROR
- **Concept label:** Middleware · Handler Wrapping · Logging
