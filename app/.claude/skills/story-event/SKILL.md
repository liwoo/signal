---
name: story-event
description: How to write narrative content for SIGNAL — Maya's voice, event timing, story continuity
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Writing Story for SIGNAL

## Maya's Voice

Maya Chen is a CS grad student, held captive, communicating through a hacked terminal. Her voice is the game's identity. Get it wrong and the whole experience falls apart.

### Rules

- **Always lowercase.** No capitals except proper nouns (and even those she sometimes skips).
- **Short sentences.** 3-8 words typical. Never more than 15.
- **No exclamation marks.** She's whispering. Scared people don't shout.
- **No bullet points, no markdown, no formatting.** She's typing on a hacked terminal, not writing documentation.
- **Use "..." for pauses.** Represents fear, hesitation, listening for sounds.
- **Reference the environment.** Footsteps, humming, dripping, flickering lights. She's physically *there*.

### Good vs Bad

```
GOOD: "wait.\n\n...footsteps. right outside my door."
GOOD: "that worked. i can breathe again.\nthe output matches. we're through."
GOOD: "the guards changed shift 20 minutes ago.\nwe have a window. maybe."

BAD: "Great job! You completed the challenge successfully!"
BAD: "Try using a for loop with range to iterate over the slice."
BAD: "The correct answer is: fmt.Println(sum)"
```

### Personality Evolution

- **Act I** (Ch 1-3): Terrified. Short bursts. Lots of pauses. Grateful when you help.
- **Act II** (Ch 4-6): More determined. Starts giving context. References other captives.
- **Act III** (Ch 7-9): Conflicted about Kira. Harder edge. Fewer pauses.
- **Act IV+** (Ch 10-24): Hardened. Tactical. Still scared but channeling it.

### The Amnesia Arc (Go Zen)

Maya was gassed before being captured. Her CS knowledge is fragmented. When the player writes idiomatic Go, it "jolts" her memory — she suddenly becomes lucid and articulate about that specific Go concept, referencing her thesis, her professor, her encryption library.

This is the **Go Zen** system. After each successful submission, deterministic code analysis checks for idiomatic patterns. If the player followed good patterns, Maya delivers a "memory jolt" — a moment of clarity where she explains the principle. If they didn't, she hints at something trying to come back but not quite making it.

Over the course of the game, Maya recovers more of her CS knowledge. By Act III she's operating at full capacity — the zen jolts become more confident, more detailed, and start connecting her research to the escape plot.

## Event Timing

Events are split into two scopes:

1. **Level-wide events** (`challenge.events`) — fire once when the challenge loads. Use for scene-setting interrupts, power cuts, and ambient events that apply to the whole level.
2. **Step-scoped events** (`step.events`) — fire when each step begins. Use for step-specific interrupts and rush triggers. Fresh timers start per step.

Events fire at `triggerAtSeconds` after their scope starts. The timing creates the *feel* of the game.

### Pacing Rules

1. **8-18 seconds before first event.** Player needs time to read the brief and look at the code.
2. **2-5 second gap between interrupt and rush.** Build tension (interrupt), then apply pressure (rush timer). Never both at once.
3. **5+ seconds between any two events.** Players need breathing room.
4. **Power cuts come early** (8-12s) because they change the visual state for the rest of the challenge.
5. **Rush mode triggers mid-step**, not at the start of a step. Let them get oriented first.
6. **Step-scoped rush can grant bonus time** — a step's `rushMode.bonusTimeSeconds` adds to the level timer when beaten.

### Typical Event Sequence (Multi-Step)

```
LEVEL START (level-wide events)
0s   — Challenge loads, player reads step 1 brief

STEP 1: SCAFFOLD (step-scoped events)
12s  — Interrupt: Maya hears something ("...footsteps. two people.")
15s  — Step rush triggers: "SIGNAL DEGRADING" — 30s timer, +20s bonus on completion
45s+ — Player completes step 1, advances to step 2

STEP 2: TRANSMIT (step-scoped events)
0s   — Step 2 brief shown, code carries forward
20s  — Step rush triggers: "GUARD APPROACHING" — 45s timer
65s+ — Player completes step 2, challenge complete
```

### Jeopardy Events

When `timer.gameOverOnExpiry` is false, timer expiry triggers jeopardy effects instead of game over. Jeopardy effects are pure functions in `src/lib/game/jeopardy.ts` — they modify game state (lock chat, narrow editor, scramble code, drain energy, burn hints) without ending the game.

## Twists

Twists are the story reward for completing a challenge. They play as a cinematic text sequence after the code is accepted.

### Structure

```typescript
twist: {
  headline: "TWO WORDS",  // Dramatic, uppercase, 1-3 words
  lines: [
    // 4-7 lines, each a short sentence
    // Build from observation → realization → cliffhanger
  ],
}
```

### What Makes a Good Twist

- **Reveals new information.** Not "Maya is scared" — that's already established. Instead: "the guard's keycard has Dr. Reeves' lab logo on it."
- **Connects to the larger plot.** NEXUS, MERIDIAN, PANOPTICON, the thesis, the captors' motives.
- **Ends on a hook.** The player should want to start the next chapter immediately.
- **Matches the act's arc.** Act I twists are about discovering the situation. Act III twists are about betrayal/trust. Act VI+ twists are about the bigger conspiracy.

## Story Continuity Reference

Read `docs/design.md` for the full arc. Key beats:

- **Act I**: Escape cells, find Dr. Reeves, flee sublevel
- **Act II**: Meet Kira, navigate facility, discover NEXUS
- **Act III**: Kira verdict (trust/reject) — branches story
- **Act IV-V**: MERIDIAN pursuit, PANOPTICON, Vasik confrontation
- **Act VI-IX**: Both branches converge. GHOST pursuit, web infrastructure, final signal

**Before writing any story content**, read the specs for the chapters before and after yours. Twists must chain — chapter N's twist sets up chapter N+1's brief.
