// ── Boss fight simulation ──
// Pure, deterministic state machine for the physical 3D duel: createBossFight()
// then stepBossFight(state, input, dt) once per frame. No DOM, no timers, no
// React. The renderer reads the returned state and drains `events` for sound,
// camera and VFX. The coding beat is driven from outside: when the fight enters
// "coding" the stepper freezes; the orchestrator opens the editor and calls
// armWeapon() on a correct submission to resume the fight.
//
// Reuses the adventure grid: parsing, A* pathing, walkability, line of sight,
// and the same circle-collision movement model Maya uses in the stealth sim.

import { parseMap, tileAtPos, isWalkable, findPath, tileCenter, hasLineOfSight, blocksSight } from "./grid";
import { MAYA_SPEED, MAYA_RADIUS } from "./sim";
import type {
  AdventureLevel, BossFightEvent, BossFightInput, BossFightState, BossPhase,
  Projectile, SfxCue, Vec2, WeaponConfig,
} from "./types";

const MAX_DT = 50;
/** Breathing room after a rearm before the boss resumes fire. */
export const ARM_GRACE_MS = 1800;
/** Pause after the final blow / the killing shot lands before the win resolves. */
export const WIN_HOLD_MS = 2600;
export const LOSS_HOLD_MS = 2200;

function think(state: BossFightState, text: string): void {
  state.thought = text;
  state.events.push({ type: "thought", text });
}

export function currentPhase(state: BossFightState): BossPhase | null {
  return state.def.phases[state.boss.phaseIndex] ?? null;
}

export function createBossFight(level: AdventureLevel, hearts: number): BossFightState {
  const def = level.boss;
  if (!def) throw new Error(`Level ${level.id} has no boss def`);
  const grid = parseMap(level.map);
  const anchor = grid.interactables.get(def.anchor);
  if (!anchor) throw new Error(`Boss anchor "${def.anchor}" not found in ${level.id}`);
  const spawn = tileCenter(grid.spawn);
  const state: BossFightState = {
    level,
    def,
    grid,
    time: 0,
    maya: {
      x: spawn.x,
      y: spawn.y,
      facing: { x: 0, y: -1 },
      moving: false,
      path: null,
      pendingInteract: null,
      hidden: false,
      crawling: false,
      anim: "idle",
    },
    bossPos: { x: anchor.x + 0.5, y: anchor.y + 0.5 },
    boss: {
      hp: def.hp,
      maxHp: def.hp,
      phaseIndex: 0,
      armed: false,
      weapon: null,
      nextAttackAt: ARM_GRACE_MS,
      telegraphUntil: 0,
      anim: "idle",
    },
    projectiles: [],
    nextProjectileId: 1,
    weaponReadyAt: 0,
    hearts,
    heartsLost: 0,
    status: "fighting",
    statusSince: 0,
    thought: level.opening ?? null,
    events: [],
  };
  if (level.opening) state.events.push({ type: "thought", text: level.opening });
  return state;
}

function cloneState(prev: BossFightState, dtClamped: number): BossFightState {
  return {
    ...prev,
    time: prev.time + dtClamped,
    maya: { ...prev.maya, facing: { ...prev.maya.facing }, path: prev.maya.path ? [...prev.maya.path] : null },
    boss: { ...prev.boss },
    bossPos: { ...prev.bossPos },
    projectiles: prev.projectiles.map((p) => ({ ...p })),
    events: [],
  };
}

function circleFits(state: BossFightState, x: number, y: number): boolean {
  const r = MAYA_RADIUS;
  const corners: [number, number][] = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
  for (const [cx, cy] of corners) {
    if (!isWalkable(state.grid, Math.floor(cx), Math.floor(cy))) return false;
  }
  return true;
}

function moveMaya(state: BossFightState, vx: number, vy: number, dt: number): void {
  const m = state.maya;
  const nx = m.x + vx * dt;
  if (circleFits(state, nx, m.y)) m.x = nx;
  const ny = m.y + vy * dt;
  if (circleFits(state, m.x, ny)) m.y = ny;
}

function requestMoveTo(state: BossFightState, target: Vec2): void {
  const tx = Math.floor(target.x);
  const ty = Math.floor(target.y);
  if (!isWalkable(state.grid, tx, ty)) return;
  const path = findPath(state.grid, state.maya, { x: tx, y: ty });
  if (!path) return;
  state.maya.path = path.length > 0 ? path.map(tileCenter) : null;
}

function stepMaya(state: BossFightState, input: BossFightInput, dt: number): void {
  const m = state.maya;
  if (input.moveTo) requestMoveTo(state, input.moveTo);

  const here = tileAtPos(state.grid, m);
  // Cover: a "hide" tile is where Maya ducks — safe from fire, and where she codes.
  m.hidden = here?.kind === "hide";

  const len = Math.hypot(input.move.x, input.move.y);
  let vx = 0;
  let vy = 0;
  if (len > 0.05) {
    // Direct control overrides any queued walk.
    m.path = null;
    const s = Math.min(1, len);
    vx = (input.move.x / len) * s * MAYA_SPEED;
    vy = (input.move.y / len) * s * MAYA_SPEED;
  } else if (m.path && m.path.length > 0) {
    const wp = m.path[0];
    const dx = wp.x - m.x;
    const dy = wp.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.06) {
      m.x = wp.x;
      m.y = wp.y;
      m.path.shift();
      if (m.path.length === 0) m.path = null;
    } else {
      const step = Math.min(d, MAYA_SPEED * dt);
      vx = (dx / d) * (step / dt);
      vy = (dy / d) * (step / dt);
    }
  }

  if (vx !== 0 || vy !== 0) {
    moveMaya(state, vx, vy, dt);
    const l = Math.hypot(vx, vy);
    m.facing = { x: vx / l, y: vy / l };
    m.moving = true;
    m.anim = "walk-right";
  } else {
    m.moving = false;
    m.anim = m.hidden ? "keypad" : "idle";
  }
}

/**
 * Clear line to the boss, treating the boss's own (opaque) anchor tile as
 * transparent — otherwise the ray reads the boss as blocking itself.
 */
function clearShotToBoss(state: BossFightState): boolean {
  const a = state.maya;
  const b = state.bossPos;
  const ax = Math.floor(a.x);
  const ay = Math.floor(a.y);
  const bx = Math.floor(b.x);
  const by = Math.floor(b.y);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.ceil(dist * 4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.floor(a.x + (b.x - a.x) * t);
    const y = Math.floor(a.y + (b.y - a.y) * t);
    if (x === ax && y === ay) continue;
    if (x === bx && y === by) continue;
    if (blocksSight(state.grid, x, y)) return false;
  }
  return true;
}

/** True if Maya has a clear shot on the boss: armed, in range, line of sight, out of cover. */
export function canFire(state: BossFightState): boolean {
  const w = state.boss.weapon;
  if (!state.boss.armed || !w || state.maya.hidden) return false;
  const d = Math.hypot(state.bossPos.x - state.maya.x, state.bossPos.y - state.maya.y);
  if (d > w.range) return false;
  return clearShotToBoss(state);
}

function stepWeapon(state: BossFightState): void {
  if (state.time < state.weaponReadyAt || !canFire(state)) return;
  const w = state.boss.weapon as WeaponConfig;
  const phase = currentPhase(state);
  const floor = phase ? phase.floor : 0;
  const before = state.boss.hp;
  state.boss.hp = Math.max(floor, state.boss.hp - w.damage);
  state.weaponReadyAt = state.time + w.fireRateMs;
  state.events.push({ type: "weapon-fire", to: { ...state.bossPos } });
  if (state.boss.hp < before) {
    state.boss.hp = Math.round(state.boss.hp);
    state.events.push({ type: "boss-hit", damage: before - state.boss.hp, hp: state.boss.hp });
    state.events.push({ type: "sfx", name: "laser-fire" as SfxCue, volume: 0.4 });
    state.boss.anim = "hit-react";
  }

  // Reached this phase's floor?
  if (state.boss.hp <= floor) {
    if (floor <= 0) {
      state.status = "won";
      state.statusSince = state.time;
      state.boss.anim = "defeat";
      state.projectiles = [];
      state.events.push({ type: "won" });
      state.events.push({ type: "sfx", name: "explosion-small" as SfxCue, volume: 0.5 });
      return;
    }
    // Boss hardens: weapon offline until the next phase is coded at cover.
    state.boss.armed = false;
    state.boss.weapon = null;
    state.boss.phaseIndex += 1;
    state.boss.anim = state.boss.hp <= state.boss.maxHp * 0.34 ? "low-hp" : "idle";
    const next = currentPhase(state);
    if (next?.onGate) think(state, next.onGate);
    state.events.push({ type: "sfx", name: "shield-break" as SfxCue, volume: 0.45 });
  }
}

function startAttack(state: BossFightState): void {
  // The shot locks onto where Maya stands now; she dodges by moving before it lands.
  const target: Vec2 = { x: state.maya.x, y: state.maya.y };
  const d = Math.hypot(target.x - state.bossPos.x, target.y - state.bossPos.y);
  const travel = (d / state.def.projectileSpeed) * 1000;
  const proj: Projectile = {
    id: state.nextProjectileId++,
    x0: state.bossPos.x,
    y0: state.bossPos.y,
    tx: target.x,
    ty: target.y,
    firedAt: state.time,
    landAt: state.time + travel,
    landed: false,
  };
  state.projectiles.push(proj);
  state.boss.anim = "attack";
  state.events.push({ type: "boss-attack", target });
  state.events.push({ type: "sfx", name: "laser-fire" as SfxCue, volume: 0.45 });
}

function stepBoss(state: BossFightState): void {
  const boss = state.boss;
  // Only threaten Maya when it can actually see her out of cover.
  const canSeeMaya = !state.maya.hidden && hasLineOfSight(state.grid, state.bossPos, state.maya);

  if (boss.telegraphUntil > 0) {
    // Charging a shot.
    if (state.time >= boss.telegraphUntil) {
      boss.telegraphUntil = 0;
      startAttack(state);
      boss.nextAttackAt = state.time + rand(state, state.def.attackMinMs, state.def.attackMaxMs);
    }
    return;
  }

  if (state.time >= boss.nextAttackAt) {
    if (canSeeMaya) {
      boss.telegraphUntil = state.time + state.def.telegraphMs;
      boss.anim = "charge";
      state.events.push({ type: "boss-telegraph" });
      state.events.push({ type: "sfx", name: "weapon-charge" as SfxCue, volume: 0.3 });
    } else {
      // Can't see her — hold fire, check again shortly.
      boss.nextAttackAt = state.time + 400;
      if (boss.anim === "attack" || boss.anim === "charge") {
        boss.anim = boss.hp <= boss.maxHp * 0.34 ? "low-hp" : "idle";
      }
    }
  }
}

function stepProjectiles(state: BossFightState): void {
  const survivors: Projectile[] = [];
  for (const p of state.projectiles) {
    if (p.landed) {
      // Keep it one extra frame for the renderer's land flash, then drop.
      if (state.time - p.landAt < 120) survivors.push(p);
      continue;
    }
    if (state.time >= p.landAt) {
      p.landed = true;
      const d = Math.hypot(state.maya.x - p.tx, state.maya.y - p.ty);
      const hit = d <= state.def.blastRadius && !state.maya.hidden;
      state.events.push({ type: "projectile-land", x: p.tx, y: p.ty, hit });
      state.events.push({ type: "shake", intensity: hit ? 0.18 : 0.06 });
      if (hit) {
        state.hearts = Math.max(0, state.hearts - 1);
        state.heartsLost += 1;
        state.events.push({ type: "heart-lost", hearts: state.hearts });
        state.events.push({ type: "sfx", name: "boss-hit" as SfxCue, volume: 0.5 });
        if (state.hearts <= 0) {
          state.status = "lost";
          state.statusSince = state.time;
          state.events.push({ type: "lost" });
          state.events.push({ type: "sfx", name: "captured-impact" as SfxCue, volume: 0.6 });
        }
      } else {
        state.events.push({ type: "sfx", name: "explosion-small" as SfxCue, volume: 0.3 });
      }
      survivors.push(p);
    } else {
      survivors.push(p);
    }
  }
  state.projectiles = survivors;
}

/** Deterministic pseudo-random in [min, max) seeded by sim time + projectile count. */
function rand(state: BossFightState, min: number, max: number): number {
  const seed = Math.sin((state.time + state.nextProjectileId * 97.13) * 12.9898) * 43758.5453;
  const frac = seed - Math.floor(seed);
  return min + frac * (max - min);
}

export function stepBossFight(prev: BossFightState, input: BossFightInput, dtMs: number): BossFightState {
  const dtClamped = Math.min(MAX_DT, Math.max(0, dtMs));
  const state = cloneState(prev, dtClamped);
  const dt = dtClamped / 1000;

  if (state.status === "won" || state.status === "lost") return state;
  // Frozen while the player codes at cover; resume via armWeapon().
  if (state.status === "coding") return state;

  stepMaya(state, input, dt);

  // Reaching cover while the current phase is un-armed drops us into the editor.
  if (!state.boss.armed && state.maya.hidden) {
    state.status = "coding";
    state.statusSince = state.time;
    state.maya.path = null;
    state.maya.moving = false;
    state.maya.anim = "hack";
    state.projectiles = [];
    state.boss.telegraphUntil = 0;
    state.events.push({ type: "enter-cover", phaseIndex: state.boss.phaseIndex });
    return state;
  }

  stepWeapon(state);
  if (state.status !== "fighting") return state;
  stepBoss(state);
  stepProjectiles(state);
  return state;
}

/** Called by the orchestrator when the player's code compiles and matches the phase output. */
export function armWeapon(prev: BossFightState, weapon: WeaponConfig): BossFightState {
  const state = cloneState(prev, 0);
  const phase = currentPhase(state);
  state.boss.weapon = { ...weapon };
  state.boss.armed = true;
  state.status = "fighting";
  state.statusSince = state.time;
  state.weaponReadyAt = state.time;
  state.boss.nextAttackAt = state.time + ARM_GRACE_MS;
  state.boss.telegraphUntil = 0;
  state.boss.anim = state.boss.hp <= state.boss.maxHp * 0.34 ? "low-hp" : "idle";
  state.maya.anim = "idle";
  state.events.push({ type: "phase-armed", phaseIndex: state.boss.phaseIndex });
  state.events.push({ type: "sfx", name: "handshake-confirm" as SfxCue, volume: 0.5 });
  if (phase?.armed) think(state, phase.armed);
  return state;
}

export interface BossFightXP {
  phaseXP: number;
  defeatBonus: number;
  flawlessBonus: number;
  total: number;
}

export function bossFightXP(state: BossFightState): BossFightXP {
  const def = state.def;
  const phasesArmed = state.boss.phaseIndex + (state.status === "won" ? 1 : 0);
  const phaseXP = Math.min(def.phases.length, phasesArmed) * def.perPhaseXP;
  const defeatBonus = state.status === "won" ? def.defeatXP : 0;
  const flawlessBonus = state.status === "won" && state.heartsLost === 0 ? def.flawlessBonus : 0;
  return { phaseXP, defeatBonus, flawlessBonus, total: phaseXP + defeatBonus + flawlessBonus };
}

/** 0..1 boss HP fraction, for the HUD bar. */
export function bossHpFraction(state: BossFightState): number {
  return state.boss.maxHp > 0 ? state.boss.hp / state.boss.maxHp : 0;
}

/** 0..1 telegraph charge, for the warning pulse (0 when idle). */
export function telegraphProgress(state: BossFightState): number {
  const boss = state.boss;
  if (boss.telegraphUntil <= 0) return 0;
  const span = state.def.telegraphMs;
  return Math.min(1, 1 - (boss.telegraphUntil - state.time) / span);
}

/** All events emitted by the last step. */
export function drainBossEvents(state: BossFightState): BossFightEvent[] {
  const out = state.events;
  state.events = [];
  return out;
}
