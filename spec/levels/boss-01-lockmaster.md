# Boss 01 — The Lockmaster

**Act I Boss · Sublevel 3 · Server Room**

## Story Context

Maya reaches the server room. The Lockmaster — an AI-controlled security mainframe — guards the exit from Sublevel 3. It controls every lock, camera, and blast door. Maya has a hijacked weapon terminal. The player writes the targeting code. Miss too many shots and the Lockmaster's countermeasures take Maya down.

## Go Concepts (Applied)

Everything from Act I chapters 1-3:

- Program structure (`package`, `import`, `func main`)
- Functions with parameters and return values
- Multiple return values
- Slices and `len()`
- For loops and range
- If/else branching
- `fmt.Sprintf` for string formatting

No new concepts introduced — pure application under pressure.

## Combat Overview

6 turns to defeat. Each turn: boss telegraphs → player codes → execute → hit or miss.

- **Boss HP:** 100
- **Player hearts:** carried from previous chapters (3 starting, max 5)
- **Turn window:** 10s → shrinks by 1s per turn (min 5s)
- **Miss penalty:** lose 1 heart
- **0 hearts:** game over

## Weapon Subsystem Tabs

Three editor tabs replace the normal code/mission/library/notes:

| Tab | File | Signature | Purpose |
|---|---|---|---|
| AIM | `aim.go` | `func Aim(sector int) (int, int)` | Convert sector ID to x,y pixel coordinates |
| LOAD | `load.go` | `func Load(threat string) []string` | Return correct ammo sequence for a threat type |
| FIRE | `fire.go` | `func Fire(x, y int, ammo []string) string` | Combine aim + load, return `"HIT"` or reason for miss |

### Starter code

**aim.go**
```go
func Aim(sector int) (int, int) {
	// Sectors map to grid positions:
	//   1=(128,160)  2=(256,160)  3=(384,160)
	//   4=(128,320)  5=(256,320)  6=(384,320)
	//   7=(128,480)  8=(256,480)  9=(384,480)
	return 0, 0
}
```

**load.go**
```go
func Load(threat string) []string {
	// Threat types and ammo:
	//   "shield"  → 3x "pierce"
	//   "armor"   → 2x "blast"
	//   "exposed" → 1x "pulse"
	return []string{}
}
```

**fire.go**
```go
func Fire(x, y int, ammo []string) string {
	// Validate coordinates and ammo, return "HIT" if ready
	if x == 0 || y == 0 {
		return "NO TARGET"
	}
	if len(ammo) == 0 {
		return "NO AMMO"
	}
	return fmt.Sprintf("FIRE %d,%d x%d", x, y, len(ammo))
}
```

## Turn Sequence

### Turn 1 — First Lock (10s window)

**Telegraph:** `LOCKMASTER activating sector 3 lock...`
**Hint:** `aim at sector 3 — check the grid`
**Active tab:** aim.go
**Task:** Return `(384, 160)` for sector 3.

```go
// test harness
func main() {
	x, y := Aim(3)
	fmt.Println(x, y)
}
// expected: "384 160"
```

**Damage on hit:** 20 HP
**Canvas:** Lockmaster's sector 3 node glows. On hit: node explodes. On miss: EMP pulse hits Maya.

---

### Turn 2 — Shield Array (9s window)

**Telegraph:** `LOCKMASTER deploying SHIELD ARRAY — 3 nodes`
**Hint:** `load piercing rounds to match the shield nodes`
**Active tab:** load.go
**Task:** Return `["pierce", "pierce", "pierce"]` for threat `"shield"`.

```go
func main() {
	ammo := Load("shield")
	fmt.Println(ammo)
}
// expected: "[pierce pierce pierce]"
```

**Damage on hit:** 15 HP
**Canvas:** Shield shimmer around Lockmaster. On hit: shields shatter. On miss: reflected blast hits Maya.

---

### Turn 3 — Exposed Core (8s window)

**Telegraph:** `LOCKMASTER core EXPOSED at sector 7!`
**Hint:** `aim fast — the core is only exposed for a moment`
**Active tab:** aim.go
**Task:** Return `(128, 480)` for sector 7.

```go
func main() {
	x, y := Aim(7)
	fmt.Println(x, y)
}
// expected: "128 480"
```

**Damage on hit:** 20 HP
**Canvas:** Core pulses bright. On hit: direct core damage, sparks fly. On miss: core re-shields, counterattack.

---

### Turn 4 — Full Sequence (7s window)

**Telegraph:** `LOCKMASTER charging EMP BLAST from sector 5`
**Hint:** `wire it together — aim, load, and fire`
**Active tab:** fire.go
**Task:** Update `Fire()` to return `"HIT"` when coordinates and ammo are valid. Then the harness calls all three:

```go
func main() {
	x, y := Aim(5)
	ammo := Load("armor")
	result := Fire(x, y, ammo)
	fmt.Println(result)
}
// expected: "HIT"
```

Player must update `fire.go` to return `"HIT"` when x > 0, y > 0, and ammo is non-empty.

**Damage on hit:** 15 HP
**Canvas:** Full attack sequence — Maya aims, loads, fires. On hit: EMP blast deflected back. On miss: EMP hits Maya.

---

### Turn 5 — Reroute (6s window)

**Telegraph:** `LOCKMASTER rerouting — sector grid SHIFTED`
**Hint:** `the grid shifted by +64 on each axis — update Aim`
**Active tab:** aim.go
**Task:** The sector grid has shifted. Sector 5 is now `(320, 384)` instead of `(256, 320)`. Player must add `+64` offset to both coordinates.

```go
func main() {
	x, y := Aim(5)
	fmt.Println(x, y)
}
// expected: "320 384"
```

**Damage on hit:** 15 HP
**Canvas:** Grid lines visibly shift on the Lockmaster. On hit: systems glitch. On miss: Maya's terminal sparks.

---

### Turn 6 — Kill Shot (5s window)

**Telegraph:** `LOCKMASTER CRITICAL — all defenses down!`
**Hint:** `everything together — aim sector 9, load for exposed, fire`
**Active tab:** fire.go
**Task:** Full pipeline with shifted grid.

```go
func main() {
	x, y := Aim(9)
	ammo := Load("exposed")
	result := Fire(x, y, ammo)
	fmt.Println(x, y)
	fmt.Println(ammo)
	fmt.Println(result)
}
// expected:
// "448 544"
// "[pulse]"
// "HIT"
```

**Damage on hit:** 15 HP
**Canvas:** Maya fires everything. Lockmaster collapses in sparks and smoke.

## Damage Summary

| Turn | Damage | Cumulative | Can miss? |
|---|---|---|---|
| 1 | 20 | 20 | Yes — still winnable |
| 2 | 15 | 35 | Yes — still winnable |
| 3 | 20 | 55 | Yes — but tight |
| 4 | 15 | 70 | Depends on earlier |
| 5 | 15 | 85 | Depends on earlier |
| 6 | 15 | 100 | Must hit if missed any |

**Minimum hits to defeat:** 5 out of 6 (miss 1 turn of 15 damage → 85 HP dealt, boss retreats at ≤30 HP threshold... so actually need all 6 for full defeat, can miss one 15-damage turn for partial victory).

**Full defeat:** 100 damage dealt (all 6 hits or enough to reach 0).
**Partial victory (boss retreats):** survive all 6 turns with HP ≤ 30 remaining. Reduced XP but still progresses.

## XP

| Source | Amount |
|---|---|
| Per successful hit | 50 XP |
| Full defeat (0 HP) | 500 XP |
| Partial victory (retreat) | 200 XP |
| No hearts lost | 250 XP |
| Speed bonus (avg < 5s/turn) | 150 XP |
| **Max possible** | **1200 XP** |

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ♥♥♥  MAYA  ·  L3  ·  XP 2,450       LOCKMASTER  ████████░░   │
│                                        HP 80%   TURN 2 / 6     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ┌─────────────────────────────────┐                │
│              │      COMBAT CANVAS              │                │
│              │  maya ◄──────────────► lockmaster│                │
│              │  (left)               (right)    │                │
│              └─────────────────────────────────┘                │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ⚡ LOCKMASTER deploying SHIELD ARRAY — 3 nodes            │ │
│  │  ▸ load piercing rounds to match the shield nodes          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
├──────────┬──────────┬──────────┬────────────────────────────────┤
│  AIM.GO  │ LOAD.GO  │ FIRE.GO  │        [======= 9s =====] ▸ RUN│
├──────────┴──────────┴──────────┴────────────────────────────────┤
│  func Load(threat string) []string {                            │
│      // TODO: return correct ammo for threat type               │
│      return []string{}                                          │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Boss Character — The Lockmaster

Canvas 2D, programmatic (no image assets). A wall-mounted security mainframe:

- Central monitor "eye" — glowing screen that tracks Maya's position
- 4 extending mechanical arms with weapon/tool tips
- Grid of status LEDs across the chassis (green → yellow → red as HP drops)
- At low HP: exposed wiring, sparks, flickering monitor
- Shield effect: translucent hex-grid overlay when deploying shields

## Audio

| Event | Sound |
|---|---|
| Fight start | `boss-loop.mp3` begins |
| Telegraph | `alert-beep` × 2 rapid |
| Timer last 3s | `heartbeat-fast` |
| Execute | `code-submit` |
| Hit | impact + sparks (new: `boss-hit`) |
| Miss | Maya hurt (new: `boss-miss`) |
| Heart lost | `captured-impact` (softened) |
| Boss defeat | explosion + silence (new: `boss-defeat`) |
| Turn transition | `terminal-beep` |

## Theme

IDE shifts to boss palette on arena entry:

- Background: deep red-black (`#0a0408`)
- Signal color: danger red (`#ff6e6e`)
- Borders: dark crimson (`#201010`)
- Telegraph text: warning orange (`#ffaa00`)

Reverts to normal palette after victory cinematic.

## Cinematics

**Intro scenes:** existing `BOSS_01_INTRO_SCENES` — Maya runs from B-10, alarms trigger, reaches server room, codes cycling.

**Complete scenes:** existing `BOSS_01_COMPLETE_SCENES` — lock disengages, Maya runs through corridor, brief calm before Sublevel 2.

## Mobile

- Canvas collapses to narrow strip (80px tall) showing Maya + boss silhouettes and HP bars
- Telegraph text moves above editor
- Tabs stack horizontally, scrollable
- ▸ RUN button fixed at bottom

## Win / Loss

**Win (full defeat):** Boss HP reaches 0. Collapse animation → victory cinematic → XP summary.

**Win (partial — boss retreats):** All 6 turns survived but boss HP > 0 and ≤ 30. Boss sparks and retreats. Reduced XP. Story continues.

**Loss:** Hearts reach 0. Same GameOver screen as normal levels. Can retry boss from turn 1 with hearts restored to 3.

**Timer note:** No global level timer. Each turn has its own window. Missing the window counts as a miss (lose heart), not game over.
