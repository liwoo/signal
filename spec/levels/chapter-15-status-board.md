# Chapter 15 — Status Board

**Act VI · Safe House / Basement Server Room**

## Go Concepts

- `html/template` package
- Template parsing and execution
- Range loops in templates (`{{range .}}`)
- Conditional logic (`{{if .}}`, `{{else}}`)
- Template pipelines and custom functions

## Story Context

Maya has agents checking in via the dead drop server. She needs a visual status board — a web page that renders all active agents, their last check-in time, and their threat level. Pure Go templates, no JavaScript frameworks. Lean and fast.

## Challenge

Build an HTTP handler that renders a dynamic HTML page using Go's template engine, showing agent data with conditional styling.

### Starter Code

```go
package main

import (
    "html/template"
    "net/http"
    "time"
)

type Agent struct {
    ID        string
    Zone      string
    LastPing  time.Time
    Threat    string // "LOW", "MEDIUM", "HIGH"
}

var agents = []Agent{
    {"ALPHA-7", "Berlin", time.Now().Add(-2 * time.Minute), "LOW"},
    {"BRAVO-3", "Tokyo", time.Now().Add(-30 * time.Second), "MEDIUM"},
    {"DELTA-9", "Cairo", time.Now().Add(-15 * time.Minute), "HIGH"},
    {"ECHO-1", "London", time.Now().Add(-1 * time.Minute), "LOW"},
}

// Template should:
// 1. Display a title "SIGNAL STATUS BOARD"
// 2. Loop through agents showing ID, Zone, Threat
// 3. If Threat is "HIGH", wrap in a <span class="danger"> tag
// 4. Show total agent count at the bottom

const statusTemplate = `
<!DOCTYPE html>
<html>
<body>
    <h1>SIGNAL STATUS BOARD</h1>
    <!-- TODO: render agent list with conditionals -->
    <p>Total agents: <!-- TODO: count --></p>
</body>
</html>
`

func main() {
    // TODO: parse template and serve on /status
}
```

### Acceptance Criteria

- Uses `template.New` and `template.Parse` (or `template.Must`)
- Template uses `{{range .Agents}}` to iterate
- Template uses `{{if eq .Threat "HIGH"}}` or similar conditional
- Renders agent ID, Zone, and Threat for each agent
- Shows total count using `{{len .Agents}}` or passed data
- Handler calls `tmpl.Execute(w, data)` with proper data struct

## Timed Events

| Time | Event |
| --- | --- |
| T+15s | Rush Mode — "NEXUS scanning for active HTTP services on this subnet" |

## Rush Mode

- **Duration:** 45 seconds
- **On expiry:** Jeopardy — Power Reduced (editor shrinks)

## XP

- **Base:** 350 XP
- **First-try bonus:** +175 XP
- **Par time:** 150s

## Hints

1. "`tmpl := template.Must(template.New(\"status\").Parse(templateString))` — parse once, execute many." (-8 energy)
2. "`{{range .Agents}}{{.ID}} — {{.Zone}}{{end}}` loops through the slice in the template." (-12 energy)
3. "`{{if eq .Threat \"HIGH\"}}<span class=\"danger\">{{.ID}}</span>{{else}}{{.ID}}{{end}}` — conditional rendering." (-20 energy)

## Twist (post-completion)

The template renders an agent Maya never registered. GHOST has injected a phantom into the system.

### Twist Display

- Lines:
  1. `> status board rendered successfully.`
  2. `> agent count: 5`
  3. `> maya: wait. i only registered 4.`
  4. `> unknown agent: GHOST-NODE-00`
  5. `> maya: it's inside our system.`
  6. `> dr. reeves: ghost has been watching since the beginning.`

## UI State

- **Location label:** SAFE HOUSE · STATUS BOARD
- **Concept label:** Templates · html/template · Range · Conditionals
- **Visual:** The rendered template is shown as a preview panel alongside the editor (desktop: right side; mobile: tab)
