# Chapter 21 — Identity Lock

**Act VIII · NEXUS Corporate HQ · Singapore (Mirror Server)**

## Go Concepts

- Cookies (`http.SetCookie`, `r.Cookie`, `http.Cookie` fields)
- Server-side session storage (a session store, not client-trusted state)
- Session tokens as opaque handles
- Expiry and renewal (time-based, with an injectable clock for testability)
- `HttpOnly` cookies and why client state is never trusted
- Detecting a session that shouldn't exist (session fixation)

## Story Context

The heartbeat forgery from ch20 got the mirror recognized as a NEXUS node — but recognition isn't identity. To route agents through the mirror across many requests, Maya needs sessions: an agent logs in once, gets a token, and every later request is tied back to them server-side. She builds the session store the way it must be built — the cookie holds only an opaque token, all the real state lives on her server, and sessions expire. Then, mid-build, a session token appears in the store that Maya never issued. Someone else authenticated on her server. From inside NEXUS HQ.

## Challenge

Build a server-side session store with expiry, wire it to cookies over HTTP, and expose the rogue session that appears.

**Playground note:** production Go reaches for `gorilla/sessions`; this chapter builds the store by hand (a map behind a small API) so the *mechanism* is visible. Teaching Notes map each piece to its gorilla equivalent. Time is supplied by an injectable `now func() time.Time` so expiry is deterministic instead of wall-clock dependent.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "session store ready".

Imports needed: `"fmt"`, `"net/http"`, `"time"` (harness adds `"io"`, `"net/http/httptest"`, `"net/http/cookiejar"`)

#### Step 1: The Session Store

Define `Session` and `Store`, and write `Create`.

Key teaching moment: sessions live **server-side**. The store maps an opaque token → session data (agent id, expiry). The client only ever holds the token. Injecting `now func() time.Time` instead of calling `time.Now()` directly makes expiry testable — a real, widely-used technique for time-dependent code.

```go
type Session struct {
    AgentID string
    Expires time.Time
}

type Store struct {
    sessions map[string]Session
    now      func() time.Time
}

func NewStore(now func() time.Time) *Store {
    return &Store{sessions: map[string]Session{}, now: now}
}

func (s *Store) Create(token, agentID string, ttl time.Duration) {
    s.sessions[token] = Session{AgentID: agentID, Expires: s.now().Add(ttl)}
}
```

Test harness:
```go
func main() {
    clock := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
    store := NewStore(func() time.Time { return clock })
    store.Create("tok-abc", "WREN", 30*time.Minute)
    fmt.Println("sessions stored:", len(store.sessions))
    fmt.Println("agent for tok-abc:", store.sessions["tok-abc"].AgentID)
}
```

Expected output:
```
sessions stored: 1
agent for tok-abc: WREN
```

#### Step 2: Get With Expiry

Write `func (s *Store) Get(token string) (Session, bool)` — return the session if it exists and hasn't expired; delete and reject it otherwise.

Key teaching moment: a lookup isn't just a map read — an expired session must be treated as absent (and cleaned up). `s.now().Before(sess.Expires)` is the liveness check; negate it for "expired." Because `now` is injectable, the test can *advance the clock* and prove expiry without waiting.

```go
func (s *Store) Get(token string) (Session, bool) {
    sess, ok := s.sessions[token]
    if !ok {
        return Session{}, false
    }
    if !s.now().Before(sess.Expires) {
        delete(s.sessions, token)
        return Session{}, false
    }
    return sess, true
}
```

Test harness:
```go
func main() {
    clock := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
    store := NewStore(func() time.Time { return clock })
    store.Create("tok-abc", "WREN", 30*time.Minute)

    sess, ok := store.Get("tok-abc")
    fmt.Printf("at T+0: ok=%v agent=%s\n", ok, sess.AgentID)

    clock = clock.Add(45 * time.Minute)
    _, ok2 := store.Get("tok-abc")
    fmt.Printf("at T+45m: ok=%v\n", ok2)
}
```

Expected output:
```
at T+0: ok=true agent=WREN
at T+45m: ok=false
```

(The closure captures `clock` by reference through the surrounding scope; reassigning `clock` advances the store's clock. The engine's harness wires this exactly as shown.)

#### Step 3: Cookies Over HTTP

Write a `/login` handler that creates a session and sets the token as an `HttpOnly` cookie, and a `/whoami` handler that reads the cookie and returns the agent.

Key teaching moment: `http.SetCookie(w, &http.Cookie{...})` sends the token to the client; `r.Cookie("session")` reads it back. `HttpOnly: true` keeps JavaScript from reading the cookie (XSS defense — callback to ch15's escaping). The handler resolves cookie → token → session via the store; a missing or expired session is a `401`.

```go
func loginHandler(store *Store) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        store.Create("tok-xyz", "FERRYMAN", 30*time.Minute)
        http.SetCookie(w, &http.Cookie{Name: "session", Value: "tok-xyz", HttpOnly: true})
        fmt.Fprintln(w, "logged in")
    }
}

func whoamiHandler(store *Store) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        c, err := r.Cookie("session")
        if err != nil {
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprintln(w, "no session")
            return
        }
        sess, ok := store.Get(c.Value)
        if !ok {
            w.WriteHeader(http.StatusUnauthorized)
            fmt.Fprintln(w, "session expired")
            return
        }
        fmt.Fprintln(w, "you are", sess.AgentID)
    }
}
```

Test harness (a `cookiejar` client carries the cookie between requests):
```go
func main() {
    clock := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
    store := NewStore(func() time.Time { return clock })
    mux := http.NewServeMux()
    mux.HandleFunc("/login", loginHandler(store))
    mux.HandleFunc("/whoami", whoamiHandler(store))
    srv := httptest.NewServer(mux)
    defer srv.Close()

    jar, _ := cookiejar.New(nil)
    client := &http.Client{Jar: jar}
    r1, _ := client.Get(srv.URL + "/login")
    b1, _ := io.ReadAll(r1.Body); r1.Body.Close()
    fmt.Print("/login -> ", string(b1))
    r2, _ := client.Get(srv.URL + "/whoami")
    b2, _ := io.ReadAll(r2.Body); r2.Body.Close()
    fmt.Print("/whoami -> ", string(b2))
}
```

Expected output:
```
/login -> logged in
/whoami -> you are FERRYMAN
```

#### Step 4: The Rogue Session

Write `func (s *Store) Audit(known map[string]bool) []string` that returns every session token in the store that Maya didn't issue — sorted for a stable report.

Key teaching moment: the store is the source of truth, so it can be *audited*. A session token present in the store but absent from the set of tokens Maya's `/login` issued is a session someone created another way — the fingerprint of session fixation or a stolen server. Return the unknown tokens sorted (map iteration order is random — sort before reporting, the brief's determinism rule and ch16's lesson).

```go
func (s *Store) Audit(known map[string]bool) []string {
    var rogue []string
    for tok := range s.sessions {
        if !known[tok] {
            rogue = append(rogue, tok)
        }
    }
    sort.Strings(rogue)
    return rogue
}
```

(add `"sort"` to imports)

Test harness:
```go
func main() {
    clock := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
    store := NewStore(func() time.Time { return clock })
    store.Create("tok-xyz", "FERRYMAN", time.Hour) // Maya issued this
    store.Create("tok-999", "REEVES", time.Hour)   // Maya did NOT issue this
    known := map[string]bool{"tok-xyz": true}
    fmt.Println("rogue sessions:", store.Audit(known))
}
```

Expected output:
```
rogue sessions: [tok-999]
```

`tok-999` belongs to REEVES — a session Maya never created.

### Acceptance Criteria

- `Store` keeps sessions server-side (a map); the cookie carries only the token
- `now` is injected (no direct `time.Now()` in graded logic)
- `Get` treats an expired session as absent and deletes it
- Cookie set with `HttpOnly: true`; `/whoami` resolves cookie → store → agent or `401`
- `Audit` returns unknown tokens **sorted**
- Required code: `http.SetCookie`, `r.Cookie`, `context`/store lookups, `sort.Strings`, injected `now`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (store + Create):** 100 base, +50 first-try
- **Step 2 (Get + expiry):** 120 base, +60 first-try
- **Step 3 (cookies over HTTP):** 130 base, +65 first-try
- **Step 4 (audit rogue session):** 100 base, +50 first-try
- **Total base:** 490
- **Par time:** 250s
- **Level timer:** 530s, game over on expiry

## Hints

### Step 1
1. "store maps token → Session{AgentID, Expires}. the client never sees the struct." (−8 energy)
2. "take `now func() time.Time` in the constructor — don't call time.Now() directly." (−12 energy)
3. "`Expires: s.now().Add(ttl)` — expiry is set at creation from the injected clock." (−20 energy)

### Step 2
1. "map read first: `sess, ok := s.sessions[token]`; missing → false." (−8 energy)
2. "liveness: `s.now().Before(sess.Expires)`. if NOT before, it's expired." (−12 energy)
3. "delete the expired entry and return false — an expired session must read as absent." (−20 energy)

### Step 3
1. "`http.SetCookie(w, &http.Cookie{Name:\"session\", Value: token, HttpOnly: true})`." (−12 energy)
2. "read it back with `r.Cookie(\"session\")` — returns `(*Cookie, error)`." (−16 energy)
3. "resolve cookie.Value through store.Get; not-ok → 401. no session → 401." (−20 energy)

### Step 4
1. "loop `s.sessions`, collect tokens not in the `known` set." (−8 energy)
2. "`known[tok]` is false for anything you didn't issue — those are rogue." (−12 energy)
3. "`sort.Strings(rogue)` before returning — map order is random, the report must be stable." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "The mirror's a trusted node now. Give the agents real sessions — server-side, expiring." |
| T+90s | Maya: "sessions working. login sets a cookie, whoami resolves it. clean." |
| T+150s | System: `SESSION STORE — 1 TOKEN NOT ISSUED BY THIS SERVER` |
| T+160s | Rush Mode — "Unknown Session Active" |
| T+300s | GHOST: `SOMEONE ELSE HAS A KEY TO YOUR SERVER. GUESS WHO LET THEM IN.` |
| T+340s | Rush Mode — "Audit Before They Renew It" |

## Rush Mode

- **Rush 1 (T+160s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Signal Scramble
- **Rush 2 (T+340s):** 45 seconds · up to +100 XP · on expiry: Jeopardy — Energy Drain (−20) + Hint Burned

## Twist

Post-completion. The audit names the rogue session's owner.

### Twist Display

- Lines:
  1. `> audit complete. 1 rogue session in the store.`
  2. `> token: tok-999 · agent: "REEVES, E."`
  3. `> origin ip: nexus-hq.sg — INSIDE the building.`
  4. `> maya: reeves. you're logged into my server. from inside nexus HQ.`
  5. `> reeves (delayed): "...Maya. I went in. I'm sorry. I couldn't tell you before now."`
  6. `> reeves: "I have the server room. But I'm not getting out the way I came."`
  7. `> ghost: NOW YOU BOTH SEE HER. ACTIVE ASSET. AS I ALWAYS SAID.`

The design.md ch21 twist detonated: Reeves is physically inside NEXUS HQ (Singapore), tying the "ACTIVE ASSET" thread (ch16/boss-07) to her going in alone — and reframing GHOST's earlier taunts.

## UI State

- **Location label:** NEXUS HQ · MIRROR SERVER
- **Concept label:** Sessions · Cookies · Expiry · Audit
- **Visual state:** Session-store table beside the editor (token · agent · expiry countdown), the rogue `tok-999` row pulsing red after the twist, cookie inspector on the request feed
- **Audio:** dark-drone-2 ambient, keypad-beep on logins, warning-beep on the rogue session, heartbeat-slow under the Reeves reveal, dread-sting on GHOST's line

## Teaching Notes

### Server-authoritative state, the whole point

The chapter's spine is: *never trust the client with anything but an opaque handle.* The cookie holds a token; every meaningful fact lives in the store. This is the correct mental model that prevents an entire class of auth bugs (client-side privilege in a cookie/JWT-body). Naming it explicitly matters more than the syntax.

### Injectable clocks are a testing superpower

`now func() time.Time` is a technique the player will reuse forever: anything time-dependent becomes deterministically testable by injecting the clock. The harness *advancing* the clock to prove expiry (rather than sleeping 45 minutes) is the lesson demonstrated, not just described.

### HttpOnly closes the ch15 loop

ch15 escaped a `<script>` so it couldn't run; ch21 marks the cookie `HttpOnly` so that even if a script *did* run, it couldn't steal the session. Two chapters, two halves of XSS defense — the player sees the layered picture.

### Audit as the reveal mechanism

Consistent with the game's habit (Volkov via a struct, NIGHTJAR via a rendered row), the biggest character beat of the act — Reeves inside NEXUS — surfaces through *the player's own diagnostic code*. The rogue-session audit isn't a cutscene; it's the function the player just wrote returning a name they didn't expect. gorilla/sessions is cited as the production tool, but building the store by hand is what makes this reveal land through code.
