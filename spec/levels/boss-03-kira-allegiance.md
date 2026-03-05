# Boss — Kira (Allegiance Challenge)

**Act III Boss**

## Go Concepts (Evaluation)

- Goroutines
- Race conditions
- Slice internals (shared backing array)

## Story Context

Kira sends a function. It looks like it helps Maya. But the player must evaluate: does this goroutine introduce a data race?

## Mechanic

This is NOT a coding challenge — it's an analysis challenge. The player reads code and writes an explanation.

### Kira's Code (displayed, read-only)

```go
func transmit(data []byte, ch chan<- []byte) {
    for i := range data {
        data[i] ^= 0xFF  // in-place mutation
        ch <- data[i:]    // sends slice of mutated original
    }
}
```

### The Answer

**Yes — it has a data race.** The function:

1. Mutates `data` in-place (`data[i] ^= 0xFF`)
2. Sends a slice of the same underlying array at each iteration (`data[i:]`)
3. Every receiver sees mutated data from subsequent iterations
4. The sent slices share the same backing array — no `copy` is made
5. This would corrupt the escape transmission

### Player Task

Write a comment-only explanation (no code) identifying the race condition. Must identify:

- Shared slice header / backing array
- In-place mutation affecting previously sent slices
- Missing `copy`

### Evaluation

Maya's AI (LLM) evaluates the explanation. The evaluation prompt checks for mention of:

1. "shared" or "same" array/backing
2. "mutation" or "modif" of original data
3. "copy" as the fix or "no copy" as the problem

Must hit at least 2 of 3 to pass.

### Branching

| Result | Path | Narrative |
| --- | --- | --- |
| Correct explanation | **Reject Kira** — she's sabotaging | Ending B path: Kira vanishes, harder navigation in Act IV |
| Incorrect explanation | **Trust Kira** (wrongly) | Ending A path: Kira helps but with hidden cost, twist in finale |

## Layout

### Desktop

```
┌──────────────────────────────────────────────────┐
│           KIRA · ALLEGIANCE CHECK                │
├─────────────────────────┬────────────────────────┤
│  KIRA'S CODE (read-only)│  YOUR ANALYSIS         │
│                         │                        │
│  func transmit(data     │  [prose textarea]      │
│    []byte, ch chan<-     │                        │
│    []byte) {            │  Explain: does this    │
│    for i := range data {│  code have a data race?│
│      data[i] ^= 0xFF   │  If so, what causes it?│
│      ch <- data[i:]     │                        │
│    }                    │                        │
│  }                      │                        │
├─────────────────────────┴────────────────────────┤
│         [ TRUST KIRA ]    [ REJECT KIRA ]        │
└──────────────────────────────────────────────────┘
```

### Mobile

- Binary choice UI: `[ TRUST ]` / `[ REJECT ]`
- Code snippet shown as non-editable code block above
- Dedicated prose `<textarea>` replaces the code editor

## XP

- **Base:** 600 XP
- **Correct allegiance reading:** +400 XP bonus
- **AI tokens earned:** +2 (correct), +0 (incorrect)

## No Timer

This boss has no time pressure. It's a deliberate, thoughtful challenge.

## UI State

- **Location label:** KIRA'S CHANNEL
- **No rush mode, no jeopardy**
- **Atmosphere:** Tense silence. Maya and Dr. Reeves are watching.
- **Post-decision:** Cinematic reveal of consequences
