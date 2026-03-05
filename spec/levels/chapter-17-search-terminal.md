# Chapter 17 — Search Terminal

**Act VII · NEXUS Data Vault / Geneva**

## Go Concepts

- HTML forms (`<form method="POST">`)
- `r.ParseForm()` and `r.FormValue()`
- POST request handling
- Input validation and sanitization
- Combining forms with database queries

## Story Context

Multiple agents need to search the vault simultaneously. Maya builds a web-based search interface — a form that accepts query parameters, validates input against SQL injection, and returns filtered results from the archive.

## Challenge

Build an HTTP handler that serves an HTML form and processes search submissions with proper validation.

### Starter Code

```go
package main

import (
    "fmt"
    "html/template"
    "net/http"
    "strings"
)

// Simulated database records
var records = []map[string]string{
    {"name": "Maya Chen", "field": "quantum encryption", "status": "ACQUIRED"},
    {"name": "Dr. Reeves", "field": "quantum encryption", "status": "ACTIVE ASSET"},
    {"name": "Dr. Tanaka", "field": "neural networks", "status": "MONITORING"},
    {"name": "Prof. Okafor", "field": "quantum encryption", "status": "APPROACHED"},
    {"name": "Dr. Petrov", "field": "cryptography", "status": "ACQUIRED"},
}

// Build two handlers:
// GET  /search  -> render the search form
// POST /search  -> parse form, validate input, filter records, render results

// Validation rules:
// - "name" field: max 50 chars, no SQL keywords (SELECT, DROP, DELETE, INSERT, UPDATE)
// - "field" field: must be one of: "quantum encryption", "neural networks", "cryptography"
// - If validation fails, re-render form with error message

func main() {
    // TODO
}
```

### Acceptance Criteria

- GET handler renders an HTML form with `method="POST"`
- POST handler calls `r.ParseForm()` before reading values
- Uses `r.FormValue("name")` to extract form fields
- Validates input length and rejects SQL keywords
- Validates `field` against an allowlist
- Returns filtered results matching the search criteria
- Re-renders form with error message on invalid input
- Uses `html/template` for rendering (not raw string concatenation)

## Timed Events

| Time | Event |
| --- | --- |
| T+18s | Someone submits a search for "GHOST IDENTITY" — from inside the network |

## Rush Mode

- No rush mode in this chapter — the narrative tension carries it

## XP

- **Base:** 300 XP
- **First-try bonus:** +150 XP
- **Par time:** 150s

## Hints

1. "`r.ParseForm()` must be called before `r.FormValue()`. the form data isn't available until parsed." (-8 energy)
2. "validate by checking `strings.ContainsAny(strings.ToUpper(input), \"SELECT,DROP,DELETE\")` — reject if true." (-12 energy)
3. "use a template with `{{if .Error}}<p class=\"error\">{{.Error}}</p>{{end}}` to show validation errors inline." (-20 energy)

## Twist (post-completion)

A search for "thesis" returns 14 results. All quantum encryption research. All stolen.

### Twist Display

- Lines:
  1. `> search submitted: "thesis"`
  2. `> results: 14 matches`
  3. `> all classified under: quantum encryption`
  4. `> all status: ACQUIRED`
  5. `> maya: 14 theses. all stolen. all quantum.`
  6. `> maya: they're not collecting research. they're building something.`

## UI State

- **Location label:** NEXUS DATA VAULT · SEARCH TERMINAL
- **Concept label:** HTML Forms · FormValue · POST · Validation
- **Visual:** Split view — form preview on the left, code on the right
