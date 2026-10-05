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
- **Code editor uses transparent-textarea overlay pattern.** Syntax highlighting via `src/lib/go/tokenizer.ts` renders into a `<pre>`, input captured by a transparent `<textarea>` on top. Vim mode lives in `src/hooks/useVim.ts` — never add vim logic to the editor component directly.

### Content

- **Maya speaks lowercase.** No caps except the `||COMPLETE||` token. No exclamation marks. No bullet points. No markdown formatting.
- **`||COMPLETE||` token is sacred.** It's how the game detects correct submissions. Never remove it from prompt logic.
- **Every challenge needs a spec first.** Specs live in `../spec/levels/`. Don't create challenge data without a corresponding spec.
- **The Concept Tracker shows the WHOLE game, built + unbuilt.** `src/data/curriculum.ts` is a forward-looking roadmap: all 9 acts / 24 chapters (from `docs/design.md`). Built chapters pull `concepts` straight from their `Challenge` (auto-synced) and carry a `chapterId`; planned chapters list static concepts and have NO `chapterId` → rendered dim with a "SOON" tag so players see the road ahead. `src/lib/game/curriculum.ts` → `summarizeCurriculum()` marks each chapter covered/current/upcoming/planned from `completedChapterIds` + active `challenge.id`; the % is over PLAYABLE (built) concepts, with `planned` surfaced as "+N AHEAD". Renders as a far-right rail on desktop (`ConceptTracker`, ≥lg) and behind a "CONCEPTS LEARNED · N%" entry in the mobile MORE tab. **When you build a planned chapter, set its `chapterId` in curriculum.ts** so it lights up; concepts stay deduped (first occurrence wins).
- **Every step leads with the WHY.** Set `ChallengeStep.stake` — one plain-language sentence, ZERO code words, on what this step does for Maya / the escape. Playtests (Oct 2026) showed non-coders can finish a step without ever knowing why they wrote it. `stake` renders as the green "WHY" block (MissionPanel) + the prominent ObjectiveBar line; `brief` is the short WHAT (the action, one line). Maya's step `intro` (engine bank) should also open with the stake, not a package/import/main enumeration. Keep all three short — reading is the #1 complaint.

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

### Hints, Onboarding & Shipped Packages (current patterns — follow these)

- **Hints = the "STUCK?" helper, in the chat only.** A step's `quickCheck` is NOT a quiz — it's a hint FAQ. Shape (`src/types/game.ts`): `QuickCheck { prompt?, items: { question, answer }[] }`. Each item is a question the player is *stuck WITH* ("how do i declare a package?") that reveals Maya's answer as a hint. Rendered by `ChatQuickCheck`/`QuickCheck` in `src/components/game/QuickCheck.tsx`.
- **The `? HINT` button lives in `ChatPanel`'s input row and is always present** (see `quickCheck` + `stuck` props). It opens the STUCK? helper as a focused popout (`HintOverlay` in `QuickCheck.tsx`): a `fixed inset-0` card over a blurred backdrop, larger/clearer than the inline chat, closed by the ✕, Escape, or a backdrop tap. **The hint is closed by default and must never linger** — `ChatPanel` snaps it shut on step change AND whenever Maya moves the story on (a new message lands → `lastMsgId` changes). Do NOT re-add: the progressive-hint XP ladder UI (removed from `ObjectiveBar`/`MissionPanel`), the 3s idle auto-popup, or scripted "tap HINT above the code" nudges. All hinting flows through the chat button.
- **Never inject scaffold/comment "starter code" into the editor.** Prefer `starterCode: null` (carry the player's own code forward). Put all guidance in the chat (Maya intro + hint ladder + quickCheck), not as editor clutter.
- **Steps can ship a real Go package to import** via `ChallengeStep.compileModule` (`CompileModule` in `game.ts`). The engine wraps the player's code + the package into a Go Playground **txtar module** (`buildModuleSource` in `src/lib/ai/engine.ts`); `StepTestConfig.compileModule` is threaded from `useGame.ts`. Prevent hardcoding with `expectedOutput` + `requiredCode` (must reference the package's exported names). Example: Chapter 1 Step 2 ships `terminal/cellblock` (exports `Cell` const, `Sublevel` var).
- **Autocomplete for shipped packages is automatic.** `extraPackagesFromModule(compileModule)` (in `src/lib/go/completions.ts`) parses exported `const`/`var`/`func`/`type`; `play/page.tsx` passes the result as `CodeEditor`'s `extraPackages` prop. So `pkg.` lists members and a bare prefix suggests the package once imported. Don't hardcode game packages into the stdlib registry.
- **Every chapter's scaffold step starts by printing `Hello World` into an empty editor** (`starterCode: ""`, no injected code) — printing teases out package/import/main naturally. Don't frame scaffold steps as "set up the skeleton." Example follow-on: Ch1 Step 2 imports `terminal/cellblock` and prints `Cell`/`Sublevel` (teaches importing a package's exported members, blocks hardcoding).

## Reference Files

- **Design doc:** `../docs/design.md` — game mechanics, story arc, curriculum map
- **Level specs:** `../spec/levels/` — per-chapter/boss requirements
- **Infrastructure specs:** `../spec/infrastructure/` — LSP, LLM, testing, persistence, auth, analytics
- **Prototype:** `../inspo/inspo.jsx` — working single-file prototype (read for patterns, don't copy inline styles)
- **Skills:** `.claude/skills/` — detailed how-to guides for content authoring, components, game logic, story, prompts, sprite art, visual testing
