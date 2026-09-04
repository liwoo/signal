# Chapter 2 — Door Code

**Act I · Sublevel 3 · Cell B-09 Keypad**

> Built to the [level playbook](./level-playbook.md). Intro cinematic 6 shots / outro 4 shots, beginner analogy card → walkthrough video → recap, zen debrief with before/after examples, objective bar + hint ladder, reward cards per step. Deviations from the playbook are noted inline.

## Go Concepts

- For loops (`for i := 1; i <= 10; i++`)
- Switch/case (expressionless `switch { case cond: }`)
- If/else chains
- Grouped constants (`const ( ... )`) — taught in beginner mode, rewarded in zen

## Story Context

Maya is through the handshake but still locked in. The cell door has a keypad that runs a 1–10 classification sequence; guessing just locks her out longer. She needs you to write the logic that maps each code to its door action. When the sequence lands and the lock turns, a knock comes from the next cell — B-10 — and a stranger says her name.

## Steps

The challenge is a four-step progression. Code carries forward between steps 1→3 (`starterCode: null`); step 4 hands the player a fresh scaffold.

### Step 1 — SCAFFOLD (`chapter-02:scaffold`)

Set up the program skeleton so the keypad terminal initializes.

```go
package main

import "fmt"

func main() {
    fmt.Println("ready")
}
```

- **Expected:** valid `package main`, `import "fmt"`, `func main()`.
- **XP:** base 50, first-try +25, par 30s. No rush.

### Step 2 — LOOP (`chapter-02:loop`)

Print each code 1–10 on its own line. *Just the numbers — nothing else* (prevents jumping ahead to step 3).

```go
for i := 1; i <= 10; i++ {
    fmt.Println(i)
}
```

- **Expected output:** `1\n2\n3\n…\n10`
- **Required code:** `for`, `Println(i`
- **XP:** base 50, first-try +25, par 45s. No rush.

### Step 3 — CLASSIFY (`chapter-02:classify`)

Modify the loop to print the code number, a space, then its access level.

```
1-3  → DENY
4-6  → WARN
7-9  → GRANT
10   → OVERRIDE
```

Reference solution (either `switch` or `if/else` accepted):

```go
for i := 1; i <= 10; i++ {
    switch {
    case i <= 3:
        fmt.Println(i, "DENY")
    case i <= 6:
        fmt.Println(i, "WARN")
    case i <= 9:
        fmt.Println(i, "GRANT")
    default:
        fmt.Println(i, "OVERRIDE")
    }
}
```

- **Exact output:** `1 DENY … 10 OVERRIDE`
- **Required code:** `for`, `DENY`, `WARN`, `GRANT`, `OVERRIDE`
- **Rush:** `CELL B-10 IN DANGER`, 40s, `energy_drain` on expiry, +30s bonus time.
- **XP:** base 100, first-try +50, par 90s.

### Step 4 — REWRITE (`chapter-02:rewrite`)

Redundancy protocol: re-implement the classification with the *other* control structure (switch → if/else, or if/else → switch). Same output. Starts from a fresh scaffold with the loop stubbed to `fmt.Println(i, "TODO")`.

- **Exact output:** `1 DENY … 10 OVERRIDE`
- **Rush:** `REDUNDANCY CHECK`, fires at T+3s, +45s bonus time.
- **XP:** base 75, first-try +25, par 60s.

## Timed Events (step 3)

| Time | Event |
| --- | --- |
| T+12s | Two slow knocks from Cell B-10 — someone's in there |
| T+28s | Three knocks — a distress signal |
| T+30s | Rush Mode — "CELL B-10 IN DANGER" |

## Level Timer

- **Limit:** 240s across the whole challenge, `gameOverOnExpiry: true` (game over = Maya captured).
- **Par:** 90s.

## Hints

Three per step, authored nudge → directional → nearly-there, paid in energy (see step data). Never the full solution. Revealed one at a time in order; the HINT button pulses after 2 failed attempts or 75s idle.

## Cinematics

**Intro — 6 shots (~23s):** wide + title card `CHAPTER 2 / DOOR CODE` → keypad insert (amber LED) → tracking (Maya crosses to the door, walk → keypad) → reject insert (amber flash + shake) → corridor guard walking at the lens (glitch in, dutch tilt, boots + dread sting) → keypad insert under a cyan flash ("she needs you").

**Outro — 4 shots (~15s):** sequence accepted (green flash, `SEQUENCE ACCEPTED` card, lock + door-slide) → the knock from B-10 (9px slam, glitch, warm flash) → the voice ("Maya? Maya Chen?") → she resolves, corridor sealed, `CHAPTER 2 COMPLETE / NEXT · SHAFT CODES` card.

Data in `src/lib/sprites/scenes.ts` (`CHAPTER_02_INTRO_SCENES`, `CHAPTER_02_COMPLETE_SCENES`); enforced by the `level 2 cinematics` block in `scenes.test.ts`.

## Beginner Mode

Analogy card → walkthrough video → recap with hotspots (playbook §4/§5 order).

- **Analogy card:** `DoorCodeMachine` (card view) — the sealed folder (const group), revolving door (for loop), sorting room (switch), with the analogy map modal.
- **Video:** `DoorCodeVideo` — ~26 beats, reading-length pacing, sound (door-slide on arrival, terminal-beep on each print, handshake-confirm on done), chaptered scrubber and watch-again. Teaches const group → for (init/cond/post) → switch (first-match, no break, default) before the ten spins.
- **Recap:** the full program with hotspots on `const (`, a name tag, the `for`, `switch {`, cases, and `default`.

New analogies introduced (see `beginner-mode` skill): sealed folder + name tags = `const ( )`, revolving door = `for`, counter/condition/tick signs = init/cond/post, sorting room = `switch`, labelled bay = `case`, DEFAULT bay = `default`, checkpoint booth = `if/else`.

## Zen Rules

Step-keyed in `src/lib/game/zen.ts`, each with an `isRelevant` guard and a before/after example in `zen-examples.ts`:

- `chapter-02:scaffold` → grouped_import, package_import_sep, import_func_sep (shared with ch01 scaffold)
- `chapter-02:loop` → `simple_increment` (`i++`, not `i = i + 1`)
- `chapter-02:classify` → `switch_over_ifelse`, `no_unnecessary_break`, `use_constants_labels`

## Twist (post-completion)

A voice from Cell B-10 says Maya's name. Someone in there knows her.

### Twist Display

- Audio: two knocks, then three knocks (in the outro cinematic).
- Lines (`chapter02Twist`):
  1. `> ...`
  2. `> "Maya? Maya Chen?"`
  3. `> maya: ...someone knows my name.`
  4. `> maya: i need to get to B-10.`

## UI State

- **Location label:** CELL B-09 · KEYPAD
- **Concept label:** For Loops · Switch/Case · If/Else
- **Chat state:** Maya is tense, mentions the knocking during the rush.
- **Next:** Chapter 3 — Shaft Codes (the corridor to B-10 is sealed; she takes the vent).
