---
name: adventure-level
description: How to author and debug the playable 3D story beats (Sims-style stealth levels) that replaced SIGNAL's cutscenes — maps, guards, objectives, cues, hand-off to the terminal
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Adventure Levels in SIGNAL

Every chapter's intro and aftermath cinematic is now a **playable beat**: the player steers Maya through the facility (dodging patrols, prying open panels, reaching doors) and she only gives up control at her terminal, where the coding challenge begins. Think *The Sims* camera + a light stealth loop, rendered in Three.js with the existing pixel-art Maya/guard frames as 3D billboards.

## Architecture

```
src/lib/adventure/            # Pure logic — no React, no DOM (except world.ts)
├── types.ts                  # AdventureLevel, Objective, GuardDef, Cue, SimState, SimInput, legend
├── grid.ts                   # parseMap, A* findPath, line of sight, visionPolygon
├── sim.ts                    # createSim / stepSim: movement, guards, detection, objectives, cues
├── levels.ts                 # The 12 levels (6 intro + 6 aftermath) + ALL_LEVELS / levelById
└── world.ts                  # Three.js scene builder (browser-only: paints textures)

src/components/adventure/
├── AdventureScene.tsx        # WebGL stage: RAF loop steps the sim, orbit camera, cutaway walls
├── AdventureHUD.tsx          # WHY line, Maya's thoughts, SEEN meter, prompt, cards, SKIP
└── AdventureLevel.tsx        # Scene + HUD + audio + fade; CinematicScene fallback if WebGL fails

src/app/dev/adventure/        # /dev/adventure?level=<id>&autoplay=1&sound=0 — preview any level
test-visual/capture-adventure.mjs, probe-adventure.mjs, scenario-adventure.mjs — screenshot/probe QA
```

`src/app/play/page.tsx` wires `ChapterConfig.introLevel` / `completeLevel`; the old `introScenes` / `completeScenes` stay as the fallback film.

## Map legend

```
#  wall        .  floor        =  bars (blocks walking, NOT sight)
d  locked door D  open doorway T  terminal (goal of intro levels)
k  keypad      p  panel        c  maintenance box     b  bunk (opaque cover)
h  hide spot   v  vent duct    o  vent hatch          s  server rack
x  exit (goal of aftermath levels)   *  floor under a ceiling light
m  maya spawn  r  reeves (npc) L  the lockmaster     (space) void
B  a hidden chapter of the field manual (exactly one per intro level)
```

Interactable ids are `<kind>-<n>` in reading order (row-major): the first `d` is `door-1`, the second `door-2`, etc. Vent ducts (`v`) are plain walkable tiles; only the hatch (`o`) gets an id. Rows must be the same width.

## Level shape

```ts
export const CHAPTER_XX_INTRO_LEVEL: AdventureLevel = {
  id: "chapter-xx-intro",          // "<chapter>-intro" ends in "relinquish", "-complete" in "exit"
  title, subtitle, location, theme, // theme: cell | corridor | vent | server | comms | boss
  map: [...],
  ambience: ["cell-ambient"],      // AmbienceName loops, started on mount
  opening: "maya's first thought.",
  guards: [{ id, route: [{ x, y, face?, waitMs? }], loop?, speed?, range?, halfAngle?, triggerOn?, leaveOn?, delayMs? }],
  objectives: [
    { id, stake, kind: "interact", target: "terminal-1", verb: "WAKE TERMINAL", durationMs, checkpoint, thought, done, unlocks, sfx, cues, pose },
    { id, stake, kind: "reach", target: "hatch-1" },     // walk onto (walkable) or next to (solid) the target
    { id, stake, kind: "hold", target: "hide-1", durationMs: 7000 }, // stay there this long
  ],
  ending: "relinquish" | "exit",
  endCard: { text: "CHAPTER X COMPLETE", sub: "NEXT · ..." },  // exit levels
  handoff: "CONTROL → TERMINAL",                                // relinquish label
};
```

- **`stake` is the WHY** (same rule as `ChallengeStep.stake`): one plain sentence on what this does for Maya. It renders as the green WHY line. `thought`/`done` are Maya's inner voice — lowercase, no exclamation marks (tested).
- **Cues** are scripted beats: `{ atMs, sfx?, thought?, voice?, shake?, flash?, alarm?, unlock?, after? }`. `after: "interact"` counts from the moment Maya starts the interaction (voice lines she hears while LISTENING, beeps while she types); default counts from the objective becoming active.
- **Checkpoints**: `checkpoint: true` on an objective means a capture sends Maya back to the start of that objective (guards reset, doors stay open, cues from that objective replay).
- **Guards**: routes are tile stops; `face` + `waitMs` make a guard stop and peer (the classic stealth beat). `triggerOn: "<objective id>"` keeps a guard frozen until that objective completes; `leaveOn` removes him. Vision is a cone (`range` tiles, `halfAngle` rad) clipped by walls/closed doors; bars don't block sight. Maya is invisible on `h`/`v` tiles. Touching a guard captures instantly. Detection never rises in the first `GRACE_MS` (3.2s — the title card).
- **Doors** open via `unlocks` (objective) or `unlock` (cue). Reachability through doors is validated in order by `levels.test.ts`.

## Rules

1. **Intro levels end at a terminal-style object** (`terminal`, `panel`, or `lockmaster`) with `ending: "relinquish"`; the HUD shows "YOU HAVE THE TERMINAL" and control passes to the editor. Aftermath levels end on an `exit`/`reach` beat with an `endCard`.
2. **Keep beats short** — 2–4 objectives, 20–60s. Playtests: time-to-first-keystroke is the retention gate. SKIP and Esc always work.
3. **Spawn Maya somewhere safe.** `levels.test.ts` only proves reachability; eyeball the first guard's cone against the spawn (use `/dev/adventure`).
4. **Run `npx vitest run src/lib/adventure`** — every level is validated: rectangular map, spawn walkable, every objective target exists and is reachable in order (with doors opened so far), guard stops walkable, trigger ids exist, Maya's voice lowercase.
5. **Visual QA**: start `next dev --port 3131`, then
   `node test-visual/capture-adventure.mjs http://localhost:3131 <outdir> <level-id>` (title/walk/rotate/click frames),
   `node test-visual/probe-adventure.mjs <level-id> <outdir>` (prints sim + camera state per step), or script a run with `window.__adventure.interactWith(id)` / `.moveTo(x, y)` (dev-only hook).
6. **Renderer conventions**: tile = 1 world unit, grid `y` → world `z`. Walls between the camera and Maya drop to knee height (cutaway). Lights use physically-based intensities (ceiling ≈ 20, terminal ≈ 12). Sprites are unlit — `lightLevelAt` tints them from nearby point lights. Never call `forceContextLoss()`; the canvas is created per mount.
7. **Controls**: WASD/arrows move relative to the camera; click/tap the floor to walk, click an object to walk-and-use (Sims style); Space/Enter/E use; Q/R or drag to orbit; wheel to zoom.

## The field manual (book chapters)

Dr. Eleanor Reeves wrote *GO: A Field Manual* and, held here before Maya, hid one torn-out chapter in every place she was moved through. **Every intro level hides exactly one `B` tile** with an `interact` objective (`verb: "TAKE THE PAGES"`) placed *before* the terminal objective; aftermath levels have none (`levels.test.ts` enforces both). Place it with `placeBook(MAP, x, y)` so shared maps stay shared.

- `src/data/book.ts` — `BOOK` meta + `BOOK_CHAPTERS` (number/numeral/title, where it was hidden, Reeves' margin note, Maya's `found` line). `bookChapterForLevel("chapter-03-intro")` → chapter III. One entry per challenge with beginner notes (`book.test.ts`).
- Taking it: the sim adds the id to `state.taken`, emits `{ type: "book" }`; the 3D book (world.ts `case "book"`: leather boards, page block, lifted cover, loose slip) disappears; `AdventureLevel` pauses the stage and the HUD shows the found card (`BookCover` + chapter, margin note in the hand font). Enter / KEEP IT resumes.
- Reading it: the chapter *is* the beginner notes for that challenge, typeset by `src/components/book/BookReader.tsx` (replaces `BeginnerOverlay` in `play/page.tsx`): inside cover → title page → one page per note section → end page. Listings keep their hotspots as numbered footnotes (+5 XP). Preview at `/dev/book?chapter=chapter-03` (`&cover=1` for the closed book); capture with `test-visual/capture-book.mjs`.
- Look: real paper and leather with **no border-radius and no box-shadow** — `.book-paper`, `.book-leather`, `.book-page-left/right` (gradient spine shadow), `.book-edges-bottom` in globals.css; serif `--font-book` (Crimson Pro), hand `--font-hand` (Caveat); palette tokens `--color-paper/-shade/-ink/-ink-soft/-leather/-gilt`.
- Voice: Reeves is **she/her** (design.md: Dr. Eleanor Reeves). Maya's `found` lines are lowercase, no exclamation marks.
