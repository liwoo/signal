// ── Adventure types ──
// A playable level replaces a cinematic: the player steers Maya through the
// facility (dodging patrols, reaching panels and doors) and she only gives up
// control at her terminal, where the coding challenge begins.
//
// Grid coordinates: x = column, y = row (row grows downward). World space maps
// x → x and y → z, with tile size 1. Angles are atan2(dy, dx) in grid space.

import type { CharAnimation } from "@/lib/sprites/character-painter";

export type TileKind =
  | "void"
  | "floor"
  | "wall"
  | "bars"
  | "door"
  | "terminal"
  | "keypad"
  | "panel"
  | "bunk"
  | "hide"
  | "vent"
  | "hatch"
  | "server"
  | "crate"
  | "exit"
  | "light"
  | "npc"
  | "lockmaster"
  | "book";

/** Map legend. Spaces are void (nothing rendered, not walkable). */
export const TILE_LEGEND: Record<string, TileKind> = {
  " ": "void",
  ".": "floor",
  "#": "wall",
  "=": "bars",
  "d": "door",
  "D": "floor", // open doorway — just floor, the legend keeps maps readable
  "T": "terminal",
  "k": "keypad",
  "p": "panel",
  "b": "bunk",
  "h": "hide",
  "v": "vent",
  "o": "hatch",
  "s": "server",
  "c": "crate",
  "x": "exit",
  "*": "light",
  "m": "floor", // maya spawn
  "r": "npc",
  "L": "lockmaster",
  "B": "book", // a hidden chapter of the field manual
};

/** Kinds the player can walk on. */
export const WALKABLE: ReadonlySet<TileKind> = new Set<TileKind>(["floor", "hide", "vent", "hatch", "exit", "light"]);
/** Kinds that stop a guard's line of sight. Doors block only while closed. */
export const OPAQUE: ReadonlySet<TileKind> = new Set<TileKind>(["wall", "server", "lockmaster", "bunk"]);
/** Kinds with a world object the player can act on (always from an adjacent tile). */
export const INTERACTABLE: ReadonlySet<TileKind> = new Set<TileKind>([
  "terminal", "keypad", "panel", "crate", "door", "npc", "exit", "hide", "hatch", "lockmaster", "book",
]);

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
  /** Stable id for interactable tiles, e.g. "terminal-1", "door-2". */
  id?: string;
}

export interface Grid {
  width: number;
  height: number;
  tiles: Tile[]; // row-major, width * height
  spawn: { x: number; y: number };
  interactables: Map<string, Tile>;
}

export type Facing = "up" | "down" | "left" | "right";

export interface RouteStop {
  x: number;
  y: number;
  /** Turn to face this way on arrival (default: direction of travel). */
  face?: Facing;
  /** Pause here (ms). Default GuardDef.waitMs. */
  waitMs?: number;
}

export interface GuardDef {
  id: string;
  route: RouteStop[];
  /** "cycle" returns to the first stop; "pingpong" walks the route backwards. Default pingpong. */
  loop?: "cycle" | "pingpong";
  /** Tiles per second. Default 1.5. */
  speed?: number;
  /** Default pause at each stop (ms). Default 700. */
  waitMs?: number;
  /** Vision cone range in tiles. Default 5. */
  range?: number;
  /** Vision cone half angle in radians. Default 0.62 (~35°). */
  halfAngle?: number;
  /** Stand still until this objective id has been completed. */
  triggerOn?: string;
  /** Stand still for this long after the level (or a checkpoint reset) starts. */
  delayMs?: number;
  /** Leave the map once this objective id has been completed. */
  leaveOn?: string;
}

export type SfxCue =
  | "terminal-beep" | "message-receive" | "code-submit" | "handshake-confirm" | "warning-beep"
  | "alert-beep" | "dread-sting" | "door-slide" | "machinery" | "knock-1" | "knock-2" | "knock-heavy"
  | "keypad-beep" | "captured-impact" | "maya-typing" | "explosion-small" | "target-lock" | "boss-hit"
  | "keypress-1" | "message-receive";

/** A scripted beat fired at an offset from when an objective becomes active. */
export interface Cue {
  atMs: number;
  /**
   * What atMs counts from. "start" (default): the objective becoming active.
   * "interact": Maya beginning the objective's interaction (voice lines she
   * hears while listening, beeps while she types).
   */
  after?: "start" | "interact";
  sfx?: SfxCue;
  /** Maya's inner voice. Lowercase, no exclamation marks. */
  thought?: string;
  /** Another voice on the line (reeves, ghost, the stranger in B-10). */
  voice?: { from: string; text: string };
  /** Camera shake intensity (world units * 100). */
  shake?: number;
  /** Full-frame flash. */
  flash?: "signal" | "term" | "danger" | "warm";
  /** Turn the alarm (red strobes + siren) on or off. */
  alarm?: boolean;
  /** Open doors by id. */
  unlock?: string[];
}

export interface Objective {
  id: string;
  /** Plain-language WHY — what this does for Maya. Shown as the objective line. */
  stake: string;
  /**
   * "interact": act on the target from an adjacent tile. "reach": stand next
   * to / on the target. "hold": stay on / next to the target for durationMs.
   */
  kind: "interact" | "reach" | "hold";
  /** Interactable id (see Grid.interactables). */
  target: string;
  /** Prompt verb, e.g. "WAKE TERMINAL". Interact only. */
  verb?: string;
  /** How long the interaction (or hold) lasts (ms). Default 900. */
  durationMs?: number;
  /** Maya's thought when this objective starts. */
  thought?: string;
  /** Maya's thought when it completes. */
  done?: string;
  /** Doors opened on completion. */
  unlocks?: string[];
  /** Sound on completion. */
  sfx?: SfxCue;
  /** Scripted beats relative to objective start. */
  cues?: Cue[];
  /** Capture sends Maya back to the start of this objective (default: level start). */
  checkpoint?: boolean;
  /** Maya's pose while interacting. Default "hack" for terminals/panels, "keypad" otherwise. */
  pose?: CharAnimation;
}

export type LevelTheme = "cell" | "corridor" | "vent" | "server" | "comms" | "boss";

export interface LevelLight {
  x: number;
  y: number;
  color: "warm" | "cool" | "signal" | "term" | "danger" | "alert";
  intensity?: number;
  range?: number;
}

export interface AdventureLevel {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  theme: LevelTheme;
  map: string[];
  guards: GuardDef[];
  objectives: Objective[];
  /** Extra lights beyond the "*" tiles. */
  lights?: LevelLight[];
  /** Ambience loop names (useAudio AmbienceName). */
  ambience?: string[];
  /** Start with the alarm running. */
  alarm?: boolean;
  /**
   * "relinquish": the level ends at Maya's terminal and control passes to the
   * editor. "exit": a story beat that ends with a title card.
   */
  ending: "relinquish" | "exit";
  /** Title card shown as the level ends. */
  endCard?: { text: string; sub?: string };
  /** Maya's opening thought. */
  opening?: string;
  /** Hand-off label when control passes to the player's editor. Default "CONTROL → TERMINAL". */
  handoff?: string;
}

// ── Simulation ──

export interface Vec2 {
  x: number;
  y: number;
}

export interface MayaState {
  x: number;
  y: number;
  /** Unit facing vector (grid space). */
  facing: Vec2;
  moving: boolean;
  /** Tile-centre waypoints Maya is auto-walking along. */
  path: Vec2[] | null;
  /** Interactable to act on when the path ends. */
  pendingInteract: string | null;
  hidden: boolean;
  crawling: boolean;
  anim: CharAnimation;
}

export interface GuardState {
  id: string;
  x: number;
  y: number;
  /** Facing angle in radians (grid space). */
  angle: number;
  stopIndex: number;
  /** +1 walking forward along the route, -1 backward. */
  dir: 1 | -1;
  /** Sim time until which the guard waits at the current stop. */
  waitUntil: number;
  moving: boolean;
  seesMaya: boolean;
  active: boolean;
  gone: boolean;
}

export interface Interaction {
  id: string;
  startedAt: number;
  durationMs: number;
}

export type SimStatus = "playing" | "captured" | "ending" | "ended";

export type SimEvent =
  | { type: "sfx"; name: SfxCue; volume?: number }
  | { type: "thought"; text: string }
  | { type: "voice"; from: string; text: string }
  | { type: "shake"; intensity: number }
  | { type: "flash"; color: NonNullable<Cue["flash"]> }
  | { type: "alarm"; on: boolean }
  | { type: "door"; id: string; open: boolean }
  /** Maya picked up a book chapter (interactable id). */
  | { type: "book"; id: string }
  | { type: "objective"; index: number }
  | { type: "spotted" }
  | { type: "captured" }
  | { type: "reset" }
  | { type: "ending" }
  | { type: "ended" };

export interface SimState {
  level: AdventureLevel;
  grid: Grid;
  time: number;
  maya: MayaState;
  guards: GuardState[];
  /** 0..1 detection meter (max across guards). */
  alert: number;
  objectiveIndex: number;
  objectiveStartedAt: number;
  openDoors: Set<string>;
  /** Pick-ups Maya has taken (book chapters) — their objects leave the world. */
  taken: Set<string>;
  interaction: Interaction | null;
  /** Time accumulated on a "hold" objective's target. */
  holdMs: number;
  status: SimStatus;
  statusSince: number;
  checkpoint: { objectiveIndex: number; x: number; y: number };
  firedCues: Set<string>;
  completed: Set<string>;
  alarm: boolean;
  captures: number;
  thought: string | null;
  /** A thought queued behind the current one (an objective's opening line waits for the previous `done`). */
  pendingThought: { text: string; at: number } | null;
  events: SimEvent[];
}

export interface SimInput {
  /** Direct movement vector in grid space (not necessarily normalised). */
  move: Vec2;
  /** Interact key edge (pressed this tick). */
  interact: boolean;
  /** Tap/click on the floor at a world position. */
  moveTo?: Vec2;
  /** Tap/click on an interactable. */
  interactWith?: string;
}
