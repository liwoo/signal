// ── Cinematic scene definitions ──
// Each scene describes what to render: background type, actors, camera path, duration.
// Actor positions are in scene coordinates (scene = viewport + padding).
// With viewport 640x400 and padding 200, scene is 1040x600.
//
// Floor bands (scene px, h=600) — actors' feet must sit inside these:
//   cell      far edge y≈339 (back wall / terminal)  → near edge 600
//   corridor  far edge y≈315 (heavy door at the VP)  → near edge 600
// Actors grow as they walk down the band toward the camera (depth scale).

import type { SceneType } from "./scene-painter";
import type { CharAnimation } from "./character-painter";
import type { ShakeSpec, FlashSpec, GlitchSpec } from "./scene-fx";
import { C } from "./palette";

export interface Actor {
  type: "maya" | "guard";
  x: number;              // position in pixels (at scene resolution)
  y: number;
  animation: CharAnimation;
  path?: Waypoint[];      // movement waypoints
  /** Animation to switch to once the path has been walked (e.g. walk → hack). */
  endAnimation?: CharAnimation;
  /** Extra size multiplier on top of depth scale. Default 1. */
  scale?: number;
}

export interface Waypoint {
  x: number;
  y: number;
  duration: number;       // ms to reach this point
}

export interface CameraKeyframe {
  x: number;              // world-space point centered in the viewport (scene coords, 0..1040)
  y: number;              // world-space point centered in the viewport (scene coords, 0..600)
  /** Multiplier on the base cinematic scale. Default 1.0, useful range 0.9–1.5. */
  zoom?: number;
  time: number;           // ms from scene start
}

/** Audio cue synced to scene timeline */
export interface AudioCue {
  /** When to fire (ms from scene start) */
  atMs: number;
  action: "sfx" | "loop-start" | "loop-stop" | "loop-volume" | "footsteps";
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

/** In-picture title reveal (big display type over the frame). */
export interface TitleCard {
  text: string;
  sub?: string;
  /** When it appears. Default 0. */
  atMs?: number;
  /** How long it stays. Default: until the shot ends. */
  durationMs?: number;
}

export interface SceneDefinition {
  background: SceneType;
  actors: Actor[];
  camera: CameraKeyframe[];
  durationMs: number;
  location: string;
  caption?: string;
  audio?: AudioCue[];
  /**
   * Transition into this shot. Default "cut". "dissolve" (720ms) for
   * time/place jumps; "flash" = cut under a bright frame; "glitch" = cut
   * through a burst of signal tearing.
   */
  transition?: "cut" | "dissolve" | "flash" | "glitch";
  /**
   * Shot pacing. "timed" (default) runs for durationMs. "on-action" ends at
   * max(last actor path end, caption typing end) + 600ms settle, with
   * durationMs as a hard ceiling.
   */
  advance?: "timed" | "on-action";
  /** Impact shakes (viewport px) at points in the shot. */
  shakes?: ShakeSpec[];
  /** Full-frame flashes at points in the shot. */
  flashes?: FlashSpec[];
  /** Signal-tear bursts at points in the shot. */
  glitches?: GlitchSpec[];
  /** Dutch tilt in radians, eased in over the first 700ms. */
  dutch?: number;
  titleCard?: TitleCard;
}

// ── INTRO SCENES ───────────────────────────────────────────────────
// Level 1 intro — six shots, ~23s. Wide → close → tracking → insert → threat →
// insert. The corridor guard walks straight at the camera (depth scale) and
// the whole thing ends on the terminal waiting for you.

export const INTRO_SCENES: SceneDefinition[] = [
  // Shot 1: establishing wide. Title card lands over the cell as the drone swells.
  {
    background: "cell",
    transition: "dissolve",
    actors: [
      { type: "maya", x: 610, y: 440, animation: "idle" },
    ],
    camera: [
      { x: 500, y: 330, zoom: 0.98, time: 0 },
      { x: 520, y: 326, zoom: 1.08, time: 4600 },
    ],
    durationMs: 4600,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "72 hours missing. no contact.",
    titleCard: { text: "SIGNAL", sub: "FIRST CONTACT", atMs: 700, durationMs: 3000 },
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.12, fadeMs: 2000 },
      { atMs: 200, action: "loop-start", sound: "facility-hum", volume: 0.06, fadeMs: 1500 },
      { atMs: 700, action: "sfx", sound: "terminal-beep", volume: 0.22 },
      { atMs: 2600, action: "sfx", sound: "machinery", volume: 0.12 },
    ],
  },
  // Shot 2: close on Maya. Dust in the pendant light, a door slides somewhere far off.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 610, y: 440, animation: "idle" },
    ],
    camera: [
      { x: 606, y: 366, zoom: 1.5, time: 0 },
      { x: 604, y: 360, zoom: 1.64, time: 3400 },
    ],
    durationMs: 3400,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "sublevel 3. no windows. one terminal.",
    audio: [
      { atMs: 1400, action: "sfx", sound: "door-slide", volume: 0.1 },
    ],
  },
  // Shot 3: she crosses to the terminal — camera tracks, then she sits into the hack.
  {
    background: "cell",
    actors: [
      {
        type: "maya",
        x: 610,
        y: 440,
        animation: "walk-left",
        path: [{ x: 528, y: 348, duration: 2000 }],
        endAnimation: "hack",
      },
    ],
    camera: [
      { x: 590, y: 372, zoom: 1.25, time: 0 },
      { x: 520, y: 320, zoom: 1.36, time: 2300 },
    ],
    durationMs: 3200,
    advance: "on-action",
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "she found it on day two.",
    audio: [
      { atMs: 100, action: "footsteps", count: 4, intervalMs: 430, volume: 0.22 },
    ],
  },
  // Shot 4: insert on the terminal. Typing, then the send — a cyan flash and a jolt.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 520, y: 345, animation: "hack" },
    ],
    camera: [
      { x: 515, y: 292, zoom: 1.7, time: 0 },
      { x: 512, y: 282, zoom: 1.86, time: 4200 },
    ],
    durationMs: 4200,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "rigged a dead terminal. one shot at the outside.",
    flashes: [{ atMs: 3300, durationMs: 520, color: C.termBright, intensity: 0.35 }],
    shakes: [{ atMs: 3300, durationMs: 320, intensity: 3 }],
    audio: [
      { atMs: 300, action: "sfx", sound: "maya-typing", volume: 0.3 },
      { atMs: 900, action: "sfx", sound: "keypress-1", volume: 0.16 },
      { atMs: 1300, action: "sfx", sound: "keypress-2", volume: 0.16 },
      { atMs: 1700, action: "sfx", sound: "keypress-3", volume: 0.16 },
      { atMs: 2300, action: "sfx", sound: "terminal-beep", volume: 0.3 },
      { atMs: 3300, action: "sfx", sound: "code-submit", volume: 0.38 },
    ],
  },
  // Shot 5: the threat. A guard walks the corridor straight at the lens, growing
  // with every step; boots and a dread sting under a slight dutch tilt.
  {
    background: "corridor",
    transition: "glitch",
    actors: [
      {
        type: "guard",
        x: 526,
        y: 328,
        animation: "walk-down",
        path: [{ x: 506, y: 578, duration: 4200 }],
      },
    ],
    camera: [
      { x: 520, y: 382, zoom: 1.05, time: 0 },
      { x: 514, y: 404, zoom: 1.16, time: 4200 },
    ],
    dutch: 0.022,
    durationMs: 4200,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "they check the cells every hour. it's been fifty minutes.",
    shakes: [
      { atMs: 3180, durationMs: 220, intensity: 1.6 },
      { atMs: 3650, durationMs: 240, intensity: 2.2 },
    ],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1200 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.12, fadeMs: 800 },
      { atMs: 200, action: "sfx", sound: "dread-sting", volume: 0.42 },
      { atMs: 300, action: "footsteps", count: 9, intervalMs: 470, volume: 0.42, variant: "boots" },
    ],
  },
  // Shot 6: back on the terminal under a flash — the signal is out. It wobbles once.
  {
    background: "cell",
    transition: "flash",
    actors: [
      { type: "maya", x: 520, y: 345, animation: "hack" },
    ],
    camera: [
      { x: 512, y: 286, zoom: 1.6, time: 0 },
      { x: 506, y: 272, zoom: 1.96, time: 3800 },
    ],
    durationMs: 3800,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "signal sent. waiting for a programmer.",
    glitches: [{ atMs: 2600, durationMs: 220 }],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 800 },
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.1, fadeMs: 1500 },
      { atMs: 400, action: "sfx", sound: "message-receive", volume: 0.4 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.25 },
      { atMs: 2600, action: "sfx", sound: "warning-beep", volume: 0.2 },
    ],
  },
];

// ── CHAPTER 1 COMPLETE SCENES ──────────────────────────────────────
// Handshake lands → a guard heard it → the knock → the door is the next problem.

export const CHAPTER_01_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: the terminal confirms. Green flash, link card.
  {
    background: "cell",
    transition: "dissolve",
    actors: [
      { type: "maya", x: 520, y: 345, animation: "hack" },
    ],
    camera: [
      { x: 512, y: 290, zoom: 1.6, time: 0 },
      { x: 512, y: 284, zoom: 1.72, time: 3600 },
    ],
    durationMs: 3600,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "handshake confirmed. she's not alone anymore.",
    titleCard: { text: "LINK ESTABLISHED", sub: "CELL B-09 ↔ YOU", atMs: 900, durationMs: 2300 },
    flashes: [{ atMs: 700, durationMs: 640, color: C.signalBright, intensity: 0.42 }],
    shakes: [{ atMs: 700, durationMs: 260, intensity: 2 }],
    audio: [
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 1000 },
      { atMs: 200, action: "sfx", sound: "terminal-beep", volume: 0.35 },
      { atMs: 700, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 1600, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
  // Win 2: the corridor. A guard heard the terminal wake up — and he's coming.
  {
    background: "corridor",
    transition: "glitch",
    actors: [
      {
        type: "guard",
        x: 530,
        y: 322,
        animation: "walk-down",
        path: [{ x: 500, y: 592, duration: 3400 }],
      },
    ],
    camera: [
      { x: 520, y: 380, zoom: 1.1, time: 0 },
      { x: 510, y: 424, zoom: 1.3, time: 3400 },
    ],
    dutch: 0.03,
    durationMs: 3600,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "but someone heard the terminal wake up.",
    shakes: [{ atMs: 2900, durationMs: 260, intensity: 3 }],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "cell-ambient", fadeMs: 600 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.12, fadeMs: 800 },
      { atMs: 0, action: "loop-start", sound: "heartbeat-slow", volume: 0.2, fadeMs: 1200 },
      { atMs: 300, action: "sfx", sound: "warning-beep", volume: 0.35 },
      { atMs: 200, action: "footsteps", count: 8, intervalMs: 430, volume: 0.45, variant: "boots" },
      { atMs: 2600, action: "sfx", sound: "alert-beep", volume: 0.4 },
    ],
  },
  // Win 3: the knock. The frame slams, the picture tears, the camera creeps to the door.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 520, y: 345, animation: "idle" },
    ],
    camera: [
      { x: 600, y: 332, zoom: 1.3, time: 0 },
      { x: 700, y: 330, zoom: 1.36, time: 3400 },
    ],
    durationMs: 3600,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "she kills the screen. holds her breath.",
    shakes: [
      { atMs: 900, durationMs: 520, intensity: 9 },
      { atMs: 1500, durationMs: 360, intensity: 5 },
    ],
    flashes: [{ atMs: 900, durationMs: 300, color: C.lightWarm, intensity: 0.22 }],
    glitches: [{ atMs: 900, durationMs: 190 }],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 400 },
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.06, fadeMs: 800 },
      { atMs: 900, action: "sfx", sound: "knock-heavy", volume: 0.62 },
      { atMs: 900, action: "loop-volume", sound: "heartbeat-slow", volume: 0.32, fadeMs: 400 },
      { atMs: 1500, action: "sfx", sound: "knock-2", volume: 0.42 },
      { atMs: 1900, action: "sfx", sound: "dread-sting", volume: 0.5 },
    ],
  },
  // Win 4: the door, and the boots walking away. Chapter card over the keypad.
  {
    background: "cell",
    transition: "dissolve",
    actors: [
      { type: "maya", x: 520, y: 345, animation: "idle" },
    ],
    camera: [
      { x: 800, y: 300, zoom: 1.4, time: 0 },
      { x: 832, y: 290, zoom: 1.56, time: 4000 },
    ],
    durationMs: 4000,
    location: "SUBLEVEL 3 · CELL B-09 · DOOR",
    caption: "the door has a keypad. next: the code.",
    titleCard: { text: "CHAPTER 1 COMPLETE", sub: "NEXT · DOOR CODE", atMs: 1200, durationMs: 2600 },
    audio: [
      { atMs: 200, action: "footsteps", count: 3, intervalMs: 700, volume: 0.22, variant: "boots" },
      { atMs: 1500, action: "loop-stop", sound: "heartbeat-slow", fadeMs: 2000 },
      { atMs: 2800, action: "sfx", sound: "door-slide", volume: 0.18 },
      { atMs: 3000, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
];

// ── CHAPTER 2 INTRO SCENES ───────────────────────────────────────
// Level 2 intro — six shots, ~23s. Wide (title card) → keypad insert → tracking
// → reject insert → corridor threat → keypad insert. The guard walks straight at
// the lens under a dutch tilt; the sequence ends on the keypad, waiting for you.

export const CHAPTER_02_INTRO_SCENES: SceneDefinition[] = [
  // Shot 1: establishing wide on the cell and the heavy door. Title card lands.
  {
    background: "cell",
    transition: "dissolve",
    actors: [
      { type: "maya", x: 560, y: 440, animation: "idle" },
    ],
    camera: [
      { x: 520, y: 330, zoom: 0.98, time: 0 },
      { x: 560, y: 324, zoom: 1.1, time: 4600 },
    ],
    durationMs: 4600,
    location: "SUBLEVEL 3 · CELL B-09 · DOOR",
    caption: "one door out. one keypad on it.",
    titleCard: { text: "CHAPTER 2", sub: "DOOR CODE", atMs: 700, durationMs: 3000 },
    audio: [
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 2000 },
      { atMs: 200, action: "loop-start", sound: "facility-hum", volume: 0.05, fadeMs: 1500 },
      { atMs: 700, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 2600, action: "sfx", sound: "machinery", volume: 0.12 },
    ],
  },
  // Shot 2: insert — the camera pushes onto the keypad on the right wall, amber LED.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 560, y: 440, animation: "idle" },
    ],
    camera: [
      { x: 800, y: 320, zoom: 1.4, time: 0 },
      { x: 828, y: 312, zoom: 1.54, time: 3400 },
    ],
    durationMs: 3400,
    location: "SUBLEVEL 3 · CELL B-09 · KEYPAD",
    caption: "it wants a ten-code sequence, in order.",
    flashes: [{ atMs: 1200, durationMs: 420, color: C.lightWarm, intensity: 0.2 }],
    audio: [
      { atMs: 900, action: "sfx", sound: "keypad-beep", volume: 0.22 },
      { atMs: 1200, action: "sfx", sound: "terminal-beep", volume: 0.18 },
    ],
  },
  // Shot 3: tracking — Maya crosses to the door and settles into the keypad.
  {
    background: "cell",
    actors: [
      {
        type: "maya",
        x: 400,
        y: 372,
        animation: "walk-right",
        path: [{ x: 700, y: 360, duration: 2200 }],
        endAnimation: "keypad",
      },
    ],
    camera: [
      { x: 520, y: 330, zoom: 1.2, time: 0 },
      { x: 640, y: 320, zoom: 1.32, time: 2500 },
    ],
    durationMs: 3400,
    advance: "on-action",
    location: "SUBLEVEL 3 · CELL B-09 · DOOR",
    caption: "she crosses to the panel.",
    audio: [
      { atMs: 100, action: "footsteps", count: 5, intervalMs: 440, volume: 0.22 },
    ],
  },
  // Shot 4: insert — she punches codes and the keypad rejects. Amber flash, jolt.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 700, y: 360, animation: "keypad" },
    ],
    camera: [
      { x: 640, y: 312, zoom: 1.34, time: 0 },
      { x: 652, y: 306, zoom: 1.46, time: 4200 },
    ],
    durationMs: 4200,
    location: "SUBLEVEL 3 · CELL B-09 · KEYPAD",
    caption: "tried three. tried seven. wrong pattern.",
    flashes: [{ atMs: 3500, durationMs: 420, color: C.dangerBright, intensity: 0.28 }],
    shakes: [{ atMs: 3500, durationMs: 300, intensity: 2.4 }],
    audio: [
      { atMs: 400, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 700, action: "sfx", sound: "keypad-beep", volume: 0.26 },
      { atMs: 1000, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 1500, action: "sfx", sound: "warning-beep", volume: 0.4 },
      { atMs: 2400, action: "sfx", sound: "keypad-beep", volume: 0.28 },
      { atMs: 2700, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 3000, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 3500, action: "sfx", sound: "warning-beep", volume: 0.46 },
    ],
  },
  // Shot 5: the threat. A guard walks the corridor straight at the lens, growing
  // with every step; boots and a dread sting under a slight dutch tilt.
  {
    background: "corridor",
    transition: "glitch",
    actors: [
      {
        type: "guard",
        x: 526,
        y: 328,
        animation: "walk-down",
        path: [{ x: 506, y: 566, duration: 4000 }],
      },
    ],
    camera: [
      { x: 520, y: 382, zoom: 1.05, time: 0 },
      { x: 514, y: 404, zoom: 1.16, time: 4000 },
    ],
    dutch: 0.022,
    durationMs: 4000,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "patrol sweeps the block every hour.",
    shakes: [
      { atMs: 3000, durationMs: 220, intensity: 1.6 },
      { atMs: 3460, durationMs: 240, intensity: 2.2 },
    ],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "cell-ambient", fadeMs: 1200 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.12, fadeMs: 800 },
      { atMs: 200, action: "sfx", sound: "dread-sting", volume: 0.42 },
      { atMs: 300, action: "footsteps", count: 8, intervalMs: 470, volume: 0.42, variant: "boots" },
    ],
  },
  // Shot 6: back on the keypad under a flash — she needs the pattern, and you.
  {
    background: "cell",
    transition: "flash",
    actors: [
      { type: "maya", x: 700, y: 360, animation: "keypad" },
    ],
    camera: [
      { x: 680, y: 306, zoom: 1.44, time: 0 },
      { x: 700, y: 298, zoom: 1.6, time: 3800 },
    ],
    durationMs: 3800,
    location: "SUBLEVEL 3 · CELL B-09 · KEYPAD",
    caption: "she needs the pattern. she needs you.",
    flashes: [{ atMs: 400, durationMs: 500, color: C.termBright, intensity: 0.3 }],
    glitches: [{ atMs: 2600, durationMs: 200 }],
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 800 },
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 1500 },
      { atMs: 400, action: "sfx", sound: "message-receive", volume: 0.4 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.25 },
    ],
  },
];

// ── CHAPTER 2 COMPLETE SCENES ────────────────────────────────────
// Handshake on the keypad → the lock turns → a knock from the next cell → her name
// in a stranger's mouth → the corridor to B-10 is sealed. Four shots, ~15s.

export const CHAPTER_02_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: the sequence lands. Keypad turns green, the lock turns over. Link card.
  {
    background: "cell",
    transition: "dissolve",
    actors: [
      { type: "maya", x: 700, y: 360, animation: "keypad" },
    ],
    camera: [
      { x: 680, y: 306, zoom: 1.4, time: 0 },
      { x: 700, y: 300, zoom: 1.52, time: 3800 },
    ],
    durationMs: 4000,
    location: "SUBLEVEL 3 · CELL B-09 · DOOR",
    caption: "all ten codes classified. the lock turns green.",
    titleCard: { text: "SEQUENCE ACCEPTED", sub: "CELL B-09 · DOOR", atMs: 900, durationMs: 2300 },
    flashes: [{ atMs: 1800, durationMs: 620, color: C.signalBright, intensity: 0.42 }],
    shakes: [{ atMs: 2600, durationMs: 300, intensity: 3 }],
    audio: [
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 1000 },
      { atMs: 300, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 600, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 900, action: "sfx", sound: "keypad-beep", volume: 0.32 },
      { atMs: 1200, action: "sfx", sound: "keypad-beep", volume: 0.34 },
      { atMs: 1800, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 2600, action: "sfx", sound: "machinery", volume: 0.32 },
      { atMs: 3200, action: "sfx", sound: "door-slide", volume: 0.45 },
    ],
  },
  // Win 2: the knock. Two slow, then three fast — from B-10. The frame slams, tears.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 560, y: 360, animation: "idle" },
    ],
    camera: [
      { x: 560, y: 306, zoom: 1.15, time: 0 },
      { x: 640, y: 306, zoom: 1.24, time: 3600 },
    ],
    durationMs: 3600,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "then — knocking. from cell b-10.",
    shakes: [
      { atMs: 700, durationMs: 520, intensity: 9 },
      { atMs: 1300, durationMs: 360, intensity: 5 },
    ],
    flashes: [{ atMs: 700, durationMs: 300, color: C.lightWarm, intensity: 0.2 }],
    glitches: [{ atMs: 700, durationMs: 190 }],
    audio: [
      { atMs: 0, action: "loop-start", sound: "heartbeat-slow", volume: 0.2, fadeMs: 1200 },
      { atMs: 700, action: "sfx", sound: "knock-heavy", volume: 0.6 },
      { atMs: 1300, action: "sfx", sound: "knock-2", volume: 0.42 },
      { atMs: 2100, action: "sfx", sound: "knock-1", volume: 0.5 },
      { atMs: 2400, action: "sfx", sound: "knock-2", volume: 0.46 },
      { atMs: 2700, action: "sfx", sound: "knock-heavy", volume: 0.52 },
    ],
  },
  // Win 3: the voice. Someone in B-10 says her name.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 560, y: 360, animation: "idle" },
    ],
    camera: [
      { x: 600, y: 300, zoom: 1.3, time: 0 },
      { x: 604, y: 292, zoom: 1.42, time: 3200 },
    ],
    durationMs: 3200,
    location: "SUBLEVEL 3 · CELL B-09",
    caption: "\"Maya? Maya Chen?\" — someone knows her name.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.1, fadeMs: 2000 },
      { atMs: 1200, action: "sfx", sound: "message-receive", volume: 0.24 },
      { atMs: 2400, action: "sfx", sound: "dread-sting", volume: 0.32 },
    ],
  },
  // Win 4: she resolves. The corridor to B-10 is sealed. Chapter card over the walk.
  {
    background: "corridor",
    transition: "dissolve",
    actors: [
      {
        type: "maya",
        x: 120,
        y: 460,
        animation: "walk-right",
        path: [{ x: 520, y: 460, duration: 2600 }],
      },
    ],
    camera: [
      { x: 400, y: 300, zoom: 1.0, time: 0 },
      { x: 560, y: 296, zoom: 1.12, time: 4000 },
    ],
    durationMs: 4000,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "the corridor to b-10 is sealed. she needs another way.",
    titleCard: { text: "CHAPTER 2 COMPLETE", sub: "NEXT · SHAFT CODES", atMs: 1200, durationMs: 2600 },
    audio: [
      { atMs: 0, action: "loop-stop", sound: "cell-ambient", fadeMs: 1200 },
      { atMs: 0, action: "loop-stop", sound: "heartbeat-slow", fadeMs: 1500 },
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1500 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.1, fadeMs: 800 },
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 430, volume: 0.3 },
      { atMs: 3000, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
];

// ── CHAPTER 3 INTRO SCENES ──────────────────────────────────────

export const CHAPTER_03_INTRO_SCENES: SceneDefinition[] = [
  // Scene 0: Bridge — Maya stands in the corridor, processing what just happened
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 420, y: 460, animation: "idle" },
    ],
    camera: [
      { x: 440, y: 300, zoom: 1.15, time: 0 },
      { x: 430, y: 295, zoom: 1.28, time: 3500 },
    ],
    durationMs: 4000,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "\"Maya? Maya Chen?\" — someone in B-10 knows her name.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.1, fadeMs: 1500 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.06, fadeMs: 1000 },
      // Echo of the knocks from B-10 — haunting memory
      { atMs: 600, action: "sfx", sound: "knock-1", volume: 0.2 },
      { atMs: 1100, action: "sfx", sound: "knock-2", volume: 0.15 },
      { atMs: 1600, action: "sfx", sound: "knock-heavy", volume: 0.12 },
      // Tension builds
      { atMs: 2800, action: "sfx", sound: "dread-sting", volume: 0.15 },
    ],
  },
  // Scene 1: Maya walks the corridor — the direct path is blocked
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 420,
        y: 460,
        animation: "walk-right",
        path: [{ x: 620, y: 460, duration: 2000 }],
      },
    ],
    camera: [
      { x: 460, y: 300, time: 0 },
      { x: 620, y: 300, time: 2500 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "the corridor to B-10 is sealed. but the ventilation shaft isn't.",
    audio: [
      // Maya's footsteps — purposeful, then stopping
      { atMs: 100, action: "footsteps", count: 5, intervalMs: 420, volume: 0.25 },
      // She spots the vent grate
      { atMs: 2400, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 2800, action: "sfx", sound: "machinery", volume: 0.15 },
    ],
  },
  // Scene 2: Maya crawls into the ventilation shaft — tight, claustrophobic
  {
    background: "vent",
    actors: [
      {
        type: "maya",
        x: 120,
        y: 445,
        animation: "crawl-right",
        path: [{ x: 450, y: 445, duration: 3200 }],
      },
    ],
    camera: [
      { x: 400, y: 320, zoom: 1.1, time: 0 },
      { x: 560, y: 320, zoom: 1.1, time: 3200 },
    ],
    durationMs: 4000,
    location: "VENTILATION SHAFT · SUBLEVEL 3",
    caption: "tight. dark. the only way to B-10.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1000 },
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 800 },
      { atMs: 0, action: "loop-start", sound: "dark-drone-2", volume: 0.1, fadeMs: 1500 },
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.04, fadeMs: 1000 },
      // Maya crawling — slower, muffled, lower volume than walking
      { atMs: 100, action: "footsteps", count: 7, intervalMs: 520, volume: 0.1 },
    ],
  },
  // Scene 2: Maya reaches the junction panel — punches in a code, rejected
  {
    background: "vent",
    actors: [
      { type: "maya", x: 550, y: 460, animation: "keypad" },
    ],
    camera: [
      { x: 560, y: 310, zoom: 1.3, time: 0 },
      { x: 570, y: 305, zoom: 1.38, time: 3500 },
    ],
    durationMs: 4000,
    location: "VENTILATION SHAFT · JUNCTION A",
    caption: "a junction panel. each gate needs a computed code to pass.",
    audio: [
      { atMs: 300, action: "sfx", sound: "keypad-beep", volume: 0.25 },
      { atMs: 550, action: "sfx", sound: "keypad-beep", volume: 0.25 },
      { atMs: 800, action: "sfx", sound: "keypad-beep", volume: 0.28 },
      { atMs: 1200, action: "sfx", sound: "warning-beep", volume: 0.35 },
      // She studies the panel display
      { atMs: 2500, action: "sfx", sound: "keypad-beep", volume: 0.2 },
      { atMs: 3200, action: "sfx", sound: "terminal-beep", volume: 0.2 },
    ],
  },
];

// ── CHAPTER 3 COMPLETE SCENES ───────────────────────────────────

export const CHAPTER_03_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: Maya enters the correct codes at the junction panel — green confirmation
  {
    background: "vent",
    actors: [
      { type: "maya", x: 550, y: 460, animation: "keypad" },
    ],
    camera: [
      { x: 560, y: 310, zoom: 1.3, time: 0 },
    ],
    durationMs: 3000,
    location: "VENTILATION SHAFT · JUNCTION A",
    caption: "codes validated. the shaft gate opens.",
    audio: [
      { atMs: 200, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.25 },
      { atMs: 1500, action: "sfx", sound: "machinery", volume: 0.25 },
      { atMs: 2200, action: "sfx", sound: "door-slide", volume: 0.35 },
    ],
  },
  // Win 2: Maya walks through to cell B-10
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 120,
        y: 460,
        animation: "walk-right",
        path: [{ x: 550, y: 460, duration: 2500 }],
      },
    ],
    camera: [
      { x: 400, y: 300, time: 0 },
      { x: 600, y: 300, time: 2500 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · CELL B-10",
    caption: "cell B-10. someone's inside.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "dark-drone-2", fadeMs: 1000 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.1, fadeMs: 800 },
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 420, volume: 0.25 },
      // Knocks from inside B-10
      { atMs: 2200, action: "sfx", sound: "knock-1", volume: 0.5 },
      { atMs: 2600, action: "sfx", sound: "knock-2", volume: 0.45 },
    ],
  },
  // Win 3: Door opens — dramatic reveal moment
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 550, y: 460, animation: "idle" },
    ],
    camera: [
      { x: 560, y: 300, zoom: 1.25, time: 0 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · CELL B-10",
    caption: "\"Maya — I know exactly why they took us.\"",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 1500 },
      { atMs: 300, action: "sfx", sound: "door-slide", volume: 0.45 },
      { atMs: 1200, action: "loop-start", sound: "dark-drone-1", volume: 0.12, fadeMs: 2000 },
      { atMs: 2500, action: "sfx", sound: "dread-sting", volume: 0.35 },
    ],
  },
];

// ── BOSS 01 INTRO SCENES ─────────────────────────────────────────

export const BOSS_01_INTRO_SCENES: SceneDefinition[] = [
  // ── ACT BREAK: Reeves told Maya everything ──
  // Scene 1: B-10 — heavy silence. Maya absorbing what she just learned.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 480, y: 370, animation: "idle" },
    ],
    camera: [
      { x: 500, y: 300, zoom: 1.05, time: 0 },
      { x: 490, y: 290, zoom: 1.2, time: 5000 },
    ],
    durationMs: 5500,
    location: "SUBLEVEL 3 · CELL B-10",
    caption: "dr. reeves told her everything. the project. the subjects. why none of them remember.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.12, fadeMs: 3000 },
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.04, fadeMs: 2000 },
      { atMs: 3000, action: "loop-start", sound: "heartbeat-slow", volume: 0.06, fadeMs: 2000 },
    ],
  },
  // Scene 2: Reeves's last words — the server room is the way out
  {
    background: "cell",
    actors: [
      { type: "maya", x: 480, y: 370, animation: "idle" },
    ],
    camera: [
      { x: 490, y: 295, zoom: 1.25, time: 0 },
      { x: 490, y: 290, zoom: 1.35, time: 4000 },
    ],
    durationMs: 4500,
    location: "SUBLEVEL 3 · CELL B-10",
    caption: "\"there's a server room at the end of east wing. the lockmaster controls every door on this level. take it down, and you're out.\"",
    audio: [
      // Quiet — just the drone and heartbeat building
      { atMs: 2500, action: "sfx", sound: "knock-heavy", volume: 0.2 },
      { atMs: 3500, action: "sfx", sound: "knock-heavy", volume: 0.15 },
    ],
  },
  // Scene 3: ALARM — the quiet shatters. Sirens. Red.
  {
    background: "cell",
    actors: [
      { type: "maya", x: 480, y: 370, animation: "idle" },
    ],
    camera: [
      { x: 490, y: 295, zoom: 1.3, time: 0 },
      { x: 470, y: 305, zoom: 1.15, time: 800 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · CELL B-10",
    caption: "then the sirens hit.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "heartbeat-slow", fadeMs: 200 },
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 300 },
      { atMs: 0, action: "loop-stop", sound: "facility-hum", fadeMs: 200 },
      // Hard cut to alarm — violent contrast
      { atMs: 200, action: "sfx", sound: "alert-beep", volume: 0.65 },
      { atMs: 500, action: "loop-start", sound: "siren-loop", volume: 0.18, fadeMs: 200 },
      { atMs: 700, action: "loop-start", sound: "alarm-loop", volume: 0.12, fadeMs: 300 },
      // Boss music starts low under the alarm — builds from here
      { atMs: 800, action: "loop-start", sound: "boss-loop", volume: 0.06, fadeMs: 2000 },
      { atMs: 1500, action: "sfx", sound: "warning-beep", volume: 0.45 },
      { atMs: 2200, action: "sfx", sound: "alert-beep", volume: 0.3 },
    ],
  },
  // Scene 4: Maya runs through alarm corridor — desperate sprint
  {
    background: "chase",
    actors: [
      {
        type: "maya",
        x: 60,
        y: 460,
        animation: "walk-right",
        path: [{ x: 750, y: 460, duration: 2800 }],
      },
    ],
    camera: [
      { x: 400, y: 300, time: 0 },
      { x: 664, y: 300, time: 2800 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · EAST WING",
    caption: "run.",
    audio: [
      // Running — fast pace, boots on metal
      { atMs: 50, action: "footsteps", count: 9, intervalMs: 300, volume: 0.45 },
      { atMs: 0, action: "loop-start", sound: "heartbeat-fast", volume: 0.12, fadeMs: 600 },
      // Alarm fades, boss music rises
      { atMs: 1000, action: "loop-stop", sound: "alarm-loop", fadeMs: 2000 },
      { atMs: 500, action: "loop-volume", sound: "boss-loop", volume: 0.1, fadeMs: 2000 },
    ],
  },
  // Scene 5: Door at the end — she reaches it
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 400,
        y: 460,
        animation: "walk-right",
        path: [{ x: 620, y: 460, duration: 1200 }],
      },
    ],
    camera: [
      { x: 520, y: 300, time: 0 },
      { x: 620, y: 300, time: 1500 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · EAST WING",
    caption: "end of the corridor. the server room door.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "siren-loop", fadeMs: 1500 },
      { atMs: 100, action: "footsteps", count: 3, intervalMs: 400, volume: 0.35 },
      { atMs: 1400, action: "sfx", sound: "door-slide", volume: 0.55 },
      // Heartbeat drops, music dips for the reveal moment
      { atMs: 1600, action: "loop-stop", sound: "heartbeat-fast", fadeMs: 800 },
      { atMs: 1600, action: "loop-volume", sound: "boss-loop", volume: 0.04, fadeMs: 1000 },
      { atMs: 2000, action: "loop-start", sound: "tension-drone", volume: 0.04, fadeMs: 1500 },
    ],
  },
  // Scene 6: The boss arena — Maya steps in. Dark. Machinery hum.
  {
    background: "boss-arena",
    actors: [
      {
        type: "maya",
        x: 100,
        y: 460,
        animation: "walk-right",
        path: [{ x: 240, y: 460, duration: 2000 }],
      },
    ],
    camera: [
      { x: 420, y: 300, zoom: 1.0, time: 0 },
      { x: 440, y: 290, zoom: 1.1, time: 3000 },
    ],
    durationMs: 4000,
    location: "SERVER ROOM · SUBLEVEL 3",
    caption: "the room is cold. server racks line both walls. and at the center — mounted to the back wall like a steel eye —",
    audio: [
      { atMs: 500, action: "sfx", sound: "door-slide", volume: 0.3 },
      { atMs: 800, action: "footsteps", count: 4, intervalMs: 550, volume: 0.2 },
      { atMs: 1500, action: "sfx", sound: "machinery", volume: 0.3 },
      { atMs: 2200, action: "sfx", sound: "machinery", volume: 0.25 },
      { atMs: 2800, action: "loop-start", sound: "tension-drone", volume: 0.1, fadeMs: 1000 },
    ],
  },
  // Scene 7: LOCKMASTER REVEAL — camera pushes in on the mainframe
  {
    background: "boss-arena",
    actors: [],
    camera: [
      { x: 500, y: 280, zoom: 1.15, time: 0 },
      { x: 520, y: 250, zoom: 1.45, time: 4500 },
    ],
    durationMs: 5000,
    location: "SERVER ROOM · LOCKMASTER",
    caption: "the lockmaster.",
    audio: [
      // Accelerating beeps — it wakes up. Music rises with it.
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.15 },
      { atMs: 800, action: "loop-volume", sound: "boss-loop", volume: 0.08, fadeMs: 1500 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 2000, action: "sfx", sound: "terminal-beep", volume: 0.28 },
      { atMs: 2400, action: "sfx", sound: "warning-beep", volume: 0.3 },
      { atMs: 2400, action: "loop-volume", sound: "boss-loop", volume: 0.14, fadeMs: 1500 },
      { atMs: 2800, action: "sfx", sound: "terminal-beep", volume: 0.35 },
      { atMs: 3100, action: "sfx", sound: "terminal-beep", volume: 0.38 },
      { atMs: 3300, action: "sfx", sound: "alert-beep", volume: 0.4 },
      { atMs: 3500, action: "sfx", sound: "machinery", volume: 0.4 },
    ],
  },
  // Scene 8: It locks on — weapon systems arming. Music hits full.
  {
    background: "boss-arena",
    actors: [],
    camera: [
      { x: 520, y: 255, zoom: 1.4, time: 0 },
      { x: 520, y: 260, zoom: 1.5, time: 3500 },
    ],
    durationMs: 4000,
    location: "SERVER ROOM · LOCKMASTER",
    caption: "it sees her. arms extending. sector grid online. weapon systems hot.",
    audio: [
      // Music hits full — this is the fight
      { atMs: 0, action: "loop-volume", sound: "boss-loop", volume: 0.2, fadeMs: 1500 },
      // Mechanical activation sequence
      { atMs: 200, action: "sfx", sound: "machinery", volume: 0.45 },
      { atMs: 600, action: "sfx", sound: "alert-beep", volume: 0.45 },
      { atMs: 1000, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 1300, action: "sfx", sound: "keypad-beep", volume: 0.33 },
      { atMs: 1500, action: "sfx", sound: "keypad-beep", volume: 0.36 },
      { atMs: 1700, action: "sfx", sound: "warning-beep", volume: 0.4 },
      { atMs: 2200, action: "sfx", sound: "dread-sting", volume: 0.35 },
      // Heartbeat — Maya's fear
      { atMs: 2500, action: "loop-start", sound: "heartbeat-fast", volume: 0.08, fadeMs: 1000 },
    ],
  },
];

// ── BOSS 01 COMPLETE SCENES ──────────────────────────────────────

export const BOSS_01_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: Lock mechanism accepting — terminal confirmation
  {
    background: "server",
    actors: [],
    camera: [
      { x: 520, y: 280, zoom: 1.3, time: 0 },
    ],
    durationMs: 2500,
    location: "SUBLEVEL 3 · LOCK CONTROLLER",
    caption: "codes aligned. lock disengaging.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "tension-drone", fadeMs: 1200 },
      { atMs: 200, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.3 },
      { atMs: 1400, action: "sfx", sound: "terminal-beep", volume: 0.25 },
    ],
  },
  // Win 2: Maya running through the door — victorious chase energy
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 100,
        y: 460,
        animation: "walk-right",
        path: [{ x: 700, y: 460, duration: 2500 }],
      },
    ],
    camera: [
      { x: 400, y: 300, time: 0 },
      { x: 664, y: 300, time: 2500 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · EAST WING",
    caption: "sublevel 3 — cleared.",
    audio: [
      { atMs: 0, action: "sfx", sound: "door-slide", volume: 0.4 },
      // Maya running — fast footsteps (360ms = running pace)
      { atMs: 100, action: "footsteps", count: 7, intervalMs: 360, volume: 0.35 },
      { atMs: 0, action: "loop-stop", sound: "alarm-loop", fadeMs: 800 },
    ],
  },
  // Win 3: Brief calm — Maya at far right, corridor behind her
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 680, y: 460, animation: "idle" },
    ],
    camera: [
      { x: 600, y: 300, zoom: 1.2, time: 0 },
    ],
    durationMs: 2500,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "dr. reeves is on sublevel 2. she has to keep going.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-2", volume: 0.08, fadeMs: 2000 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.06, fadeMs: 1500 },
    ],
  },
];

// ── CHAPTER 4 INTRO SCENES ──────────────────────────────────────

export const CHAPTER_04_INTRO_SCENES: SceneDefinition[] = [
  // Scene 1: Aftermath — server room still smoking from lockmaster fight
  {
    background: "server",
    actors: [],
    camera: [
      { x: 100, y: 50, time: 0 },
      { x: 120, y: 60, time: 3500 },
    ],
    durationMs: 3500,
    location: "SUBLEVEL 3 · SERVER ROOM",
    caption: "lockmaster down. the server room is still humming. circuits fried, but the door is open.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.08, fadeMs: 1500 },
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 2000, action: "sfx", sound: "terminal-beep", volume: 0.15 },
    ],
  },
  // Scene 2: Maya climbs out of sublevel 3 — moving up through the facility
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 80,
        y: 460,
        animation: "walk-right",
        path: [{ x: 600, y: 460, duration: 3000 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 250, y: 10, time: 3000 },
    ],
    durationMs: 3500,
    location: "STAIRWELL · SUBLEVEL 3 → FLOOR 1",
    caption: "she found reeves on sublevel 2. reeves handed her a photograph before the alarms hit.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "facility-hum", fadeMs: 800 },
      { atMs: 100, action: "footsteps", count: 8, intervalMs: 380, volume: 0.3 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.08, fadeMs: 1500 },
      { atMs: 2500, action: "sfx", sound: "door-slide", volume: 0.35 },
    ],
  },
  // Scene 3: Maya studying the photograph — guard schedule
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 420, y: 460, animation: "idle" },
    ],
    camera: [
      { x: 120, y: 10, time: 0 },
      { x: 160, y: 20, time: 4500 },
    ],
    durationMs: 4500,
    location: "FLOOR 1-3 · SURVEILLANCE CORRIDOR",
    caption: "guard schedule. five names, four floors, shift windows. she needs to find the gap.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.04, fadeMs: 1000 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.25 },
      { atMs: 3000, action: "sfx", sound: "maya-typing", volume: 0.2 },
    ],
  },
  // Scene 4: Maya walks past surveillance monitors — tension building
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 180,
        y: 460,
        animation: "walk-right",
        path: [{ x: 620, y: 460, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 300, y: 10, time: 2500 },
    ],
    durationMs: 3500,
    location: "FLOOR 1-3 · SURVEILLANCE",
    caption: "but something else is watching. the facility knows she passed the lockmaster.",
    audio: [
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 420, volume: 0.25 },
      { atMs: 2200, action: "sfx", sound: "warning-beep", volume: 0.2 },
    ],
  },
  // Scene 5: GHOST's broadcast — acknowledges the lockmaster, raises the stakes
  {
    background: "server",
    actors: [],
    camera: [
      { x: 100, y: 40, time: 0 },
      { x: 120, y: 50, time: 4000 },
    ],
    durationMs: 4000,
    location: "FACILITY BROADCAST",
    caption: "[GHOST]: impressive. you beat the lockmaster. you have twelve hours. then the building burns.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "corridor-ambient", fadeMs: 800 },
      { atMs: 0, action: "loop-stop", sound: "facility-hum", fadeMs: 800 },
      { atMs: 0, action: "loop-start", sound: "dark-drone-1", volume: 0.12, fadeMs: 2000 },
      { atMs: 800, action: "sfx", sound: "alert-beep", volume: 0.4 },
      { atMs: 1500, action: "sfx", sound: "dread-sting", volume: 0.35 },
      { atMs: 2500, action: "sfx", sound: "terminal-beep", volume: 0.2 },
      { atMs: 3000, action: "sfx", sound: "warning-beep", volume: 0.3 },
    ],
  },
];

// ── CHAPTER 4 COMPLETE SCENES ───────────────────────────────────

export const CHAPTER_04_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: Maya at a terminal — schedule decoded, confirmation
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 600, y: 460, animation: "hack" },
    ],
    camera: [
      { x: 260, y: 10, time: 0 },
    ],
    durationMs: 3000,
    location: "FLOOR 1-3 · SURVEILLANCE",
    caption: "guard schedule decoded. floor 4 is clear.",
    audio: [
      { atMs: 200, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.3 },
      { atMs: 1500, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
  // Win 2: Maya moves toward the stairwell
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 200,
        y: 460,
        animation: "walk-right",
        path: [{ x: 650, y: 460, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 300, y: 10, time: 2500 },
    ],
    durationMs: 3500,
    location: "FLOOR 4 · STAIRWELL",
    caption: "floor 4. no guards for another forty minutes. enough time.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1000 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.1, fadeMs: 800 },
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 420, volume: 0.3 },
    ],
  },
  // Win 3: Static — tension. GHOST's presence lingers.
  {
    background: "server",
    actors: [],
    camera: [
      { x: 100, y: 40, time: 0 },
      { x: 110, y: 45, time: 3500 },
    ],
    durationMs: 3500,
    location: "FLOOR 4 · SERVER ACCESS",
    caption: "but who is GHOST? and what burns in twelve hours?",
    audio: [
      { atMs: 0, action: "loop-start", sound: "dark-drone-2", volume: 0.08, fadeMs: 2000 },
      { atMs: 0, action: "loop-start", sound: "tension-drone", volume: 0.06, fadeMs: 1500 },
      { atMs: 2000, action: "sfx", sound: "dread-sting", volume: 0.25 },
    ],
  },
];

// ── CHAPTER 4.2 INTRO SCENES ─────────────────────────────────────

export const CHAPTER_04_2_INTRO_SCENES: SceneDefinition[] = [
  // Scene 1: Maya reaches the comms room
  {
    background: "server",
    actors: [
      {
        type: "maya",
        x: 80,
        y: 460,
        animation: "walk-right",
        path: [{ x: 450, y: 460, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 200, y: 10, time: 2500 },
    ],
    durationMs: 3500,
    location: "FLOOR 2 · COMMS ROOM",
    caption: "floor 2. the comms room. relay equipment lines the walls — half of it still powered.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.06, fadeMs: 1500 },
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 420, volume: 0.3 },
      { atMs: 2000, action: "sfx", sound: "terminal-beep", volume: 0.2 },
    ],
  },
  // Scene 2: Maya at terminal — Reeves explains the cipher
  {
    background: "server",
    actors: [
      { type: "maya", x: 450, y: 460, animation: "hack" },
    ],
    camera: [
      { x: 200, y: 10, time: 0 },
      { x: 180, y: 20, time: 4000 },
    ],
    durationMs: 4000,
    location: "FLOOR 2 · COMMS ROOM",
    caption: "reeves on the line: \"GHOST's scanners intercept plain text. reverse each word — they can't parse that.\"",
    audio: [
      { atMs: 200, action: "sfx", sound: "message-receive", volume: 0.35 },
      { atMs: 1000, action: "sfx", sound: "maya-typing", volume: 0.2 },
      { atMs: 2500, action: "sfx", sound: "terminal-beep", volume: 0.15 },
    ],
  },
  // Scene 3: Keyword scanner sweep — tension
  {
    background: "server",
    actors: [],
    camera: [
      { x: 100, y: 40, time: 0 },
      { x: 120, y: 50, time: 3500 },
    ],
    durationMs: 3500,
    location: "FLOOR 2 · COMMS ROOM",
    caption: "the keyword scanners check every 30 seconds. the cipher has to be ready before the next sweep.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "tension-drone", volume: 0.08, fadeMs: 2000 },
      { atMs: 800, action: "sfx", sound: "warning-beep", volume: 0.25 },
      { atMs: 2000, action: "sfx", sound: "alert-beep", volume: 0.3 },
    ],
  },
];

// ── CHAPTER 4.2 COMPLETE SCENES ──────────────────────────────────

export const CHAPTER_04_2_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: First encoded message sent
  {
    background: "server",
    actors: [
      { type: "maya", x: 450, y: 460, animation: "hack" },
    ],
    camera: [
      { x: 180, y: 10, time: 0 },
    ],
    durationMs: 3500,
    location: "FLOOR 2 · COMMS ROOM",
    caption: "first encoded message through the relay: \"evom ot roolf 4 — raelc\"",
    audio: [
      { atMs: 200, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      { atMs: 800, action: "sfx", sound: "terminal-beep", volume: 0.3 },
      { atMs: 1500, action: "sfx", sound: "message-receive", volume: 0.3 },
    ],
  },
  // Win 2: Reeves confirms — relay live
  {
    background: "server",
    actors: [
      { type: "maya", x: 450, y: 460, animation: "idle" },
    ],
    camera: [
      { x: 200, y: 10, time: 0 },
      { x: 220, y: 20, time: 3500 },
    ],
    durationMs: 3500,
    location: "FLOOR 2 · COMMS ROOM",
    caption: "reeves decoded it on his end. the relay is live. they have a secure channel.",
    audio: [
      { atMs: 200, action: "sfx", sound: "handshake-confirm", volume: 0.35 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.2 },
    ],
  },
  // Win 3: Secure channel established
  {
    background: "corridor",
    actors: [],
    camera: [
      { x: 100, y: 10, time: 0 },
      { x: 120, y: 15, time: 3000 },
    ],
    durationMs: 3000,
    location: "FLOOR 2 · SECURE RELAY",
    caption: "encrypted. invisible to GHOST's scanners. now they can coordinate.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "tension-drone", fadeMs: 1000 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.08, fadeMs: 1500 },
      { atMs: 1500, action: "sfx", sound: "terminal-beep", volume: 0.15 },
    ],
  },
];
