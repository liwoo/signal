# Boss — Director Vasik (Terminal 1 of 3)

**Act II · Floor 3 · Vasik's Terminal Channel**

## Go Concepts (Application)

- Structs (field declarations vs method declarations)
- Methods (value receivers, receiver syntax)
- The `error` interface, `errors.New`, sentinel error values
- Returning errors vs swallowing them (`return nil` in an error branch)
- Reading compiler output to locate syntax errors

Comprehensive application of ch05 (structs, methods) and ch06 (errors, sentinels). Zero new concepts.

## Story Context

Kira's trick worked on the machine — GHOST's scanner skips Maya's test-verified modules (ch06.2). It does not work on the man. Director Vasik has been reading the lock telemetry by hand since the server-east fault, and now his terminal cuts straight into Maya's editor. He's a programmer too, and this is a duel: he sends a `SecurityProfile` struct with three deliberately planted errors and seals every door on Floor 3. When his code compiles clean and runs correctly, the doors unseal. Every twenty seconds Maya stalls, he shuts down another wing of the building — and the fifth wing is the one with Kira's held-open door.

Reeves: "He's baiting you. Fine. Beat him at his own game — *read* the code."

## Mechanic

### Layout

```
┌──────────────────────────────────────────────────────┐
│      DIRECTOR VASIK · TERMINAL 1 · 02:00      [minimap]│
├─────────────────────────┬────────────────────────────┤
│  VASIK'S CODE           │  YOUR CORRECTED VERSION     │
│  (read-only diff panel) │  (editor)                   │
│                         │                             │
│  type SecurityProfile   │  // rewrite his code so it  │
│  struct { ... }         │  // compiles AND behaves    │
│                         │                             │
│  func (s SecurityProfile│                             │
│    Validate() error {   │                             │
│  ...                    │                             │
├─────────────────────────┴────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  WINGS OPEN: 5/5 · NEXT SHUTDOWN 0:20│
└──────────────────────────────────────────────────────┘
[Building minimap top-right: five wings, lit → dark as they shut]
```

Split-pane debugging duel: Vasik's broken code on the left (read-only, diff-highlighted against the player's editor), the player's corrected version on the right. The player may submit at any time; Vasik's evaluator compiles it and taunts based on what's still wrong. This is the game's first **debugging boss** — the player writes almost nothing new; they *read*.

### Vasik's Broken Code (left pane, read-only)

```go
package main

import (
	"errors"
	"fmt"
)

var ErrBadLevel = errors.New("invalid level")

type SecurityProfile struct {
	Name  string
	Level int
}

func (s SecurityProfile) Clearance() string {
	if s.Level >= 3 {
		return "RESTRICTED"
	}
	return "FULL"
}

func (s SecurityProfile Validate() error {
	if s.Level < 0 {
		return nil
	}
	return nil
}

func main() {
	profiles := []SecurityProfile{
		{Name: "M. CHEN", Level: 4},
		{Name: "K. VOLKOV", Level: 2},
		{Name: "INTRUDER", Level: -1},
	}
	for _, p := range profiles {
		if err := p.Validate(); err != nil {
			fmt.Println(p.Name, "REJECTED:", err)
			continue
		}
		fmt.Println(p.Name, "clearance:", p.Clearance())
	}
}
```

Vasik's test data is itself a taunt: `M. CHEN, Level 4` — he knows exactly who is in his building.

### The Three Planted Bugs (phase structure)

**Bug 1 — Compile error (expected fix window: 0–35s)**
`func (s SecurityProfile Validate() error {` — missing `)` after the receiver. Nothing runs until this is fixed. Vasik's evaluator relays the real compiler output (`missing ',' in parameter list` pointing at the receiver line — the compiler thinks `Validate` is a second parameter name) — the compiler is the player's ally, and the boss teaches them to read it.

Fix: `func (s SecurityProfile) Validate() error {`

**Bug 2 — Logic bug (expected fix window: 35–75s)**
`Clearance()` has its returns swapped: Level ≥ 3 gets `"RESTRICTED"`, everyone else gets `"FULL"` — the building would hand full clearance to visitors. Once bug 1 is fixed, the symptom is visible in the output: `M. CHEN clearance: RESTRICTED` / `K. VOLKOV clearance: FULL`.

Fix: Level ≥ 3 returns `"FULL"`, otherwise `"RESTRICTED"`.

**Bug 3 — Subtle error-handling bug (expected fix window: 75–120s)**
`Validate()` detects the invalid level — then returns `nil` anyway. The sentinel `ErrBadLevel` is declared at package level and never returned: the clue is an error value that exists but is used nowhere. Symptom: `INTRUDER` (Level −1) sails through validation and prints a clearance line instead of being rejected. This compiles, looks plausible, and is the classic swallowed-error bug from real production Go.

Fix: `return ErrBadLevel` inside the `s.Level < 0` branch.

### Corrected Reference Solution

```go
func (s SecurityProfile) Clearance() string {
	if s.Level >= 3 {
		return "FULL"
	}
	return "RESTRICTED"
}

func (s SecurityProfile) Validate() error {
	if s.Level < 0 {
		return ErrBadLevel
	}
	return nil
}
```

(Everything else — package clause, imports, `ErrBadLevel`, struct, `main` — carries over unchanged.)

### Expected Output (exact, graded)

```
M. CHEN clearance: FULL
K. VOLKOV clearance: RESTRICTED
INTRUDER REJECTED: invalid level
```

### Timer

- **Duration:** 120 seconds, hard cap. No per-wave timers — one continuous duel.
- **Wing clock:** every 20 seconds *without a submission*, Vasik shuts a wing (minimap wing goes dark, `door-slide` + `warning-beep`). Any submission — even a failing one — resets the 20s wing clock. Submitting garbage to stall is a legitimate tactic; Vasik mocks it, but the wings stay open.
- **No time penalty for wrong attempts.**

### Failure

Timer reaches 0, or all 5 wings shut (earliest possible: T+100s with zero submissions). Doors stay sealed, energy drops to 20%, and the duel replays with a 90-second timer. No hearts — the wings and the clock are the only danger.

### Victory

Submission compiles clean and produces the exact expected output — all three bugs fixed. The Floor 3 doors unseal. **Sub-60s plot pivot:** if the winning submission lands under 60 seconds, Vasik is visibly rattled — SYS relays `VASIK: "Faster than expected."` and the flag `vasik_rattled` is set, unlocking the Act IV dialogue branch where Vasik makes Maya an offer.

## XP

- **Bug 1 fixed (compiles):** 150 base
- **Bug 2 fixed (clearance logic):** 150 base
- **Bug 3 fixed (error returned):** 200 base
- **Sub-60s victory:** +250
- **Total possible:** 750 XP
- **AI tokens earned:** +2

## Timed Events

| Time | Event |
| --- | --- |
| T+0s | Vasik: "I know you're in my building, Maya Chen. Your modules test very cleanly. Too cleanly." |
| T+5s | Vasik: "My code. Three mistakes. The doors open when it compiles. You have two minutes." |
| Any wing shutdown | Vasik: "The building has five wings. Four now." (count decrements each time) |
| First failed compile submission | Vasik: "You submitted *that*? Amusing." |
| First compiles-but-wrong submission | Vasik: "It compiles. It is still wrong. Tick tock." |
| T+60s (unsolved) | GHOST broadcast: "T-MINUS EIGHT HOURS." · Vasik: "Even it grows impatient." |
| T+100s | System: "ONE WING REMAINING — EAST STAIRWELL" + alert-beep |
| Victory <60s | SYS: `VASIK: "Faster than expected."` → sets `vasik_rattled` dialogue flag |

## Twist

The terminal disconnects and the doors unseal — but Vasik's session leaves a residual buffer on screen, and Maya reads it before it clears: his `SecurityProfile` validator wasn't a toy built to taunt her. It's live. He's running it against the guard roster, and the current audit target is `K. VOLKOV`, flagged for an anomalous shift pattern. Vasik suspects a mole; Kira's cover is cracking, and she knows it — because before Maya can even tell Reeves, an unregistered channel opens. Kira's first direct words. (Sets up Act III: Kira makes contact, and ch07's descent toward the archive servers.)

### Twist Display

- Lines (types at 22ms/char):
  1. `> vasik terminal disconnected — floor 3 doors unsealing`
  2. `> residual buffer: validation batch 7 of 7`
  3. `> audit target: K. VOLKOV · badge 2231 · flag: ANOMALOUS SHIFT PATTERN`
  4. `> maya: he's auditing volkov's profile. he knows something's wrong with her.`
  5. `> maya: kira's cover is cracking.`
  6. `> [UNREGISTERED CHANNEL] kira: you passed his little test. mine is next. we need to talk.`

## UI State

- **Location label:** FLOOR 3 · VASIK'S TERMINAL
- **Concept label:** Debugging · Structs · Methods · Errors
- **Visual state:** Split-pane diff view (Vasik's code read-only left, editor right, changed lines highlighted); building minimap top-right with five lit wings that go dark on shutdown; wing-clock bar along the bottom refilling on every submission; Vasik's taunts land in chat with a distinct crimson tint
- **Mobile:** diff panel becomes a collapsible drawer with a "Vasik's Code" / "Your Code" tab toggle; minimap hidden — wing count shown as text ("WINGS OPEN: 4/5")
- **Audio:** boss-loop music, dark-drone-2 ambient, door-slide + warning-beep on each wing shutdown, keypad-beep on submission, alert-beep at one wing remaining, dread-sting on twist line 3

## Teaching Notes

### The game's first debugging boss

Say it plainly in the intro comms: this fight is not about writing code, it's about *reading* it. Lockmaster (boss-01) was combat — tabs, ammo, hearts. The Relay Interceptor (boss-01.5) was data processing — waves of input to filter, sort, and reconstruct under per-wave timers. Vasik Terminal 1 is a debugging duel: broken code you didn't write, one continuous clock, and an opponent who talks back. Three bosses, three mechanically distinct formats — and this one previews the "fix the broken code" steps that become standard chapter fare in Act VIII, plus Vasik Terminals 2–4.

### The three bugs mirror the real severity ladder

Bug 1 is syntax — the compiler catches it and even tells you where; the lesson is to read compiler output instead of squinting at code. Bug 2 is logic — the compiler is silent, but the output betrays it; the lesson is comparing actual vs expected output like the test tables from ch06.2. Bug 3 is error handling — nothing catches it: the program compiles, runs, and quietly grants an intruder clearance. Swallowed errors (`return nil` in a branch that detected a failure) are the most expensive bug class in production Go, which is exactly why Vasik hid his deepest trap there.

### The unused sentinel is the clue

`ErrBadLevel` is declared and never returned — a real code-review smell. Players who absorbed the ch06 sentinel preview will spot it immediately; players who don't will find bug 3 by diffing the output (`INTRUDER` gets a clearance line instead of `REJECTED`). Both paths are legitimate detective work, and both were taught in Act II.

### Zero new concepts, full Act II coverage

Struct fields vs methods and receiver syntax are ch05; `error`, `errors.New`, sentinels, and the return-the-error discipline are ch06; verifying behavior against exact expected output is ch06.2's whole worldview. The boss adds only pressure. And the story closes the 06.2 loop: Maya's tests hid her from GHOST's scanner, but not from a human reading logs — tests are camouflage, not armor.

### Stall mechanics reward engagement

Because any submission resets the wing clock, the dominant strategy is to submit early and often — which is precisely the habit we want: compile relentlessly, let the toolchain narrate your progress. The design makes the pedagogically correct behavior also the tactically correct one.
