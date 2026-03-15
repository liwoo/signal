---
name: go-concept-animation
description: >
  Use this skill whenever introducing a new Go programming concept that needs
  to be explained visually to beginners. Triggers when the user asks to explain,
  illustrate, animate, or teach any Go concept — including but not limited to:
  variables, functions, packages, imports, structs, interfaces, goroutines,
  channels, error handling, maps, slices, pointers, closures, or methods.
  Also triggers when the user says things like "add a new scene", "introduce X
  concept", "animate how X works", or "show the next concept". Always use this
  skill before writing any animation code — it defines the entire design system,
  analogy model, and scene structure that all Go animations must follow.
---

# Go Concept Animation Skill

This skill governs how every new Go concept is introduced visually. All
animations in this course share one physical universe — the Go Appliance office
— and one analogy system. Never break the analogy. Never start a new universe.
Every new concept is a new event inside the same office.

---

## The Core Principle

**Analogy first. Code last.**

The learner must understand what is happening physically before they see a
single line of syntax. Every animation has two phases:

1. **The Analog Card** — a tappable paper form that maps the concept to a
   physical object the learner can already picture.
2. **The Office Animation** — a cutaway room inside the appliance where workers
   carry out the exact same sequence, scene by scene.

Only after both phases does the Go code appear — labelled, line by line, mapped
back to the physical events.

---

## The Analogy System

This is the canonical mapping. **Never invent new physical objects.** Extend
existing ones.

| Physical Object | Go Concept | Notes |
|---|---|---|
| The Appliance | Go runtime | The machine that runs everything |
| Programme package | `.go` file / programme | Slides into the slot |
| Package name field | `package main` | Label on the outside of the package |
| Required Attachments list | `import` | Checklist inside the package, collected from shelf |
| Envelope | `func` (function) | Lives inside the package |
| Front of envelope | Function params `(...)` | "Required Information" — must be filled before opening |
| Back of envelope | Return type | "Expected Information" — what comes back when done |
| Envelope body `{ }` | Function instructions | The lined pages inside |
| Small envelope | Variable (`var` / `:=`) | Colour-coded by type |
| Blue small envelope | `string` variable | Word stickers live here |
| Red small envelope | `int` variable | Number stickers live here |
| Yellow small envelope | `float64` variable | Decimal stickers |
| Green small envelope | `bool` variable | Yes/No stickers |
| Sealed envelope (🔒) | `const` | Cannot be opened and restickered |
| Sticker | Value / data | The content inside any small envelope |
| Postal slot in dividing wall | Function call | Alice posts to Bob's dept. |
| Reply through postal slot | Return value | Bob posts back to Alice |
| MAIN dept. (left room) | Caller / `main()` scope | Alice's workspace |
| FMT dept. (right room) | `fmt` package / called function | Bob's workspace |
| New dept. (new right room) | Any new imported package | Add a new room to the right |
| Display panel (bottom) | Terminal / `stdout` | Where printed output appears |
| Red blinking button 🔴 | Programme running | Always blinks from start |
| Green button ✅ | Programme complete / `return` | Pressed when main envelope done |
| Attachments shelf | Go standard library | Where address labels live |

### Extending the analogy for new concepts

| Go Concept | Physical Extension |
|---|---|
| `struct` | A **folder** with labelled slots for multiple small envelopes |
| `interface` | A **job description card** — any worker who can do these tasks qualifies |
| `goroutine` | A **second worker** hired mid-task, works in parallel |
| `channel` | A **shared pigeonhole tray** between two workers |
| `slice` | A **stack of same-colour envelopes**, expandable |
| `map` | A **filing cabinet** with labelled drawers, each holding a sticker |
| `error` | A **red flagged envelope** — returned on the back when something went wrong |
| `nil` | An **empty envelope** with no sticker inside |
| `pointer` | A **sticky note with a locker number** — not the sticker itself, but where to find it |
| `defer` | A **"do this last" sticky note** pinned to the outside of the envelope |
| `for` loop | Alice walking the **same path repeatedly**, once per item |
| `if` / `else` | A **decision sign** on the floor — turn left or right |

---

## The Design System

All animations use these exact tokens. Never introduce new colours arbitrarily.

```js
const T = {
  hw:       "'Caveat', cursive",        // handwriting — used on all paper objects
  mono:     "'Share Tech Mono', mono",  // terminal / code output
  ui:       "'DM Sans', sans-serif",    // all UI labels
  paper:    "#fdf8ee",                  // card/envelope background
  line:     "#e2d9c4",                  // ruled lines on paper
  ink:      "#2c1810",                  // dark handwritten text
  inkMid:   "#5c3d2e",
  inkLight: "#8b6b52",
  inkFade:  "#c5b49a",                  // placeholder italic text
  red:      "#c0392b",                  // form header bar colour
  steel:    "#0f1623",                  // appliance body
  steelMid: "#1a2236",
  steelLt:  "#2d3f5c",
  green:    "#00d4aa",                  // success / complete
  amber:    "#f59e0b",                  // MAIN dept ceiling light
  blue:     "#3b82f6",                  // FMT dept / string type
  pink:     "#f472b8",                  // func envelope type
  purple:   "#c084fc",                  // package keyword
};
```

**Envelope type colours** (for small variable envelopes):
- `string` → `#3b82f6` blue
- `int` → `#ef4444` red  
- `float64` → `#f59e0b` amber
- `bool` → `#22c55e` green

**Envelope sizing rule:**
- `func` envelopes: **78px wide**, tall flap, large font — these are the main work items
- Variable envelopes: **50px wide**, compact — these are data containers

---

## The Office Room Layout

The office is a fixed layout. Departments are added by extending to the right.

```
┌──────┬───────────────────────┬────────┬──────────────────┐
│      │                       │        │                  │
│ PKG  │    MAIN dept.         │ WALL   │   FMT dept.      │
│ SLOT │    Alice 👩‍💻           │ (post) │   Bob 👨‍💻         │
│      │    worktable          │  slot  │   fmt table      │
│      │    shelf              │   📪   │                  │
│      │    🔴 button          │        │                  │
├──────┴───────────────────────┴────────┴──────────────────┤
│           DISPLAY PANEL (terminal)                       │
└──────────────────────────────────────────────────────────┘
```

**Fixed positions (as % of office width/height):**

```js
const PA = {
  DOOR:      { x:11, y:28 },   // package slot — Alice picks up package here
  SHELF:     { x:17, y:22 },   // attachments shelf
  MAIN_DESK: { x:26, y:52 },   // Alice's worktable
  WALL_SLOT: { x:48, y:47 },   // Alice posts through wall here
  FMT_SLOT:  { x:62, y:47 },   // Bob receives / sends through wall here
  FMT_DESK:  { x:74, y:47 },   // Bob's desk
};
```

**Adding a new department:**
- Each new `import`ed package gets its own room further right
- Add a new dividing wall at ~`wallX + 46%` of total width
- New worker gets a name and emoji, a desk, and a ceiling light in their dept colour

---

## Scene Structure

Every animation is a sequence of named scenes. Each scene has this shape:

```js
{
  id:          "snake_case_name",
  narr:        "Narrative shown to the learner. Plain English.\nUse \\n for line breaks.\nDescribe what is physically happening in present tense.",
  workers:     [ { id, emoji, label, x, y, action } ],
  pkg:         true | false,           // is the package in the slot?
  fmtBox:      true | false,           // is fmt label on shelf?
  envs:        [ envelope objects ],   // envelopes visible in the room
  postalDir:   null | "to_fmt" | "to_main",
  postalLabel: "Text shown on floating label when postal active",
  display:     ["line 1", "line 2"],   // terminal lines — keep minimal
  displayResult: true | false,         // true = final result highlighted green
  completeBtn: "locked" | "pressed",   // always "locked" until programme done
  highlight:   [0, 1, 2],             // code line indices to highlight
}
```

**Worker action values and their label colours:**
- `"read"` → amber — reading a label or sticker
- `"create"` → blue — making a new envelope
- `"post"` → green — posting through the wall slot
- `"collect"` → green — picking something up
- `"open"` → pink — opening an envelope
- `"wait"` → grey — blocked, waiting for reply
- `"done"` → green (with glow) — finished

**Rules for display panel:**
- Only show `"$ go run main.go"` while running
- Only show actual programme output (e.g. `"Alice"`) when produced
- Never show internal log messages, fetch notices, or status text
- Keep it to 2 lines maximum at any time

**Rules for postalLabel:**
- Format: `"TO: recipient  |  REQ: what is attached"`
- For replies: `"REPLY: result or done ✓"`
- Keep under 50 characters

---

## Standard Scene Sequence

Every new concept animation follows this backbone. Add concept-specific scenes
in the middle (marked ✦).

```
1.  idle          — office empty, appliance dark, red button blinking
2.  package_in    — package slides in, Alice reads label (highlight: package main)
3.  check_attach  — Alice walks to shelf, collects required address labels (highlight: import)
4.  open_main     — Alice opens main envelope at worktable (highlight: func main)
  ✦ [concept scenes go here]
N-2 alice_waiting — Alice back at desk, waiting, red button blinking
N-1 fmt_sends     — Bob sends reply + result through slot, display lights up
N   complete      — Reply arrives, button goes green ✅, Alice presses it
```

### The Red Button Rule

The complete button **always exists from scene 1** and **always blinks red**
using `animation: "blinkRed 1s step-end infinite"` until the very last scene,
when it snaps to green with a pop animation. This communicates: the programme
is running the entire time. It is never hidden.

---

## The Analog Card

Every new concept needs a card section. The card always has:

1. **Package Name field** — `package main` written in handwriting font
2. **Required Attachments** — checkboxes, one per import
3. **The envelope** — with front/back flip
   - Front: "Required Information" field (params)
   - Back: "Expected Information" field (return type)
   - Body: lined instructions in handwriting
4. **Any new concept object** — described below

**Card rules:**
- All printed labels: `fontSize: 9`, `fontFamily: T.ui`, `textTransform: "uppercase"`, `letterSpacing: 1`, `color: T.inkLight`
- All filled-in values: `fontFamily: T.hw`, `fontSize: 15–19`, `color: T.ink`
- Highlight ring on active element: `box-shadow: "0 0 0 2px {color}, 0 0 12px {color}44"`
- Explanation panel below: always shows the selected element's description
- Code panel to the right: always highlights the mapped line(s)

**New concept card additions:**

| Concept | Card object to add |
|---|---|
| `struct` | A tabbed folder below the envelope, with named slots |
| `slice` | A stack of same-coloured small envelopes with a count badge |
| `map` | A miniature filing cabinet with drawer labels |
| `goroutine` | A second envelope with a ⚡ badge — "processed in parallel" |
| `channel` | A shared in-tray between two envelope sections |
| `error` | A red-flagged section on the back of the envelope |
| `pointer` | A locker number sticker pointing to another envelope |

---

## How to Build a New Concept Animation

### Step 1 — Map the concept to the analogy

Before writing any code, write out:
- What physical object represents this concept?
- Where does it live in the office? (shelf, worktable, postal slot, new dept?)
- What does the worker do with it?
- What goes on the front and back of the envelope?
- Does it require a new dept. room on the right?

### Step 2 — Write the scenes

Write the scene array in plain English first. Each scene = one physical action.
Keep scenes atomic — one thing happening per scene. Aim for 8–12 scenes total.

The concept-specific scenes (✦) should show:
1. Alice encountering the concept for the first time (finding it, reading it)
2. Alice doing the work (creating, filling, posting)
3. Any cross-dept communication via the postal slot
4. The result appearing on the display

### Step 3 — Write the card

Map every part of the new concept to a tappable card section. Every tappable
zone must have a corresponding code line it highlights.

### Step 4 — Write the code panel

The full programme code goes in `CARD_CODE`. Every meaningful line gets:
- A `color` (from the design token palette)
- A `label` (3–6 words, plain English, e.g. `"small blue name envelope"`)
- A `scene` id (so hovering the line references the scene)

### Step 5 — Check the rules

Before outputting the component, verify:
- [ ] Red button visible from scene 1, blinks throughout
- [ ] Display panel shows ≤2 lines, no internal log messages
- [ ] `func` envelope is noticeably larger than variable envelopes (78px vs 50px)
- [ ] Postal slot is in the dividing wall, not the outer wall
- [ ] Envelope travels horizontally through the wall slot (→ or ←)
- [ ] Reply comes back before complete button turns green
- [ ] Analogy card has front/back flip on all function envelopes
- [ ] Code appears only after the animation, not before
- [ ] New departments are added to the right, not replacing existing ones

---

## Reusable Components

These components are stable across all animations. Copy them verbatim and do
not redesign them. For full implementations see `references/components.md`.

| Component | Purpose |
|---|---|
| `<SHLine line={}>` | Syntax-highlighted single code line |
| `<CodePanel highlightLines annotate>` | Full code block with highlight + annotation pills |
| `<Worker w={}>` | Animated worker chip with label and action colour |
| `<EnvChip env={}>` | Envelope chip — auto-sizes for func vs variable type |
| `<OfficeRoom sc={}>` | The full two-room office with all fixed elements |
| `<AnalogCard>` | Tappable paper card with code panel |
| `<Terminal lines result>` | Display panel output |

---

## Tab Structure

Every animation is presented in two tabs:

```
[ 📋 The Package Card ]  [ 🏭 Inside the Appliance ]
```

- Tab 1 always comes first — learner must understand the analogy before watching
- Tab 2 has the office animation with scene dots, Back/Next, and Auto-play
- Below both tabs: the **Analogy Map** — a grid of `{physical object} → {Go code}` pills

---

## What NOT to Do

- ❌ Do not show code before the animation is complete
- ❌ Do not use the terminal to log internal state ("fetching fmt...", "ready", etc.)
- ❌ Do not make variable envelopes the same size as function envelopes
- ❌ Do not animate the import step as posting — Alice goes to the shelf, not the slot
- ❌ Do not hide or remove the red button at any point
- ❌ Do not invent new physical metaphors — extend the existing ones
- ❌ Do not add a new concept without a corresponding card section
- ❌ Do not use Inter, Roboto, or Arial — always use DM Sans + Caveat + Share Tech Mono
- ❌ Do not clutter the office with more than 3 envelopes visible at once
- ❌ Do not animate both workers doing the same thing simultaneously

---

## Reference Files

- `references/components.md` — Full source for all reusable components
- `references/design-tokens.md` — Complete token list with usage examples
- `references/analogy-extensions.md` — Detailed physical descriptions for each extended concept
