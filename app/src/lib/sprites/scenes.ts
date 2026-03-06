// ── Cinematic scene definitions ──
// Each scene describes what to render: background type, actors, camera path, duration.
// Actor positions are in scene coordinates (scene = viewport + padding).
// With viewport 640x400 and padding 200, scene is 1040x600.
// Cell floor starts at y = 600 * 0.50 = 300. Characters feet should be ~360.
// Corridor walkable area: y = 192 to 420. Character feet ~310.

import type { SceneType } from "./scene-painter";
import type { CharAnimation } from "./character-painter";

export interface Actor {
  type: "maya" | "guard";
  x: number;              // position in pixels (at scene resolution)
  y: number;
  animation: CharAnimation;
  path?: Waypoint[];      // movement waypoints
}

export interface Waypoint {
  x: number;
  y: number;
  duration: number;       // ms to reach this point
}

export interface CameraKeyframe {
  x: number;
  y: number;
  time: number;           // ms from scene start
}

/** Audio cue synced to scene timeline */
export interface AudioCue {
  /** When to fire (ms from scene start) */
  atMs: number;
  action: "sfx" | "loop-start" | "loop-stop" | "footsteps";
  /** Sound name — SfxName for sfx/footsteps, AmbienceName|MusicName for loops */
  sound?: string;
  volume?: number;
  /** For footsteps: how many steps, interval between them */
  count?: number;
  intervalMs?: number;
  /** Footstep variant: "metal" (Maya) or "boots" (guard) */
  variant?: "metal" | "boots";
  fadeMs?: number;
}

export interface SceneDefinition {
  background: SceneType;
  actors: Actor[];
  camera: CameraKeyframe[];
  durationMs: number;
  location: string;
  caption?: string;
  audio?: AudioCue[];
}

// ── INTRO SCENES ───────────────────────────────────────────────────

export const INTRO_SCENES: SceneDefinition[] = [
  // Scene 1: Maya idle in cell — dark ambient drone, machinery hum
  {
    background: "cell",
    actors: [
      { type: "maya", x: 380, y: 370, animation: "idle" },
    ],
    camera: [
      { x: 50, y: 80, time: 0 },
      { x: 90, y: 100, time: 3000 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "72 hours missing. no contact.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.12, fadeMs: 2000 },
      { atMs: 200, action: "loop-start", sound: "facility-hum", volume: 0.06, fadeMs: 1500 },
    ],
  },
  // Scene 2: Maya hacking at terminal — typing sounds synced
  {
    background: "cell",
    actors: [
      { type: "maya", x: 520, y: 340, animation: "hack" },
    ],
    camera: [
      { x: 140, y: 60, time: 0 },
      { x: 180, y: 80, time: 3500 },
    ],
    durationMs: 4000,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "she found a terminal. rigged it.",
    audio: [
      { atMs: 300, action: "sfx", sound: "terminal-beep", volume: 0.3 },
      { atMs: 800, action: "sfx", sound: "maya-typing", volume: 0.25 },
      { atMs: 2400, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 3200, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
  // Scene 3: Maya walks corridor — footsteps synced to walk cycle (480ms = contact frame)
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 120,
        y: 310,
        animation: "walk-right",
        path: [
          { x: 600, y: 310, duration: 3000 },
        ],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 280, y: 10, time: 3000 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "signal sent. waiting for a programmer.",
    audio: [
      // Footsteps: ~6 steps over 3s walk, starting with first contact frame
      { atMs: 100, action: "footsteps", count: 7, intervalMs: 480, volume: 0.3 },
      // Corridor ambient underneath
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.1, fadeMs: 1000 },
      // Stop cell ambient from previous scene
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1500 },
    ],
  },
];

// ── CHAPTER 1 COMPLETE SCENES ──────────────────────────────────────

export const CHAPTER_01_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: Maya at terminal — handshake beep, confirmation
  {
    background: "cell",
    actors: [
      { type: "maya", x: 520, y: 340, animation: "hack" },
    ],
    camera: [
      { x: 140, y: 60, time: 0 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "handshake confirmed. she's not alone anymore.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 1000 },
      { atMs: 200, action: "sfx", sound: "terminal-beep", volume: 0.35 },
      { atMs: 800, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 1600, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
  // Win 2: Maya sneaking through corridor — cautious footsteps, tension
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 180,
        y: 310,
        animation: "walk-right",
        path: [{ x: 620, y: 310, duration: 3000 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 300, y: 10, time: 3000 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "but the guards heard something...",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "cell-ambient", fadeMs: 1000 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.12, fadeMs: 800 },
      // Maya's footsteps — synced to walk cycle contacts (480ms)
      { atMs: 100, action: "footsteps", count: 7, intervalMs: 480, volume: 0.25 },
      // Warning beep as guards notice
      { atMs: 2200, action: "sfx", sound: "warning-beep", volume: 0.35 },
      { atMs: 2800, action: "sfx", sound: "alert-beep", volume: 0.4 },
    ],
  },
  // Win 3: Chase — alarm, fast footsteps (both Maya and guard)
  {
    background: "chase",
    actors: [
      {
        type: "maya",
        x: 140,
        y: 310,
        animation: "walk-right",
        path: [{ x: 700, y: 310, duration: 2500 }],
      },
      {
        type: "guard",
        x: 60,
        y: 315,
        animation: "walk-right",
        path: [{ x: 560, y: 315, duration: 2800 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 350, y: 10, time: 2500 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · EAST WING",
    caption: "move. now.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 500 },
      // Alarm blaring
      { atMs: 0, action: "loop-start", sound: "alarm-loop", volume: 0.15, fadeMs: 300 },
      // Maya running — faster footsteps (360ms = running pace)
      { atMs: 50, action: "footsteps", count: 8, intervalMs: 360, volume: 0.35 },
      // Guard boots — heavier, slightly slower, offset from Maya
      { atMs: 200, action: "footsteps", count: 7, intervalMs: 420, volume: 0.45, variant: "boots" },
      // Stop alarm at end
      { atMs: 2700, action: "loop-stop", sound: "alarm-loop", fadeMs: 800 },
    ],
  },
];
