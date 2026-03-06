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

export interface SceneDefinition {
  background: SceneType;
  actors: Actor[];
  camera: CameraKeyframe[];
  durationMs: number;
  location: string;
  caption?: string;
}

// ── INTRO SCENES ───────────────────────────────────────────────────

export const INTRO_SCENES: SceneDefinition[] = [
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
  },
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
  },
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
  },
];

// ── CHAPTER 1 COMPLETE SCENES ──────────────────────────────────────

export const CHAPTER_01_COMPLETE_SCENES: SceneDefinition[] = [
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
  },
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
  },
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
  },
];
