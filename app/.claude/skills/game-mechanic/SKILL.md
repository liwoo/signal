---
name: game-mechanic
description: How to write game logic in SIGNAL — pure functions, state management, persistence
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Writing Game Logic in SIGNAL

## Architecture: Pure Functions + React State + Storage

Game logic is split into three layers. Know which layer you're working in.

### Layer 1: Pure Functions (`src/lib/game/`)

All game math and rules live here. **No React, no DOM, no storage calls.**

```typescript
// CORRECT — pure function, testable in isolation
export function getAttemptCost(attemptNumber: number): number {
  if (attemptNumber <= 1) return 0;
  if (attemptNumber === 2) return 5;
  if (attemptNumber === 3) return 10;
  return 15;
}

// WRONG — side effects in game logic
export function getAttemptCost(attemptNumber: number): number {
  const cost = attemptNumber <= 1 ? 0 : 5 * (attemptNumber - 1);
  localStorage.setItem("lastCost", String(cost)); // NO — this is a side effect
  return cost;
}
```

Existing modules: `xp.ts` (leveling, speed bonus, streaks), `energy.ts` (costs, regen, states), `jeopardy.ts` (timer math, jeopardy effects, retry penalties), `hearts.ts` (lives system), `zen.ts` (Go idiom analysis, bonus XP). Add new modules here for new systems.

### Layer 2: React State (hooks/stores in `src/hooks/` or `src/stores/`)

Hooks orchestrate pure functions + state + persistence. This is where you:
- Call pure functions from `lib/game/`
- Update React state
- Trigger saves via `lib/storage/`

### Layer 3: Persistence (`src/lib/storage/local.ts`)

Already built. Uses `localStorage` for durable state (progress, stats, unlocks, settings) and `sessionStorage` for ephemeral state (chat history, editor state, active jeopardy). Functions: `loadProgress()`, `saveProgress()`, etc.

**Rule: Never call localStorage/sessionStorage directly.** Always go through the helpers in `local.ts`.

## Type Safety

All game types are in `src/types/game.ts`. Key types:

- `PlayerStats` — XP, level, energy, streak, play time
- `PlayerProgress` — current act/chapter, completed chapters, story branch
- `PlayerUnlocks` — feature flags earned through leveling
- `Challenge` — complete challenge definition with steps, level timer, events
- `ChallengeStep` — individual submission within a challenge (brief, starter code, expected behavior, hints, XP, rush, events)
- `LevelTimerConfig` — per-challenge timer settings (`timeLimitSeconds`, `gameOverOnExpiry`)
- `JeopardyState` — active jeopardy effects (guard_entered, power_reduced, signal_scramble, energy_drain, hint_burned)

**Never create parallel types.** If `game.ts` doesn't have what you need, extend it there.

## Formulas (from `docs/design.md`)

These are implemented in `lib/game/xp.ts` and `lib/game/energy.ts`. Don't re-derive them:

- **Speed XP** = `base * (1 - elapsed/parTime) * 0.5` — capped at 0
- **First-try bonus** = `base * 0.5`
- **Streak multipliers**: 2→1.2x, 3→1.4x, 4→1.7x, 5+→2.0x
- **Energy regen**: 5 per minute, passive
- **Attempt costs**: free, 5, 10, 15 (escalating)
- **Hint costs**: 8, 12, 20 (by level)

## Testing Game Logic

Pure functions are trivially testable:

```typescript
import { getAttemptCost } from "@/lib/game/energy";

test("first attempt is free", () => {
  expect(getAttemptCost(1)).toBe(0);
});
```

Aim for 100% coverage on `lib/game/` — these are the rules of the game. Bugs here break everything.

## Editor Hooks

### `useVim` (`src/hooks/useVim.ts`)

A standalone hook for vim keybinding mode in the code editor. Follows the same `[state, actions]` pattern as `useGame`.

- **State:** `{ mode: VimMode, enabled: boolean }`
- **Actions:** `toggle()`, `setMode(mode)`, `handleKeyDown(e, code, onCodeChange) → boolean`
- Uses a `pendingRef` for multi-key commands (`dd`, `gg`) — no state updates until the command resolves
- Pure input handling — no DOM reads beyond cursor position, no side effects beyond calling `onCodeChange`

When adding new vim commands, follow the existing pattern: check `pending + key`, call `e.preventDefault()`, manipulate cursor via `selectionStart/End`, and reset `pendingRef.current`.

## Multi-Step Challenge Progression

`useGame` tracks step progression within a challenge:

- **`stepIndex`** — current step index into `challenge.steps[]`
- **Step advancement** — on successful completion (`||COMPLETE||`), XP is awarded per-step, then `stepIndex` increments
- **Code carry-forward** — when `step.starterCode` is null, the editor keeps the player's code from the previous step
- **Two event schedulers** — level-wide events fire once at challenge start; step-scoped events fire fresh per step
- **`GameState`** includes `currentStepIndex`, `totalSteps`, `currentStep` (derived from `steps[stepIndex]`)

## Level Timer & Jeopardy

Every challenge has a `timer: LevelTimerConfig`. The timer system:

- **Timer runs for the entire challenge** (across all steps), not per-step
- **Rush bonus time** — a step's `rushMode.bonusTimeSeconds` adds time to the level timer when the rush is beaten
- **Game over** — when `gameOverOnExpiry: true` and time expires, the player sees the CAPTURED screen
- **Jeopardy** — when `gameOverOnExpiry: false`, timer expiry triggers jeopardy effects instead of game over

### Maya Typing Pause

The game pauses completely when Maya is typing an animated message. This gives the player time to absorb important information (zen jolts, story beats, step introductions):

- **Timer paused** — `timerStopped` is set to `true` when Maya starts typing
- **Events blocked** — `handleEvent` checks `pauseStartRef.current > 0` and drops rush/story/system events during the pause
- **7-second grace** — after Maya finishes typing, the timer stays paused for 7 more seconds before resuming
- **Time compensation** — total paused time is added as `timerBonusSeconds` so the player isn't penalized
- **Cleanup** — resume timer is cleared on game over, chapter complete, retry, and unmount

Actions in `GameActions`:
- `onMayaTypingStart()` — pauses timer, blocks events
- `onMayaTypingEnd()` — schedules resume after 7s grace period

These are wired through `ChatPanel` via `onMayaTypingStart` / `onMayaTypingEnd` props. Only the **last** Maya message in the chat triggers the callbacks (to avoid re-pausing for old messages).

### Jeopardy Effects (`src/lib/game/jeopardy.ts`)

Pure functions that apply effects to game state:

| Effect | What it does |
|---|---|
| `guard_entered` | Locks the chat — Maya goes silent |
| `power_reduced` | Reduces editor width (simulates narrow terminal) |
| `signal_scramble` | Scrambles random lines in the code editor |
| `energy_drain` | Drains energy at an accelerated rate |
| `hint_burned` | Destroys the next unused hint |

### Hearts / Lives (`src/lib/game/hearts.ts`)

Maya has lives (hearts). Pure functions:

| Constant | Value |
|---|---|
| `INITIAL_HEARTS` | 3 |
| `MAX_HEARTS` | 5 |
| `HEART_COST_XP` | 500 |

- `loseHeart(current)` — decrements by 1, min 0
- `buyHeart(hearts, xp)` — returns `{ hearts, xp }` or null if can't afford / at max
- `canBuyHeart(hearts, xp)` — boolean check
- `hasLives(hearts)` — true if hearts > 0

On game over, a heart is lost. If hearts reach 0, the player can't retry until they buy one with XP. This is the monetization hook — future IAP will offer heart packs.

### Go Zen System (`src/lib/game/zen.ts`)

After each successful submission, the player's code is analyzed for idiomatic Go patterns based on the Zen of Go and Effective Go. Awards bonus XP and triggers Maya's "memory jolt" narrative.

**Narrative hook:** Maya was gassed, has amnesia. Each solved problem jolts her memory on Go idioms — she's secretly a Go zen master recovering her knowledge as she escapes.

Key functions:
- `analyzeZen(stepId, code)` — returns `{ bonusXP, jolts, suggestions }`
- `buildZenMessage(result, missedXP?)` — constructs Maya's narrative message (picks 1 jolt + 1 suggestion max). When `missedXP > 0`, appends "next time you could earn +N more XP with cleaner go."
- `calculateMissedXP(stepId, result)` — returns XP difference between max possible and what was earned
- `ZEN_RULES` — registry keyed by step ID, each step has relevant `ZenRule[]`

Each `ZenRule` has:
- `check(code) → boolean` — heuristic regex/string check
- `bonusXP` — 5-15 XP per rule
- `jolt` — Maya's memory returning (in-character, references her thesis/professor/research)
- `suggestion` — improvement hint when the rule isn't followed

When adding new challenge steps, add corresponding zen rules in the `STEP_ZEN_RULES` registry. Rules should map to actual Go idioms from Zen of Go or Effective Go.

### Retry from Checkpoint

When captured (game over), `retryFromCheckpoint()`:
- Costs 1 heart (already deducted when game over fires)
- Restarts from the beginning of the challenge (step 0)
- Applies penalties: 30% energy, no speed bonus eligibility
- Jeopardy effects carry over at 50% intensity

## Common Mistakes

- **Mutating state directly.** Always spread or create new objects: `saveStats({ ...stats, xp: stats.xp + earned })`.
- **Forgetting to persist.** After updating React state, call the corresponding `save*()` function.
- **Hardcoding magic numbers.** XP values, energy costs, and thresholds are already defined as constants. Import them.
- **Coupling to UI.** Game logic should never import from `components/`. If a component needs game data, it calls a hook, which calls pure functions.
