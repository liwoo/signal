# Adventure Levels — playable story beats

## Goal

Replace every intro/aftermath cinematic with a short, playable 3D scene (Sims-style camera, light stealth) in which the player steers Maya through the facility. She only relinquishes control at her terminal, where the Go challenge begins. The player should physically *see* why the next piece of code matters before writing it.

## Requirements

- One intro level and one aftermath level per chapter (ch1, ch2, ch3, boss-01, ch4, ch4.2) — 12 total, authored in `app/src/lib/adventure/levels.ts`, built from the story beats of the former `scenes.ts` sequences.
- Intro levels end with Maya at a terminal-type object and a "YOU HAVE THE TERMINAL" hand-off. Aftermath levels end on a story exit with the chapter card.
- Every beat is 20–60 seconds, skippable at any time (SKIP button, Esc). Detection does not start until the title card has cleared.
- Stealth loop: guards walk tile routes, stop and peer, project a wall-clipped vision cone; Maya is hidden on hide/vent tiles; being seen fills a meter in ~1.2s → "SPOTTED" → reset to the last checkpoint (no hearts lost, no game over).
- Interaction model: WASD/arrows (camera-relative), click/tap floor to walk, click an object to walk-and-use, Space to use. Orbit with Q/R or drag; zoom with the wheel. Works on mobile (tap to move, on-screen rotate + prompt button).
- Rendering: Three.js, procedural geometry from the ASCII map (floors, cutaway walls, bars, sliding doors, terminals, keypads, racks, the lockmaster), point lights per fixture, alarm strobes, flashlight spotlights on guards, dust. Characters are the existing pixel-art frames as billboards. No image assets.
- Graceful fallback: if WebGL cannot start, the legacy `CinematicScene` film plays instead.
- HUD follows the WHY-first rule: the objective line is the stake in plain language; Maya's thoughts are lowercase.

## The field manual

- Story thread: Reeves wrote *GO: A Field Manual* and hid one torn chapter in every place she was moved through, for whoever came next. Maya finds **exactly one chapter per intro level**, always before she reaches the terminal; the chapter is the pre-round teaching (the beginner notes), read as a real book.
- In-level: a realistic 3D book object (leather boards, page block, lifted cover, loose slip) marked as the objective; taking it pauses the stage on a found card (cover with the chapter slip, chapter number/title, where it was hidden, Reeves' handwritten margin note).
- Before the round: `BookReader` — a two-page spread (single page on phones) with inside cover + dedication, chapter title page, one page per section, listings with numbered footnotes for hotspots (+5 XP kept), page-turn animation, A−/A+ text size, PLAIN EDITION toggle where visual notes exist, DON'T SHOW AGAIN (beginner mode off).
- Real-book look without rounded corners or box shadows: SVG-noise paper and leather, gradient spine shadow and page edges, book serif (Crimson Pro) and a hand (Caveat) for Reeves' notes.

## Validation

- `app/src/data/book.test.ts` — chapters numbered in order, each mapped to a challenge with beginner notes, one per intro level, voice rules.
- `app/src/lib/adventure/*.test.ts` — grid (parsing, A*, line of sight, cones), sim (movement, click-to-walk, interactions, hold objectives, cues, guards, detection, capture/reset), and a per-level sweep (map shape, spawn, target reachability in order, guard routes, trigger ids, voice rules).
- `/dev/adventure?level=<id>` preview + `test-visual/capture-adventure.mjs`, `probe-adventure.mjs`, `scenario-adventure.mjs` for screenshots and state probes.

## Out of scope (for now)

- Hearts/XP effects from captures.
- Free-roam between chapters; levels remain linear beats.
