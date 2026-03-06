# SIGNAL

**Learn Go by keeping someone alive.**

SIGNAL is a narrative coding game where you teach yourself Go by helping Maya Chen — a cryptography researcher trapped in a research facility — escape through code. Every challenge is a real Go problem. Every line you write matters.

Built with Next.js 16, React 19, Tailwind CSS 4, and TypeScript 5.

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd signal/app
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You need a screen width of 768px or wider (tablet landscape / laptop / desktop).

### LLM Backend (Optional)

SIGNAL ships with a built-in pattern-matching engine for Maya's responses — no LLM required to play. For a richer experience with freeform conversation, configure an LLM backend:

**Option A: Ollama (free, local)**

```bash
# Install Ollama from https://ollama.com
ollama pull llama3.2:3b
```

The default `.env.local` is already configured for Ollama:

```env
LLM_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

**Option B: Anthropic API (cloud)**

```env
LLM_BACKEND=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## How It Works

You play as a remote programmer who intercepts Maya's distress signal. She's been captured and needs you to write Go programs to hack terminals, bypass locks, and transmit data — all while guards patrol and systems fail around you.

The game loop:

1. **Read the brief** — Maya tells you what she needs
2. **Write Go code** — in a real code editor with syntax highlighting
3. **Submit** — Maya evaluates your code and responds in character
4. **Earn XP** — speed bonuses, first-try bonuses, and Zen XP for idiomatic Go
5. **Race the clock** — timed events, rush challenges, and jeopardy effects raise the stakes

### Key Systems

| System | Description |
|---|---|
| **Multi-step challenges** | Each chapter has sequential steps that build on each other |
| **Level timer** | Per-challenge countdown with rush bonuses and game-over consequences |
| **Jeopardy effects** | Guard patrols lock chat, power cuts narrow the editor, signals scramble your code |
| **Go Zen** | Bonus XP for idiomatic Go patterns — Maya's amnesia lifts as you write clean code |
| **Hearts** | 3 lives. Lose one on game over. Buy more with XP |
| **Beginner mode** | Interactive pre-level briefings with clickable code hotspots |
| **Maya typing pause** | Timer and events freeze while Maya speaks, with a 7s grace period after |

---

## Project Structure

```
signal/
├── app/                          # Next.js application (you are here)
│   ├── src/
│   │   ├── app/                  # Routes and layouts
│   │   ├── components/
│   │   │   ├── game/             # HUD, editor, chat, timer, beginner overlay
│   │   │   └── story/            # TypeText, TwistReveal, cinematic scenes
│   │   ├── data/
│   │   │   ├── challenges/       # Chapter definitions (chapter-01.ts, etc.)
│   │   │   └── beginner-notes.ts # Pre-level concept briefings
│   │   ├── hooks/                # useGame (state orchestration), useVim
│   │   ├── lib/
│   │   │   ├── ai/               # Maya's response engine + prompt templates
│   │   │   ├── game/             # Pure game logic (xp, energy, hearts, zen, jeopardy)
│   │   │   ├── go/               # Go tokenizer, evaluator, diagnostics
│   │   │   ├── sprites/          # Pixi.js character + scene painters
│   │   │   └── storage/          # localStorage/sessionStorage wrappers
│   │   └── types/
│   │       └── game.ts           # All TypeScript types (single source of truth)
│   ├── test-visual/              # Playwright visual tests
│   └── .claude/skills/           # AI assistant skill guides
├── docs/
│   └── design.md                 # Full game design document
├── spec/
│   ├── levels/                   # Per-chapter/boss specs (24 chapters + 9 bosses)
│   └── infrastructure/           # LSP, LLM, testing, persistence specs
└── inspo/
    └── inspo.jsx                 # Original prototype (read-only reference)
```

---

## Architecture

### Three-Layer Rule

Game logic is split into strict layers:

| Layer | Location | Rule |
|---|---|---|
| **Pure functions** | `src/lib/game/` | No React, no DOM, no storage. Takes inputs, returns outputs. |
| **State orchestration** | `src/hooks/` | Calls pure functions + manages React state + triggers persistence |
| **Persistence** | `src/lib/storage/local.ts` | All localStorage/sessionStorage access goes through helpers here |

Never call `localStorage` directly. Never import React in `lib/game/`. Never put game math in components.

### Types

All game types live in `src/types/game.ts`. Key types:

- `Challenge` / `ChallengeStep` — challenge definitions with steps, timer, events
- `PlayerStats` / `PlayerProgress` — XP, level, hearts, streak, completion state
- `JeopardyState` — active effects (guard, power cut, scramble)
- `GamePhase` — intro, playing, twist, win, gameover

### Maya's Engine

`src/lib/ai/engine.ts` contains Maya's response logic — a pattern-matching engine keyed by step ID. Each step has:

- An intro message
- Code evaluation patterns (regex matching with `||COMPLETE||` token for success)
- Chat response banks for hints and conversation

The `||COMPLETE||` token is how the game detects correct submissions. It's stripped before display.

### Chat Formatting

Maya's messages support inline formatting via `MayaMarkdown`:

- `` `code` `` renders as styled inline code spans
- `[ZEN +N XP]` renders as a styled XP badge
- Messages stream character-by-character via `TypeText`, then swap to formatted rendering once complete

### Styling

Tailwind v4 with CSS variables defined in `src/app/globals.css` under `@theme inline`. All colors and fonts are referenced via `var()`:

```tsx
// Correct
<div style={{ color: "var(--color-signal)" }}>
<div className="text-[var(--color-signal)]">

// Wrong — don't use hex values or Tailwind color names
<div className="text-green-400">
```

No `border-radius`. No `box-shadow`. Everything is sharp rectangles — this is a terminal.

### Color Palette

| Variable | Hex | Use for |
|---|---|---|
| `--color-background` | `#040810` | Page background |
| `--color-panel` | `#06101a` | Cards, panels |
| `--color-code-bg` | `#030810` | Code editor background |
| `--color-signal` | `#6effa0` | Primary green — Maya's text, success, CTAs |
| `--color-alert` | `#ff9f1c` | Warnings, rush mode, timers |
| `--color-danger` | `#ff4040` | Errors, critical states |
| `--color-info` | `#00d4ff` | Informational, hotspot accents |
| `--color-player` | `#7ab8d8` | Player's chat messages |
| `--color-win` | `#ffed4a` | XP gains, victory |
| `--color-foreground` | `#b8d4a0` | Default body text |
| `--color-dim` | `#1a5a4a` | Muted/secondary text |

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Run production server
npm run lint      # Run ESLint
npx vitest run    # Run unit tests (377 tests across 10 files)
npx playwright test  # Run visual/E2E tests
```

---

## Testing

### Unit Tests (Vitest)

377 tests covering all pure game logic:

```bash
npx vitest run                    # Run all tests
npx vitest run src/lib/game/      # Run game logic tests only
npx vitest --watch                # Watch mode
```

Test files live next to their source: `xp.ts` / `xp.test.ts`, `zen.ts` / `zen.test.ts`, etc.

Coverage areas:
- **Game logic** — XP, energy, hearts, jeopardy, events, zen (72 idiomatic Go pattern tests)
- **Go tooling** — tokenizer, evaluator, diagnostics
- **AI engine** — Maya's response patterns and completion detection

### Visual Tests (Playwright)

```bash
npx playwright test               # Run visual tests
npx playwright test --headed      # Run with browser visible
```

Captures sprite rendering at 1200x900 viewport.

---

## Adding Content

### New Chapters

Every chapter needs three things:

1. **A spec** in `spec/levels/` — defines Go concepts, story beats, acceptance criteria
2. **Challenge data** in `src/data/challenges/` — implements the `Challenge` interface
3. **Engine banks** in `src/lib/ai/engine.ts` — Maya's responses keyed by step ID

Plus optional but recommended:
4. **Zen rules** in `src/lib/game/zen.ts` — bonus XP for idiomatic patterns
5. **Beginner notes** in `src/data/beginner-notes.ts` — pre-level concept briefings

Read `.claude/skills/challenge-author/SKILL.md` for the full process.

### Challenge Structure

```typescript
export const chapter02: Challenge = {
  id: "chapter-02",
  act: 1,
  chapter: 2,
  title: "LOOP PROTOCOL",
  location: "CORRIDOR 7-A",
  concepts: ["for loop", "range", "switch"],
  steps: [
    {
      id: "chapter-02:loop",
      title: "LOOP",
      brief: "write a for loop...",
      starterCode: "package main\n...",
      expectedBehavior: "prints numbers 1-5",
      hints: [
        { level: 1, text: "think about the for keyword", energyCost: 8 },
        { level: 2, text: "for i := 0; i < 5; i++", energyCost: 12 },
        { level: 3, text: "fmt.Println(i+1) inside the loop", energyCost: 20 },
      ],
      rushMode: { label: "ALARM TRIGGERED", durationSeconds: 30, onExpiry: "energy_drain", bonusTimeSeconds: 15 },
      xp: { base: 50, firstTryBonus: 25, parTimeSeconds: 45 },
      events: [],
    },
  ],
  events: [],
  timer: { timeLimitSeconds: 180, gameOverOnExpiry: true },
  isBoss: false,
  parTimeSeconds: 90,
};
```

### Beginner Notes with Hotspots

```typescript
"chapter-02": {
  title: "LOOPS & CONTROL",
  subtitle: "WHAT YOU NEED FOR THIS LEVEL",
  blocks: [
    { type: "text", section: 0, content: "go has only one loop keyword: for." },
    {
      type: "code", section: 0,
      content: `for i := 0; i < 5; i++ {\n    fmt.Println(i)\n}`,
      hotspots: [
        { text: "i := 0", tip: "initializer — runs once before the loop starts." },
        { text: "i < 5", tip: "condition — checked before each iteration." },
        { text: "i++", tip: "post statement — runs after each iteration." },
      ],
    },
  ],
},
```

Each hotspot awards +5 XP on first click.

---

## Content Guidelines

### Maya's Voice

Maya speaks **lowercase**. No caps except the `||COMPLETE||` token. No exclamation marks. No bullet points.

```
// Good
"you grouped the import with parentheses — `import ( ... )`. that's how go does it."

// Bad
"You grouped the import with parentheses! That's how Go does it."
```

### Code in Challenges

- Starter code must be valid Go with `package main` and correct imports
- Use `// TODO` markers for parts players fill in
- Solutions under 30 lines (chapters) or 50 lines (bosses)

### Hints (3 levels per step)

1. **Nudge** — "think about how range works"
2. **Directional** — "use a for-range loop over the slice"
3. **Nearly there** — "for _, v := range items { sum += v }"

Never paste the full solution in a hint.

---

## Environment Variables

Create `.env.local` in the `app/` directory:

```env
# LLM Backend: "ollama" (default) or "anthropic"
LLM_BACKEND=ollama

# Ollama (free, local — install from https://ollama.com)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Anthropic (cloud fallback — set your key if you want to use it)
ANTHROPIC_API_KEY=
```

The game works without any LLM — the built-in engine handles all gameplay. The LLM adds freeform conversation beyond scripted patterns.

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | Framework (App Router) |
| [React](https://react.dev) | 19 | UI |
| [TypeScript](https://typescriptlang.org) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling (CSS variables via `@theme inline`) |
| [Pixi.js](https://pixijs.com) | 8 | 2D sprite rendering (Maya's animation, cinematics) |
| [Vitest](https://vitest.dev) | 4 | Unit testing (377 tests) |
| [Playwright](https://playwright.dev) | 1.58 | Visual / E2E testing |

---

## AI Assistant Skills

The `.claude/skills/` directory contains guides for AI-assisted development:

| Skill | What it covers |
|---|---|
| `challenge-author` | Adding chapters, bosses, and story content |
| `game-mechanic` | Pure game logic, state management, timer/jeopardy/hearts/zen |
| `maya-prompt` | Writing Maya's AI responses and prompt engineering |
| `signal-component` | Building UI components matching the visual language |
| `story-event` | Narrative content, event timing, Maya's voice |
| `beginner-mode` | Pre-level concept briefings with interactive hotspots |

---

## Curriculum

SIGNAL teaches Go across 24 chapters and 9 boss encounters in 3 acts:

**Act I — First Contact** (Chapters 1-8, Bosses 1-3)
Package, import, func main, variables, constants, fmt, for loops, range, switch, slices, functions, multiple return values, error handling, structs

**Act II — Deep Signal** (Chapters 9-16, Bosses 4-6)
Interfaces, methods, pointers, maps, goroutines, channels, select, sync, file I/O, JSON, HTTP basics

**Act III — Endgame** (Chapters 17-24, Bosses 7-9)
Concurrency patterns, context, testing, packages, modules, build tags, reflection, generics, the final escape

Full curriculum and story arc are in `docs/design.md`. Per-chapter specs are in `spec/levels/`.

---

## License

TBD
