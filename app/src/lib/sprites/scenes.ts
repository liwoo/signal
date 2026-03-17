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

// ── CHAPTER 2 INTRO SCENES ───────────────────────────────────────

export const CHAPTER_02_INTRO_SCENES: SceneDefinition[] = [
  // Scene 1: Maya walks across the cell toward the heavy door on the right wall
  {
    background: "cell",
    actors: [
      {
        type: "maya",
        x: 340,
        y: 370,
        animation: "walk-right",
        path: [{ x: 700, y: 360, duration: 2500 }],
      },
    ],
    camera: [
      { x: 40, y: 80, time: 0 },
      { x: 300, y: 70, time: 3000 },
    ],
    durationMs: 3500,
    location: "CELL B-09 · DOOR",
    caption: "the door has a keypad. 10 codes cycle through it.",
    audio: [
      { atMs: 0, action: "loop-start", sound: "cell-ambient", volume: 0.1, fadeMs: 1500 },
      { atMs: 0, action: "loop-start", sound: "facility-hum", volume: 0.05, fadeMs: 1000 },
      // Maya's footsteps approaching the door
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 480, volume: 0.2 },
    ],
  },
  // Scene 2: Maya at the door — punching codes into the keypad, rejected twice
  {
    background: "cell",
    actors: [
      { type: "maya", x: 700, y: 360, animation: "keypad" },
    ],
    camera: [
      { x: 300, y: 50, time: 0 },
      { x: 340, y: 60, time: 4500 },
    ],
    durationMs: 5000,
    location: "CELL B-09 · DOOR",
    caption: "tried 3. tried 7. wrong pattern. the keypad buzzes red.",
    audio: [
      // First attempt — keypad beeps as she punches digits, then rejection
      { atMs: 400, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 650, action: "sfx", sound: "keypad-beep", volume: 0.25 },
      { atMs: 900, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 1300, action: "sfx", sound: "warning-beep", volume: 0.4 },
      // Pause — she stares at the keypad
      // Second attempt — different code, same result
      { atMs: 2400, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 2650, action: "sfx", sound: "keypad-beep", volume: 0.25 },
      { atMs: 2900, action: "sfx", sound: "keypad-beep", volume: 0.28 },
      { atMs: 3150, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 3500, action: "sfx", sound: "warning-beep", volume: 0.45 },
      // Third attempt — rushing, still wrong
      { atMs: 4000, action: "sfx", sound: "keypad-beep", volume: 0.2 },
      { atMs: 4150, action: "sfx", sound: "keypad-beep", volume: 0.2 },
      { atMs: 4400, action: "sfx", sound: "warning-beep", volume: 0.35 },
    ],
  },
  // Scene 3: Maya walks back from the door — she needs another approach
  {
    background: "cell",
    actors: [
      {
        type: "maya",
        x: 700,
        y: 360,
        animation: "walk-left",
        path: [{ x: 380, y: 370, duration: 2000 }],
      },
    ],
    camera: [
      { x: 320, y: 60, time: 0 },
      { x: 60, y: 80, time: 2500 },
    ],
    durationMs: 3500,
    location: "CELL B-09 · TERMINAL",
    caption: "guessing won't work. the codes follow a pattern.",
    audio: [
      // Maya stepping away from the door
      { atMs: 100, action: "footsteps", count: 5, intervalMs: 420, volume: 0.2 },
      // Terminal beep as she reaches it
      { atMs: 2200, action: "sfx", sound: "terminal-beep", volume: 0.25 },
    ],
  },
];

// ── CHAPTER 2 COMPLETE SCENES ────────────────────────────────────

export const CHAPTER_02_COMPLETE_SCENES: SceneDefinition[] = [
  // Win 1: Maya at the door — enters the correct code sequence, keypad goes green
  {
    background: "cell",
    actors: [
      { type: "maya", x: 700, y: 360, animation: "keypad" },
    ],
    camera: [
      { x: 280, y: 50, time: 0 },
      { x: 320, y: 60, time: 3500 },
    ],
    durationMs: 4000,
    location: "CELL B-09 · DOOR",
    caption: "all 10 codes classified. she enters the sequence.",
    audio: [
      // Confident keypad entry — faster, deliberate
      { atMs: 300, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 550, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 800, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 1050, action: "sfx", sound: "keypad-beep", volume: 0.3 },
      { atMs: 1300, action: "sfx", sound: "keypad-beep", volume: 0.35 },
      // Confirmation — green light, mechanism engages
      { atMs: 1800, action: "sfx", sound: "handshake-confirm", volume: 0.5 },
      // Heavy door mechanism unlocking
      { atMs: 2600, action: "sfx", sound: "machinery", volume: 0.3 },
      { atMs: 3200, action: "sfx", sound: "door-slide", volume: 0.45 },
    ],
  },
  // Win 2: Knocks from B-10 — the twist
  {
    background: "cell",
    actors: [
      { type: "maya", x: 500, y: 360, animation: "idle" },
    ],
    camera: [
      { x: 120, y: 80, time: 0 },
      { x: 140, y: 70, time: 3000 },
    ],
    durationMs: 4000,
    location: "CELL B-09 · CORRIDOR",
    caption: "\"Maya? Maya Chen?\"",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "cell-ambient", fadeMs: 1000 },
      // Two slow knocks
      { atMs: 400, action: "sfx", sound: "knock-1", volume: 0.5 },
      { atMs: 1000, action: "sfx", sound: "knock-2", volume: 0.45 },
      // Pause — then three fast knocks (distress)
      { atMs: 1800, action: "sfx", sound: "knock-1", volume: 0.55 },
      { atMs: 2100, action: "sfx", sound: "knock-2", volume: 0.5 },
      { atMs: 2400, action: "sfx", sound: "knock-heavy", volume: 0.6 },
      // Tension drone
      { atMs: 2000, action: "loop-start", sound: "dark-drone-1", volume: 0.1, fadeMs: 2000 },
      { atMs: 3200, action: "sfx", sound: "dread-sting", volume: 0.3 },
    ],
  },
  // Win 3: Maya resolves — she has to get to B-10
  {
    background: "corridor",
    actors: [
      {
        type: "maya",
        x: 120,
        y: 310,
        animation: "walk-right",
        path: [{ x: 500, y: 310, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 250, y: 10, time: 2500 },
    ],
    durationMs: 3000,
    location: "SUBLEVEL 3 · CORRIDOR B",
    caption: "someone in B-10 knows her name.",
    audio: [
      { atMs: 0, action: "loop-stop", sound: "dark-drone-1", fadeMs: 1500 },
      { atMs: 0, action: "loop-start", sound: "corridor-ambient", volume: 0.1, fadeMs: 800 },
      { atMs: 100, action: "footsteps", count: 6, intervalMs: 420, volume: 0.3 },
    ],
  },
];

// ── CHAPTER 3 INTRO SCENES ──────────────────────────────────────

export const CHAPTER_03_INTRO_SCENES: SceneDefinition[] = [
  // Scene 0: Bridge — Maya stands in the corridor, processing what just happened
  {
    background: "corridor",
    actors: [
      { type: "maya", x: 420, y: 310, animation: "idle" },
    ],
    camera: [
      { x: 120, y: 10, time: 0 },
      { x: 140, y: 20, time: 3500 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 620, y: 310, duration: 2000 }],
      },
    ],
    camera: [
      { x: 140, y: 10, time: 0 },
      { x: 300, y: 10, time: 2500 },
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
        y: 330,
        animation: "crawl-right",
        path: [{ x: 450, y: 330, duration: 3200 }],
      },
    ],
    camera: [
      { x: 0, y: 30, time: 0 },
      { x: 200, y: 30, time: 3200 },
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
      { type: "maya", x: 550, y: 310, animation: "keypad" },
    ],
    camera: [
      { x: 200, y: 20, time: 0 },
      { x: 230, y: 30, time: 3500 },
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
      { type: "maya", x: 550, y: 310, animation: "keypad" },
    ],
    camera: [
      { x: 200, y: 20, time: 0 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 550, y: 310, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 280, y: 10, time: 2500 },
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
      { type: "maya", x: 550, y: 310, animation: "idle" },
    ],
    camera: [
      { x: 250, y: 10, time: 0 },
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
      { x: 140, y: 90, time: 0 },
      { x: 120, y: 80, time: 5000 },
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
      { x: 120, y: 80, time: 0 },
      { x: 130, y: 75, time: 4000 },
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
      { x: 130, y: 75, time: 0 },
      { x: 100, y: 90, time: 800 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 750, y: 310, duration: 2800 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 420, y: 10, time: 2800 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 620, y: 310, duration: 1200 }],
      },
    ],
    camera: [
      { x: 200, y: 10, time: 0 },
      { x: 280, y: 20, time: 1500 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 240, y: 310, duration: 2000 }],
      },
    ],
    camera: [
      { x: 0, y: 60, time: 0 },
      { x: 40, y: 50, time: 3000 },
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
      { x: 80, y: 20, time: 0 },
      { x: 160, y: 40, time: 4500 },
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
      { x: 160, y: 40, time: 0 },
      { x: 180, y: 45, time: 3500 },
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
      { x: 100, y: 60, time: 0 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 700, y: 310, duration: 2500 }],
      },
    ],
    camera: [
      { x: 0, y: 10, time: 0 },
      { x: 350, y: 10, time: 2500 },
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
      { type: "maya", x: 680, y: 310, animation: "idle" },
    ],
    camera: [
      { x: 300, y: 10, time: 0 },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 600, y: 310, duration: 3000 }],
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
      { type: "maya", x: 420, y: 310, animation: "idle" },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 620, y: 310, duration: 2500 }],
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
      { type: "maya", x: 600, y: 310, animation: "hack" },
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 650, y: 310, duration: 2500 }],
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
        y: 310,
        animation: "walk-right",
        path: [{ x: 450, y: 310, duration: 2500 }],
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
      { type: "maya", x: 450, y: 310, animation: "hack" },
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
      { type: "maya", x: 450, y: 310, animation: "hack" },
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
      { type: "maya", x: 450, y: 310, animation: "idle" },
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
