# Chapter 18 — Evidence Locker

**Act VII · NEXUS Data Vault / Geneva**

## Go Concepts

- `http.FileServer` for serving static files
- `http.StripPrefix` for path rewriting
- Directory listing control
- Content-Type headers
- Combining file serving with dynamic routes

## Story Context

Maya has queried the vault and found the evidence. Now she needs to serve the extracted files — documents, blueprints, encrypted archives — to allied agents for download. A static file server integrated into the dead drop system.

## Challenge

Build a file server that serves static assets from a directory, with proper path handling and content-type awareness.

### Starter Code

```go
package main

import (
    "net/http"
    "github.com/gorilla/mux"
)

// Build a server with:
// 1. Static file serving at /evidence/ from the "./vault" directory
//    - Use http.StripPrefix to remove "/evidence/" from the path
//    - Disable directory listing (return 404 for directory requests)
// 2. A CSS file served at /static/css/ from the "./public/css" directory
// 3. A dynamic route: GET /evidence/{filename}/info -> returns file metadata as text

// The server should handle both static files and dynamic API routes

func main() {
    r := mux.NewRouter()
    // TODO: set up file servers and routes
    http.ListenAndServe(":8080", r)
}
```

### Expected Solution (reference)

```go
package main

import (
    "fmt"
    "net/http"
    "os"
    "path/filepath"

    "github.com/gorilla/mux"
)

func noDirectoryListing(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path == "" || r.URL.Path[len(r.URL.Path)-1] == '/' {
            http.NotFound(w, r)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func fileInfoHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    filename := vars["filename"]
    path := filepath.Join("./vault", filepath.Clean(filename))
    info, err := os.Stat(path)
    if err != nil {
        http.NotFound(w, r)
        return
    }
    fmt.Fprintf(w, "File: %s\nSize: %d bytes\nModified: %s",
        info.Name(), info.Size(), info.ModTime().Format("2006-01-02 15:04"))
}

func main() {
    r := mux.NewRouter()

    evidenceFS := http.StripPrefix("/evidence/",
        noDirectoryListing(http.FileServer(http.Dir("./vault"))))
    r.PathPrefix("/evidence/").Handler(evidenceFS)

    cssFS := http.StripPrefix("/static/css/",
        http.FileServer(http.Dir("./public/css")))
    r.PathPrefix("/static/css/").Handler(cssFS)

    r.HandleFunc("/evidence/{filename}/info", fileInfoHandler).Methods("GET")

    http.ListenAndServe(":8080", r)
}
```

### Acceptance Criteria

- Uses `http.FileServer(http.Dir("./vault"))` to create a file server
- Uses `http.StripPrefix` to map URL paths to filesystem paths
- Disables or restricts directory listing
- Serves static CSS from a separate directory
- Combines static file serving with dynamic mux routes
- Uses `filepath.Clean` or similar to prevent path traversal

## Timed Events

- No rush mode — exploration chapter

## XP

- **Base:** 300 XP
- **First-try bonus:** +150 XP
- **Par time:** 150s

## Hints

1. "`http.FileServer(http.Dir(\"./vault\"))` creates a handler that serves files from the vault directory." (-8 energy)
2. "`http.StripPrefix(\"/evidence/\", fileServer)` removes the URL prefix so `/evidence/doc.pdf` maps to `./vault/doc.pdf`." (-12 energy)
3. "to block directory listing, wrap the file server in middleware that checks if the path ends with `/` and returns 404." (-20 energy)

## Twist (post-completion)

One of the evidence files is a blueprint. A satellite. NEXUS isn't just stealing research — they're building a quantum-capable surveillance satellite. Codename: PANOPTICON.

### Twist Display

- Lines:
  1. `> evidence files served: 47 documents`
  2. `> agent ECHO-1 downloaded: blueprint_QS7.pdf`
  3. `> dr. reeves: oh god. i know what this is.`
  4. `> dr. reeves: it's a satellite. quantum-capable surveillance.`
  5. `> dr. reeves: codename: PANOPTICON`
  6. `> maya: they stole 14 theses to build a spy satellite?`
  7. `> dr. reeves: not spy. predict. quantum prediction at global scale.`

## UI State

- **Location label:** NEXUS DATA VAULT · EVIDENCE LOCKER
- **Concept label:** FileServer · StripPrefix · Static Assets
- **Note:** One of the "evidence files" is a trojan — this foreshadows content-type validation middleware in Act VIII
