# SIGNAL — Project Rules

## What This Is

A narrative coding game teaching Go through an escape thriller. Next.js 16 + React 19 + Tailwind 4 + TypeScript 5.

## Non-Negotiable Rules

### Styling

- **Use `var()` for all colors and fonts.** `text-[var(--color-signal)]`, never `text-green-400` or `text-[#6effa0]`.
- **No `rounded-*` classes. No `border-radius`.** Everything is sharp rectangles — this is a terminal.
- **No `shadow-*` classes. No `box-shadow`.** Glow effects use `text-shadow` in CSS, not Tailwind utilities.
- **Fonts via variable reference only.** `font-[family-name:var(--font-display)]` for Orbitron, `font-[family-name:var(--font-mono)]` for JetBrains Mono. Body default is already JetBrains Mono.
- Color palette is in `src/app/globals.css` under `@theme inline`. Do not add new colors without reading the existing palette first.

### Architecture

- **Game logic in `src/lib/game/` must be pure functions.** No React imports, no DOM, no localStorage. Takes inputs, returns outputs.
- **Never call localStorage/sessionStorage directly.** Use `src/lib/storage/local.ts` helpers (`loadProgress()`, `saveStats()`, etc.).
- **All game types live in `src/types/game.ts`.** Don't create parallel interfaces elsewhere.
- **Named exports only.** `export function X()`, never `export default`.
- **`"use client"` on any component with state, effects, or event handlers.**

### Content

- **Maya speaks lowercase.** No caps except the `||COMPLETE||` token. No exclamation marks. No bullet points. No markdown formatting.
- **`||COMPLETE||` token is sacred.** It's how the game detects correct submissions. Never remove it from prompt logic.
- **Every challenge needs a spec first.** Specs live in `../spec/levels/`. Don't create challenge data without a corresponding spec.

### File Organization

```
src/
├── app/           # Next.js routes and layouts
├── components/
│   ├── game/      # HUD, editor, chat, energy bar
│   ├── story/     # TypeText, TwistReveal, Interrupt
│   ├── ui/        # Button, Panel, Badge
│   └── layout/    # Page shells
├── data/
│   └── challenges/ # Challenge definitions (chapter-XX.ts, boss-XX.ts)
├── hooks/         # React hooks (state orchestration)
├── lib/
│   ├── ai/        # LLM backend detection, prompt builders
│   ├── game/      # Pure game logic (xp, energy, streaks)
│   └── storage/   # localStorage/sessionStorage wrappers
└── types/         # TypeScript types (game.ts is the source of truth)
```

## Reference Files

- **Design doc:** `../docs/design.md` — game mechanics, story arc, curriculum map
- **Level specs:** `../spec/levels/` — per-chapter/boss requirements
- **Infrastructure specs:** `../spec/infrastructure/` — LSP, LLM, testing, persistence, auth, analytics
- **Prototype:** `../inspo/inspo.jsx` — working single-file prototype (read for patterns, don't copy inline styles)
- **Skills:** `.claude/skills/` — detailed how-to guides for content authoring, components, game logic, story, prompts
