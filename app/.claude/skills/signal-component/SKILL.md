---
name: signal-component
description: How to build UI components that match SIGNAL's visual language and tech stack
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Building Components in SIGNAL

## Stack

- **Next.js 16** with App Router and `src/` directory
- **React 19** — use hooks, no class components
- **Tailwind CSS 4** with `@theme inline` in `globals.css`
- **TypeScript 5** — strict mode, no `any` without eslint-disable comment

## The Tailwind v4 + CSS Variables Pattern

This project uses Tailwind v4's `@theme inline` directive. Colors and fonts are CSS custom properties, NOT Tailwind config values. You reference them with the `var()` escape hatch:

```tsx
// CORRECT — how this project does it
<div className="bg-[var(--color-panel)] text-[var(--color-signal)] border-[var(--color-border)]">
<h1 className="font-[family-name:var(--font-display)]">

// WRONG — these don't exist in this project
<div className="bg-panel text-signal border-border">
<h1 className="font-display">
```

**Why:** Tailwind v4 auto-generates utility classes from `@theme` variables, but the mapping uses the full variable name. For colors declared as `--color-signal`, Tailwind *does* create `text-color-signal` — but we use the `var()` pattern for clarity and consistency. Pick one pattern and stick with it.

### Color Palette (from `globals.css`)

| Variable | Hex | Use for |
|---|---|---|
| `--color-background` | `#040810` | Page background |
| `--color-panel` | `#06101a` | Cards, panels, containers |
| `--color-code-bg` | `#030810` | Code editor background |
| `--color-signal` | `#6effa0` | Primary green — CTAs, Maya's text, success |
| `--color-alert` | `#ff9f1c` | Warnings, rush mode, timers |
| `--color-danger` | `#ff4040` | Errors, critical energy, Vasik |
| `--color-info` | `#00d4ff` | Links, Kira's text, informational |
| `--color-player` | `#7ab8d8` | Player's chat messages |
| `--color-win` | `#ffed4a` | XP gains, victory states |
| `--color-foreground` | `#b8d4a0` | Default body text |
| `--color-dim` | `#1a5a4a` | Muted/secondary text |
| `--color-border` | `#0a2030` | All borders |

### Fonts

- **Orbitron** (`--font-display`): Headings, HUD labels, buttons. Always uppercase + `tracking-widest`.
- **JetBrains Mono** (`--font-mono`): Everything else — code, chat, body text. This is the body default.

## Visual Rules

1. **No border-radius.** Everything is sharp rectangles. This is a terminal, not a consumer app.
2. **1px borders only.** Use `border border-[var(--color-border)]`. No thick borders, no shadows.
3. **No box-shadow.** Glow effects use `text-shadow` or CSS animations, not box-shadow.
4. **Uppercase for HUD/labels.** Lowercase for chat and story text (Maya's voice is always lowercase).
5. **Minimal spacing.** Tight layouts — this is a dense terminal UI, not a marketing page.

## Component Conventions

- **`"use client"`** directive on any component with state, effects, or event handlers.
- **Named exports only** — `export function RushBar()`, never `export default`.
- **One component per file** unless tightly coupled (e.g., a list + list item).
- **Props interface above the component**, named `{ComponentName}Props`.
- **File structure:**
  ```
  src/components/
  ├── game/     # HUD, editor, chat panel, energy bar
  ├── story/    # TypeText, TwistReveal, Interrupt toast
  ├── ui/       # Button, Panel, Badge (reusable primitives)
  └── layout/   # Page shells, split panes
  ```

## Code Editor Pattern

The `CodeEditor` (`src/components/game/CodeEditor.tsx`) uses a **transparent-textarea overlay** pattern for syntax highlighting:

1. A `<pre>` element renders tokenized code with colored `<span>`s (using `src/lib/go/tokenizer.ts`)
2. A transparent `<textarea>` sits on top, capturing all input
3. Scroll is synced between the textarea and the `<pre>` overlay
4. Caret color is set to `--color-signal` via `caretColor`

### Syntax Colors (from `globals.css`)

| Variable | Use for |
|---|---|
| `--color-syn-keyword` | `func`, `if`, `for`, `return`, etc. |
| `--color-syn-string` | String/rune literals |
| `--color-syn-comment` | `//` and `/* */` comments |
| `--color-syn-number` | Numeric literals |
| `--color-syn-builtin` | `make`, `append`, `len`, etc. |
| `--color-syn-type` | `int`, `string`, `bool`, etc. |
| `--color-syn-ident` | User identifiers |

### Vim Mode

Vim mode is powered by `src/hooks/useVim.ts`. It:
- Is **off by default** — toggled via a VIM button in the editor status bar
- Supports **normal** and **insert** modes
- Normal mode keys: `h/j/k/l`, `w/b`, `0/$`, `gg/G`, `i/a/I/A/o/O`, `x`, `dd`, `Escape`
- The hook returns `[state, actions]` — state has `mode` and `enabled`, actions has `toggle`, `setMode`, `handleKeyDown`
- `handleKeyDown` returns `true` if it consumed the event (so the editor skips its own handling)

When extending vim mode, add keys to `useVim.ts` — never add vim logic directly to the editor component.

## Chat Message Fading (`ChatPanel`)

Aggressive opacity fade keeps focus on the current conversation. Last 2 messages at full opacity, then drops 0.25 per message to a 0.08 floor:

```typescript
const distFromEnd = messages.length - 1 - i;
const opacity = distFromEnd < 2 ? 1 : Math.max(0.08, 1 - (distFromEnd - 1) * 0.25);
```

Uses `transition-opacity duration-700` for smooth fade transitions.

## Maya Markdown (`MayaMarkdown`)

`src/components/game/MayaMarkdown.tsx` — renders Maya's messages with formatted segments:

- `` `code` `` → inline code span with green background/border (`rgba(110,255,160,.08)`)
- `[ZEN +N XP]` → styled XP badge with Orbitron font and green border
- Plain text → normal prose

**Lifecycle:** Maya messages stream as plain text via `TypeText`, then swap to `MayaMarkdown` rendering once typing completes. The `ChatPanel` tracks finished messages in a `typedIds` set.

**Timer integration:** `ChatPanel` takes `onMayaTypingStart` / `onMayaTypingEnd` props. When the last Maya message starts streaming, the game timer pauses. When typing finishes, a "continue" button appears (with 5s auto-countdown). Player clicks continue to see the next chunk or resume the game. Long messages are split at `\n\n` boundaries and delivered one paragraph at a time via `addMayaChunked` in `useGame.ts`.

## TypeText Callbacks (`TypeText`)

`src/components/story/TypeText.tsx` supports:
- `onStart` — fires when the first character is typed
- `onDone` — fires when streaming completes

These are used by `ChatPanel` to coordinate the game pause around Maya's animated messages.

## Level Timer (`LevelTimer`)

`src/components/game/LevelTimer.tsx` — countdown display for the challenge timer:
- Color transitions: dim (plenty of time) -> amber (under 60s) -> red blinking (under 15s)
- Shows "CRITICAL" label when `gameOverOnExpiry` is true, "LIVE" otherwise
- Includes a tiny progress bar showing remaining time fraction
- Placed in `TopBar` via the `timerSlot` prop

## Game Over (`GameOver`)

`src/components/story/GameOver.tsx` — CAPTURED screen when the timer expires and `gameOverOnExpiry` is true:
- Black screen with Maya's last words typed line by line
- "CAPTURED / SIGNAL LOST" reveal
- "RETRY FROM CHECKPOINT" button with penalty description (30% energy, no speed bonus, jeopardy at 50%)

## Win Modal (`WinModal`)

`src/components/game/WinModal.tsx` — Chapter complete overlay:
- **Centered modal** (max 560px wide, 620px tall) — NOT full-screen. Dark backdrop with grid overlay.
- Header: title, subtitle, compact XP/Level/Zen stat boxes
- Tabbed content: LIBRARY (default), MISSIONS, GAME MAP, STORE
- Library tab scrolls if content overflows — buttons always visible
- Story teaser above action buttons
- Action buttons pinned at bottom: RETRY CHAPTER / NEXT CHAPTER
- Zen library shows missed items — these feed into subsequent round challenges

## Mission Panel Step Props

`MissionPanel` now takes `currentStep`, `currentStepIndex`, and `totalSteps`:
- Shows step progress bar (pills for each step)
- Displays current step brief and hints
- Shows total XP breakdown across all steps

## Animations

Defined in `globals.css`. Use the class names:

- `.cursor-blink` — terminal cursor
- `.screen-flicker` — power cut effect
- `.xp-burst` — XP particle floating up
- `.msg-enter` — chat message slide-in

For rush timer, use the `rush-shrink` keyframe with inline `animation-duration` matching the rush countdown.

## Responsive

The game targets mobile-first. Minimum 320px width. Use Tailwind breakpoints (`md:`, `lg:`) for desktop enhancements. The core game loop must work on a single-column mobile layout.

## Prototype Reference

`inspo/inspo.jsx` has working implementations of: TypeText (char-by-char reveal), XPBurst (particle), RushBar (shrinking timer), PowerCut (overlay), Interrupt (toast), TwistReveal (cinematic). Read it for behavior, but rewrite in TypeScript with Tailwind — don't copy the inline styles.
