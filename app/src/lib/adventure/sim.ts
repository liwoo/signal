// ── Adventure simulation ──
// Pure, deterministic state machine: createSim(level) then stepSim(state,
// input, dt) once per frame. No DOM, no timers, no React. The renderer reads
// the returned state and drains `events` for sound and camera effects.

import { parseMap, tileAt, tileAtPos, isWalkable, findPath, adjacentWalkable, isAdjacent, canSee, facingAngle, tileCenter } from "./grid";
import { WALKABLE } from "./types";
import type {
  AdventureLevel, GuardDef, GuardState, Objective, SfxCue, SimEvent, SimInput, SimState, Tile, Vec2,
} from "./types";

export const MAYA_SPEED = 3.1; // tiles / s
export const CRAWL_SPEED = 1.6;
export const MAYA_RADIUS = 0.26;
export const GUARD_TOUCH_RADIUS = 0.62;
export const ALERT_RISE_MS = 1150;
export const ALERT_FALL_MS = 1700;
export const CAPTURE_HOLD_MS = 2100;
export const RELINQUISH_MS = 2600;
export const EXIT_MS = 2800;
export const DEFAULT_INTERACT_MS = 900;
export const DEFAULT_GUARD_SPEED = 1.5;
export const DEFAULT_GUARD_WAIT_MS = 700;
export const DEFAULT_GUARD_RANGE = 5;
export const DEFAULT_GUARD_HALF_ANGLE = 0.62;
/** Detection never rises in the first moments of a level (the title card is still up). */
export const GRACE_MS = 3200;
/** How long an objective's `done` line stays before the next objective's thought. */
export const DONE_HOLD_MS = 2600;
const MAX_DT = 50;

function guardFromDef(def: GuardDef): GuardState {
  const first = def.route[0];
  const second = def.route[1] ?? first;
  const angle = first.face
    ? facingAngle(first.face)
    : Math.atan2(second.y - first.y, second.x - first.x);
  return {
    id: def.id,
    x: first.x + 0.5,
    y: first.y + 0.5,
    angle,
    // Already standing on stop 0: head for stop 1 without an initial pause.
    stopIndex: def.route.length > 1 ? 1 : 0,
    dir: 1,
    waitUntil: 0,
    moving: false,
    seesMaya: false,
    active: !def.triggerOn,
    gone: false,
  };
}

function guardDef(state: SimState, id: string): GuardDef {
  return state.level.guards.find((g) => g.id === id)!;
}

/** Guards triggered or dismissed by completed objectives. */
function syncGuardFlags(state: SimState): void {
  for (const guard of state.guards) {
    const def = guardDef(state, guard.id);
    guard.active = !def.triggerOn || state.completed.has(def.triggerOn);
    guard.gone = !!def.leaveOn && state.completed.has(def.leaveOn);
  }
}

export function currentObjective(state: SimState): Objective | null {
  return state.level.objectives[state.objectiveIndex] ?? null;
}

export function objectiveTarget(state: SimState, objective: Objective | null): Tile | null {
  if (!objective) return null;
  return state.grid.interactables.get(objective.target) ?? null;
}

function think(state: SimState, text: string): void {
  if (state.pendingThought && state.pendingThought.text !== text) state.pendingThought = null;
  state.thought = text;
  state.events.push({ type: "thought", text });
}

export function createSim(level: AdventureLevel): SimState {
  const grid = parseMap(level.map);
  const spawn = tileCenter(grid.spawn);
  const state: SimState = {
    level,
    grid,
    time: 0,
    maya: {
      x: spawn.x,
      y: spawn.y,
      facing: { x: 0, y: 1 },
      moving: false,
      path: null,
      pendingInteract: null,
      hidden: false,
      crawling: false,
      anim: "idle",
    },
    guards: level.guards.map(guardFromDef),
    alert: 0,
    objectiveIndex: 0,
    objectiveStartedAt: 0,
    openDoors: new Set(),
    taken: new Set(),
    interaction: null,
    holdMs: 0,
    status: "playing",
    statusSince: 0,
    checkpoint: { objectiveIndex: 0, x: spawn.x, y: spawn.y },
    firedCues: new Set(),
    completed: new Set(),
    alarm: !!level.alarm,
    captures: 0,
    thought: null,
    pendingThought: null,
    events: [],
  };
  state.events.push({ type: "objective", index: 0 });
  const first = level.objectives[0];
  if (level.opening) think(state, level.opening);
  else if (first?.thought) think(state, first.thought);
  return state;
}

function openDoor(state: SimState, id: string): void {
  if (state.openDoors.has(id)) return;
  state.openDoors.add(id);
  state.events.push({ type: "door", id, open: true });
  state.events.push({ type: "sfx", name: "door-slide", volume: 0.35 });
}

function fireCues(state: SimState): void {
  const objective = currentObjective(state);
  if (!objective?.cues) return;
  const elapsed = state.time - state.objectiveStartedAt;
  const sinceInteract = state.interaction ? state.time - state.interaction.startedAt : -1;
  objective.cues.forEach((cue, i) => {
    const key = `${objective.id}:${i}`;
    const clock = cue.after === "interact" ? sinceInteract : elapsed;
    if (clock < 0 || cue.atMs > clock || state.firedCues.has(key)) return;
    state.firedCues.add(key);
    if (cue.sfx) state.events.push({ type: "sfx", name: cue.sfx });
    if (cue.thought) think(state, cue.thought);
    if (cue.voice) {
      state.thought = `${cue.voice.from}: ${cue.voice.text}`;
      state.events.push({ type: "voice", from: cue.voice.from, text: cue.voice.text });
    }
    if (cue.shake) state.events.push({ type: "shake", intensity: cue.shake });
    if (cue.flash) state.events.push({ type: "flash", color: cue.flash });
    if (cue.alarm !== undefined && cue.alarm !== state.alarm) {
      state.alarm = cue.alarm;
      state.events.push({ type: "alarm", on: cue.alarm });
    }
    for (const id of cue.unlock ?? []) openDoor(state, id);
  });
}

function completeObjective(state: SimState): void {
  const objective = currentObjective(state);
  if (!objective) return;
  state.completed.add(objective.id);
  state.interaction = null;
  state.holdMs = 0;
  const target = objectiveTarget(state, objective);
  if (target?.kind === "book" && target.id && !state.taken.has(target.id)) {
    state.taken.add(target.id);
    state.events.push({ type: "book", id: target.id });
  }
  for (const id of objective.unlocks ?? []) openDoor(state, id);
  if (objective.sfx) state.events.push({ type: "sfx", name: objective.sfx });
  if (objective.done) think(state, objective.done);
  syncGuardFlags(state);

  state.objectiveIndex += 1;
  state.objectiveStartedAt = state.time;
  const next = currentObjective(state);
  if (!next) {
    state.status = "ending";
    state.statusSince = state.time;
    state.maya.path = null;
    state.maya.pendingInteract = null;
    state.maya.moving = false;
    state.maya.anim = state.level.ending === "relinquish" ? (objective.pose ?? "hack") : "idle";
    state.alert = 0;
    state.events.push({ type: "ending" });
    return;
  }
  state.events.push({ type: "objective", index: state.objectiveIndex });
  if (next.checkpoint) {
    state.checkpoint = { objectiveIndex: state.objectiveIndex, x: state.maya.x, y: state.maya.y };
  }
  if (next.thought) {
    // Let the closing line land before the next objective speaks.
    if (objective.done) state.pendingThought = { text: next.thought, at: state.time + DONE_HOLD_MS };
    else think(state, next.thought);
  }
}

function resetToCheckpoint(state: SimState): void {
  const cp = state.checkpoint;
  state.maya.x = cp.x;
  state.maya.y = cp.y;
  state.maya.path = null;
  state.maya.pendingInteract = null;
  state.maya.moving = false;
  state.maya.anim = "idle";
  state.interaction = null;
  state.holdMs = 0;
  state.alert = 0;
  // Replay everything from the checkpoint objective onward.
  for (let i = cp.objectiveIndex; i < state.level.objectives.length; i++) {
    const objective = state.level.objectives[i];
    const id = objective.id;
    state.completed.delete(id);
    const target = state.grid.interactables.get(objective.target);
    if (target?.kind === "book" && target.id) state.taken.delete(target.id);
    for (const key of [...state.firedCues]) if (key.startsWith(`${id}:`)) state.firedCues.delete(key);
  }
  state.objectiveIndex = cp.objectiveIndex;
  state.objectiveStartedAt = state.time;
  state.pendingThought = null;
  state.guards = state.level.guards.map(guardFromDef);
  syncGuardFlags(state);
  state.status = "playing";
  state.statusSince = state.time;
  state.events.push({ type: "reset" });
  state.events.push({ type: "objective", index: state.objectiveIndex });
  const objective = currentObjective(state);
  if (objective?.thought) think(state, objective.thought);
}

function capture(state: SimState): void {
  state.status = "captured";
  state.statusSince = state.time;
  state.captures += 1;
  state.alert = 1;
  state.interaction = null;
  state.maya.path = null;
  state.maya.pendingInteract = null;
  state.maya.moving = false;
  state.maya.anim = "captured";
  state.events.push({ type: "captured" });
  state.events.push({ type: "sfx", name: "captured-impact", volume: 0.6 });
}

function startInteraction(state: SimState, objective: Objective): void {
  const target = objectiveTarget(state, objective)!;
  state.maya.path = null;
  state.maya.pendingInteract = null;
  state.maya.moving = false;
  state.maya.facing = {
    x: Math.sign(target.x + 0.5 - state.maya.x),
    y: Math.sign(target.y + 0.5 - state.maya.y),
  };
  state.interaction = {
    id: objective.target,
    startedAt: state.time,
    durationMs: objective.durationMs ?? DEFAULT_INTERACT_MS,
  };
  state.maya.anim = objective.pose ?? (target.kind === "terminal" || target.kind === "panel" ? "hack" : "keypad");
  if (target.kind === "book") state.events.push({ type: "sfx", name: "keypress-1" as SfxCue, volume: 0.2 });
  if (target.kind === "terminal" || target.kind === "panel") {
    state.events.push({ type: "sfx", name: "maya-typing", volume: 0.3 });
  } else if (target.kind === "keypad" || target.kind === "door") {
    state.events.push({ type: "sfx", name: "keypad-beep", volume: 0.3 });
  }
}

/** A hint when the player pokes something that isn't the current objective. */
function offObjectiveHint(state: SimState, tile: Tile): void {
  switch (tile.kind) {
    case "door": think(state, state.openDoors.has(tile.id!) ? "it's open." : "locked. not this way."); break;
    case "terminal": think(state, "not yet. one thing at a time."); break;
    case "keypad": think(state, "a keypad. ten codes, in order. later."); break;
    case "npc": think(state, "they're waiting. keep moving."); break;
    case "hatch": think(state, "a vent hatch. not yet."); break;
    case "book": think(state, "paper. folded small. not now — the patrol first."); break;
    default: think(state, "nothing here."); break;
  }
}

/** Try to act on an interactable: start it if it's the objective and we're adjacent, else walk there. */
function requestInteract(state: SimState, id: string): void {
  const tile = state.grid.interactables.get(id);
  if (!tile) return;
  const objective = currentObjective(state);
  const onTile = Math.floor(state.maya.x) === tile.x && Math.floor(state.maya.y) === tile.y;
  if (isAdjacent(state.maya, tile) || onTile) {
    if (objective && objective.target === id) {
      if (objective.kind === "interact") startInteraction(state, objective);
      // "reach" objectives complete on their own once adjacent.
    } else {
      offObjectiveHint(state, tile);
    }
    return;
  }
  // Walk to the object (Sims-style queued action).
  const candidates = WALKABLE.has(tile.kind) ? [tile] : adjacentWalkable(state.grid, tile, state.openDoors);
  for (const c of candidates) {
    const path = findPath(state.grid, state.maya, c, state.openDoors);
    if (path) {
      state.maya.path = path.length > 0 ? path.map(tileCenter) : [tileCenter(c)];
      state.maya.pendingInteract = id;
      state.interaction = null;
      return;
    }
  }
  think(state, "can't get there from here.");
}

function requestMoveTo(state: SimState, target: Vec2): void {
  const tx = Math.floor(target.x);
  const ty = Math.floor(target.y);
  if (!isWalkable(state.grid, tx, ty, state.openDoors)) return;
  const path = findPath(state.grid, state.maya, { x: tx, y: ty }, state.openDoors);
  if (!path) return;
  state.maya.path = path.length > 0 ? path.map(tileCenter) : null;
  state.maya.pendingInteract = null;
  state.interaction = null;
}

function circleFits(state: SimState, x: number, y: number): boolean {
  const r = MAYA_RADIUS;
  const corners: [number, number][] = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
  for (const [cx, cy] of corners) {
    if (!isWalkable(state.grid, Math.floor(cx), Math.floor(cy), state.openDoors)) return false;
  }
  return true;
}

function moveMaya(state: SimState, vx: number, vy: number, dt: number): void {
  const m = state.maya;
  const nx = m.x + vx * dt;
  if (circleFits(state, nx, m.y)) m.x = nx;
  const ny = m.y + vy * dt;
  if (circleFits(state, m.x, ny)) m.y = ny;
}

function stepMaya(state: SimState, input: SimInput, dt: number): void {
  const m = state.maya;
  const objective = currentObjective(state);

  if (input.interactWith) requestInteract(state, input.interactWith);
  else if (input.moveTo) requestMoveTo(state, input.moveTo);

  const here = tileAtPos(state.grid, m);
  m.crawling = here?.kind === "vent";
  m.hidden = here?.kind === "hide" || here?.kind === "vent";
  const speed = m.crawling ? CRAWL_SPEED : MAYA_SPEED;

  const len = Math.hypot(input.move.x, input.move.y);
  let vx = 0;
  let vy = 0;
  if (len > 0.05) {
    // Direct control overrides any queued walk.
    m.path = null;
    m.pendingInteract = null;
    state.interaction = null;
    const s = Math.min(1, len);
    vx = (input.move.x / len) * s * speed;
    vy = (input.move.y / len) * s * speed;
  } else if (m.path && m.path.length > 0 && !state.interaction) {
    const wp = m.path[0];
    const dx = wp.x - m.x;
    const dy = wp.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.06) {
      m.x = wp.x;
      m.y = wp.y;
      m.path.shift();
      if (m.path.length === 0) {
        m.path = null;
        if (m.pendingInteract) {
          const id = m.pendingInteract;
          m.pendingInteract = null;
          requestInteract(state, id);
        }
      }
    } else {
      const step = Math.min(d, speed * dt);
      vx = (dx / d) * (step / dt);
      vy = (dy / d) * (step / dt);
    }
  }

  if (vx !== 0 || vy !== 0) {
    moveMaya(state, vx, vy, dt);
    const l = Math.hypot(vx, vy);
    m.facing = { x: vx / l, y: vy / l };
    m.moving = true;
  } else {
    m.moving = false;
  }

  if (input.interact && !state.interaction && objective) {
    const target = objectiveTarget(state, objective);
    if (target && objective.kind === "interact" && (isAdjacent(m, target))) {
      startInteraction(state, objective);
    } else {
      // Poke whatever is nearest.
      let best: Tile | null = null;
      let bestD = Infinity;
      for (const tile of state.grid.interactables.values()) {
        if (!isAdjacent(m, tile)) continue;
        const d = Math.hypot(tile.x + 0.5 - m.x, tile.y + 0.5 - m.y);
        if (d < bestD) { bestD = d; best = tile; }
      }
      if (best && best.id !== objective.target) offObjectiveHint(state, best);
    }
  }

  if (state.interaction) {
    if (state.time - state.interaction.startedAt >= state.interaction.durationMs) {
      completeObjective(state);
      if (state.status === "playing") state.maya.anim = "idle";
    }
  } else if (objective?.kind === "reach" || objective?.kind === "hold") {
    const target = objectiveTarget(state, objective);
    if (target) {
      const onTile = Math.floor(m.x) === target.x && Math.floor(m.y) === target.y;
      const walkable = WALKABLE.has(target.kind);
      const there = (walkable && onTile) || (!walkable && isAdjacent(m, target));
      if (objective.kind === "reach") {
        if (there) completeObjective(state);
      } else if (there) {
        state.holdMs += dt * 1000;
        if (state.holdMs >= (objective.durationMs ?? DEFAULT_INTERACT_MS)) completeObjective(state);
      }
    }
  }

  if (state.status === "playing" && !state.interaction) {
    m.anim = m.moving ? (m.crawling ? "crawl-right" : "walk-right") : "idle";
  }
}

function stepGuard(state: SimState, guard: GuardState, dt: number): void {
  const def = guardDef(state, guard.id);
  if (!guard.active || guard.gone || def.route.length < 2 || state.time - state.statusSince < (def.delayMs ?? 0)) {
    guard.moving = false;
    return;
  }
  if (state.time < guard.waitUntil) {
    guard.moving = false;
    return;
  }
  const stop = def.route[guard.stopIndex];
  const tx = stop.x + 0.5;
  const ty = stop.y + 0.5;
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  const speed = def.speed ?? DEFAULT_GUARD_SPEED;
  if (d <= speed * dt + 1e-4) {
    guard.x = tx;
    guard.y = ty;
    guard.moving = false;
    if (stop.face) guard.angle = facingAngle(stop.face);
    guard.waitUntil = state.time + (stop.waitMs ?? def.waitMs ?? DEFAULT_GUARD_WAIT_MS);
    // Advance along the route.
    const last = def.route.length - 1;
    if ((def.loop ?? "pingpong") === "cycle") {
      guard.stopIndex = (guard.stopIndex + 1) % def.route.length;
    } else {
      if (guard.stopIndex === last) guard.dir = -1;
      else if (guard.stopIndex === 0) guard.dir = 1;
      guard.stopIndex += guard.dir;
    }
    return;
  }
  guard.x += (dx / d) * speed * dt;
  guard.y += (dy / d) * speed * dt;
  guard.angle = Math.atan2(dy, dx);
  guard.moving = true;
}

export function stepSim(prev: SimState, input: SimInput, dtMs: number): SimState {
  const dtClamped = Math.min(MAX_DT, Math.max(0, dtMs));
  const state: SimState = {
    ...prev,
    time: prev.time + dtClamped,
    maya: { ...prev.maya, facing: { ...prev.maya.facing }, path: prev.maya.path ? [...prev.maya.path] : null },
    guards: prev.guards.map((g) => ({ ...g })),
    openDoors: new Set(prev.openDoors),
    taken: new Set(prev.taken),
    firedCues: new Set(prev.firedCues),
    completed: new Set(prev.completed),
    checkpoint: { ...prev.checkpoint },
    pendingThought: prev.pendingThought ? { ...prev.pendingThought } : null,
    interaction: prev.interaction ? { ...prev.interaction } : null,
    events: [],
  };
  const dt = dtClamped / 1000;

  if (state.status === "ended") return state;
  if (state.status === "ending") {
    const hold = state.level.ending === "relinquish" ? RELINQUISH_MS : EXIT_MS;
    if (state.time - state.statusSince >= hold) {
      state.status = "ended";
      state.events.push({ type: "ended" });
    }
    return state;
  }
  if (state.status === "captured") {
    if (state.time - state.statusSince >= CAPTURE_HOLD_MS) resetToCheckpoint(state);
    return state;
  }

  if (state.pendingThought && state.time >= state.pendingThought.at) {
    think(state, state.pendingThought.text);
    state.pendingThought = null;
  }
  fireCues(state);
  stepMaya(state, input, dt);
  if (state.interaction) fireCues(state);
  if (state.status !== "playing") return state;

  let seen = false;
  for (const guard of state.guards) {
    stepGuard(state, guard, dt);
    const def = guardDef(state, guard.id);
    guard.seesMaya =
      guard.active && !guard.gone && !state.maya.hidden &&
      canSee(
        state.grid, guard, guard.angle,
        def.halfAngle ?? DEFAULT_GUARD_HALF_ANGLE, def.range ?? DEFAULT_GUARD_RANGE,
        state.maya, state.openDoors,
      );
    if (guard.seesMaya) seen = true;
    if (guard.active && !guard.gone && !state.maya.hidden) {
      if (Math.hypot(guard.x - state.maya.x, guard.y - state.maya.y) < GUARD_TOUCH_RADIUS) {
        capture(state);
        return state;
      }
    }
  }

  const before = state.alert;
  if (seen && state.time - state.statusSince < GRACE_MS) {
    // Grace: the guard is looking, but the level has only just opened.
    seen = false;
  }
  if (seen) {
    state.alert = Math.min(1, state.alert + dtClamped / ALERT_RISE_MS);
    if (before === 0) state.events.push({ type: "spotted" });
    if (state.alert >= 1) capture(state);
  } else {
    state.alert = Math.max(0, state.alert - dtClamped / ALERT_FALL_MS);
  }
  return state;
}

/** Prompt for the HUD: the verb when Maya stands next to the objective target. */
export function interactPrompt(state: SimState): string | null {
  if (state.status !== "playing" || state.interaction) return null;
  const objective = currentObjective(state);
  if (!objective || objective.kind !== "interact") return null;
  const target = objectiveTarget(state, objective);
  if (!target || !isAdjacent(state.maya, target)) return null;
  return objective.verb ?? "USE";
}

/** 0..1 progress of the running interaction. */
export function interactionProgress(state: SimState): number {
  if (!state.interaction) return 0;
  return Math.min(1, (state.time - state.interaction.startedAt) / state.interaction.durationMs);
}

/** All events emitted by the last step. */
export function drainEvents(state: SimState): SimEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}

export { tileAt };
