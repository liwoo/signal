# Boss Fight Mechanic — Combat Code

**Replaces:** puzzle-style boss fights
**Applies to:** all boss encounters (boss-01 through boss-09)

## Core Concept

Boss fights are **real-time code combat**. The player controls Maya's weapon systems by writing Go code across multiple editor tabs — each tab is a weapon subsystem. The boss attacks on a timer. The player must fix/write code and execute before the boss's attack lands. Hits and misses play out as choreographed Canvas 2D combat animations.

It should feel like a fight, not a quiz.

## Combat Loop

```
┌──────────────────────────────────────────────────────────────┐
│                        TURN CYCLE                            │
│                                                              │
│  1. BOSS TELEGRAPHS  →  boss announces attack + weakness     │
│     (1-2s reveal)        canvas: boss charges up             │
│                                                              │
│  2. PLAYER WINDOW    →  code the response (aim/load/fire)    │
│     (6-10s timer)        editor tabs unlock per turn          │
│                                                              │
│  3. EXECUTE (▸ RUN)  →  compile via Go Playground            │
│     (player action)      success = hit, fail = miss          │
│                                                              │
│  4. COMBAT RESULT    →  canvas animation plays out           │
│     (2-3s)               hit: boss HP drops                  │
│                          miss: boss attacks, lose 1 heart    │
│                                                              │
│  5. NEXT TURN        →  boss recovers, new telegraph         │
│     (loop)               difficulty escalates                │
└──────────────────────────────────────────────────────────────┘
```

### Timing

- **Telegraph phase:** 1-2s. Boss glows/charges on canvas. Attack type + hint text appears in the HUD.
- **Player window:** starts at 10s for turn 1, shrinks by 1s per turn (min 5s). Countdown bar visible.
- **Execution:** instant compile check. No waiting for Go Playground response during combat — use local pattern matching for boss fights (sub-200ms). Go Playground validates async in background for cheat detection.
- **Result animation:** 2-3s. Screen shake on hit/miss. Boss HP bar animates. Heart loss animates.

## Layout — Boss Arena

The entire screen transforms. No chat panel. No mission/library/notes tabs.

```
┌─────────────────────────────────────────────────────────────────┐
│  ♥♥♥  MAYA                    LOCKMASTER  ████████░░  HP 80%    │
│  L3        XP 2,450                              TURN 2/6      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│          ┌───────────────────────────────────────┐              │
│          │                                       │              │
│          │     CANVAS: COMBAT SCENE              │              │
│          │     maya ←───────────────→ boss        │              │
│          │     (left)              (right)        │              │
│          │                                       │              │
│          └───────────────────────────────────────┘              │
│                                                                 │
│  ┌─ TELEGRAPH ──────────────────────────────────────────────┐   │
│  │  LOCKMASTER is deploying SHIELD ARRAY — 3 nodes exposed  │   │
│  │  ▸ load piercing rounds to match node count              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────┬────────┬────────┬──────────────────────────────────────┤
│ aim.go │ load.go│ fire.go│            [====== 8s ======] ▸ RUN  │
├────────┴────────┴────────┴──────────────────────────────────────┤
│  func Load() []string {                                         │
│      // TODO: return the correct ammo types                     │
│      return []string{}                                          │
│  }                                                              │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key differences from normal gameplay

| Normal Level | Boss Arena |
|---|---|
| Chat panel (left) + editor (right) | Full-width canvas (top) + editor (bottom) |
| Tabs: code / mission / library / notes | Tabs: weapon subsystem files (aim.go, load.go, fire.go) |
| Maya messages in chat | Telegraph text in HUD overlay |
| Timer at top | Turn countdown bar in editor header |
| Submit button | ▸ RUN button (executes all tabs as one program) |
| Zen analysis after | No zen — pure combat |
| Twist reveal after | Victory cinematic after |

## Weapon Subsystem Tabs

Each boss fight has 2-4 Go files the player edits. These are **not** separate programs — they compile together as one `package main`. Each file is a function the player must implement correctly.

### Boss-01: LOCKMASTER

| Tab | Function | Purpose |
|---|---|---|
| `aim.go` | `func Aim(sector int) (int, int)` | Convert sector number to x,y coordinates |
| `load.go` | `func Load(weaponType string) []string` | Return correct ammo sequence for weapon |
| `fire.go` | `func Fire(x, y int, ammo []string) string` | Execute attack, return status |

### How tabs compile

All tabs concatenate into a single Go program with a generated `main()`:

```go
package main

import "fmt"

// ── aim.go (player code) ──
func Aim(sector int) (int, int) {
    // player writes this
}

// ── load.go (player code) ──
func Load(weaponType string) []string {
    // player writes this
}

// ── fire.go (player code) ──
func Fire(x, y int, ammo []string) string {
    // player writes this
}

// ── generated test main ──
func main() {
    x, y := Aim(7)
    fmt.Println(x, y)           // expected: "512 665"
    ammo := Load("piercing")
    fmt.Println(ammo)           // expected: "[pierce pierce pierce]"
    result := Fire(x, y, ammo)
    fmt.Println(result)         // expected: "HIT"
}
```

The test `main()` changes each turn based on the boss's telegraph. This is the same pattern as `testHarness` in normal challenges — just regenerated per turn.

## Turn Structure

Each turn has:

```typescript
interface BossTurn {
  id: number;                      // 1-based turn number
  telegraph: string;               // what the boss announces
  hint: string;                    // guidance for the player
  activeTab: string;               // which tab to focus ("aim" | "load" | "fire")
  windowSeconds: number;           // time to code
  testHarness: string;             // main() that validates this turn
  expectedOutput: string;          // stdout when correct
  bossAnimation: string;           // canvas animation during telegraph
  hitAnimation: string;            // canvas animation on success
  missAnimation: string;           // canvas animation on failure
  damage: number;                  // HP the boss loses on hit (out of 100)
}
```

### Boss-01 Turns (6 turns to defeat)

| Turn | Telegraph | Active Tab | Task | Damage |
|---|---|---|---|---|
| 1 | "LOCKMASTER scanning sector 3..." | aim.go | Return coordinates for sector 3: `(256, 320)` | 20 |
| 2 | "LOCKMASTER deploying SHIELD — 3 nodes" | load.go | Return `["pierce", "pierce", "pierce"]` | 15 |
| 3 | "LOCKMASTER exposed at sector 7!" | aim.go | Return coordinates for sector 7: `(512, 665)` | 20 |
| 4 | "LOCKMASTER charging EMP BLAST" | fire.go | Wire aim+load together, return `"HIT"` | 15 |
| 5 | "LOCKMASTER rerouting power to sector 1" | aim.go | Sector 1 coords, but formula changes (must detect) | 15 |
| 6 | "LOCKMASTER CRITICAL — all systems!" | fire.go | Full pipeline: aim → load → fire with correct args | 15 |

**Total damage to win: 100 HP**

### Turn difficulty progression

- **Turns 1-2:** Single-tab focus. Only the active tab needs changes. Simple mappings.
- **Turns 3-4:** Cross-tab. Fire.go must call Aim and Load correctly.
- **Turns 5-6:** Pattern shifts. Previous correct code may need adjustment. Time pressure tighter.

## Boss HP & Hearts

### Boss HP

- Starts at 100
- Each successful turn deals `turn.damage` HP
- HP bar at top right, animated on change
- At 0 HP: boss defeated → victory cinematic

### Player Hearts

- Normal heart system (3 starting, max 5)
- Miss = lose 1 heart
- 0 hearts = game over (same GameOver screen as normal)
- Timer expiry on a turn = automatic miss (lose 1 heart, next turn)
- Hearts visible at top left

### What happens on a miss

1. Code compiles but output doesn't match → **MISS**
2. Code doesn't compile → **MALFUNCTION** (still a miss)
3. Timer expires → **TOO SLOW** (still a miss)

On any miss:
- Boss attack animation plays (boss projectile → Maya takes hit)
- Screen shake + red flash
- Heart drops by 1
- 1.5s recovery pause
- Next turn begins (boss doesn't repeat — the fight moves forward)

This means: **you can miss some turns and still win**, as long as you accumulate enough damage before the boss runs out of turns or you run out of hearts. But missing too many = not enough damage to defeat.

### Alternative win: survival

If the player survives all turns but boss HP > 0, the boss retreats (partial victory). Reduced XP, but still progresses. This prevents a hard block.

## Canvas Combat Scene

### Scene type: `"boss-arena"`

New scene type. Wide format (full viewport width). Split into:

```
┌───────────────────────────────────────────────┐
│                                               │
│    MAYA (left)                  BOSS (right)   │
│    ┌──┐                         ┌────┐        │
│    │▓▓│  ←─ projectile ─→      │████│        │
│    │▓▓│                         │████│        │
│    └──┘                         └────┘        │
│                                               │
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬ floor ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │
└───────────────────────────────────────────────┘
```

### Animations needed

| State | Maya | Boss |
|---|---|---|
| Idle (between turns) | Stance, breathing | Idle hum/pulse |
| Telegraph | Ready stance | Charges up (glow builds) |
| Player coding | Typing at terminal | Charging continues |
| Execute (hit) | Fires weapon (flash) | Hit reaction (knockback) |
| Execute (miss) | Braces | Attacks (projectile → Maya) |
| Boss defeat | Victory pose | Collapse/explode |
| Player defeat | Collapse | Victory pose |

### Boss character design (Canvas 2D)

The Lockmaster is a **security mainframe** — not humanoid. Think: a wall-mounted control panel that comes alive.

- Central "eye" (monitor screen) that tracks Maya
- Extending mechanical arms with weapon attachments
- Status LEDs that change color with HP
- At low HP: sparks, flickering, exposed wiring

Painted with `character-painter.ts` patterns — row-by-row pixel construction, same as Maya/Guard but different silhouette.

## IDE Theme — Boss Mode

When entering a boss fight, CSS variables shift:

```css
/* Normal */
--color-background: #040810;
--color-signal: #6effa0;
--color-border: #0a1820;

/* Boss mode */
--color-background: #0a0408;     /* dark red-black */
--color-signal: #ff6e6e;          /* red signal */
--color-border: #201010;          /* dark red border */
--color-boss-accent: #ff4040;    /* danger red */
--color-boss-charge: #ffaa00;    /* orange charge glow */
```

Applied via a `data-boss` attribute on the root element. Tailwind picks it up.

## Audio

### Music
- `boss-loop.mp3` — already exists. Loops during entire fight.

### SFX per event
| Event | SFX |
|---|---|
| Telegraph reveal | `alert-beep` + new `boss-telegraph` |
| Timer ticking (last 3s) | `heartbeat-fast` |
| Execute (compile) | `code-submit` |
| Hit | new `boss-hit` (impact + sparks) |
| Miss | new `boss-miss` (Maya hurt) |
| Heart lost | `captured-impact` (lighter) |
| Boss defeat | new `boss-defeat` (explosion + alarms stop) |
| Turn transition | `terminal-beep` |

## Data Model

### BossConfig (extends Challenge)

```typescript
interface BossFightConfig {
  bossName: string;
  bossHP: number;                    // starting HP (usually 100)
  tabs: BossTab[];                   // weapon subsystem files
  turns: BossTurn[];                 // sequence of combat turns
  survivalXP: number;               // XP if survived but didn't defeat
  defeatXP: number;                 // XP on full defeat
  retreatThreshold: number;         // HP% where boss retreats if survived (e.g. 30)
}

interface BossTab {
  id: string;                        // "aim" | "load" | "fire"
  filename: string;                  // "aim.go"
  label: string;                     // tab display label
  starterCode: string;               // initial code in this tab
  functionSignature: string;         // shown as reference
}

interface BossTurn {
  id: number;
  telegraph: string;                 // boss announcement
  hint: string;                      // player guidance
  activeTab: string;                 // which tab to focus/highlight
  windowSeconds: number;             // coding time
  testHarness: string;               // generated main() for validation
  expectedOutput: string;            // stdout when correct
  damage: number;                    // HP removed on hit
  // Animation keys (resolved by the arena component)
  bossCharge: string;
  hitEffect: string;
  missEffect: string;
}
```

### State Machine

```
INTRO_CINEMATIC
    ↓
BOSS_READY (boss appears, music starts)
    ↓
┌→ TELEGRAPH (boss announces, 1-2s)
│   ↓
│  PLAYER_WINDOW (countdown, player codes)
│   ↓
│  EXECUTING (compile + check)
│   ↓
│  ┌── HIT ──→ boss HP -= damage, hit animation
│  │              ↓
│  │         boss HP <= 0? → VICTORY
│  │              ↓ no
│  │         NEXT_TURN ──→ loop ┐
│  │                            │
│  └── MISS ──→ player hearts -= 1, miss animation
│                 ↓
│            hearts <= 0? → GAME_OVER
│                 ↓ no
│            NEXT_TURN ──→ loop ┘
│                            │
└────────────────────────────┘

After all turns:
  boss HP > retreatThreshold → BOSS_RETREATS (partial win)
  boss HP <= retreatThreshold → BOSS_DEFEATED (full win)
```

## Component Architecture

### New components

| Component | Location | Purpose |
|---|---|---|
| `BossArena` | `src/components/boss/BossArena.tsx` | Top-level boss fight layout (replaces GameScreen's main layout) |
| `BossCombatCanvas` | `src/components/boss/BossCombatCanvas.tsx` | Canvas 2D scene with Maya + boss + projectiles |
| `BossTelegraph` | `src/components/boss/BossTelegraph.tsx` | Attack announcement HUD |
| `BossHUD` | `src/components/boss/BossHUD.tsx` | HP bar, hearts, turn counter, timer |
| `BossEditor` | `src/components/boss/BossEditor.tsx` | Multi-tab editor with weapon files + RUN button |

### New game logic (pure functions)

| Module | Location | Purpose |
|---|---|---|
| `boss-combat.ts` | `src/lib/game/boss-combat.ts` | Turn resolution, HP calc, damage, miss handling |
| `boss-painter.ts` | `src/lib/sprites/boss-painter.ts` | Boss character rendering (Canvas 2D) |

### New hook

| Hook | Location | Purpose |
|---|---|---|
| `useBossFight` | `src/hooks/useBossFight.ts` | Boss fight state machine, turn management, separate from `useGame` |

### Integration with page.tsx

```typescript
// In GameScreen:
if (challenge.isBoss && bossFightConfig) {
  return <BossArena config={bossFightConfig} ... />;
}
// else: normal GameScreen layout
```

Boss fights use a completely separate layout and state hook. They share:
- Hearts system (`hearts.ts`)
- XP/level system
- Persistence layer
- Audio system
- Cinematic scenes (intro/complete)

They do NOT use:
- `useGame` hook
- ChatPanel
- MissionPanel / LibraryPanel / NotesPanel
- Zen rules
- AI tokens
- Jeopardy system
- Rush mode

## Go Concepts Per Boss

Boss fights **apply** concepts learned in preceding chapters. No new concepts introduced during combat — pure application under pressure.

| Boss | Concepts Applied | Weapon Metaphor |
|---|---|---|
| boss-01 (LOCKMASTER) | functions, returns, slices, for loops, if/else | aim/load/fire subsystems |
| boss-02+ | TBD per chapter arc | TBD |

## XP Breakdown

| Source | Amount |
|---|---|
| Per successful turn | 50 XP |
| Full defeat bonus | 500 XP |
| Survival (partial) | 200 XP |
| No hearts lost bonus | 250 XP |
| Speed bonus (avg <5s/turn) | 150 XP |

## Compilation Strategy

Boss fights need sub-200ms feedback. The Go Playground's 2-8s latency breaks the combat feel.

**Solution: local evaluation for boss turns.**

Boss turn validation uses **exact output matching** — the `testHarness` produces deterministic stdout. Steps:

1. Concatenate all tab contents + turn's `testHarness` into one Go source
2. Run basic syntax validation locally (bracket matching, function signatures)
3. **Primary check:** pattern match expected output against code logic
   - For boss-01: functions return literal values, so static analysis can verify
4. **Background:** async compile via Go Playground for cheat detection
5. If local check passes → instant HIT animation
6. If local check fails → check if it's a syntax error (MALFUNCTION) or wrong output (MISS)

For turns requiring actual computation (later bosses), pre-compute expected values and embed them in the turn config.

## What This Replaces

The current `boss-01.ts` challenge definition gets replaced. The cinematic scenes (`BOSS_01_INTRO_SCENES`, `BOSS_01_COMPLETE_SCENES`) stay — the intro/complete cinematics bookend the fight.

The `Challenge` type still wraps boss metadata, but `BossFightConfig` contains the combat-specific data (turns, tabs, HP). The `isBoss` flag on Challenge gates which layout/hook to use.

## Open Questions

1. **Mobile layout:** Boss arena on mobile? Canvas + editor needs careful stacking. Possibly canvas collapses to a narrow status strip during coding.
2. **Boss painter complexity:** How detailed should the Lockmaster be? Minimal (glowing rectangle with arms) vs. detailed (multi-part mechanical entity)?
3. **Partial victory narrative:** How does "boss retreats" affect the story? Does the player replay or continue with reduced rewards?
4. **Future bosses:** Should all bosses use the aim/load/fire metaphor, or should each boss have unique subsystem tabs?
