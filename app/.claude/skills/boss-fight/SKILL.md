---
name: boss-fight
description: How to build boss fight encounters in SIGNAL — combat loop, visual effects, jeopardy, and content authoring
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Building Boss Fights in SIGNAL

Boss fights are full-screen combat encounters where the player fixes weapon system code while a boss entity attacks Maya. They're structurally different from regular chapters — no chat panel, no level timer, no step progression. The jeopardy comes entirely from boss attacks draining Maya's hearts.

## Architecture Overview

```
src/
├── data/challenges/boss-XX.ts    # Config: tabs, turns, test harnesses, XP
├── lib/game/boss-combat.ts       # Pure combat state machine (no React)
├── hooks/useBossFight.ts         # React hook: orchestrates combat + comms
├── components/boss/
│   ├── BossArena.tsx             # Full-screen canvas + DOM overlay (main component)
│   ├── BossHUD.tsx               # Top bar: hearts, boss HP, turn counter
│   └── BossComms.tsx             # Maya comms feed (bottom-left)
├── lib/sprites/
│   ├── boss-painter.ts           # Boss entity sprite (64x80 base, Canvas 2D)
│   ├── weapon-painter.ts         # Weapon effects: targeting, ammo, charge, projectiles, blood
│   └── scene-painter.ts          # paintBossFPS() — first-person server room background
```

### Three-Layer Split

Same as regular game logic — pure functions, React state, rendering:

| Layer | Files | Responsibility |
|---|---|---|
| Pure logic | `boss-combat.ts` | State machine, turn resolution, XP calculation |
| React state | `useBossFight.ts` | Orchestrate combat flow, Maya comms, persistence |
| Rendering | `BossArena.tsx`, `weapon-painter.ts`, `boss-painter.ts` | 60fps canvas + DOM overlays |

## Combat State Machine

Phases flow linearly per turn:

```
ready → telegraph → player_window → hit/miss → telegraph → ... → victory/boss_retreats/gameover
```

### Phase Definitions (`BossCombatPhase`)

| Phase | What happens |
|---|---|
| `ready` | Pre-fight. ENGAGE button or Maya intro briefing. |
| `telegraph` | Boss announces next move. 3.5s duration. Red warning on canvas. |
| `player_window` | Player codes. No timer — stays open until player executes. Boss attacks periodically. |
| `hit` | Player's code was correct. Beam + explosion animation. 2.5s, then auto-advance. |
| `miss` | Player's code was wrong or didn't compile. Spark effect. 2.5s, then auto-advance. |
| `victory` | Boss HP reached 0. XP breakdown shown. |
| `boss_retreats` | All turns exhausted, boss still alive. Partial win. |
| `gameover` | Maya's hearts reached 0 from boss attacks. |

### Critical: No Timer

Boss fights have **no countdown timer**. The only jeopardy is periodic boss attacks that drain Maya's hearts. This creates organic urgency — the longer you take, the more shots Maya absorbs. Never add a timer to boss fights.

## The Jeopardy Model: Boss Attacks

Boss attacks are the sole source of danger. They fire semi-randomly during `player_window` phase.

### How Boss Attacks Work (in BossArena.tsx RAF loop)

```typescript
// Semi-randomized interval: 8-14 seconds between attacks
function nextAttackInterval(): number {
  return 8000 + Math.random() * 6000;
}

// In the RAF draw loop:
if (state.phase === "player_window" && !anim.bossAttackActive) {
  if (time - anim.lastBossAttackMs > anim.nextAttackIntervalMs) {
    anim.bossAttackActive = true;
    anim.bossAttackProgress = 0;
    anim.bossAttackLanded = false;
    // Randomize where projectile hits (different every time)
    const target = randomAttackTarget();
    anim.attackTargetX = target.x;
    anim.attackTargetY = target.y;
  }
}

// When projectile lands (progress > 0.85):
if (anim.bossAttackProgress > 0.85 && !anim.bossAttackLanded) {
  anim.bossAttackLanded = true;
  anim.heartsLost += 1;           // Update in anim state for RAF
  bossAttackHitRef.current();      // Update React state via ref
}
```

### The Ref Pattern for RAF ↔ React Communication

The canvas runs at 60fps via `requestAnimationFrame`. React state closures go stale. The solution:

```typescript
// Store the React callback in a ref, update it every render
const bossAttackHitRef = useRef(actions.bossAttackHit);
bossAttackHitRef.current = actions.bossAttackHit;

// RAF calls the ref (always gets latest function)
bossAttackHitRef.current();
```

**The same pattern applies to audio:**
```typescript
const audioRef = useRef(audio);
audioRef.current = audio;
// In RAF: audioRef.current.playSfx("boss-hit", 0.45);
```

### AnimState: RAF-Side State (Not React)

`AnimState` tracks everything the canvas needs at 60fps — weapon effects, boss projectile progress, blood splatter count. This state is mutated directly (no `setState`) for performance:

```typescript
interface AnimState {
  weaponProgress: number;          // Targeting/ammo/charge animation cycle
  bossAttackActive: boolean;       // Is a boss projectile in flight?
  bossAttackProgress: number;      // 0-1, projectile flight progress
  lastBossAttackMs: number;        // performance.now() timestamp
  nextAttackIntervalMs: number;    // Randomized delay until next attack
  bossAttackLanded: boolean;       // Prevent double-damage per projectile
  attackTargetX: number;           // Randomized target (0-1 normalized)
  attackTargetY: number;
  hitBeamProgress: number;         // Player's weapon beam (-1 = inactive)
  explosionProgress: number;       // Boss explosion on hit
  missProgress: number;            // Miss sparks
  shakeIntensity: number;          // Screen shake (decays over time)
  telegraphProgress: number;       // Warning pulse
  heartsLost: number;              // Mirror of React state for RAF access
}
```

**Key rule: `heartsLost` must be tracked in AnimState.** React state is stale inside RAF closures. The RAF loop reads `anim.heartsLost` for blood rendering; `bossAttackHitRef.current()` updates React state for the HUD.

### Blood Splatters

`drawBloodSplatters(ctx, w, h, heartsLost, maxHearts)` paints progressive camera damage:

- Each heart lost adds 3-6 blood drops with deterministic positioning (via `splatSeed` hash)
- Drops biased toward screen edges for dramatic framing
- Drip streaks appear after 2+ hits
- Red vignette overlay from first hit onward, intensifying per hit
- Alpha range: 0.35-0.80 (must be clearly visible, not subtle)

### Randomized Projectile Targets

Each boss attack picks a random screen position via `randomAttackTarget()`:

```typescript
function randomAttackTarget(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const dist = 0.15 + Math.random() * 0.3;
  return {
    x: 0.5 + Math.cos(angle) * dist,
    y: 0.5 + Math.sin(angle) * dist,
  };
}
```

Never hardcode projectile targets — the whole point is unpredictability.

## Maya Comms

Maya communicates through the `BossComms` panel (bottom-left). Messages are typed sequentially:

### Intro Briefing

Before combat begins, Maya types 4 lines explaining the situation. This gives the player context before chaos starts:

```typescript
const MAYA_INTRO = [
  "i just got in... i can see the lockmaster's core from here.",
  "i've got the main weapon system online but the firmware's corrupted.",
  "i need you to fix each module — aim, load, fire — while i keep us alive.",
  "the lockmaster will shoot back. every hit takes me down. don't let me die in here.",
];
```

### Per-Turn Callouts

`MAYA_TELEGRAPH[turnIndex]` gives tactical context for each turn. Must reference the specific tab and task.

### Combat Chatter

On hit/miss/malfunction/timeout/boss-attack, Maya reacts with in-character lines. Keep them short, lowercase, no exclamation marks.

## Content Authoring: Adding a New Boss

### 1. Create the config file (`src/data/challenges/boss-XX.ts`)

```typescript
export const bossXX: Challenge = {
  id: "boss-XX",
  act: N,
  chapter: N,
  title: "BOSS_NAME",
  location: "LOCATION",
  concepts: ["concept1", "concept2"],
  steps: [],            // Boss fights don't use the step system
  events: [],
  timer: { timeLimitSeconds: 0, gameOverOnExpiry: false },
  isBoss: true,
  parTimeSeconds: 0,
};

export const bossXXConfig: BossFightConfig = {
  bossName: "BOSS_NAME",
  bossHP: 100,
  defeatXP: 500,        // XP for full defeat
  survivalXP: 200,      // XP if survived but didn't fully defeat
  retreatThreshold: 30,  // HP at which boss retreats
  perHitXP: 50,         // XP per successful turn
  flawlessBonus: 250,   // XP if Maya took no damage
  speedBonus: 150,      // XP if avg turn time < 5s
  tabs: [...],           // Weapon subsystem files (see below)
  turns: [...],          // Combat sequence (see below)
};
```

### 2. Define Tabs (Weapon Subsystems)

Each tab is a Go file the player edits. 2-4 tabs is ideal. Each needs:

```typescript
{
  id: "aim",                    // Unique tab ID
  filename: "aim.go",           // Display filename
  label: "AIM",                 // Tab button text
  functionSignature: "func Aim(sector int) (int, int)",  // Status bar hint
  starterCode: `func Aim(sector int) (int, int) {
\t// Comments explaining what to do
\treturn 0, 0
}`,
}
```

**Starter code rules:**
- Include helpful comments explaining the expected behavior
- Provide a skeleton that compiles but returns wrong values
- Use `\t` for indentation (matches editor tab behavior)
- Don't include `package main` or `import` — the build system adds those

### 3. Define Turns (Combat Sequence)

Each turn targets one tab and has a test harness:

```typescript
{
  id: 1,                        // 1-based turn number
  telegraph: "BOSS activating sector 3 lock...",  // Boss announcement
  hint: "aim at sector 3 — check the grid",       // Player guidance
  activeTab: "aim",              // Which tab auto-focuses
  windowSeconds: 25,             // Not used as timer, but kept for pacing reference
  damage: 20,                    // HP damage on hit
  testHarness: `func main() {
\tx, y := Aim(3)
\tfmt.Println(x, y)
}`,
  expectedOutput: "384 160",     // Exact match (trimmed)
  bossCharge: "charge-sector",   // Visual effect key (for boss-painter)
  hitEffect: "node-explode",     // Visual effect on hit
  missEffect: "emp-hit",         // Visual effect on miss
}
```

**Test harness rules:**
- Must be a complete `func main()` that calls the player's functions
- Output is compared via `checkOutput()` — exact string match after trim
- Use `fmt.Println` for output (matches Go Playground behavior)
- The harness + all tab code is assembled by `buildSource()` and sent to Go Playground

### 4. Design Turn Progression

Good boss fights escalate:

| Turn | Pattern |
|---|---|
| 1-2 | Single-tab, simple task. Teach the mechanic. |
| 3 | Same tab, harder variant. Time pressure from boss attacks. |
| 4 | Cross-tab integration. Wire multiple functions together. |
| 5 | Rule change. Modify earlier code (e.g., grid shifts). |
| 6 | Everything together. The kill shot. |

### 5. Write Maya Comms

In `useBossFight.ts`, add:

- `MAYA_INTRO` — 3-4 lines of context before the fight
- `MAYA_TELEGRAPH[turnIndex]` — tactical callout per turn (reference specific tabs/tasks)
- `MAYA_HIT` / `MAYA_MISS` / `MAYA_TIMEOUT` / `MAYA_MALFUNCTION` — reaction lines

All Maya lines: lowercase, no exclamation marks, short, in-character.

### 6. Register in page.tsx

Add to `CHAPTERS` array:
```typescript
{
  challenge: bossXX,
  bossFightConfig: bossXXConfig,
  introScenes: BOSS_XX_INTRO_SCENES,
  completeScenes: BOSS_XX_COMPLETE_SCENES,
  introTitle: "BOSS FIGHT",
  introSubtitle: "BOSS_NAME",
  completeTitle: "BOSS DEFEATED",
  completeSubtitle: "description",
  ctaLabel: "CONTINUE",
}
```

And add camera config:
```typescript
"boss-XX": { scene: "boss-arena", animation: "hack", rushAnimation: "hack" },
```

## Visual Effects Pipeline

All weapon effects are in `weapon-painter.ts` — pure Canvas 2D rendering functions:

| Function | When | What |
|---|---|---|
| `drawTargetingGrid` | `activeTab === "aim"` | 3x3 sector grid with crosshair on active sector |
| `drawAmmoRack` | `activeTab === "load"` | Vertical ammo slots that fill based on progress |
| `drawChargeBar` | `activeTab === "fire"` | Horizontal charge meter (0-100%) |
| `drawFiringBeam` | On hit | Beam from weapon position to boss |
| `drawExplosion` | On hit (delayed) | Radial explosion at boss position |
| `drawBossProjectile` | Boss attacking | Red energy bolt flying toward randomized target |
| `drawImpactFlash` | Projectile lands | Screen-wide red flash |
| `drawMissEffect` | On miss | Sparks from weapon position |
| `drawBloodSplatters` | `heartsLost > 0` | Progressive blood on camera lens |
| `drawTelegraphWarning` | Telegraph phase | Pulsing red border + "INCOMING" text |
| `drawWeaponStatus` | Player window | Bottom-left AIM/LOAD/FIRE indicator |
| `getShakeOffset` | Any shake | Screen displacement for impact feel |

### Boss Painter (`boss-painter.ts`)

The boss is a wall-mounted security mainframe (not humanoid):
- Central monitor "eye" with glowing pupil
- 4 mechanical arms (2 per side)
- LED status grid reflecting HP
- 6 animation states: idle, charge, hit-react, attack, low-hp, defeat
- Painted at 64x80 base, scaled 3x in arena

## Audio

Boss fights use these audio cues:

| Event | SFX | Volume |
|---|---|---|
| Fight starts | `alert-beep` | 0.4 |
| Telegraph | `warning-beep` + `weapon-charge` | 0.35 / 0.25 |
| Player window opens | `target-lock` | 0.3 |
| Player hits | `laser-fire` → `explosion-small` → `hit-confirm` | 0.5 / 0.4 / 0.3 |
| Player misses | `dread-sting` → `boss-hit` | 0.45 / 0.35 |
| Boss attacks Maya | `boss-hit` + `explosion-small` | 0.45 / 0.3 |
| Boss attack dodge | `grunt-dodge-1` or `grunt-dodge-2` | 0.5 |
| Boss attack hit | `grunt-hit-1`/`2`/`3` (80ms delay) | 0.55 |
| Victory | `handshake-confirm` | 0.6 |
| Game over | `captured-impact` → `game-over-slam` | 0.6 / 0.5 |

**Loops during combat:**
- `boss-loop` at 0.45 (intro), ramped to 0.55 (combat), 0.65 (low HP), 0.70 (low hearts)
- `facility-hum` at 0.15
- `tension-drone` at 0.12
- `heartbeat-fast` at 0.25-0.3 when boss HP low or Maya at 1 heart

### Critical: Start Music on ENGAGE Click

Music loops **must** start in the ENGAGE button's click handler — synchronously, as the very first calls. This ensures the browser recognises `el.play()` as user-gesture-initiated (autoplay policy). Use `setLoopVolume()` to ramp volume on phase transitions — never `stopLoop`+`startLoop` (that kills/recreates the element).

```typescript
onClick={() => {
  // Music FIRST — synchronous in click handler for autoplay policy
  audio.startLoop("boss-loop", 0.45);
  audio.startLoop("facility-hum", 0.15);
  audio.startLoop("tension-drone", 0.12);
  audio.playSfx("terminal-beep", 0); // unlock Web Audio context
  setShowIntro(true);
  actions.startFight();
  audio.preload([...]); // fire-and-forget
}}
```

## The Editor

Boss fights reuse the regular `CodeEditor` component from `src/components/game/CodeEditor`. It's wrapped in a tab bar for switching between weapon files:

```tsx
<div className="flex-1 min-h-0">
  <CodeEditor
    code={state.tabCode[selectedTab] ?? ""}
    onCodeChange={(code) => actions.setTabCode(selectedTab, code)}
    onSubmit={actions.execute}
    busy={state.busy}
    attempts={0} inRush={false} baseXP={0} rushBonus={0}
    vimEnabled={vimEnabled}
  />
</div>
```

**Never build a custom editor for boss fights.** The proven CodeEditor handles syntax highlighting, vim mode, tab indentation, and paste prevention. Just wrap it with a tab bar.

## Visual Effects

Boss fights have extensive camera motion and visual feedback:

### Dodge Spring Physics
When Maya dodges a boss attack, the camera lurches using damped spring oscillation:
- 90-110px lateral, 25-35px vertical dip, ±4-5° rotation, 1.6s decay
- Dodge direction alternates left/right
- Glitch scanline effect: 10-24 slices with ±50px displacement + chromatic aberration

### Hit Recoil
When Maya takes a hit: 45px backward slam, 20px lateral stagger, ±2.3° tilt, 1.2s decay.

### Idle Camera Sway
Two layered sine waves for organic drift (always active):
```typescript
const idleX = Math.sin(t * 0.7) * 6 + Math.sin(t * 1.3) * 3;
const idleY = Math.sin(t * 0.9 + 1.0) * 3 + Math.cos(t * 1.6) * 1.5;
```

### Screen Shatter
`drawScreenShatter()` — persistent glass cracks from each hit impact point. Severity scales with total hits.

## Common Mistakes

- **Adding a timer.** Boss fights have NO timer. Jeopardy = boss attacks only.
- **Reading React state in RAF.** Use `anim.*` or `*Ref.current` — never `state.*` inside the draw loop.
- **Hardcoding projectile targets.** Each attack must randomize its target position.
- **Subtle blood effects.** Alpha must be 0.35+ to be visible against the dark background. Players need to SEE the damage.
- **Missing ref updates.** Every callback used in RAF needs `const xRef = useRef(x); xRef.current = x;` pattern.
- **Using `async` in `startLoop`.** `startLoop` must be synchronous — `async` breaks the user gesture call stack, causing browsers to reject `el.play()` under autoplay policy. Use `.catch()` instead of `await`.
- **Unstable `useAudio` return in effect deps.** `useAudio()` returns a memoized object (via `useMemo`). If you add `[audio]` as a `useEffect` dependency, verify `audio` is stable — an unstable ref triggers cleanup on every render, killing all loops. For unmount-only cleanup, use `[]`.
- **Using `stopLoop`+`startLoop` to change volume.** This kills and recreates the Audio element. Use `setLoopVolume()` to ramp an existing loop — avoids autoplay issues and audible gaps.
- **Building a custom editor.** Reuse `CodeEditor`. It works. Custom editors break.
- **Using `Date.now()` in RAF.** RAF provides `performance.now()`-scale timestamps. Use `performance.now()` for RAF-compatible timing.
- **Forgetting `ctx.globalAlpha = 1`.** Always reset after transparent draws in Canvas 2D.
- **Missing `bossAttackLanded` guard.** Without this flag, a single projectile triggers multiple damage events per frame.
- **Setting `el.src = ""` on Audio elements.** Firefox throws `NS_ERROR_DOM_INVALID_STATE_ERR`. Just call `el.pause()` and delete from the map — no src manipulation.

## XP Breakdown

Calculated by `calculateBossXP()` in `boss-combat.ts`:

| Component | Formula |
|---|---|
| Hit XP | `hits * config.perHitXP` |
| Defeat bonus | `config.defeatXP` if boss HP = 0, else `config.survivalXP` |
| Flawless bonus | `config.flawlessBonus` if `heartsLost === 0` |
| Speed bonus | `config.speedBonus` if avg hit time < 5s |

Typical values for a 6-turn boss: 500 defeat + 300 hits + 250 flawless + 150 speed = 1200 max XP.
