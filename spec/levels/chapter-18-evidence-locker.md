# Chapter 18 — Evidence Locker

**Act VII · NEXUS Data Vault · Geneva (Evidence Distribution)**

## Go Concepts

- `http.FileServer` — serving files over HTTP
- `http.FS` — adapting an `fs.FS` into an HTTP file source
- `http.StripPrefix` — mounting a file tree under a URL prefix
- `testing/fstest.MapFS` — an in-memory file system
- `path.Ext` — file extension inspection
- Content-type allowlist middleware (serving assets safely)

## Story Context

The vault gave up its records; now the extraction agents need the files themselves — operation dossiers, payment ledgers, the CSS for the search terminal's UI. Maya stands up an evidence locker: a file server under `/evidence/`, authenticated routes, downloadable proof. But NEXUS anticipated this. Salted into the evidence set is a file that isn't evidence — a trojan that phones home the instant it's opened, revealing every agent who downloaded it. Maya has to serve the real documents and refuse to hand out the poison, without knowing in advance which file is the bait.

## Challenge

Serve the evidence tree over HTTP with `FileServer` + `StripPrefix`, then wrap it in a content-type allowlist so only safe file types leave the locker.

**Playground note:** the locker's files live in `fstest.MapFS` (fictionally: the smuggled evidence cache), served through `http.FS`. In production this would be `os.DirFS("./evidence")` — the code is identical; only the source changes. That equivalence is the point of `fs.FS`.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "evidence locker ready".

Imports needed: `"fmt"`, `"net/http"`, `"path"` (harness adds `"io"`, `"net/http/httptest"`, `"testing/fstest"`)

The scaffold provides the evidence file system as read-only reference:
```go
// ---- EVIDENCE CACHE (provided) ----
var evidence = fstest.MapFS{
    "docs/op-nightfall.txt": {Data: []byte("OP NIGHTFALL: surveillance of 41 researchers\n")},
    "docs/ledger-2024.txt":  {Data: []byte("PAYMENTS: 14 shell companies, 9 countries\n")},
    "style/terminal.css":    {Data: []byte("body{background:#040810;color:#6effa0}\n")},
}
```

#### Step 1: Serve the Files

Stand up an `http.FileServer` over the evidence cache and serve it.

Key teaching moment: `http.FileServer` returns a handler that maps URL paths to files. It takes an `http.FileSystem`; `http.FS(evidence)` adapts any `fs.FS` (like `MapFS`, or a real directory via `os.DirFS`) into one. Mounted at the root, `GET /docs/op-nightfall.txt` serves that file — the handler does directory listing, content-type detection, and range requests for free.

```go
srv := httptest.NewServer(http.FileServer(http.FS(evidence)))
```

Test harness:
```go
func main() {
    srv := httptest.NewServer(http.FileServer(http.FS(evidence)))
    defer srv.Close()
    resp, _ := http.Get(srv.URL + "/docs/op-nightfall.txt")
    body, _ := io.ReadAll(resp.Body)
    fmt.Printf("%d -> %s", resp.StatusCode, string(body))
    resp2, _ := http.Get(srv.URL + "/docs/ledger-2024.txt")
    body2, _ := io.ReadAll(resp2.Body)
    fmt.Printf("%d -> %s", resp2.StatusCode, string(body2))
}
```

Expected output:
```
200 -> OP NIGHTFALL: surveillance of 41 researchers
200 -> PAYMENTS: 14 shell companies, 9 countries
```

#### Step 2: Mount Under a Prefix

Real servers don't serve files from the root — the locker lives under `/evidence/`. Mount it there with `StripPrefix`.

Key teaching moment: a file server resolves URL paths *literally* against its file system — a request for `/evidence/docs/x.txt` would look for `evidence/docs/x.txt` on disk, which doesn't exist. `http.StripPrefix("/evidence/", fileServer)` removes the prefix before the file server sees the path, so `/evidence/docs/x.txt` → `docs/x.txt`. Miss this and every request 404s; that's the classic first-time FileServer bug.

```go
mux := http.NewServeMux()
mux.Handle("/evidence/", http.StripPrefix("/evidence/", http.FileServer(http.FS(evidence))))
```

Test harness:
```go
func main() {
    mux := http.NewServeMux()
    mux.Handle("/evidence/", http.StripPrefix("/evidence/", http.FileServer(http.FS(evidence))))
    srv := httptest.NewServer(mux)
    defer srv.Close()

    get := func(p string) {
        resp, _ := http.Get(srv.URL + p)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        if resp.StatusCode == 200 {
            fmt.Printf("%d %s -> %s", resp.StatusCode, p, string(body))
        } else {
            fmt.Printf("%d %s\n", resp.StatusCode, p)
        }
    }
    get("/evidence/docs/op-nightfall.txt")
    get("/evidence/style/terminal.css")
    get("/docs/op-nightfall.txt")
}
```

Expected output:
```
200 /evidence/docs/op-nightfall.txt -> OP NIGHTFALL: surveillance of 41 researchers
200 /evidence/style/terminal.css -> body{background:#040810;color:#6effa0}
404 /docs/op-nightfall.txt
```

The un-prefixed path 404s — the locker only answers under `/evidence/`.

#### Step 3: The Content Guard

NEXUS added `docs/dropkit.exe` to the cache — the trojan. Write `func contentGuard(next http.Handler) http.Handler` that serves only allowlisted extensions and blocks everything else.

Key teaching moment: this is the middleware shape from boss-06, now written from scratch — `func(next http.Handler) http.Handler`, returning a handler that inspects the request, then either calls `next.ServeHTTP` (pass) or writes its own response (block). `path.Ext(r.URL.Path)` extracts `.txt`, `.exe`, etc.; an allowlist (`map[string]bool`) is safer than a blocklist — you can't enumerate every dangerous extension, but you can enumerate every safe one.

```go
var allowedExt = map[string]bool{".txt": true, ".css": true, ".html": true}

func contentGuard(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !allowedExt[path.Ext(r.URL.Path)] {
            w.WriteHeader(http.StatusForbidden)
            fmt.Fprintln(w, "BLOCKED: file type not on evidence allowlist")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

Test harness (guard wraps the file server, mounted under the prefix; cache includes `docs/dropkit.exe`):
```go
func main() {
    mux := http.NewServeMux()
    guarded := http.StripPrefix("/evidence/", contentGuard(http.FileServer(http.FS(evidence))))
    mux.Handle("/evidence/", guarded)
    srv := httptest.NewServer(mux)
    defer srv.Close()

    get := func(p string) {
        resp, _ := http.Get(srv.URL + p)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()
        fmt.Printf("%d %s -> %s", resp.StatusCode, p, string(body))
    }
    get("/evidence/docs/op-nightfall.txt")
    get("/evidence/docs/dropkit.exe")
    get("/evidence/style/terminal.css")
}
```

Expected output:
```
200 /evidence/docs/op-nightfall.txt -> OP NIGHTFALL: surveillance of 41 researchers
403 /evidence/docs/dropkit.exe -> BLOCKED: file type not on evidence allowlist
200 /evidence/style/terminal.css -> body{background:#040810;color:#6effa0}
```

The trojan is refused. The real evidence and the terminal's CSS flow through.

### Acceptance Criteria

- Step 1 uses `http.FileServer(http.FS(...))`
- Step 2 uses `http.StripPrefix` and the un-prefixed path 404s
- Step 3 middleware has the `func(next http.Handler) http.Handler` shape, uses `path.Ext` + an allowlist map, calls `next.ServeHTTP` on pass, returns `403` on block
- The `.exe` is blocked; `.txt` and `.css` pass
- Required code: `http.FileServer`, `http.FS`, `http.StripPrefix`, `path.Ext`, `next.ServeHTTP`

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (FileServer):** 90 base, +45 first-try
- **Step 2 (StripPrefix):** 100 base, +50 first-try
- **Step 3 (content guard):** 130 base, +65 first-try
- **Total base:** 360 (3 working steps + scaffold — a deliberately tighter chapter before the boss)
- **Par time:** 210s
- **Level timer:** 490s, game over on expiry

## Hints

### Step 1
1. "`http.FileServer(http.FS(evidence))` — FS adapts the file system, FileServer serves it." (−5 energy)
2. "serve it as-is; the handler does content types and listing for you." (−8 energy)
3. "`httptest.NewServer(handler)` gives you a live URL to GET in the harness." (−12 energy)

### Step 2
1. "mount it: `mux.Handle(\"/evidence/\", ...)` — note the trailing slash for a subtree." (−8 energy)
2. "the file server sees the FULL path and 404s. strip the prefix first." (−12 energy)
3. "`http.StripPrefix(\"/evidence/\", fileServer)` — removes the prefix so paths resolve inside the FS." (−20 energy)

### Step 3
1. "same shape as boss-06's guard: `func(next http.Handler) http.Handler` returning a HandlerFunc." (−8 energy)
2. "`path.Ext(r.URL.Path)` gives \".exe\", \".txt\". check it against an allowlist map." (−12 energy)
3. "allowlist, not blocklist. block → `w.WriteHeader(403); return`. pass → `next.ServeHTTP(w, r)`." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "The agents need the files, not just the records. Stand up the locker." |
| T+60s | Maya: "locker's live under /evidence/. docs and the terminal css are serving." |
| T+120s | System: `NEW FILE IN CACHE — docs/dropkit.exe · ORIGIN: UNVERIFIED` |
| T+130s | Rush Mode — "Unverified File In Distribution" |
| T+240s | GHOST: `ONE DOWNLOAD. THAT IS ALL I NEED FROM YOUR NETWORK.` |
| T+330s | Rush Mode — "Agents Downloading Now — Guard The Locker" |

## Rush Mode

- **Rush 1 (T+130s):** 50 seconds · up to +85 XP · on expiry: Jeopardy — Signal Scramble (the trojan's payload bleeds into the editor)
- **Rush 2 (T+330s):** 45 seconds · up to +95 XP · on expiry: Jeopardy — Energy Drain (−20) (an agent opens the trojan before the guard is up)

## Twist

Post-completion. The guard blocks the `.exe`. Maya inspects what it would have done.

### Twist Display

- Lines:
  1. `> content guard active. blocked: docs/dropkit.exe`
  2. `> inspecting payload in sandbox...`
  3. `> dropkit.exe phones home to: nexus-hq.sg — SINGAPORE`
  4. `> maya: it wasn't stealing evidence. it was tagging whoever touched it.`
  5. `> reeves: "Singapore. That's their headquarters. That's where this ends."`
  6. `> ghost: YOU BLOCKED ONE FILE. THEIR FRONT DOOR HAS FIVE THOUSAND.`

Points the team at Singapore (Act VIII) and foreshadows the middleware-layered "front door" the whole next act is about.

## UI State

- **Location label:** GENEVA VAULT · EVIDENCE LOCKER
- **Concept label:** FileServer · StripPrefix · Content Guard
- **Visual state:** File-tree browser preview beside the editor, download counter for agents pulling files, the `dropkit.exe` entry flashing red, blocked-request log
- **Audio:** facility-hum ambient, door-slide on file downloads, warning-beep on the trojan appearance, dread-sting on the Singapore reveal

## Teaching Notes

### fs.FS is the transferable idea

The chapter serves `MapFS` but says plainly it's `os.DirFS` in production — identical code. This teaches Go's `fs.FS` abstraction (the reason static files, embeds via `embed.FS`, and test fixtures all share one interface) rather than a playground trick. The skill transfers verbatim to real servers.

### StripPrefix is the canonical gotcha

Nearly everyone's first FileServer 404s because they forgot StripPrefix. The chapter makes the un-prefixed 404 an *expected output* the player must reproduce — turning the classic bug into a verified understanding of how path resolution works.

### Middleware, written not given

boss-06 handed the player a middleware wrapper to fill in; ch18 has them write the full `func(next) next` from scratch, guarding a real (file-serving) handler. This is the on-ramp to Act VIII, which is nothing but middleware — the player arrives already having built one that does something real.

### The trojan closes an arc and opens one

ch15 defused an injection with auto-escaping; ch17 rejected one with validation; ch18 refuses a malicious *file*. Three chapters, three input surfaces (HTML, form fields, downloads), one thesis: every byte from outside is hostile until proven otherwise. Boss-07 then tests it under corruption, and Act VIII makes it the entire subject.
