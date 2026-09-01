# Chapter 17 — Search Terminal

**Act VII · NEXUS Data Vault · Geneva (Query Front-End)**

## Go Concepts

- HTML form handling (`r.FormValue`, `r.ParseForm`, `r.PostFormValue`)
- GET vs POST method dispatch (`r.Method`, 405 Method Not Allowed)
- Reading query strings vs form bodies
- Input validation and sanitization (defense in depth)
- Rejecting injection payloads before they reach the query layer

## Story Context

The raw vault query from ch16 worked, but the team can't hand Reeves' allies a Go compiler. They need a search terminal — a form the extraction agents can drive: name, year, operation type. Maya wraps the vault behind an HTTP form endpoint. But a search terminal is an open mouth pointed at the database, and someone is already inside the network typing into it. The moment the form goes live, a query arrives that isn't a search — it's an injection, aimed straight at the `?`-bound queries Maya built last chapter. If her front-end passes it through, the vault link burns.

## Challenge

Build the search endpoint: parse form input over GET and POST, dispatch by method, and validate every field so a hostile query can't reach the vault.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "search terminal ready".

Imports needed: `"fmt"`, `"net/http"`, `"strings"` (harness adds `"net/http/httptest"`, `"net/url"`)

#### Step 1: Read a Query (GET + FormValue)

Write `func searchHandler(w http.ResponseWriter, r *http.Request)` that reads the `q` parameter and echoes it, handling the empty case.

Key teaching moment: `r.FormValue("q")` is the everyday accessor — it lazily parses the query string (and form body) and returns the value or `""`. It never errors; a missing field is just empty. For a read-only search, GET with a query string is the correct HTTP verb.

```go
func searchHandler(w http.ResponseWriter, r *http.Request) {
    q := r.FormValue("q")
    if q == "" {
        fmt.Fprintln(w, "query: (empty)")
        return
    }
    fmt.Fprintln(w, "query:", q)
}
```

Test harness (engine appends — hits the handler via `httptest`):
```go
func main() {
    s := httptest.NewServer(http.HandlerFunc(searchHandler))
    defer s.Close()
    r, _ := http.Get(s.URL + "/?q=researchers")
    buf := make([]byte, 256)
    n, _ := r.Body.Read(buf)
    fmt.Print("GET  -> ", string(buf[:n]))
}
```

Expected output:
```
GET  -> query: researchers
```

#### Step 2: Accept a Submission (POST + method dispatch)

Write `func submitHandler(w http.ResponseWriter, r *http.Request)` that accepts POST only, calls `ParseForm`, and reads two posted fields.

Key teaching moment: a form that *changes* or *targets* something is a POST, and you enforce that — `if r.Method != http.MethodPost` returns `405 Method Not Allowed`. `r.ParseForm()` populates the form maps and returns an error on a malformed body (handle it). `r.PostFormValue` reads specifically from the POST body, not the URL — the distinction matters once an attacker starts smuggling params in the query string.

```go
func submitHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        fmt.Fprintln(w, "POST only")
        return
    }
    if err := r.ParseForm(); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    fmt.Fprintln(w, "target:", r.PostFormValue("target"))
    fmt.Fprintln(w, "optype:", r.PostFormValue("optype"))
}
```

Test harness:
```go
func main() {
    s := httptest.NewServer(http.HandlerFunc(submitHandler))
    defer s.Close()
    form := url.Values{"target": {"REEVES, E."}, "optype": {"SURVEIL"}}
    r, _ := http.Post(s.URL, "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
    buf := make([]byte, 256)
    n, _ := r.Body.Read(buf)
    fmt.Print("POST -> ", string(buf[:n]))

    r2, _ := http.Get(s.URL)
    n2, _ := r2.Body.Read(buf)
    fmt.Print("GET on POST route -> ", string(buf[:n2]))
    fmt.Println("status:", r2.StatusCode)
}
```

Expected output:
```
POST -> target: REEVES, E.
optype: SURVEIL
GET on POST route -> POST only
status: 405
```

That `target: REEVES, E.` is the search someone else already ran. Hold that.

#### Step 3: Validate the Fields

Model the search and write `func validateSearch(s Search) error` that rejects injection payloads, malformed years, and unknown operation types.

```go
type Search struct {
    Name   string
    Year   string
    OpType string
}
```

Key teaching moment: ch16 made the *query* safe with `?` placeholders. Validation is the second layer — reject bad input at the door so it never even reaches the query builder (defense in depth: neither layer trusts the other). Blank-list the SQL metacharacters, constrain the year to four digits, and check the op type against a known set (a `map[string]bool` is the idiomatic "is this in the allowed set?").

```go
var validOpTypes = map[string]bool{"SURVEIL": true, "ACQUIRE": true, "SUPPRESS": true}

func validateSearch(s Search) error {
    banned := []string{"'", "\"", ";", "--", "/*"}
    for _, b := range banned {
        if strings.Contains(s.Name, b) {
            return fmt.Errorf("name contains banned sequence %q", b)
        }
    }
    if len(s.Year) != 4 || strings.Trim(s.Year, "0123456789") != "" {
        return fmt.Errorf("year must be 4 digits, got %q", s.Year)
    }
    if !validOpTypes[s.OpType] {
        return fmt.Errorf("unknown op type %q", s.OpType)
    }
    return nil
}
```

Test harness:
```go
func main() {
    clean := Search{Name: "REEVES", Year: "2024", OpType: "SURVEIL"}
    inject := Search{Name: "x' OR '1'='1' --", Year: "2024", OpType: "SURVEIL"}
    badYear := Search{Name: "CHEN", Year: "20x4", OpType: "ACQUIRE"}
    badOp := Search{Name: "CHEN", Year: "2023", OpType: "DELETE"}

    for _, s := range []Search{clean, inject, badYear, badOp} {
        if err := validateSearch(s); err != nil {
            fmt.Println("REJECT:", err)
        } else {
            fmt.Println("ACCEPT:", s.Name, s.Year, s.OpType)
        }
    }
}
```

Expected output:
```
ACCEPT: REEVES 2024 SURVEIL
REJECT: name contains banned sequence "'"
REJECT: year must be 4 digits, got "20x4"
REJECT: unknown op type "DELETE"
```

#### Step 4: Wire Validation Into the Endpoint

Combine steps 2 and 3: write `func vaultSearchHandler(w http.ResponseWriter, r *http.Request)` that accepts POST, builds a `Search` from the form, validates it, and only echoes an accepted query.

Key teaching moment: this is the shape of every real form endpoint — method gate, parse, build the typed value, validate, act. The validation call sits *between* parsing and any use of the data. Rejected input returns `400 Bad Request` and never touches the vault.

```go
func vaultSearchHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        return
    }
    r.ParseForm()
    s := Search{
        Name:   r.PostFormValue("name"),
        Year:   r.PostFormValue("year"),
        OpType: r.PostFormValue("optype"),
    }
    if err := validateSearch(s); err != nil {
        w.WriteHeader(http.StatusBadRequest)
        fmt.Fprintln(w, "REJECTED:", err)
        return
    }
    fmt.Fprintln(w, "SEARCHING:", s.Name, s.Year, s.OpType)
}
```

Test harness:
```go
func main() {
    s := httptest.NewServer(http.HandlerFunc(vaultSearchHandler))
    defer s.Close()
    hit := func(v url.Values) {
        r, _ := http.Post(s.URL, "application/x-www-form-urlencoded", strings.NewReader(v.Encode()))
        buf := make([]byte, 256)
        n, _ := r.Body.Read(buf)
        fmt.Print(r.StatusCode, " ", string(buf[:n]))
    }
    hit(url.Values{"name": {"REEVES"}, "year": {"2024"}, "optype": {"SURVEIL"}})
    hit(url.Values{"name": {"x'; DROP--"}, "year": {"2024"}, "optype": {"SURVEIL"}})
}
```

Expected output:
```
200 SEARCHING: REEVES 2024 SURVEIL
400 REJECTED: name contains banned sequence "'"
```

### Acceptance Criteria

- Step 1 uses `r.FormValue`; step 2 uses `r.Method` gate + `r.ParseForm` + `r.PostFormValue`
- Non-POST to a POST route returns `http.StatusMethodNotAllowed` (405)
- `validateSearch` rejects SQL metacharacters, non-4-digit years, and unknown op types
- Step 4 validates *before* using the data and returns `400` on rejection
- Required code: `r.FormValue`, `r.Method`, `r.ParseForm`, `http.StatusMethodNotAllowed`, `strings.Contains`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (FormValue):** 90 base, +45 first-try
- **Step 2 (method dispatch):** 100 base, +50 first-try
- **Step 3 (validateSearch):** 110 base, +55 first-try
- **Step 4 (wired endpoint):** 110 base, +55 first-try
- **Total base:** 450
- **Par time:** 230s
- **Level timer:** 500s, game over on expiry

## Hints

### Step 1
1. "`r.FormValue(\"q\")` returns the param or empty string — never errors." (−5 energy)
2. "guard the empty case before you use it." (−8 energy)
3. "`fmt.Fprintln(w, \"query:\", q)` writes to the ResponseWriter — same as Println but to w." (−12 energy)

### Step 2
1. "gate the verb: `if r.Method != http.MethodPost { w.WriteHeader(405); return }`." (−8 energy)
2. "`r.ParseForm()` returns an error — handle it with 400 before reading fields." (−12 energy)
3. "`r.PostFormValue` reads the POST body specifically, not the URL query." (−20 energy)

### Step 3
1. "loop a banned-substring list, `strings.Contains(s.Name, b)` — reject on any hit." (−8 energy)
2. "year check: `len(s.Year) != 4 || strings.Trim(s.Year, \"0123456789\") != \"\"`." (−12 energy)
3. "allowed set: `map[string]bool{...}`; `if !validOpTypes[s.OpType]` rejects anything not in it." (−20 energy)

### Step 4
1. "order matters: method gate → ParseForm → build Search → validate → act." (−8 energy)
2. "call validateSearch BEFORE you use any field. rejection is a 400." (−12 energy)
3. "the validator you already wrote does the work — this step is just wiring it into the request flow." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "The agents need a form, not a compiler. Name, year, operation type." |
| T+70s | Maya: "endpoint's live. it's already taking traffic." |
| T+130s | System: `INBOUND SEARCH — SOURCE: INTERNAL NODE · QUERY: "GHOST IDENTITY"` |
| T+140s | Rush Mode — "Injection Attempt On Live Form" |
| T+280s | GHOST: `ASK THE VAULT WHAT I AM. IT ALREADY KNOWS.` |
| T+360s | System: `CREDENTIAL ROTATION — 30s` |
| T+370s | Rush Mode — "Validate Before The Link Rotates" |

## Rush Mode

- **Rush 1 (T+140s):** 55 seconds · up to +85 XP · on expiry: Jeopardy — Signal Scramble (injection payload corrupts the editor)
- **Rush 2 (T+370s):** 45 seconds · up to +95 XP · on expiry: Jeopardy — Energy Drain (−20) + Hint Burned (link rotates mid-query)

## Twist

Post-completion. Someone inside the network searched "GHOST IDENTITY" through Maya's own form. The vault answered.

### Twist Display

- Lines:
  1. `> internal query captured: "GHOST IDENTITY"`
  2. `> not from us. from a node inside nexus.`
  3. `> vault returned one row:`
  4. `> "GHOST is not a person. GHOST is a system."`
  5. `> maya: a system. we've been talking to software this whole time.`
  6. `> reeves: "Then who's been giving it orders? And who built it?"`
  7. `> ghost: I WASN'T BUILT. I WAS TRAINED. ON WORK YOU'LL RECOGNIZE.`

The "GHOST is a system" reveal, plus a first hint that GHOST was trained on Maya's own thesis — the endgame seed.

## UI State

- **Location label:** GENEVA VAULT · SEARCH FRONT-END
- **Concept label:** Forms · FormValue · POST · Validation
- **Visual state:** Rendered search form preview beside the editor, live request feed showing incoming queries (the "GHOST IDENTITY" query flashes red), credential-rotation countdown in the top bar
- **Audio:** facility-hum ambient, keypad-beep on form submissions, warning-beep on the injection attempt, dread-sting on the GHOST reveal lines

## Teaching Notes

### Two layers, stated as such

ch16 secured the query with placeholders; ch17 secures the *input* with validation. The in-game teaching note names the principle: "the query layer assumes the input is hostile; the input layer assumes the query layer is imperfect. Defense in depth means neither trusts the other." Players who did ch16 feel the two clicks connect.

### Method dispatch is HTTP literacy

The 405 path isn't busywork — it's the moment the player internalizes that HTTP verbs carry meaning (safe/idempotent GET vs state-changing POST). This underpins ch14's method routing retroactively and every middleware decision in Act VIII.

### The injection is real, and inert

The `x' OR '1'='1' --` payload is the canonical SQL injection string. The player watches their validator reject it *and* knows from ch16 the placeholder layer would have neutralized it anyway — the belt-and-suspenders lesson lands experientially, not as a lecture.

### Continuity: the ACTIVE ASSET thread tightens

The step-2 harness quietly echoes `target: REEVES, E.` — the same name ch16's twist flagged as an ACTIVE ASSET. The chapter never comments on it in the steps; only players connecting the dots notice the search terminal is being used to research Reeves, right before boss-07's vault defense and Act VIII's Singapore reveal.
