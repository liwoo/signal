---
name: challenge-author
description: How to add new game content (chapters, bosses, story) to SIGNAL
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Adding Game Content to SIGNAL

## Process

1. **Start from the spec** — every chapter/boss has a spec in `spec/levels/`. Read it first. It defines the Go concepts, story beats, acceptance criteria, and XP values. Don't improvise story or mechanics.

2. **Read adjacent chapters** — content must flow narratively. If you're writing chapter 7, read chapters 6 and 8's specs (or existing data files) so twists connect and the difficulty curve makes sense.

3. **Write Go code that actually compiles** — starter code is what players see first. It must be valid Go with `package main`, correct imports, and `// TODO` markers for the parts players fill in. Test it mentally: would `go run main.go` work if TODOs were completed?

4. **Keep solutions short** — chapters: under 30 lines. Bosses: under 50 lines. If your solution is longer, the challenge is too complex. Simplify.

5. **Match the type exactly** — challenge data must satisfy the `Challenge` interface in `src/types/game.ts`. Key fields: `id`, `act`, `chapter`, `concepts`, `brief`, `starterCode`, `expectedBehavior`, `hints` (3 levels), `events` (timed), `rushMode`, `xp`, `parTimeSeconds`.

## Common Mistakes

- **Hints that give away the answer.** Level 1 should be a nudge ("think about how range works"). Level 2 is directional ("use a for-range loop over the slice"). Level 3 is nearly-there ("for _, v := range items { sum += v }"). Never paste the full solution.

- **Events that fire too early.** Players need 8+ seconds to read the brief. First event at 8-18s. Rush trigger 2-5s after a narrative interrupt.

- **Twists that don't advance the plot.** Every twist must reveal something new about the story or characters. "Maya is scared" is not a twist. "Maya recognizes the guard's voice — it's her lab partner" is.

- **Forgetting the `||COMPLETE||` token.** Maya's AI response must contain `||COMPLETE||` when the player's code is correct. This is how the game detects success. The `expectedBehavior` field describes what correct output looks like for the evaluator.

## File Location & Naming

- Challenge data: `src/data/challenges/{id}.ts` (e.g., `chapter-01.ts`, `boss-03.ts`)
- Always export a named `challenge` constant, not a default export

## XP Values Reference

Check `docs/design.md` for the curriculum table. Don't invent XP values — they're calibrated to the level progression curve in `LEVEL_THRESHOLDS`.
