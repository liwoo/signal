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

5. **Match the type exactly** — challenge data must satisfy the `Challenge` interface in `src/types/game.ts`. Key fields: `id`, `act`, `chapter`, `concepts`, `steps` (array of `ChallengeStep`), `events` (level-wide timed), `timer` (`LevelTimerConfig`), `isBoss`, `parTimeSeconds`.

6. **Design multi-step challenges** — every challenge has `steps: ChallengeStep[]`. Each step is a separate submission the player must complete in order. Steps teach concepts incrementally (e.g. step 1: scaffold `package main`, step 2: add the actual logic). Each step has its own `brief`, `starterCode`, `expectedBehavior`, `hints`, `xp`, `rushMode`, and `events`.

7. **Use step IDs** — step IDs follow the pattern `"{challenge-id}:{step-name}"` (e.g. `"chapter-01:scaffold"`, `"chapter-01:transmit"`). These IDs key into the engine's response banks in `src/lib/ai/engine.ts`.

8. **Code carry-forward** — when a step's `starterCode` is `null`, the player keeps their code from the previous step. Use this when steps build on each other (e.g. step 1 writes the scaffold, step 2 adds a print statement to it).

9. **Configure the level timer** — every challenge needs a `timer: LevelTimerConfig` with `timeLimitSeconds` and `gameOverOnExpiry`. For early/easy levels, `gameOverOnExpiry: true` (game over = "Maya captured"). For harder levels, `gameOverOnExpiry: false` (timer expiry triggers jeopardy effects instead).

10. **Step-scoped rush for bonus time** — rush challenges can be on individual steps, not the whole level. A step's `rushMode` can include `bonusTimeSeconds` to add time to the level timer when the rush is beaten.

## Common Mistakes

- **Ambiguous briefs that don't show expected output.** Players should never have to guess the exact output format. If the step expects `1\n2\n3`, show it. If it expects `1 DENY\n2 DENY`, show it. Include a truncated example in the brief: `"expected output:\n1 DENY\n2 DENY\n...\n10 OVERRIDE"`. This is the #1 cause of player drop-off — unclear expectations make the game feel broken.

- **Hints that give away the answer.** Level 1 should be a nudge ("think about how range works"). Level 2 is directional ("use a for-range loop over the slice"). Level 3 is nearly-there ("for _, v := range items { sum += v }"). Never paste the full solution.

- **Events that fire too early.** Players need 8+ seconds to read the brief. First event at 8-18s. Rush trigger 2-5s after a narrative interrupt.

- **Twists that don't advance the plot.** Every twist must reveal something new about the story or characters. "Maya is scared" is not a twist. "Maya recognizes the guard's voice — it's her lab partner" is.

- **Forgetting the `||COMPLETE||` token.** Maya's AI response must contain `||COMPLETE||` when the player's code is correct. This is how the game detects success. The `expectedBehavior` field describes what correct output looks like for the evaluator.

## Brief Writing Rules

Briefs are the player's primary instruction. If they're ambiguous, the player fails repeatedly without understanding why — this kills retention.

1. **Always show expected output format.** Include a truncated example of exact output in the brief. "Print the numbers 1-10" is ambiguous. "Print each number on its own line. Just the numbers — nothing else.\n\nexpected output:\n1\n2\n3\n...\n10" is clear.

2. **Explicitly state what NOT to include** when the next step builds on this one. If step 2 is "loop prints numbers" and step 3 is "add labels", the step 2 brief must say "just the numbers — nothing else" to prevent players from jumping ahead.

3. **When output has a specific format** (e.g. `number label`), show multiple concrete examples: "each line: the code number, a space, then the label. e.g. `1 DENY`, `4 WARN`, `10 OVERRIDE`."

4. **Multi-step carry-forward clarity.** When `starterCode` is null, the brief must tell players what to modify in their existing code, not just what the output should be.

5. **Use code syntax, not English algorithms.** Players are learning to code — they need to see the exact Go syntax to use. "collect the occupied floors and check which are missing" is useless. "create `occupied := map[string]bool{}`, loop with `for _, floor := range guards`, set `occupied[floor] = true`" gives them the building blocks. Show the variable names, the types, the function calls — in backticks. The brief is a recipe with ingredients, not a description of a meal.

6. **Name every variable and type.** Don't say "create a map". Say "declare `guards := map[string]string{ }`". Don't say "loop through the values". Say "use `for _, floor := range guards`". The player should be able to read the brief and know exactly what to type, even if they need to figure out how to assemble the pieces.

## Challenge Structure Example

```typescript
export const chapter01: Challenge = {
  id: "chapter-01",
  act: "act-1",
  chapter: 1,
  title: "FIRST SIGNAL",
  location: "Cell B-09 // SUBLEVEL 3",
  concepts: ["package", "import", "func main", "fmt.Println"],
  steps: [
    {
      id: "chapter-01:scaffold",
      title: "SCAFFOLD",
      brief: "write the skeleton of a Go program...",
      starterCode: "// your Go program starts here\n",
      expectedBehavior: "package main, import fmt, func main()",
      hints: [/* 3 levels */],
      rushMode: { label: "SIGNAL DEGRADING", durationSeconds: 30, bonusTimeSeconds: 20 },
      xp: { base: 40, timeBonus: true, firstTryBonus: true },
      events: [/* step-scoped events */],
    },
    {
      id: "chapter-01:transmit",
      title: "TRANSMIT",
      brief: "print your location...",
      starterCode: null,  // carry forward from SCAFFOLD
      expectedBehavior: 'prints "B-09" and "SUBLEVEL 3"',
      hints: [/* 3 levels */],
      rushMode: { label: "GUARD APPROACHING", durationSeconds: 45 },
      xp: { base: 60, timeBonus: true, firstTryBonus: true },
      events: [],
    },
  ],
  events: [/* level-wide events that fire once at challenge start */],
  timer: { timeLimitSeconds: 150, gameOverOnExpiry: true },
  isBoss: false,
  parTimeSeconds: 60,
};
```

## File Location & Naming

- Challenge data: `src/data/challenges/{id}.ts` (e.g., `chapter-01.ts`, `boss-03.ts`)
- Always export a named `challenge` constant, not a default export
- Each challenge needs a corresponding step bank in `src/lib/ai/engine.ts` keyed by step ID

## Go Zen Rules

Every step needs zen rules in `src/lib/game/zen.ts` (`STEP_ZEN_RULES` registry). These are heuristic checks for idiomatic Go patterns that award bonus XP and trigger Maya's memory jolts.

When writing zen rules for a new step:
1. Identify which Go idioms are teachable for the concepts in that step
2. Write regex/string heuristic checks (no AST parsing — keep it lightweight)
3. Write Maya's jolt text (memory returning) and suggestion text (memory failing)
4. Each rule awards 5-15 bonus XP

Source material: [Zen of Go](https://dave.cheney.net/2020/02/23/the-zen-of-go) and [Effective Go](https://go.dev/doc/effective_go).

## XP Values Reference

XP is per-step, not per-challenge. Total challenge XP is the sum of all step XP values plus potential zen bonus. Check `docs/design.md` for the curriculum table.
