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

Existing modules: `xp.ts` (leveling, speed bonus, streaks), `energy.ts` (costs, regen, states). Add new modules here for new systems.

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
- `Challenge` — complete challenge definition with events, hints, XP config

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

## Common Mistakes

- **Mutating state directly.** Always spread or create new objects: `saveStats({ ...stats, xp: stats.xp + earned })`.
- **Forgetting to persist.** After updating React state, call the corresponding `save*()` function.
- **Hardcoding magic numbers.** XP values, energy costs, and thresholds are already defined as constants. Import them.
- **Coupling to UI.** Game logic should never import from `components/`. If a component needs game data, it calls a hook, which calls pure functions.
