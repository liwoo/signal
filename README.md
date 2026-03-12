# SIGNAL

A browser-based coding game that teaches Go through an escape thriller. You're an anonymous programmer contacted by Maya Chen, a kidnapped CS grad student, through an encrypted terminal. Every room she escapes teaches real Go concepts. Every mistake has consequences.

4 acts. 24 chapters. 4 boss fights. From `fmt.Println` to production Go.

## The idea

Most coding tutorials are boring. You watch a video, copy some code, forget it by Thursday. SIGNAL flips that: the code you write is the game mechanic. You're not solving puzzles that happen to involve programming. You're writing actual Go that controls what happens in the story. Mess up a for loop and Maya gets caught. Nail a variadic function and she escapes through the ventilation shaft.

There's a timer. There are stakes. There's a guard AI that adapts to how you play. And there's Maya, talking to you in real time, reacting to your code, panicking when you're slow.

## Stack

- **Next.js 16** + **React 19** + **Tailwind 4** + **TypeScript 5**
- All visuals are programmatic **Canvas 2D** (no image assets, no sprites, everything painted)
- Code compilation via the **Go Playground API** (`go.dev/_/compile`)
- On-device AI chat (Maya) with local LLM fallback
- **Firebase Analytics** + **Supabase** for telemetry
- **Vitest** for unit/integration tests, **Playwright** for visual validation

## Project structure

```
signal/
├── app/                    # Next.js application
│   └── src/
│       ├── app/            # Routes and layouts
│       ├── components/     # UI (game/, story/, boss/, promo/)
│       ├── data/           # Challenge definitions
│       │   └── challenges/ # chapter-01.ts, boss-01.ts, etc.
│       ├── hooks/          # React hooks (useGame, useBossFight, useVim, useAudio)
│       ├── lib/
│       │   ├── ai/         # Maya's engine, prompt builders
│       │   ├── game/       # Pure game logic (xp, hearts, jeopardy, zen, timer)
│       │   ├── go/         # Tokenizer, completions, Go Playground client
│       │   ├── sprites/    # Canvas painters (scenes, characters, boss, map)
│       │   ├── storage/    # Persistence layer (IndexedDB)
│       │   └── supabase/   # Analytics (chat logs)
│       └── types/          # game.ts is the source of truth
├── docs/                   # Design doc, notes
├── spec/
│   ├── levels/             # Per-chapter specs (write these first)
│   └── infrastructure/     # System specs (LSP, auth, analytics)
└── inspo/                  # Original prototype
```

## Getting started

```bash
cd app
npm install
npm run dev
```

The game runs at `localhost:3000`. Act I (4 chapters + boss fight) is playable without any API keys.

### Environment variables

Copy `.env.local.example` or create `.env.local` with:

```bash
# Optional: LLM backend for Maya's chat (defaults to local Ollama)
LLM_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Optional: Firebase Analytics
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Optional: Supabase (chat message logging)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Running tests

```bash
cd app
npx vitest run          # 891+ unit/integration tests
npx playwright test     # Visual validation screenshots
```

## What's built so far

**Act I: The Escape** is fully playable:

| Chapter | Name | Concepts | Type |
|---|---|---|---|
| 01 | Handshake | `package main`, `import`, `fmt.Println`, string literals | Challenge |
| 02 | Door Code | `for` loops, `if/else`, `switch`, modulo | Challenge |
| 03 | Shaft Codes | Functions, multiple returns, slices, variadic params | Challenge |
| Boss | Lockmaster | Debugging across tabs, `const` groups, `strings.Join` | Boss fight |

Each chapter has beginner notes (pre-level tutorials), zen rules (idiomatic Go analysis), timed events, rush mode, and intro/complete cinematics.

## Key systems

- **Code Editor**: Transparent textarea overlay with syntax highlighting. Optional vim mode. Autocomplete on `pkg.` triggers. Paste disabled (you have to type it).
- **Maya Engine**: Pattern-matched dialogue system keyed by step ID. Sync for chat, async for code evaluation. Falls back gracefully when offline.
- **Jeopardy**: Guard patrols, chat lockdowns, code scrambling. Stakes that actually matter.
- **Hearts**: 3 initial lives, max 5. Lose them and it's game over. Buy more with XP.
- **Go Zen**: Heuristic code analysis that awards bonus XP for idiomatic Go. Tracks mastery across sessions.
- **Boss Fights**: Full-screen Canvas 2D combat. The Lockmaster has 100 HP, 6 turns, a sector grid, and shoots at you while you debug code across 3 tabs.
- **Sprite System**: Every visual is painted programmatically. Scenes (cell, corridor, vent, server room, boss arena), characters (Maya, guards, bosses), walk cycles, blood splatters, explosions. All Canvas 2D, no assets.

## Architecture rules

Game logic in `src/lib/game/` must be pure functions. No React, no DOM, no side effects. Takes inputs, returns outputs, easy to test.

All game types live in `src/types/game.ts`. Challenge data lives in `src/data/challenges/`. Every chapter needs a spec in `spec/levels/` before you write the code.

Maya speaks lowercase. No caps except the `||COMPLETE||` token. No exclamation marks. No bullet points.

The full set of rules is in `app/CLAUDE.md`.

## License

Private. All rights reserved.
