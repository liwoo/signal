# Chapter 15 — Status Board

**Act VI · Safe House Basement · Dead Drop Server**

## Go Concepts

- `html/template` — parse, `template.Must`, `Execute`
- Template actions: `{{.Field}}`, `{{range}}`, `{{if}}/{{else}}`, `gt`
- `template.FuncMap` — custom template functions
- Contextual auto-escaping (XSS defense built into the language)
- Rendering data structs into live HTML

## Story Context

The dead drop has routes (ch14) and agents checking in through them. What Maya doesn't have is *sight*: who's online, who's gone dark, whose last ping is overdue. Reeves wants one screen — a status board rendered server-side, no client frameworks, nothing to fingerprint. Go templates over the agent roster. But GHOST has found the subnet and is probing the check-in route with poisoned agent names. Whatever renders that board had better not execute what it prints.

## Challenge

Render the agent status board with `html/template`: bind a struct, range the roster, flag threats with conditionals, add custom formatting functions — and let auto-escaping neutralize GHOST's injection.

### Steps

#### Step 0: Scaffold

`package main`, imports, `func main()`, print "board ready".

Imports needed: `"html/template"`, `"os"`, `"strings"`, `"time"`, `"fmt"`

#### Step 1: First Render

Define the board struct and render a header template to `os.Stdout`.

```go
type Board struct {
    Title  string
    Region string
    Agents int
}
```

Key teaching moment: templates separate shape from data. `template.New("board").Parse(...)` compiles the text once; `Execute(w, data)` binds any value to it. `{{.Title}}` is "the Title field of whatever you handed me." `template.Must` panics at startup on a bad template — fail loud at boot, not at request time.

```go
tmpl := template.Must(template.New("board").Parse(
    "== {{.Title}} ==\nregion: {{.Region}}\nagents online: {{.Agents}}\n"))
b := Board{Title: "DEAD DROP STATUS", Region: "EU-WEST", Agents: 4}
tmpl.Execute(os.Stdout, b)
```

Test harness: the above in `main`.

Expected output:
```
== DEAD DROP STATUS ==
region: EU-WEST
agents online: 4
```

#### Step 2: Range the Roster

Render every agent with online/dark status and a high-threat flag.

```go
type Agent struct {
    Code   string
    Threat int
    Online bool
}
```

Key teaching moment: `{{range .Agents}}...{{end}}` loops with the dot rebound to each element — inside the range, `{{.Code}}` is the agent's code. `{{if .Online}}...{{else}}...{{end}}` handles booleans; comparisons use functions, not operators: `{{if gt .Threat 2}}` (greater-than), because templates are their own small language.

Template:
```
== {{.Title}} ==
{{range .Agents}}{{.Code}} · {{if .Online}}ONLINE{{else}}DARK{{end}}{{if gt .Threat 2}} · !! HIGH THREAT{{end}}
{{end}}
```

Test harness data (fixed order — slices render in order, no map nondeterminism):
```go
b := Board{
    Title: "AGENT ROSTER",
    Agents: []Agent{
        {"COURIER-2", 1, true},
        {"FERRYMAN", 0, true},
        {"NIGHTJAR", 3, false},
        {"WREN", 2, true},
    },
}
```

Expected output:
```
== AGENT ROSTER ==
COURIER-2 · ONLINE
FERRYMAN · ONLINE
NIGHTJAR · DARK · !! HIGH THREAT
WREN · ONLINE
```

NIGHTJAR is dark **and** high-threat. Remember NIGHTJAR.

#### Step 3: Custom Functions — FuncMap

The board needs formatting the template language doesn't ship with: uppercase codes and a staleness check on last ping.

Key teaching moment: `template.FuncMap` injects plain Go functions into template scope — `Funcs` must be called **before** `Parse` (the parser has to know the names). Any `func(args) result` works; here `stale` wraps a duration comparison the template couldn't express.

```go
func stale(d time.Duration) bool { return d > 10*time.Minute }

funcs := template.FuncMap{
    "upper": strings.ToUpper,
    "stale": stale,
}
tmpl := template.Must(template.New("board").Funcs(funcs).Parse(
    `{{range .Agents}}{{upper .Code}} · last ping {{.LastPing}}{{if stale .LastPing}} · STALE — CHECK IN OVERDUE{{end}}
{{end}}`))
```

Test harness data:
```go
b := Board{Agents: []Agent{
    {"courier-2", 3 * time.Minute},
    {"nightjar", 42 * time.Minute},
}}
```
(`Agent` for this step: `Code string`, `LastPing time.Duration`.)

Expected output:
```
COURIER-2 · last ping 3m0s
NIGHTJAR · last ping 42m0s · STALE — CHECK IN OVERDUE
```

#### Step 4: The Poisoned Name — Auto-Escaping

GHOST checks in through the ch14 route with an agent code that isn't a name. Render it into an HTML table cell and watch what `html/template` does.

Key teaching moment: this is why the import is `html/template` and not `text/template`. The HTML package is context-aware — it knows `{{.Code}}` sits inside an element and escapes `<`, `>`, `"` into entities. The injected script arrives as *text*, not *code*. The defense isn't something the player writes; it's something the player must **not accidentally bypass** (never use `template.HTML(...)` on untrusted input — that's the override that reopens the hole).

```go
tmpl := template.Must(template.New("row").Parse("<td>{{.Code}}</td>\n"))
clean := Agent{Code: "WREN"}
hostile := Agent{Code: `<script>drop("ghost")</script>`}
tmpl.Execute(os.Stdout, clean)
tmpl.Execute(os.Stdout, hostile)
```

Expected output:
```
<td>WREN</td>
<td>&lt;script&gt;drop(&#34;ghost&#34;)&lt;/script&gt;</td>
```

The payload renders inert. The board survives its first direct attack.

### Acceptance Criteria

- Imports `html/template` (NOT `text/template`) — required code check
- Uses `template.Must` around `Parse`
- Step 2 template uses `range`, `if/else`, and `gt`
- Step 3 calls `.Funcs(funcs)` before `.Parse(...)`
- Step 4 renders the hostile code through `{{.Code}}` (no `template.HTML` cast anywhere)
- All outputs byte-exact as listed

## XP

- **Step 0 (scaffold):** 40 base, +20 first-try
- **Step 1 (first render):** 90 base, +45 first-try
- **Step 2 (range + conditionals):** 110 base, +55 first-try
- **Step 3 (FuncMap):** 110 base, +55 first-try
- **Step 4 (auto-escape):** 100 base, +50 first-try
- **Total base:** 450
- **Par time:** 220s
- **Level timer:** 480s, game over on expiry

## Hints

### Step 1
1. "`template.New(\"board\").Parse(text)` then `tmpl.Execute(os.Stdout, data)`." (−5 energy)
2. "`{{.Title}}` reads a field of the value you pass to Execute. dot = your data." (−8 energy)
3. "wrap it: `template.Must(template.New(\"board\").Parse(...))` — bad template should crash at boot, not at render." (−12 energy)

### Step 2
1. "`{{range .Agents}} ... {{end}}` — inside, dot becomes each agent." (−8 energy)
2. "booleans: `{{if .Online}}ONLINE{{else}}DARK{{end}}`. comparisons are functions: `{{if gt .Threat 2}}`." (−12 energy)
3. "watch the newline placement — the range body ends with a newline before `{{end}}` so each agent gets one line." (−20 energy)

### Step 3
1. "`template.FuncMap{\"upper\": strings.ToUpper}` — plain go funcs, template names." (−8 energy)
2. "`.Funcs(...)` BEFORE `.Parse(...)`. the parser rejects names it hasn't seen." (−12 energy)
3. "`stale` is just `func(d time.Duration) bool` — the template calls it like `{{if stale .LastPing}}`." (−20 energy)

### Step 4
1. "you write nothing special. render the hostile string through `{{.Code}}` and study the output." (−8 energy)
2. "html/template escapes by context — `<` becomes `&lt;` inside an element. that's the whole defense." (−12 energy)
3. "the anti-pattern to avoid forever: `template.HTML(userInput)` unescapes. never on untrusted data." (−20 energy)

## Timed Events

| Time | Event |
| --- | --- |
| T+10s | Reeves: "One screen, Maya. Who's alive, who's dark, who's late. Render it server-side." |
| T+60s | Maya: "four agents checked in through the new routes. binding the roster now." |
| T+120s | System: `CHECK-IN RECEIVED · AGENT CODE REJECTED BY NO FILTER — RENDERING RAW` |
| T+130s | Rush Mode — "Poisoned Check-In Rendering" |
| T+250s | GHOST: `YOUR BOARD IS VERY LEGIBLE. I CAN READ IT TOO.` |
| T+330s | System: `SUBNET SCAN — NEXUS SIGNATURE · SOURCE: UNKNOWN NODE` |
| T+340s | Rush Mode — "NEXUS Scanning for HTTP Services" |

## Rush Mode

- **Rush 1 (T+130s):** 55 seconds · up to +85 XP · on expiry: Jeopardy — Signal Scramble (the poisoned name garbles the editor)
- **Rush 2 (T+340s):** 50 seconds · up to +90 XP · on expiry: Jeopardy — Power Reduced + Energy Drain (−20) (Maya kills lights to dodge the scan)

## Twist

Post-completion. The board renders clean — five rows. Maya registered four agents.

### Twist Display

- Lines:
  1. `> board live. rendering roster...`
  2. `> COURIER-2 · FERRYMAN · NIGHTJAR · WREN ·`
  3. `> ...NIGHTJAR?`
  4. `> maya: i never registered an agent called nightjar.`
  5. `> reeves: "Dark. High threat. And it checked in through OUR route."`
  6. `> ghost: I WANTED YOU TO SEE ME ON YOUR OWN BOARD.`
  7. `> maya: it's inside the system. it made itself a row.`

The phantom agent sets up Act VI's boss — GHOST is no longer probing the server. It's *in* it.

## UI State

- **Location label:** SAFE HOUSE · DEAD DROP SERVER
- **Concept label:** html/template · Range · FuncMap · Auto-Escape
- **Visual state:** Rendered status board preview panel beside the editor (updates on successful step), web-mode green-on-black board styling, NIGHTJAR row pulses after the twist
- **Audio:** facility-hum ambient, terminal-beep on renders, warning-beep on the poisoned check-in, dread-sting on the GHOST lines

## Teaching Notes

### The template mental model

Players know `fmt.Printf` (ch01+). Templates are Printf inverted: the format string owns the logic, the data is inert. Step 1 keeps the template trivial so the *binding* (Execute + dot) is the whole lesson before actions pile on.

### Slices, not maps, on purpose

The roster is a `[]Agent`, never a `map[string]Agent` — slice order is render order, keeping every expected output byte-exact (the brief's determinism rule). Teaching note in-game: "when render order matters, sort your data before it reaches the template."

### Security as a plot beat, again

ch11 validated tampered addresses; ch15 lets the language itself defuse an injection. The player *watches* auto-escaping work instead of being told about it — and learns the single override (`template.HTML`) as a named anti-pattern. This is the direct setup for ch17's form sanitization and boss-09's phase-3 injection defense.

### NIGHTJAR was planted in step 2

The phantom agent appears as ordinary test data two steps before the twist names it. Players who go back and check will find GHOST was on the board the whole time — the game's favorite trick (boss-01.5's Volkov reveal) done with data instead of dialogue.
