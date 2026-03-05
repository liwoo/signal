# Chapter 13 — First Server

**Act VI · Safe House / Basement Server Room**

## Go Concepts

- `net/http` package
- `http.HandleFunc`
- `http.ListenAndServe`
- Response writers and request objects

## Story Context

Part II begins. Maya and Dr. Reeves are at the safe house but the leaked files reveal Vasik was a contractor for NEXUS — a private intelligence consortium spanning 14 countries. GHOST sends a final broadcast: "You escaped the building. You haven't escaped the network." To fight back, Maya needs to build infrastructure. Step one: a covert HTTP server on the safe house's air-gapped machine. Allied agents need a way to check in.

## Challenge

Build a basic HTTP server with health check and agent identification endpoints.

### Starter Code

```go
package main

import (
    "fmt"
    "net/http"
)

// Build a server with two endpoints:
// GET /ping        -> responds with "SIGNAL ALIVE"
// GET /identity    -> responds with "AGENT: " + the value of the "X-Agent" header
//                     If no header, respond with "AGENT: UNKNOWN"

// Server should listen on port 8080

func main() {
    // TODO: register handlers
    // TODO: start server
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "net/http"
)

func pingHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "SIGNAL ALIVE")
}

func identityHandler(w http.ResponseWriter, r *http.Request) {
    agent := r.Header.Get("X-Agent")
    if agent == "" {
        agent = "UNKNOWN"
    }
    fmt.Fprintf(w, "AGENT: %s", agent)
}

func main() {
    http.HandleFunc("/ping", pingHandler)
    http.HandleFunc("/identity", identityHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Acceptance Criteria

- Uses `http.HandleFunc` to register at least 2 routes
- Calls `http.ListenAndServe` with a port
- `/ping` handler writes a response using `fmt.Fprint` or `w.Write`
- `/identity` handler reads a request header via `r.Header.Get`
- Handles the missing header case

## Timed Events

| Time | Event |
| --- | --- |
| T+12s | A ping from an unknown IP — chat message: "incoming connection..." |
| T+25s | Rush Mode — "Unknown scanner probing port 8080" |

## Rush Mode

- **Duration:** 40 seconds
- **On expiry:** Jeopardy — Signal Scramble

## XP

- **Base:** 250 XP
- **First-try bonus:** +125 XP
- **Par time:** 90s

## Hints

1. "`http.HandleFunc(\"/path\", handlerFunc)` registers a route. the handler takes `(w http.ResponseWriter, r *http.Request)`." (-8 energy)
2. "`r.Header.Get(\"X-Agent\")` reads a header value. returns empty string if not set." (-12 energy)
3. "`fmt.Fprint(w, \"text\")` writes to the response. `http.ListenAndServe(\":8080\", nil)` starts the server." (-20 energy)

## Twist (post-completion)

The ping contains a header: `X-Agent: KIRA`. She's still out there.

### Twist Display

- Lines:
  1. `> first ping received.`
  2. `> analyzing headers...`
  3. `> X-Agent: KIRA`
  4. `> maya: ...she's alive.`
  5. `> maya: and she knows where we are.`

## UI State

- **Location label:** SAFE HOUSE · BASEMENT SERVER
- **Concept label:** HTTP Server · Handlers · ListenAndServe
- **Tone shift:** Maya is no longer whispering. She's still cautious but speaks in full sentences. The safe house is hers.
- **New chat personality:** Maya's responses are slightly longer (3 sentences max in normal state). She's more confident.
