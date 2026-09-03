# Level Playbook — the level 1 decisions, made replicable

**Applies to:** every chapter and boss after chapter 1.
**Source of truth for:** cinematics, onboarding, gameplay HUD, hints, rewards, zen debrief, legibility, mobile.
**Derived from:** the chapter 1 (HANDSHAKE) overhaul, September 2026. Where a number appears, it is the value that shipped and should be the default, not a suggestion.

Read this before `challenge-author`, `story-event`, `sprite-art`, `beginner-mode` or `zen-rules`. Those skills explain *how* to build; this document records *what we decided* and why, so the next level feels like the same game.

---

## 1. The level arc (what a player goes through, in order)

```
landing → intro screen → intro cinematic → warm-up → briefing (expert | beginner video)
       → mission modal → play (step 1 … step n, reward card each) → twist
       → outro cinematic → zen debrief → win modal
```

Every chapter gets all of these. Nothing is optional except the warm-up (chapter 1 only, until later chapters get lesson-specific warm-ups).

**Why:** the player always knows where they are: story (green Maya voice), instructions (amber mission voice), lesson (cyan notes/zen voice), reward (gold).

---

## 2. Cinematics (intro + outro)

Files: `src/lib/sprites/scenes.ts`, `src/lib/sprites/scene-fx.ts`, `src/components/story/PixiScene.tsx`, `CinematicScene.tsx`.

### Shot grammar
- **Intro: 5–6 shots, 20–25 s.** Outro: 4 shots, 14–16 s. Both must pass the duration checks in `scenes.test.ts`.
- Order that worked: **wide (title card) → close → tracking → insert → threat → insert.** Wide establishes the room, the threat shot is always a guard walking straight at the lens, and the last shot lands on the object the level is about (the terminal, the door, the vent).
- **Dissolve** only into the first shot of a sequence. **Glitch** for a threat reveal. **Flash** for a send/confirm beat (cyan for a transmission, green for a handshake, amber for a door light). Everything else is a **cut**.
- One in-picture **title card** per sequence: the intro's first shot ("SIGNAL / FIRST CONTACT"), the outro's last shot ("CHAPTER N COMPLETE / NEXT · …"). The header title hides while a card is up.
- Every shot has a caption in Maya's lowercase voice, 4–9 words. Captions teletype with a soft key click every third character.

### Staging rules
- Feet on the floor band: **cell y ≥ 339, corridor y ≥ 315** (scene 1040×600). `scenes.test.ts` enforces it.
- Actors grow toward the camera (`depthScale` 0.86 → 1.16). Use it: a guard's path should descend the band by ≥150 px.
- Walk → work transitions use `Actor.endAnimation` (walk-left → hack). Never leave a character walking in place.
- Don't place actors on furniture: in the cell, the clear floor is x 560–680 between the table group and the bucket.

### Camera body
- Every shot moves: single-keyframe shots auto push-in +0.05; authored shots use 2 keyframes with zoom 0.98–1.96.
- **Shakes** for impacts only (knock 9 px / 520 ms, boots 1.6–3 px / 220–260 ms, send 3 px / 320 ms). **Dutch** 0.02–0.03 rad on threat shots. Idle sway is always on.

### Audio bed
- One ambience loop per location (`dark-drone-1` + `facility-hum` in the cell, `corridor-ambient` in corridors), cross-faded at cuts (stop 800–1500 ms, start 800–2000 ms).
- One sting per beat: `dread-sting` when the threat appears, `handshake-confirm` on success, `knock-heavy` + `knock-2` for the door, `message-receive` when a signal lands, `door-slide` low (0.1) as distant texture.
- Footsteps synced to the walk cycle: metal 430–480 ms, boots 430–470 ms. Every cue name must exist in `useAudio.ts` (the test checks).

### QA
- `node test-visual/capture-live.mjs <url>/play <out> cinematic` (GPU headless only; SwiftShader stalls the light stack).
- `/dev/cinematic?seq=NAME` previews any sequence without game state.

---

## 3. Landing page

- The hero is the game: the promo loop draws through the same planes, lights, dust and camera as the cinematics. When a new location exists, add a shot of it to `PromoLoop.tsx` rather than a static image.
- No text below 10 px anywhere on the landing or reading pages. Body copy 15–16 px. Secondary text at opacity ≥ 0.8. Labels use `--color-dim`, never a hard-coded dark hex.

---

## 4. Intro screen and onboarding

- **Intro screen** shows the chapter's opening room live behind the brief (`PixiScene` with `loop="pingpong"`, 14 s drift, opacity 0.45–0.55, cover-fit). Push Maya to the right third so the panel stays clean.
- **Secondary actions are visible.** "or ⏎ ENTER" is a keycap, "SKIP WARMUP", "SKIP ▸▸", "DON'T SHOW AGAIN" are bordered buttons in the body colour using `.btn-secondary`. Never whisper-dim an option the player is allowed to take.
- **Warm-up** drills are exactly what the level will ask the player to type, in 4 exercises, smallest first (one line → variable → format → skeleton).
- **Briefing** leads with expert mode; the beginner CTA appears under the first paragraph. Beginner flow is analogy card → walkthrough video → recap code with hotspots.

---

## 5. The walkthrough video (beginner mode)

File: `src/components/game/diagrams/MailroomVideo.tsx` is the template.

- It is a **video**, not a slideshow: beats, not scenes. Each beat = one subtitle (≤ 90 chars) + one visible action + one highlighted code line. 25 beats ≈ 1:45.
- Pacing by reading length (`400 + chars × 34 ms + 1300 ms`), never a fixed timer.
- Spotlight the room where the action is; the other room drops to 45%.
- Characters are large, named, and speak in high-contrast bubbles. Objects travel (courier envelope across the slot). Output prints on a display panel with glow and a beep.
- Title card in, recap grid (analogy → Go) out. Transport: play/pause, step, chaptered scrub bar, time, chapter links (hidden on phones), "watch again" at the end.
- Sounds: door-slide on arrival, message-receive on delivery, terminal-beep on print, handshake-confirm on done.

---

## 6. Gameplay HUD

### The objective bar (`ObjectiveBar.tsx`)
The one line that always answers "what do I do now?", above the code on every tab: step pips · OBJECTIVE · STEP n/m · one-line brief (click opens the mission tab) · hazard chips · HINT button. On phones the XP cost hides and the title truncates.

### Tabs
`CODE · MISSION · NOTES · LIBRARY`, plain labels, 9 px tracking 3px, no icons. Step pips and jeopardy chips live in the objective bar, not the tab bar.

### Chat
- No timestamps (message ids are `msg-N`, not epochs).
- Header: `MAYA · <location>` left, `<chapter> · <step>` right. Concept lists do not belong in the header.
- System lines are slim chips with a rule on each side; consecutive duplicates collapse to "×N". Messages fade with age but never below 0.4.
- Maya's step-complete reply, zen jolt, and next-step intro arrive as chunks with a 7 s auto-continue; that is fine on desktop and drives the "MAYA IS WAITING · OPEN CHAT" banner on mobile.

### Top bar
`SIGNAL LVn [xp bar] xp ♥♥♥ [timer]`. The status dot only appears for RUSH or TX; the timer already says LIVE.

### Mission tab
Title, location · time · reward on one row; step path; one amber objective block; the hint ladder with locked entries. No XP/level info boxes.

### Notes tab
Compact scale (12 px + 3 px per scale step). Code blocks rebuilt from token offsets (the tokenizer drops whitespace). One chapter = no accordion.

---

## 7. Hints (`src/lib/game/hints.ts`)

- Three hints per step, authored nudge → directional → nearly-there. Never the full solution.
- Revealed **one at a time, in order**, paid in XP using the authored `energyCost` (8 / 12 / 20). XP never goes below zero.
- The player is "stuck" after **2 failed attempts or 75 s idle** on a step. Then the HINT button pulses cyan and Maya nudges once: "stuck? that's normal. tap HINT above the code…"
- A revealed hint is posted as a Maya message ("hint 1: …") so it reads as help, and appears unlocked on the mission tab.
- Mission modal copy points at HINT first, NOTES second.

---

## 8. Rewards (`src/lib/game/reward.ts`, `RewardCard.tsx`)

- Every successful submission shows one full-screen, non-blocking card for **2.6 s**: flash, sweep, "STEP CLEAR" slam, XP count-up (900 ms), badges popping in at 450 ms + 180 ms each.
- Badges in this order: FIRST TRY +n (gold), SPEED +n (amber), ZEN +n (cyan). Only show badges that are > 0.
- The last step is "CHAPTER CLEAR" in gold with a second cheer (`we-did-it`); steps use `next-one`. `handshake-confirm` fires on both.
- No floating "+XP" and no streak label at the same moment; LEVEL UP keeps its streak label.

---

## 9. Zen (feedback during play + debrief after)

### During play
- Keep the per-step zen jolt in chat: it is the "you used Println, not Printf" moment players love. Author every rule with an `isRelevant` guard so irrelevant suggestions never fire.

### After the chapter (`ZenDebrief.tsx`)
- Between the outro cinematic and the win modal, one beat per rule: verdict chip (LEARNED green / MISSED amber), principle in display type, Maya's lesson line typed as subtitle, and a **before → after** code pair from `src/data/zen-examples.ts` keyed by rule id.
- **Every new zen rule needs a before/after example.** Rules without one show the principle only, which is a regression.
- Pacing `500 + chars × 30 ms + 3600 ms` for rule beats. Title beat in, tally beat out, skippable, "CONTINUE ▸" when it ends.
- The chat no longer recaps missed tips at chapter end; the debrief does.
- Library lines use `entryLesson()`: the teaching sentence, never the "...wait. i remember" flourish.

---

## 10. Win modal

- Type sizes: subtitle 11 px, tabs 10 px, stat labels 9 px, teaser 13/11 px, buttons 11 px. Card width up to 640 px.
- Library entries: 14 px principle, 13 px lesson at 0.9 opacity.

---

## 11. Legibility rules (whole app)

- `--color-dim` is `#4f9f82` (≈6:1 on the background). Do not reintroduce `#1a5a4a`, `#0a3a4a`, `#1a6a4a` and friends.
- Type floor: 10 px for labels, 11 px for chrome, 13 px+ for anything a player reads.
- Colour code by voice: green = Maya/player/progress, amber = mission/facility, cyan = code/notes/hints, red = damage, gold = reward/story.

---

## 12. Mobile

- Level must be completable with the compact shell: CHAT · CODE · MISSION · MORE, objective bar in compact mode, accessory keys under the editor, timing scale 1.5×.
- Anything that lives beside the code on desktop (hazards, XP costs, chapter links, code column of the walkthrough) either collapses or hides on phones. Check with `sm:` breakpoints.
- Overlays (reward card, interrupts) must be `pointer-events: none`; Maya's continue is also bound to Enter.

---

## 13. QA checklist for a new level (run all)

| Check | Command |
|---|---|
| Scene data: feet on floor, cue names exist, durations in range | `npx vitest run src/lib/sprites` |
| Hint/reward/zen logic | `npx vitest run src/lib/game` |
| Intro/outro cinematic frames | `node test-visual/capture-live.mjs <url>/play /tmp/out cinematic` and `/dev/cinematic?seq=…` |
| Beginner flow + video | `node test-visual/capture-beginner.mjs <url>/play /tmp/out` |
| Desktop play → reward → debrief → win | `node test-visual/capture-gameplay.mjs <url>/play /tmp/out` |
| Mobile play end to end | `node test-visual/capture-mobile.mjs <url> /tmp/out` |
| Painters still compose flat | `npx playwright test test-visual/visual.spec.ts` |

All capture scripts need GPU headless Chromium (`--headless=new --use-angle=metal`). Look at every frame; the scripts exist so that nobody has to trust a description.

---

## 14. Per-level authoring checklist

- [ ] Spec in `spec/levels/` with story, concepts, steps, hints (3 per step), timer, twist.
- [ ] Intro cinematic (5–6 shots) and outro (4 shots) authored per §2, tests green.
- [ ] Location painter has ≥1 fore element and mid props if actors cross furniture.
- [ ] Warm-up drills (if the level needs its own) mirror what will be typed.
- [ ] Beginner blocks: analogy card → video (new `Beat[]` script if the concept is new) → recap with hotspots.
- [ ] Zen rules with `isRelevant` guards **and** before/after examples in `zen-examples.ts`.
- [ ] Step briefs show the expected output verbatim.
- [ ] Audio cues use existing names or the new files are registered in `useAudio.ts`.
- [ ] Ran the full QA table above on desktop and mobile and looked at the frames.
