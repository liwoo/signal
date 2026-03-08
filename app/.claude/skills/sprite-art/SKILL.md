---
name: sprite-art
description: How to paint scenes, characters, and animations for SIGNAL's 2D pixel art cinematics
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Sprite Art in SIGNAL

All visuals are painted programmatically with Canvas 2D — no external image assets. Scenes render in PixiJS during gameplay. Quality bar: rich pixel-art interiors with architectural depth, atmospheric lighting, and well-proportioned characters.

## Architecture

```
src/lib/sprites/
├── palette.ts            # Central color palette (C.metalDark, C.skinMid, etc.)
├── scene-painter.ts      # Background environments (cell, corridor, chase, vent, server)
├── character-painter.ts  # Maya + Guard sprite frames
└── scenes.ts             # Scene definitions (actors, camera, duration)

src/components/story/
├── PixiScene.tsx          # WebGL renderer — composites scene + characters
├── CinematicScene.tsx     # Full-screen intro/chapter-transition sequences
└── MayaAnimation.tsx      # Bottom-right freeze-frame during gameplay
```

## Color Palette Rules

All colors come from `palette.ts` via the `C` object. Never hardcode hex values for recurring elements.

| Group | Examples | Use for |
|---|---|---|
| `C.metalDark/Mid/Light/Highlight` | Infrastructure, pipes, beams, ducts |
| `C.skinDark/Mid/Light` | Maya's exposed skin (forearms, face, neck) |
| `C.hoodieDark/Mid/Light/Accent` | Maya's open hoodie |
| `C.hairDark/Mid/Highlight` | Maya's hair |
| `C.guardArmor/Dark/Mid/Light/Accent` | Guard's tactical armor |
| `C.signalMid/Bright` | Green accents, Maya's hair streak, wire glow |
| `C.dangerBright` | Red accents, guard visor, alarm lights |
| `C.termBright` | Cyan terminal glow |

Warm skin tones (`#8a6850`, `#b08868`, `#c8a080`) — never green-tinted.

## Scene Painting

### Layer Order (back to front)

1. **Upper infrastructure** — catwalks, ducts, pipes above ceiling
2. **Ceiling slab** — concrete panels, steel I-beams, pendant lights
3. **Back wall** — panels, seams, rivets, mounted props (terminal, intercom, vent)
4. **Side walls** — perspective depth panels (left/right)
5. **Floor** — perspective tile grid with converging lines
6. **Floor props** — furniture, crates, equipment (proportional to character)
7. **Lighting effects** — light cones, screen glow, signal wire glow, light rays
8. **Post-processing** — vignette, ambient occlusion strips

### Prop Proportions

Props MUST be sized relative to the character, not with fixed pixel values. Use `ch = h * 0.32` as the character reference height, then size everything relative to it:

| Prop | Height | Width | Notes |
|---|---|---|---|
| Locker/cabinet | `ch * 1.1` | `ch * 0.34` | Slightly taller than character |
| Table | `ch * 0.28` | `ch * 0.48` | Waist-high |
| Stool | `ch * 0.24` | `ch * 0.20` | Thigh-high |
| Cot/bed | `ch * 0.22` | `ch * 0.9` | Low frame, body-length |
| Toilet | `ch * 0.28` | `ch * 0.24` | Knee-to-waist |
| Crate | `ch * 0.20-0.24` | `ch * 0.22-0.28` | Knee-high |
| Bucket | `ch * 0.16` | `ch * 0.13` | Shin-high |
| Food tray | `ch * 0.06` | `ch * 0.22` | Flat on floor |

This scales correctly at any scene resolution (640x420 test, 1040x600 in-game).

### Scene Types

- **cell** — Maya's prison. Dense props, terminal on wall, pendant lights, signal wire on floor.
- **corridor** — Top-down hallway. Doors on both walls, alarm fixtures, center signal wire.
- **chase** — Same as corridor with `alarm=true`. Red overlay, glowing alarm lights.
- **vent** — Claustrophobic duct. Structural ribs, tight space.
- **server** — Server room. Rack rows, status LEDs, cable trays.

### Lighting Techniques

- `drawLightCone(ctx, x, y, width, height, color)` — triangular light wash from ceiling fixtures
- `drawLightRays(ctx, x, y, w, h, alpha)` — visible god-ray beams
- Radial gradients for screen glow (terminal = cyan, door crack = amber)
- `drawSignalWire()` with linear gradient glow — the green wire is a recurring motif
- `drawVignette()` and `drawAO()` for post-processing depth

### Adding a New Scene Type

1. Add the type to `SceneType` union in `scene-painter.ts`
2. Add the case in `paintScene()` switch
3. Write a `paintXxx()` function following the layer order above
4. Define layout zones as proportional `h *` values (like `wallBotY = h * 0.50`)
5. Add scene definitions in `scenes.ts` with actor positions on the floor
6. Add a canvas + render call in `test-visual/render-scene.html` and `.ts`
7. Run `npx playwright test test-visual/visual.spec.ts` and inspect `test-visual/screenshot.png`

## Character Painting

### Base Dimensions & Proportions

Characters are painted at **48x80 pixels** then scaled up by `CHAR_SCALE` (default 3) = **144x240** in scene.

**5-head proportional model** (SLYNYRD Pixelblog reference):
- Head (forehead-chin): 14px — eyes at half head height, mouth at 2/3
- Neck: 3px
- Torso (shoulders-belt): 20px — tapered from 22px shoulders to 14px waist
- Belt/hip: 3px
- Legs: 20px — tapered from 8px thigh to 6px calf
- Boots: 8px — chunky combat style with sole detail

**Key anatomy techniques:**
- **Shaped silhouette**: Row-by-row width interpolation for face/torso — not rectangles
- **Tapered limbs**: `drawTaperedLimb()` interpolates width from top to bottom
- **Anti-aliased edges**: Intermediate color pixels on diagonals
- **Selective lighting**: Left side lighter, right side darker (consistent light source)
- **Strategic highlights**: 1-2px bright spots on nose tip, boot cuff, shoulder

### Maya Design

- Dark hair with **green streak** (signature — `C.signalMid`, with shadowBlur glow)
- **Open hoodie** over gray tank top — zippered edges with `C.hoodieAccent`
- Dark cargo pants with visible pockets, knee creases
- Combat boots with lace eyelets, ankle cuff, thick sole
- Warm skin on forearms/hands with thumb/finger distinction
- Expressive face: 5x4px eyes with whites, green irises, pupils, catch lights, lower lash hint
- Defined nose bridge + tip highlight, shaped lips (upper/lower)
- Row-based face shape (14 rows from forehead to chin, widening then narrowing)
- **Rim light** on right side (green, 12% opacity)

### Guard Design

- Bulkier frame than Maya — 4.5-head proportions, wider shoulders
- **Tactical helmet** with angular visor, side vents with slits, breathing grille, comms antenna
- **Red visor** (glowing, `C.dangerBright`, shadowBlur 8) with highlight streak
- Segmented chest plates with edge highlighting, center gap
- Red center stripe insignia
- Armored shoulder pads with rivets, elbow guards, tactical gloves with knuckle detail
- Utility belt: red buckle, side pouches with shadow
- Thigh armor plates, knee pads, heavy boots with shin guard and straps
- **Red rim light** on right side (10% opacity)

### Walk Cycle Animation (8 frames)

Walk cycles use **pose-based keyframes**, NOT sinusoidal math. The `WALK_POSES` array defines 8 frames:

```
Frame 0: Right Contact  — right foot strikes ahead, body dips
Frame 1: Right Down     — weight absorbs onto right, LOWEST point
Frame 2: Right Passing  — left leg swings past, body rising, trailing knee bends
Frame 3: Right Up       — push off right, HIGHEST point
Frame 4: Left Contact   — mirror of frame 0
Frame 5: Left Down      — mirror of frame 1
Frame 6: Left Passing   — mirror of frame 2
Frame 7: Left Up        — mirror of frame 3
```

Each pose specifies: `bob` (body height), `leftLeg/rightLeg` (horizontal offset), `leftArm/rightArm` (vertical swing), `leftKnee/rightKnee` (bend amount).

**Critical rules:**
- Arms swing OPPOSITE to legs (left arm forward when right leg forward)
- Body bob: lowest at Down (impact), highest at Up (push-off) — never sinusoidal
- Passing leg lifts slightly (knee bend) — the trailing foot leaves the ground
- Left-facing walk flips leg direction via `legDir = -1`
- Animation interval: **120ms** per frame (8 frames x 120ms = 960ms full cycle)

### Adding a New Animation State

1. Add to the `CharAnimation` union type
2. Set frame count in `FRAME_COUNT` record
3. Add drawing logic in `drawMaya()` / `drawGuard()` with per-frame pose data
4. If walk-like, add pose data to `WALK_POSES` or create a new pose array
5. Add walk strip to visual test (see Visual Validation skill)

### Captured State

`captured` animation: body rotated, arms limp, head drooped, eyes closed. Drawn via `drawMayaCaptured()` with `ctx.rotate()`.

## PixiScene Renderer

`PixiScene.tsx` composites everything at runtime:

- **SCENE_PADDING**: 200px — scene painted larger than viewport for camera panning
- **CHAR_SCALE**: 3 — character sprites at 120x192
- **ANIM_INTERVAL**: 120ms — frame advance timing
- **Sprite anchor**: `(0.5, 1)` — feet position, so `actor.y` is where feet touch floor
- **Camera**: interpolated between keyframes with ease-in-out
- **Actor paths**: waypoint interpolation for walking characters

### Scene Coordinate System

With viewport 640x400 and padding 200:
- Scene canvas: 1040x600
- Cell floor at `y = 600 * 0.50 = 300`. Character feet should be ~360-370.
- Corridor walkable area: character feet ~310.
- Camera offsets pan within the scene. Camera `{x: 100, y: 50}` shifts viewport origin.

## Common Mistakes

- **Props with fixed pixel sizes** — always use `ch * multiplier` for proportional scaling
- **Sinusoidal walk animation** — creates a "wave" feeling. Use discrete pose keyframes.
- **Characters floating** — anchor is at feet `(0.5, 1)`. Check actor `y` matches floor line.
- **Monochrome characters** — Maya needs clothing variety (hoodie open, tank top visible, skin on arms). Guard needs armor plate detail.
- **Scenes too dark** — colors must be in the `#1a-#60+` range for backgrounds. Use `#0a-#1a` only for voids and deep shadows.
- **Missing rim light** — every character needs a subtle colored rim light for environmental grounding.
- **Forgetting `ctx.globalAlpha = 1`** — always reset after transparent draws.
