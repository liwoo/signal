# Chapter 14 — Route Map

**Act VI · Safe House / Basement Server Room**

## Go Concepts

- `gorilla/mux` router
- Named path parameters (`/agent/{id}`)
- Method-based routing (GET, POST, DELETE)
- Route-specific handlers

## Story Context

The basic server is up. Now Maya needs proper routing — different endpoints for different operations. Agents need to check in (POST), retrieve status (GET), and in emergencies, burn their identity (DELETE). The standard library's `http.ServeMux` isn't expressive enough. Time for `gorilla/mux`.

## Challenge

Build a REST-style router with named parameters and method-specific handlers for agent operations.

### Starter Code

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/gorilla/mux"
)

// Agents stored in memory
var agents = map[string]string{}

// Build routes:
// POST   /agent/{id}/checkin  -> store agent ID with status "ACTIVE", respond 201
// GET    /agent/{id}/status   -> return agent status as JSON {"id": "...", "status": "..."}
// DELETE /agent/{id}          -> remove agent, respond "BURNED"
// GET    /ping                -> "SIGNAL ALIVE"

func main() {
    r := mux.NewRouter()
    // TODO: register routes
    http.ListenAndServe(":8080", r)
}
```

### Expected Solution (reference)

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/gorilla/mux"
)

var agents = map[string]string{}

func checkinHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    agents[id] = "ACTIVE"
    w.WriteHeader(http.StatusCreated)
    fmt.Fprintf(w, "CHECKED IN: %s", id)
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    status, ok := agents[id]
    if !ok {
        http.Error(w, "AGENT NOT FOUND", http.StatusNotFound)
        return
    }
    json.NewEncoder(w).Encode(map[string]string{"id": id, "status": status})
}

func burnHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    delete(agents, id)
    fmt.Fprint(w, "BURNED")
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprint(w, "SIGNAL ALIVE")
    }).Methods("GET")
    r.HandleFunc("/agent/{id}/checkin", checkinHandler).Methods("POST")
    r.HandleFunc("/agent/{id}/status", statusHandler).Methods("GET")
    r.HandleFunc("/agent/{id}", burnHandler).Methods("DELETE")
    http.ListenAndServe(":8080", r)
}
```

### Acceptance Criteria

- Uses `mux.NewRouter()` from gorilla/mux
- Registers routes with `{id}` path parameter
- Uses `.Methods()` to restrict HTTP methods
- Extracts path parameters with `mux.Vars(r)`
- Returns appropriate status codes (201 for create, 404 for not found)
- DELETE handler removes the agent
- At least one endpoint returns JSON

## Timed Events

| Time | Event |
| --- | --- |
| T+20s | Rush Mode — "Unregistered agent scanning your routes" |

## Rush Mode

- **Duration:** 35 seconds
- **On expiry:** Jeopardy — Energy Drain (-20)

## XP

- **Base:** 300 XP
- **First-try bonus:** +150 XP
- **Par time:** 120s

## Hints

1. "`r.HandleFunc(\"/agent/{id}/status\", handler).Methods(\"GET\")` — path params in braces, method chained." (-8 energy)
2. "`vars := mux.Vars(r); id := vars[\"id\"]` extracts the named parameter from the URL." (-12 energy)
3. "for JSON: `w.Header().Set(\"Content-Type\", \"application/json\"); json.NewEncoder(w).Encode(data)`" (-20 energy)

## Twist (post-completion)

An agent checks in with ID `VASIK-PROXY`. Someone is using Vasik's credentials — or Vasik isn't as gone as they thought.

### Twist Display

- Lines:
  1. `> new agent check-in received.`
  2. `> agent ID: VASIK-PROXY`
  3. `> maya: that's not possible.`
  4. `> dr. reeves: it's a proxy. someone is using his credentials.`
  5. `> maya: ...or he's not as arrested as we thought.`

## UI State

- **Location label:** SAFE HOUSE · ROUTE CONFIGURATION
- **Concept label:** Routing · gorilla/mux · Named Parameters · REST
