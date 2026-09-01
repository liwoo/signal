# Visual Overhaul — Elegant 3.5D

**Applies to:** all cinematics, all scene painters, character painters, UI chrome
**Replaces:** ad-hoc perspective, static cinematic camera, Orbitron display face
**Preserves:** audio cue system (`scenes.ts`), boss arena camera physics (`BossArena.tsx`), `backup-flicker-1..4` escalation, zero border-radius, phosphor-terminal identity

## Problem Statement

The game currently reads "AI-generated" for five diagnosable reasons:

1. **Three incompatible perspective systems.** `scene-painter.ts` uses linear line-splay + flat vertical side walls; `cinematic-painter.ts` uses a fixed 45° iso projection that disagrees with its own converging floor seams; the only correct one-point perspective (`paintBossFPS`) is locked inside the boss fight.
2. **The cinematic camera is static.** Pan is damped to 18% × 0.7 world scale (≈5px of motion per shot); `CameraKeyframe.zoom` is declared but used by zero shots; every shot shows the same 0.7-scaled wide master.
3. **Haze instead of light.** Dozens of radial gradients at alpha 0.02–0.12 with no consistent direction. Maya's face is lit left, her rim light is right. No cast-shadow logic. No mid-frequency texture anywhere — pure gradients + 1px hairlines.
4. **Detail without hierarchy.** ~30 fully-shaded props per scene, nothing subordinated, no focal point.
5. **Uniform rhythm.** Every shot 3–4s, every transition the same 720ms dissolve, every anim frame a flat 120ms, shots advance on wall-clock `setTimeout`.

Plus a world-consistency bug: the cinematic painter renders the cell floor as warm wood (`C.woodMid`) while the gameplay painter renders it cold blue (`#1a3050`).

## Design Pillars

```
ONE PROJECTION   every room drawn through the same vanishing-point math
ONE LIGHT        every scene declares its light source; all shading derives from it
COMPOSED CAMERA  shots crop and move; wide → medium → insert grammar
HIERARCHY        one focal prop, few supporting, rest demoted to silhouette
RHYTHM           cuts by default, dissolves for time-jumps, timing driven by action
```

---

## Phase 1 — Cinematic Camera

**Files:** `src/components/PixiScene.tsx`, `src/lib/sprites/scenes.ts`, `src/components/CinematicScene.tsx`

Highest leverage, smallest diff. Everything in this phase is transform math on existing Pixi containers — no repainting.

### 1.1 Camera semantics (breaking change to scene data)

Redefine `CameraKeyframe` — `{x, y}` becomes **the world-space point centered in the viewport**, `zoom` becomes live:

```ts
export interface CameraKeyframe {
  x: number;      // world-space center target (scene coords, 0..1040)
  y: number;      // world-space center target (scene coords, 0..600)
  zoom?: number;  // multiplier on base scale, default 1.0. Range 0.9–1.5
  time: number;   // ms into the shot
}
```

- `CINEMATIC_WORLD_SCALE`: `0.7` → **`0.85`** (base). At 0.85 the 1040×600 scene renders 884×510 into the 640×400 viewport — ~244×110px of crop headroom, so the camera actually frames.
- **Delete the 0.18 pan damping.** Camera position interpolates between keyframes with the existing `easeInOutCubic` at full magnitude.
- Clamp the computed viewport rect inside the scene bounds so pans never expose void.
- All ~40 shots across the 9 scene arrays must be re-authored (mechanical data edit: convert offset-style keyframes to center-point targets). Do it per-sequence with visual verification.

### 1.2 Shot grammar per shot

```ts
export interface SceneDefinition {
  // ...existing fields...
  transition?: "cut" | "dissolve";   // default "cut". dissolve = 720ms (unchanged constant)
  advance?: "timed" | "on-action";   // default "timed"
}
```

- **Cut** = instant swap, no alpha ramp. **Dissolve** reserved for time/place jumps (author guideline: dissolve into shot 1 of a sequence and across location changes; cut everywhere else).
- `advance: "on-action"` ends the shot at `max(last actor path end, caption typing end) + 600ms settle`, with `durationMs` kept as a hard ceiling. `CinematicScene.tsx` replaces its `setTimeout(durationMs)` with this computation (caption length × TypeText speed 28ms/char is deterministic).

### 1.3 Idle sway + push-in (the "filmed" feel)

Port the boss arena's layered-sine drift into `PixiScene`'s ticker, applied to `layer.world` after camera transform:

```ts
// two summed sines per axis so the loop never visibly repeats (cf. BossArena.tsx idle sway)
const swayX = Math.sin(t * 0.7) * 2.5 + Math.sin(t * 1.3) * 1.2;   // ±3.7px max
const swayY = Math.sin(t * 0.9) * 1.5 + Math.sin(t * 0.5) * 0.8;
const swayRot = Math.sin(t * 0.4 + 0.5) * 0.003;                    // radians
```

- **Default push-in on every shot with a single camera keyframe:** zoom eases 1.00 → 1.05 over the shot duration (`easeInOutCubic`). Shots with explicit multi-keyframe cameras use their authored values only.
- Both sway and auto-push-in are disabled under `prefers-reduced-motion` (extend the existing check at the dissolve-suppression site).

### 1.4 True letterbox

Replace the top/bottom scrim gradient in `CinematicScene.tsx` with solid bars:

- Two absolutely-positioned divs, `background: var(--color-background)` (opaque), each **9% of stage height**, top and bottom, inside the 16:10 stage → effective picture ratio ≈ 1.95:1.
- Location text, caption, and progress hairlines move **onto the bars** (caption sits on the bottom bar, location/LIVE FEED on the top bar) so chrome never overlaps the picture.
- Keep the 1px signal border on the stage; keep the CRT overlay stack (scanlines/vignette/wash) — it applies to the picture area only, not the bars.

### 1.5 Acceptance

- Intro sequence shot 2 (corridor walk): camera visibly tracks Maya ~180 world-px; foot-plants stay synced with the existing 480ms footstep cues.
- At least one shot per sequence uses zoom ≥ 1.25 (a "medium" on Maya or an insert on a prop).
- Sequences cut between shots 2→3; dissolve only on sequence entry.
- Reduced-motion run: hard cuts, no sway, no push-in (existing behavior preserved).

---

## Phase 2 — Shared Projection, Declared Light, Texture

**Files:** new `src/lib/sprites/projection.ts`, new `src/lib/sprites/lighting.ts`, `src/lib/sprites/scene-painter.ts`, `src/lib/sprites/palette.ts`

### 2.1 `projection.ts` — extract the boss FPS math

`paintBossFPS` already has the correct model (vanishing point, non-linear depth). Generalize it:

```ts
export interface Projection {
  vpX: number;                 // vanishing point, scene px
  vpY: number;
  depth(t: number): number;    // Math.pow(t, 1.3) — non-linear recession, t ∈ [0,1]
  // Map a point at normalized floor position (xFrac across near edge, t into depth)
  // to screen px + a scale factor for sizing props placed at that depth.
  project(xFrac: number, t: number): { x: number; y: number; scale: number };
}

export function createProjection(w: number, h: number, opts?: {
  vpXFrac?: number;   // default 0.5 — OFF-CENTER PER SCENE for composition (see table)
  vpYFrac?: number;   // default 0.38
  farScale?: number;  // width of far plane relative to near, default 0.28
}): Projection;

// Drawing helpers, all VP-derived:
export function wallQuad(ctx, p: Projection, side: "left" | "right", nearX, t0, t1, fill): void;
export function floorGrid(ctx, p: Projection, cols, rows, lineColor): void;  // replaces paintPerspectiveFloor
export function depthFogAlpha(t: number): number;  // max(0.15, 0.6 * (1 - t * 0.8)) — from boss painter
```

Rules:

- `paintPerspectiveFloor` (linear splay, hardcoded center) is **deleted**; all six scene types draw floors via `floorGrid`.
- Side walls become trapezoids via `wallQuad` — no more flat vertical strips (`drawSideWall` deleted).
- `paintBossFPS` is refactored to consume `createProjection` (behavior-identical; this is the correctness reference).

Per-scene vanishing points (off-center VPs give each location a distinct composition):

| Scene | vpXFrac | vpYFrac | Rationale |
|---|---|---|---|
| cell | 0.42 | 0.40 | terminal (focal) sits right of center, VP pulls eye left-to-right |
| corridor | 0.50 | 0.36 | symmetric flight corridor, door at VP |
| chase | 0.58 | 0.36 | asymmetry = unease |
| vent | 0.50 | 0.45 | low, claustrophobic |
| server | 0.38 | 0.38 | rack rows rake across frame |
| boss-arena | 0.50 | 0.38 | unchanged (matches paintBossFPS) |

### 2.2 `lighting.ts` — one declared light per scene

```ts
export interface SceneLight {
  x: number; y: number;        // scene px
  color: string;               // from palette accents only
  radius: number;
  intensity: number;           // 0..1
}

export interface SceneLighting {
  key: SceneLight;             // THE light. Exactly one.
  fills?: SceneLight[];        // ≤2 practicals (screen glow, indicator) at ≤0.3 intensity
  ambient: string;             // base fill, from palette
}

export const SCENE_LIGHTING: Record<SceneType, SceneLighting>;
```

Derivation rules — no hand-placed glows outside this system:

- **Shade side:** a prop at `px` lights its `sign(key.x - px)` face with the light ramp, opposite face with the dark ramp. The current universal top-left bevel is replaced.
- **Contact shadows:** every floor-standing prop and character gets one ellipse offset **away from `key`**, length scaled by distance to key. Deletes the hand-placed `:209-216`-style ellipses.
- **Glow passes:** radial gradients are emitted only at `key` and `fills` positions. All other prop-local glow gradients are removed.
- **Depth fog:** surfaces beyond `t > 0.5` blend toward `C.void` via `depthFogAlpha` (already proven in the boss painter).
- Characters receive the scene's light too: `drawMaya`/`drawGuard` gain a `lightDir: -1 | 1` param (Phase 5 wires it).

### 2.3 Texture — one dither pass

New helper in `scene-painter.ts`:

```ts
// Bayer 4×4 ordered dither. Deterministic (no Math.random — visual-test safe).
export function ditherRect(ctx, x, y, w, h, color: string, strength: number): void;
```

- Applied to every wall/floor/ceiling surface **after** its gradient, `strength` 0.02–0.04.
- One grain pass over the full scene at 0.015 as the final paint step, before vignette.
- This is the entire texture budget. No noise elsewhere; the point is mid-frequency variation, not grunge.

### 2.4 Prop hierarchy — cull for a focal point

Three tiers, enforced per scene:

| Tier | Count | Treatment |
|---|---|---|
| **Focal** | exactly 1 | full 3-tone shading + the only fill-light glow + highest local contrast |
| **Supporting** | 5–8 | 3-tone shading, no glow |
| **Background** | everything else | 2-tone silhouette, merged into wall value range (±10% of wall luminance) |

| Scene | Focal | Supporting (keep) | Demote/cut |
|---|---|---|---|
| cell | wall terminal | bunk, heavy door, vent grate, pipe run, camera | locker, crate, shelf, bucket, food tray, extinguisher, toilet, drain, papers → silhouette or cut |
| corridor | heavy door at VP | light strips, 2 side doors, camera, cable tray | signage clutter, duplicate pipes |
| vent | lit grate (light shaft) | duct seams, 2 cable runs | dust props beyond the 20 fixed motes |
| server | core rack | 4 rack rows (raked via projection), cable bundles | per-rack blinkenlights beyond 2 rows |
| boss-arena | lockmaster core | unchanged | unchanged |

### 2.5 Palette consolidation

- Boss arena local hexes (`#0c0406`, `#120810`, …), `boss-painter.ts`'s `B` palette, and every inline hex in `drawSteelBeam` et al. move into `palette.ts`. Rule (already in the sprite-art skill, now enforced): **no hex literals in painters.**
- Each scene gets a declared grade: 1 dominant hue + 1 accent, from the palette. Cell = blue-steel + terminal-cyan. Corridor = blue-steel + signal-green. Chase = corridor + danger-red wash (unchanged mechanism). Vent = concrete grays + alert-amber shaft. Server = blue-steel + terminal-cyan. Boss = red-black (now in palette).
- The `drawLightCone` regex-on-rgba hack is replaced with a proper `alpha(color, a)` helper.

### 2.6 Vertical slice requirement

Phase 2 lands as a **cell-scene vertical slice first** (projection + lighting + dither + hierarchy on `paintCell` only), screenshot-reviewed against the current version, before propagating to the other five scenes.

---

## Phase 3 — Layered Backgrounds, Depth Sorting, Parallax

**Files:** `src/lib/sprites/scene-painter.ts`, `src/components/PixiScene.tsx`

This is the other half of the "3.5D" read: actors passing behind props, planes sliding at different rates under camera pans.

### 3.1 Painter output becomes planes

```ts
export interface PaintedScene {
  back: HTMLCanvasElement;     // walls, ceiling, floor, background-tier props
  mid: MidProp[];              // supporting-tier props as individual canvases
  fore: HTMLCanvasElement;     // near-camera occluders (door frame edge, foreground pipe)
}

export interface MidProp {
  canvas: HTMLCanvasElement;
  x: number;                   // scene px
  footY: number;               // depth-sort key — same convention as actor y
}

export function paintSceneLayers(type: SceneType, w, h): PaintedScene;
// paintScene(type, w, h) remains, compositing the planes flat —
// MayaAnimation, PromoLoop, and visual tests are untouched.
```

### 3.2 PixiScene consumption

- `back` sprite at `zIndex: -1000`; each `MidProp` at `zIndex: footY`; `fore` at `zIndex: 10000`.
- Actors keep `zIndex = y` — they now sort naturally against mid props. A guard walks **behind** the crate stack and **in front of** the back wall with zero new logic.
- **Parallax on camera pan:** `back` translates at 0.92× camera, mid + actors at 1.0×, `fore` at 1.12×. Applied in the same ticker block as Phase 1's camera transform.
- Every scene must declare ≥1 `fore` element (even just a door-frame edge or hanging cable at frame left/right) — the parallax is invisible without one.

### 3.3 Actor grounding cleanup

The current 4-sprite actor stack (shadow ellipse + offset void-tinted copy + offset rim copy + sprite) is reduced:

- Shadow ellipse: kept, but offset direction/length now derived from `SCENE_LIGHTING[scene].key` (Phase 2).
- The hard drop-shadow sprite copy (`tint: C.void, alpha 0.72, +4/+4`): **deleted** — double shadows read as a rendering artifact.
- Rim copy: kept, tinted from the scene grade accent instead of hardcoded green/red, alpha 0.2 unchanged.

---

## Phase 4 — Painter Unification (Cinematics = Gameplay)

**Files:** `src/lib/sprites/cinematic-painter.ts`, `src/components/PixiScene.tsx`

- `cinematic-painter.ts` is **retired**. `PixiScene` consumes `paintSceneLayers` from the (now projected + lit) `scene-painter`. The cut-scenes and the in-game cam feed finally show the same world — same cell floor, same materials, same geometry.
- `drawIsoBox` and the 45° projection are deleted; anything unique to the cinematic renders of a location (e.g. `drawLockmasterCore` on the wall) migrates into the corresponding scene-painter scene behind an options param: `paintSceneLayers(type, w, h, { variant?: "cinematic" })`.
- The wood-floor cell inconsistency dies here by construction.
- `MayaAnimation.tsx`'s hardcoded per-scene crop table (`:36-75`) is re-derived once against the updated paintings (crops will shift as compositions change); its frozen frame-0 character gets the idle animation at the existing 120ms cadence (cheap, already loaded).

---

## Phase 5 — Character Pass

**Files:** `src/lib/sprites/character-painter.ts`, `src/lib/sprites/boss-painter.ts`

### 5.1 Consistent light

- `drawMaya`/`drawGuard` signature gains `lightDir: -1 | 1` (default `-1`, lit-left). All face/torso/limb light-dark splits key off it. The current contradiction (face lit left, rim right) is resolved: **rim goes on the shadow side**, tinted by a new `rimColor` param supplied from the scene grade.
- All `ctx.shadowBlur` uses inside sprites (iris glow, hair streak, guard visor) are removed — soft blur inside hard-edged pixel art fights the aesthetic. Glows are baked as 1px dithered halo pixels at 2 alpha steps.

### 5.2 A walk that steps

- `WALK_POSES` gains `hipAngle`/`kneeAngle` per leg. `drawTaperedLimb` (translate-only) is replaced by a two-segment `drawLimb(hipX, hipY, kneeAngle, hipAngle, ...)` that renders each segment as stepped pixel runs along the rotated axis (same technique the crawl already uses via `ctx.rotate(0.55)` — the crawl is the craft reference).
- Frame timing becomes per-frame: contact frames hold **160ms**, passing frames **95ms** (total cycle stays ≈ 8 × 120ms = 960ms so the 480ms footstep audio interval still lands on contacts). `PixiScene`'s flat `120` interval becomes a per-animation timing table.

### 5.3 Face detail budget

At 14px of head, the current inventory (eye whites, irises, pupils, catch lights, lash lines, brows, nose bridge/tip/nostrils, 3-tone lips, inner-ear shadow) is over-rendered. New budget: **eyes as 2×2 marks with 1px catch light, 1px brow, 2-tone lips, nose as a single shadow pixel.** Silhouette and hair shape carry the likeness; the freed contrast goes to the eyes.

### 5.4 Boss painter

- `B` palette merges into `palette.ts` (Phase 2.5). Procedural pulse/spark logic is good — unchanged.

---

## Phase 6 — UI Skin

**Files:** `src/app/globals.css`, `src/app/layout.tsx`, `TopBar.tsx`, `ChatPanel.tsx`, `MissionPanel.tsx`, `WinModal.tsx`, and other chrome components

Calibration honesty: near-black + single acid-green accent + sci-fi display font is a stock look. The diegetic terminal identity is *right* for this game — the fix is specificity, not a new direction.

### 6.1 Type

- **Orbitron is replaced.** Primary candidate: **Doto** (dot-matrix variable face — reads as facility LED signage, on-theme, distinctive). Alternate: **Handjet**. Decision by side-by-side visual test on TopBar + cinematic title card; JetBrains Mono stays for body/code.
- **Micro-type floor raised.** All `text-[5px]`–`text-[9px]` chrome is migrated to a 3-tier scale (nothing below 10px):

```css
.ui-label  { font-size: 10px; letter-spacing: 0.16em; }  /* eyebrows, section labels */
.ui-chrome { font-size: 11px; letter-spacing: 0.08em; }  /* buttons, tabs, stats */
.ui-body   { font-size: 13px; line-height: 1.7; }        /* briefs, hints */
```

Tracking above 0.2em is retired except on the SIGNAL wordmark and cinematic title cards.

### 6.2 Two-phosphor color system

Amber becomes structural, not just "warning" — green and amber phosphor encode *whose system you're looking at*:

| Phosphor | Meaning | Used for |
|---|---|---|
| signal green | Maya / player / progress | wordmark, XP, chat, zen, completed nodes |
| alert amber | the facility / hostile systems | boss HUD, guard telemetry, lockdown states, facility signage in scenes |
| danger red | damage only | hearts, hits, game over |
| terminal cyan | code / tooling | editor chrome, diagnostics, autocomplete |

Audit pass: every current `--color-alert` / inline-orange use is reclassified per this table.

### 6.3 Tokens

The theme currently has 19 colors + 2 fonts and nothing else; borders are inlined `rgba(110,255,160,.08/.1/.12/.15/.2)` everywhere. Add:

```css
--border-hair:   1px solid color-mix(in srgb, var(--color-signal) 10%, transparent);
--border-panel:  1px solid var(--color-border);
--border-focus:  1px solid color-mix(in srgb, var(--color-signal) 35%, transparent);
--dur-fast: 150ms;  --dur-med: 400ms;  --dur-slow: 700ms;
--ease-out-quint: cubic-bezier(.22, 1, .36, 1);
```

Migration rule: no new inline `rgba(...)` borders; existing ones converted opportunistically as files are touched in Phases 1–5, with a final sweep.

### 6.4 Hover

All imperative `onMouseEnter`/`onMouseLeave` style mutations are replaced with CSS classes (e.g. `.btn-invert` for the WinModal CTA fill-swap). Keyboard `:focus-visible` gets `--border-focus` — currently absent.

### 6.5 Explicitly kept

Zero border-radius (scrollbar excepted), the panel-less left-accent-rule brief pattern, underline-only tabs and inputs, chat recency fading, the CRT overlay stack.

---

## Rollout Order & Dependencies

```
Phase 1 (camera)          — independent, ship first, transforms cinematics alone
Phase 2 (projection/light) — cell vertical slice → review gate → propagate to 5 scenes
Phase 3 (layers/parallax)  — depends on 2 (planes are painted per-tier)
Phase 4 (unification)      — depends on 2+3
Phase 5 (characters)       — depends on 2.2 (SceneLighting) for lightDir wiring
Phase 6 (UI)               — independent, can run parallel to any phase
```

## Testing

- **Visual pipeline:** every phase adds/updates snapshots in `test-visual/visual.spec.ts` (per the visual-test skill). Phase 1 adds mid-shot cinematic captures at fixed elapsed times (sway must be driven by scene-elapsed time, not wall clock, so captures are deterministic).
- **Determinism:** `ditherRect` and grain use ordered patterns / hash scatter only — no `Math.random()`, consistent with existing painter conventions.
- **Unit:** projection math (`project`, `depth`, clamping), camera keyframe interpolation with new semantics, `on-action` shot-end computation.
- **Perf budget:** scenes still paint once per shot (layering adds ≤4 offscreen canvases per scene). Per-frame work remains transform-only. Target: no regression on the existing mobile-first profile.
- **Reduced motion:** cuts only, no sway, no push-in, no parallax easing — verified in the Playwright run.

## Out of Scope

- New scene types, new animations beyond the walk rework, new cinematic content
- WebGL shaders / real lighting — everything stays Canvas 2D + Pixi transforms
- Map painter redesign (`map-painter.ts` gets only the palette/no-hex-literal cleanup)
- Boss combat mechanics (visuals already the reference standard)
