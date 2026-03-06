---
name: beginner-mode
description: How to write and extend beginner mode content — pre-level concept briefings for new players
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Beginner Mode in SIGNAL

## What It Is

A toggleable pre-level overlay that teaches Go concepts before the player starts a challenge. Content is grouped into sections — the player presses CONTINUE between each one. Code blocks have clickable hotspots that reveal explanations and award XP.

## Architecture

### Data Layer: `src/data/beginner-notes.ts`

Notes are keyed by challenge ID. Each challenge maps to a `BeginnerNotes` object:

```typescript
interface Hotspot {
  text: string;     // exact substring in the code to highlight
  tip: string;      // tooltip shown on click
}

interface NoteBlock {
  type: "text" | "code";
  content: string;
  section: number;     // blocks with same section are revealed together
  hotspots?: Hotspot[]; // only for code blocks
}

interface BeginnerNotes {
  title: string;      // e.g. "GO BASICS"
  subtitle: string;   // e.g. "WHAT YOU NEED FOR THIS LEVEL"
  blocks: NoteBlock[];
}
```

Key functions:
- `getBeginnerNotes(challengeId)` — returns notes or null
- `getSectionCount(notes)` — returns total number of sections

### Component: `src/components/game/BeginnerOverlay.tsx`

Fullscreen overlay (`z-[60]`) with:
- **Sections** — blocks are grouped by `section` number. Each section streams in, then the player must press CONTINUE to advance
- **Streaming** — character-by-character (18ms for text, 8ms for code) with blinking cursor
- **Hotspots** — code blocks have dashed-underlined clickable spans. Clicking reveals a full-width tooltip below the code block with the explanation
- **XP rewards** — each hotspot awards +5 XP on first click (tracked via `clickedHotspots` set, no double-dipping). Total earned XP shown in header
- **Progress bar** — section dots at the top (green = done, amber = current, dim = upcoming)
- **SKIP** button — fast-forwards current section's streaming
- **CONTINUE** button — appears when section streaming is done, advances to next section
- **START LEVEL** button — replaces CONTINUE on the last section
- **DON'T SHOW AGAIN** button — saves `beginnerMode: false` to settings and starts the level

Props:
```typescript
interface BeginnerOverlayProps {
  notes: BeginnerNotes;
  onReady: () => void;           // called when player finishes or skips
  onDisable: () => void;         // called when player clicks "don't show again"
  onHotspotXP: (amount: number) => void;  // wired to actions.addXP
}
```

### Settings: `PlayerSettings.beginnerMode`

- Stored in `src/types/game.ts` → `PlayerSettings`
- Persisted via `src/lib/storage/local.ts` → `loadSettings()` / `saveSettings()`
- Default: `true` (new players see it)
- Set to `false` when player clicks "DON'T SHOW AGAIN"

### XP Integration

- `useGame` exposes `addXP(amount)` in `GameActions`
- `page.tsx` passes `actions.addXP` as `onHotspotXP` to the overlay
- XP earned in the tutorial carries into the game session

### Flow in `src/app/page.tsx`

```
IntroScreen → Cinematic → (if beginnerMode && notes exist) BeginnerOverlay → startGame()
```

The intro guard checks `!showBeginner` to prevent re-rendering IntroScreen while the overlay is visible.

## Adding Notes for a New Challenge

1. Open `src/data/beginner-notes.ts`
2. Add an entry to the `BEGINNER_NOTES` record keyed by challenge ID
3. Group blocks into sections using the `section` field
4. Add hotspots to code blocks

### Sections

Blocks with the same `section` number are revealed together. Use sections to group related concepts:

- Section 0: The skeleton / first concept
- Section 1: Deeper explanation of section 0
- Section 2: Next concept with code example
- Section 3: Final concept

Aim for 3-5 sections per challenge. Each section should be digestible in one read.

### Writing Guidelines

- **Maya's voice** — lowercase, no exclamation marks, no bullet points
- **Text blocks** — explain one concept per block, keep it to 1-3 sentences
- **Code blocks** — short, focused snippets (3-8 lines). Always valid Go. Use comments sparingly — `// %s = string` style
- **Order** — start with the most foundational concept, build up. Mirror the order the player will encounter them in the challenge steps
- **Don't teach everything** — cover just enough for the player to attempt the level. The challenge itself and Maya's hints fill in the rest
- **Match the challenge** — if the challenge uses `fmt.Printf`, show `Printf`. Don't teach `Sprintf` that isn't needed yet

### Hotspot Guidelines

- **Every code block should have hotspots.** They're the main interactive element — don't skip them
- **`text` must be an exact substring** of the code block's `content`. The system finds it via `indexOf`
- **No overlapping hotspots.** If two hotspots overlap, only the first is kept
- **Tips should explain what the code does**, not just restate it. "declares this file as an executable program" not "this is the package declaration"
- **Keep tips to 1-2 sentences.** They appear in a tooltip — not a paragraph
- **3-5 hotspots per code block.** Too many feels overwhelming, too few misses teaching opportunities
- **Already-clicked hotspots dim** (opacity 0.6) to show they've been explored

### Example Entry

```typescript
"chapter-02": {
  title: "LOOPS & CONTROL",
  subtitle: "WHAT YOU NEED FOR THIS LEVEL",
  blocks: [
    {
      type: "text",
      section: 0,
      content: "go has only one loop keyword: for. it does everything — counting, iterating, infinite loops.",
    },
    {
      type: "code",
      section: 0,
      content: `for i := 0; i < 5; i++ {
    fmt.Println(i)
}`,
      hotspots: [
        { text: "i := 0", tip: "initializer — runs once before the loop starts. declares i as 0." },
        { text: "i < 5", tip: "condition — checked before each iteration. loop stops when this is false." },
        { text: "i++", tip: "post statement — runs after each iteration. increments i by 1." },
      ],
    },
    {
      type: "text",
      section: 1,
      content: "range lets you iterate over slices, strings, and maps without managing an index yourself.",
    },
    {
      type: "code",
      section: 1,
      content: `codes := []int{42, 17, 88}
for _, c := range codes {
    fmt.Println(c)
}`,
      hotspots: [
        { text: "[]int{42, 17, 88}", tip: "a slice literal — an ordered, resizable list of integers." },
        { text: "_", tip: "blank identifier. discards the index because we only need the value." },
        { text: "range codes", tip: "iterates over the slice, yielding (index, value) pairs each iteration." },
      ],
    },
    {
      type: "text",
      section: 2,
      content: "switch in go doesn't fall through by default. no break needed — each case exits automatically.",
    },
    {
      type: "code",
      section: 2,
      content: `switch {
case x <= 3:
    fmt.Println("low")
case x <= 7:
    fmt.Println("mid")
default:
    fmt.Println("high")
}`,
      hotspots: [
        { text: "switch {", tip: "switch without a variable — each case is a boolean expression. go's alternative to if-else chains." },
        { text: "case x <= 3:", tip: "matches when x is 3 or less. only this block runs — no fallthrough." },
        { text: "default:", tip: "runs when no other case matches. like the 'else' of a switch." },
      ],
    },
  ],
},
```

## Styling Rules

- Use `var()` for all colors — `--color-signal` for code text, `--color-foreground` for prose, `--color-dim` for labels, `--color-code-bg` for code block backgrounds, `--color-info` for hotspot underlines and tooltip accents
- No rounded corners, no shadows — terminal aesthetic
- Code blocks use `<pre>` with `font-family: var(--font-mono)`
- Left border accent: `rgba(110,255,160,.15)`
- Hotspot tooltip: full-width below the code block, cyan left border (`--color-info`), `▸ EXPLAIN` header
- XP flash uses existing `xp-burst` CSS animation

## Common Mistakes

- **Notes too long.** 8-12 blocks across 3-5 sections max. If you need more, the challenge covers too many concepts — consider splitting the challenge
- **Code that doesn't compile.** Every code block should be valid Go (or a valid snippet from a main function). Players will try to copy it
- **Teaching concepts not in the challenge.** Only cover what the player needs for THIS level. Extra concepts confuse beginners
- **Forgetting to check the challenge's concepts array.** The notes should map to `challenge.concepts[]` — that's the source of truth for what's being taught
- **Hotspot text not matching code.** The `text` field must be an exact substring of the code's `content`. A mismatch means the hotspot silently won't render
- **Missing sections.** Every block needs a `section` number. Forgetting it defaults to 0, which dumps everything into one group
- **Code blocks without hotspots.** Every code block should have hotspots — they're the primary interactive teaching tool and the XP incentive to engage
