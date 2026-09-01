# Chapter 14 — Route Map

**Act VI · Safe House · Basement Server Room**

## Go Concepts

- `gorilla/mux`: `mux.NewRouter()`, `r.HandleFunc(...).Methods(...)`
- Named path variables: `/agent/{id}` + `mux.Vars(r)["id"]`
- Method-based routing (POST / GET / DELETE on REST-style resources)
- 404 (no such route) vs 405 (route exists, wrong method) — and why the difference matters
- `http.Error` for status + message in one call
- `encoding/json`: `json.NewEncoder(w).Encode` (callback to ch11's JSON)
- In-memory state with a map (callback to ch04) behind HTTP handlers

## Story Context

The dead drop answers pings — but Kira's arrival proved one route can't run a network. Agents in six cities need real operations: check in (`POST`), read their status (`GET`), and — if NEXUS closes in — a kill switch (`DELETE`) that burns their identity from the roster before it can be seized. One URL per agent, verb decides the operation. The stdlib `ServeMux` can't split by method or read `{id}` out of a path; `gorilla/mux` can. And precision matters now: an unregistered path must look like nothing (`404`), while a wrong verb on a real route must refuse without explaining itself (`405`). NEXUS's route scanner is already walking the subnet, cataloguing every endpoint that answers.

## Challenge

Build the agent operations router: check-in, status, and burn endpoints keyed by `{id}` path variables, restricted by HTTP method, verified through `httptest` before the scanner finds an opening.

**Note:** each step's harness runs a fresh program — the `agents` map starts empty on every run. The harness performs its own check-ins; no state carries over between steps.

### Steps

#### Step 0: Scaffold

Same as always — `package main`, `import`, `func main()`, print "route table loading".

Imports for this chapter: `"fmt"` now; `"net/http"` and `"github.com/gorilla/mux"` arrive in step 1, `"encoding/json"` in step 2. Harnesses use `"net/http/httptest"` and `"strings"`.

Reference declarations given in the scaffold (the roster the routes will manage):

```go
// The roster — package-level state, one entry per living agent.
var agents = map[string]string{}
```

#### Step 1: Check-In (POST + path variables)

Write `func checkinHandler(w http.ResponseWriter, r *http.Request)` that reads the agent ID from the path via `mux.Vars(r)["id"]`, stores `agents[id] = "ACTIVE"`, sets status `201`, and responds `CHECKED IN: <id>`. Then write `func newRouter() *mux.Router` that registers it: `r.HandleFunc("/agent/{id}/checkin", checkinHandler).Methods("POST")`.

Key teaching moment: `{id}` in the route pattern is a named path variable — the router captures whatever sits in that URL segment and hands it to the handler through `mux.Vars(r)`, a plain `map[string]string` (the ch04 map idiom, again). `201 Created` is the correct verb-result for making a new resource; `.Methods("POST")` means this route simply does not exist for other verbs. Same constructor-returns-router shape as ch13's `newDeadDrop` — testable by design.

```go
func checkinHandler(w http.ResponseWriter, r *http.Request) {
    id := mux.Vars(r)["id"]
    agents[id] = "ACTIVE"
    w.WriteHeader(http.StatusCreated)
    fmt.Fprintf(w, "CHECKED IN: %s", id)
}

func newRouter() *mux.Router {
    r := mux.NewRouter()
    r.HandleFunc("/agent/{id}/checkin", checkinHandler).Methods("POST")
    return r
}
```

Test harness:
```go
func main() {
    router := newRouter()
    for _, id := range []string{"K7", "ECHO-4"} {
        req := httptest.NewRequest("POST", "/agent/"+id+"/checkin", nil)
        rec := httptest.NewRecorder()
        router.ServeHTTP(rec, req)
        fmt.Printf("%d %s\n", rec.Code, rec.Body.String())
    }
    fmt.Println("roster:", len(agents), "active")
}
```

Expected output:
```
201 CHECKED IN: K7
201 CHECKED IN: ECHO-4
roster: 2 active
```

#### Step 2: Status (GET + JSON + 404)

Write `func statusHandler(w http.ResponseWriter, r *http.Request)` that looks up the agent in the map. Unknown agent → `http.Error(w, "AGENT NOT FOUND", http.StatusNotFound)`. Known agent → set `Content-Type: application/json` and encode `map[string]string{"id": id, "status": status}` with `json.NewEncoder(w).Encode`. Register it in `newRouter` as `GET /agent/{id}/status`.

Key teaching moment: the comma-ok lookup (`status, ok := agents[id]`) becomes an HTTP contract — `ok == false` IS the 404. `http.Error` is the two-in-one idiom: status code plus plaintext body plus early `return`. `json.NewEncoder(w)` streams JSON straight into the response writer — no intermediate string (ch11 marshalled to bytes; this is the writer-native version). Encoding a map keeps keys sorted, so output is deterministic.

```go
func statusHandler(w http.ResponseWriter, r *http.Request) {
    id := mux.Vars(r)["id"]
    status, ok := agents[id]
    if !ok {
        http.Error(w, "AGENT NOT FOUND", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"id": id, "status": status})
}
```

Test harness (includes the `send` helper used from here on):
```go
func send(router *mux.Router, method, path string) {
    req := httptest.NewRequest(method, path, nil)
    rec := httptest.NewRecorder()
    router.ServeHTTP(rec, req)
    fmt.Printf("%s %s -> %d %s\n", method, path, rec.Code, strings.TrimSpace(rec.Body.String()))
}

func main() {
    router := newRouter()
    send(router, "POST", "/agent/K7/checkin")
    send(router, "GET", "/agent/K7/status")
    send(router, "GET", "/agent/PHANTOM/status")
}
```

Expected output:
```
POST /agent/K7/checkin -> 201 CHECKED IN: K7
GET /agent/K7/status -> 200 {"id":"K7","status":"ACTIVE"}
GET /agent/PHANTOM/status -> 404 AGENT NOT FOUND
```

#### Step 3: The Kill Switch (DELETE)

Write `func burnHandler(w http.ResponseWriter, r *http.Request)` that deletes the agent from the map and responds `BURNED: <id>`. Register it as `DELETE /agent/{id}` in `newRouter`.

Key teaching moment: `delete(agents, id)` is safe even if the key is missing — burning twice is a no-op, which is exactly the semantics a kill switch needs (idempotent DELETE, the REST convention). Note the route shape: `/agent/{id}` with no suffix. It can coexist with `/agent/{id}/status` because mux matches the full path — but it's the same URL a future `GET /agent/{id}` would use, distinguished purely by method. The verb is part of the address.

```go
func burnHandler(w http.ResponseWriter, r *http.Request) {
    id := mux.Vars(r)["id"]
    delete(agents, id)
    fmt.Fprintf(w, "BURNED: %s", id)
}
```

Test harness (`send` now prints `-` for empty bodies):
```go
func send(router *mux.Router, method, path string) {
    req := httptest.NewRequest(method, path, nil)
    rec := httptest.NewRecorder()
    router.ServeHTTP(rec, req)
    body := strings.TrimSpace(rec.Body.String())
    if body == "" {
        body = "-"
    }
    fmt.Printf("%s %s -> %d %s\n", method, path, rec.Code, body)
}

func main() {
    router := newRouter()
    send(router, "POST", "/agent/HAVEN-2/checkin")
    send(router, "GET", "/agent/HAVEN-2/status")
    send(router, "DELETE", "/agent/HAVEN-2")
    send(router, "GET", "/agent/HAVEN-2/status")
}
```

Expected output:
```
POST /agent/HAVEN-2/checkin -> 201 CHECKED IN: HAVEN-2
GET /agent/HAVEN-2/status -> 200 {"id":"HAVEN-2","status":"ACTIVE"}
DELETE /agent/HAVEN-2 -> 200 BURNED: HAVEN-2
GET /agent/HAVEN-2/status -> 404 AGENT NOT FOUND
```

The last line is the point: after the burn, HAVEN-2 doesn't exist. If NEXUS seizes the server one second later, there is nothing to find.

#### Step 4: Full Route Map (404 vs 405)

Write `func newAgentRouter() *mux.Router` — the production router: `GET /ping` (a one-line ch13-style health handler, `SIGNAL ALIVE`), plus all three agent routes from steps 1–3, every one locked to its method.

Key teaching moment: run the harness and read the two refusals carefully. `GET /vault` → `404 page not found`: the path means nothing, scanner learns nothing. `GET /agent/K7/checkin` → `405` with an empty body: mux found the route but the method is wrong — it refuses without a hint. A scanner that sees 405 knows a route exists there; that's why the real routes are the ones agents already know, and everything else must 404. Distinguishing the two codes is how you read a server's mind — and how you keep yours shut.

```go
func pingHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "SIGNAL ALIVE")
}

func newAgentRouter() *mux.Router {
    r := mux.NewRouter()
    r.HandleFunc("/ping", pingHandler).Methods("GET")
    r.HandleFunc("/agent/{id}/checkin", checkinHandler).Methods("POST")
    r.HandleFunc("/agent/{id}/status", statusHandler).Methods("GET")
    r.HandleFunc("/agent/{id}", burnHandler).Methods("DELETE")
    return r
}
```

Test harness (same `send` helper as step 3):
```go
func main() {
    router := newAgentRouter()
    send(router, "GET", "/ping")
    send(router, "POST", "/agent/K7/checkin")
    send(router, "GET", "/agent/K7/status")
    send(router, "GET", "/agent/K7/checkin")
    send(router, "GET", "/vault")
    send(router, "DELETE", "/agent/K7")
    send(router, "GET", "/agent/K7/status")
}
```

Expected output:
```
GET /ping -> 200 SIGNAL ALIVE
POST /agent/K7/checkin -> 201 CHECKED IN: K7
GET /agent/K7/status -> 200 {"id":"K7","status":"ACTIVE"}
GET /agent/K7/checkin -> 405 -
GET /vault -> 404 404 page not found
DELETE /agent/K7 -> 200 BURNED: K7
GET /agent/K7/status -> 404 AGENT NOT FOUND
```

### Acceptance Criteria

- Router built with `mux.NewRouter()`; routes registered via `r.HandleFunc(...).Methods(...)` — every route method-locked
- Path variables declared as `{id}` and read with `mux.Vars(r)["id"]` (no string-splitting the URL)
- `checkinHandler` writes `201` via `w.WriteHeader(http.StatusCreated)` before the body
- `statusHandler` uses the comma-ok map lookup; missing agent → `http.Error(..., http.StatusNotFound)`
- JSON produced by `json.NewEncoder(w).Encode` with `Content-Type` set (not hand-built strings)
- `burnHandler` uses `delete(agents, id)`
- `newAgentRouter` returns the router (no `ListenAndServe` in graded code)
- No hardcoded responses — IDs must come from `mux.Vars`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (check-in):** 90 base, +45 first-try
- **Step 2 (status + JSON):** 90 base, +45 first-try
- **Step 3 (kill switch):** 90 base, +45 first-try
- **Step 4 (full route map):** 90 base, +45 first-try
- **Par time:** 200s total

Level timer: 450s, gameOverOnExpiry: **true**.

## Hints

### Step 1
1. "`{id}` in the pattern captures that URL segment. `mux.Vars(r)` gives you a map of every captured variable." (−5 energy)
2. "`id := mux.Vars(r)[\"id\"]`, store `agents[id] = \"ACTIVE\"`, then `w.WriteHeader(http.StatusCreated)` before writing the body." (−8 energy)
3. "register with `r.HandleFunc(\"/agent/{id}/checkin\", checkinHandler).Methods(\"POST\")` inside newRouter, then `return r`." (−12 energy)

### Step 2
1. "comma-ok on the map: `status, ok := agents[id]`. no ok, no agent — that's your 404." (−5 energy)
2. "`http.Error(w, \"AGENT NOT FOUND\", http.StatusNotFound)` sets the status and body in one call. return right after." (−8 energy)
3. "happy path: `w.Header().Set(\"Content-Type\", \"application/json\")` then `json.NewEncoder(w).Encode(map[string]string{\"id\": id, \"status\": status})`." (−12 energy)

### Step 3
1. "`delete(agents, id)` removes the key. missing key? no-op, no panic — burn twice, nothing happens." (−8 energy)
2. "route is `/agent/{id}` — no suffix — locked to `.Methods(\"DELETE\")`. same path shape, different verb, different operation." (−12 energy)
3. "two lines in the handler: `delete(agents, id)` then `fmt.Fprintf(w, \"BURNED: %s\", id)`. register it and the 404-after-burn falls out of step 2's lookup." (−20 energy)

### Step 4
1. "one router, four routes, each `.Methods(...)`-locked. ping is a one-liner handler like ch13's health check." (−8 energy)
2. "404 means the path matched nothing. 405 means mux matched the path but not the verb — it sends an empty body on purpose." (−12 energy)
3. "assemble: ping GET, checkin POST, status GET, burn DELETE — then `return r`. the harness's wrong-verb probe should hit 405 without you writing anything extra." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+20s | System message: "ROUTE ENUMERATION ATTEMPT — /login /admin /api — ALL 404" — an unregistered agent is scanning the routes |
| T+60s | Maya message: "someone's walking our url space. every path that answers is a path they map." |
| T+110s | Rush Mode 1 — "Unregistered Agent Scanning Your Routes" |
| T+200s | Reeves message: "Kira's check-in used the old format. Whoever is scanning does not know the format. Yet." |
| T+280s | GHOST broadcast: "EVERY DOOR YOU BUILD, I WILL KNOCK ON. EVERY VERB. EVERY PATH." |
| T+320s | Rush Mode 2 — "Scanner Switching to Verb Probing" |

## Rush Mode

- **Rush 1 duration:** 55 seconds — **Speed bonus:** up to +60 XP — **On expiry:** Jeopardy — Energy Drain (−20 energy; the scanner forces a burst of decoy traffic Maya has to hand-filter)
- **Rush 2 duration:** 50 seconds — **Speed bonus:** up to +60 XP — **On expiry:** Jeopardy — Signal Scramble (verb probes flood the log; editor scrambles 5s)

## Twist

The route map goes live. Check-ins tick in from the network — ECHO-4, HAVEN-2, K7. Then the roster prints an entry nobody expected.

### Twist Display

> `> POST /agent/VASIK-PROXY/checkin -> 201`
> `> roster updated: VASIK-PROXY · ACTIVE`
> `> maya: that's not possible. he's in custody.`
> `> reeves: It is a proxy. Someone is running his credentials.`
> `> maya: ...or he's not as arrested as the news said.`
> `> reeves: Do not burn it. Watch what it asks for.`

## UI State

- **Location label:** SAFE HOUSE · ROUTE CONFIGURATION
- **Concept label:** gorilla/mux · Path Variables · Method Routing · 404 vs 405
- **Visual state:** Route table panel on the right listing registered routes as they're wired (method badge color-coded: POST amber, GET green, DELETE red); scanner probes flash grey 404 lines in the feed
- **Audio:** facility-hum ambient, keypad-beep per registered route, warning-beep on scanner events, dark-drone-2 under Rush 2

## Teaching Notes

### The verb is part of the address

The core lesson: REST routing means `DELETE /agent/K7` and `GET /agent/K7/status` are different operations on the same resource, disambiguated by method. Players wired one mux in ch13 where path was the only key; here the key is (path, method). Step 3 deliberately registers `/agent/{id}` bare so players see two routes share a prefix without conflict.

### 404 vs 405 is operational security AND correct HTTP

gorilla/mux gives the 405 for free once routes are `.Methods()`-locked — players write zero code for it, they just have to *predict it* in the harness output. The fiction (a scanner reading refusals) is exactly how real API reconnaissance works, so the lesson generalizes: a 405 leaks existence, a 404 leaks nothing. This distinction returns in ch19's middleware logging.

### Fresh state per run

Every harness run starts with an empty `agents` map — the engine compiles a fresh program per submission. That's why each harness does its own check-ins before reading status. Worth surfacing to players in Maya's step-2 chatter: "the harness seeds its own roster. cold start, every time." It preempts the "but I checked K7 in last step" confusion.

### Third-party modules, first contact

This is the first import outside the standard library. The playground fetches `github.com/gorilla/mux` automatically; teach that the import path IS the package identity. No `go.mod` ceremony in-game — but the teaching notes name it so the skill transfers.

### Composition callbacks

`mux.Vars` is a `map[string]string` (ch04), the status lookup is comma-ok (ch04), JSON encoding is ch11 pointed at a writer, and `newAgentRouter` is ch13's testable-constructor pattern grown to four routes. Zen rules should reward `http.Error` over hand-rolled `WriteHeader`+`Fprint` pairs on error paths, and flag any handler that parses `r.URL.Path` by hand.
