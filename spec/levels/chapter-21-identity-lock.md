# Chapter 21 — Identity Lock

**Act VIII · NEXUS Corporate HQ / Singapore**

## Go Concepts

- `gorilla/sessions` package
- Cookie-based session management
- Server-side session stores
- Session creation, reading, saving
- Session expiry and renewal
- CSRF protection basics

## Story Context

Maya's agent network needs persistent identity — agents should stay logged in across requests without re-authenticating every time. She builds a session system with secure cookies. But she discovers that NEXUS's own session tokens contain embedded GPS coordinates — every logged-in operator is being tracked by their own system.

## Challenge

Build a session management system that creates, reads, and expires sessions for authenticated agents.

### Starter Code

```go
package main

import (
    "fmt"
    "net/http"

    "github.com/gorilla/sessions"
)

// Secret key for cookie encryption
var store = sessions.NewCookieStore([]byte("SIGNAL-SECRET-KEY-32BYTES-LONG!!"))

// Build:
// POST /login      -> create session with agentID and role, set max age to 3600
// GET  /dashboard  -> read session, greet agent by ID, show role
//                     If no session, redirect to /login
// POST /logout     -> destroy session (max age -1), redirect to /login

func loginHandler(w http.ResponseWriter, r *http.Request) {
    // TODO: create session
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
    // TODO: read session, check auth
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
    // TODO: destroy session
}

func main() {
    http.HandleFunc("/login", loginHandler)
    http.HandleFunc("/dashboard", dashboardHandler)
    http.HandleFunc("/logout", logoutHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "net/http"

    "github.com/gorilla/sessions"
)

var store = sessions.NewCookieStore([]byte("SIGNAL-SECRET-KEY-32BYTES-LONG!!"))

func loginHandler(w http.ResponseWriter, r *http.Request) {
    session, _ := store.Get(r, "signal-session")
    session.Values["agentID"] = r.FormValue("agentID")
    session.Values["role"] = "agent"
    session.Options.MaxAge = 3600
    session.Save(r, w)
    http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
    session, _ := store.Get(r, "signal-session")
    agentID, ok := session.Values["agentID"].(string)
    if !ok || agentID == "" {
        http.Redirect(w, r, "/login", http.StatusSeeOther)
        return
    }
    role := session.Values["role"].(string)
    fmt.Fprintf(w, "WELCOME AGENT %s [%s]", agentID, role)
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
    session, _ := store.Get(r, "signal-session")
    session.Options.MaxAge = -1
    session.Save(r, w)
    http.Redirect(w, r, "/login", http.StatusSeeOther)
}

func main() {
    http.HandleFunc("/login", loginHandler)
    http.HandleFunc("/dashboard", dashboardHandler)
    http.HandleFunc("/logout", logoutHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Acceptance Criteria

- Uses `sessions.NewCookieStore` with a secret key
- `store.Get(r, "session-name")` to retrieve/create sessions
- Stores values in `session.Values`
- Calls `session.Save(r, w)` to persist
- Sets `MaxAge` for expiry
- Dashboard checks for valid session before rendering
- Logout sets `MaxAge = -1` to destroy session
- Uses `http.Redirect` appropriately

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | A session token appears that Maya didn't create — someone else is on the server |

## Rush Mode

- No rush mode — narrative tension chapter

## XP

- **Base:** 400 XP
- **First-try bonus:** +200 XP
- **Par time:** 150s

## Hints

1. "`session, _ := store.Get(r, \"signal-session\")` — get or create. it's the same call." (-8 energy)
2. "`session.Values[\"agentID\"] = \"ALPHA-7\"` — store any value. read it back with a type assertion: `val.(string)`" (-12 energy)
3. "destroy by setting `session.Options.MaxAge = -1` then `session.Save(r, w)`. the cookie expires immediately." (-20 energy)

## Twist (post-completion)

The rogue session belongs to Dr. Reeves — accessing the system from a NEXUS terminal in Singapore. She's inside the building. She went in alone.

### Twist Display

- Lines:
  1. `> rogue session detected.`
  2. `> session owner: DR. ELEANOR REEVES`
  3. `> source IP: NEXUS-HQ-SINGAPORE`
  4. `> maya: she went in alone.`
  5. `> maya: why didn't she tell me?`
  6. `> [session message from reeves]: "i started this. i have to finish it."`

## UI State

- **Location label:** NEXUS HQ · SESSION MANAGEMENT
- **Concept label:** Sessions · Cookies · gorilla/sessions
