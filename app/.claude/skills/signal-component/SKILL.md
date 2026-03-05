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
