// ── Scene FX — deterministic, per-frame "3.5D" effects ──
// Pure math shared by the Pixi cinematic renderer (PixiScene) and the Canvas 2D
// landing loop (PromoLoop). Everything is a function of scene-elapsed time so
// visual captures are reproducible: no Math.random anywhere in this module.
//
//   parallax      planes slide at different rates under camera pans
//   depth scale   actors grow as they walk toward the camera
//   lights        key flicker, practical pulse, alarm beacon strobe, light shafts
//   particles     dust motes in the light, sparks in the arena
//   camera        idle sway, impact shake, dutch tilt, flash + glitch cuts

import type { SceneType } from "./scene-painter";
import type { CharAnimation } from "./character-painter";
import { C, alpha } from "./palette";
import { SCENE_PROJECTION, farBottomFrac } from "./projection";
import type { ResolvedLight } from "./lighting";

// ── Parallax ────────────────────────────────────────────────────────

/** Per-plane camera multipliers. back < 1 lags the camera, fore > 1 leads it. */
export const PARALLAX = { back: 0.92, mid: 1, fore: 1.12 } as const;

/**
 * Screen-space offset for a plane with parallax factor `f` when the camera is
 * centred on `cam` and the scene centre is `origin` (both world px). A plane at
 * f=1 needs no offset; others are shifted so they appear to move at f× the
 * camera displacement.
 */
export function parallaxOffset(f: number, cam: number, origin: number): number {
  return (1 - f) * (cam - origin);
}

/** How far the back plane may be exposed by parallax; painters bleed by this. */
export const BACK_BLEED_PX = 48;

// ── Depth scale ─────────────────────────────────────────────────────

const DEPTH_SCALE_MIN = 0.86;
const DEPTH_SCALE_MAX = 1.16;

/**
 * Actor scale multiplier by floor position. `y` is the actor's foot line in
 * scene px; the floor band runs from the far plane (small) to the near edge
 * (large). Characters walking toward the camera visibly grow.
 */
export function depthScale(type: SceneType, y: number, h: number): number {
  const top = farBottomFrac(SCENE_PROJECTION[type]) * h;
  const t = clamp01((y - top) / Math.max(1, h - top));
  return DEPTH_SCALE_MIN + (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN) * t;
}

// ── Animation timing ────────────────────────────────────────────────

/** Frame hold per animation. Walks are brisk; idles breathe; the hack is frantic. */
export const CHAR_ANIM_INTERVAL_MS: Record<CharAnimation, number> = {
  "idle": 230,
  "walk-right": 110,
  "walk-left": 110,
  "walk-down": 120,
  "walk-up": 120,
  "hack": 95,
  "keypad": 150,
  "captured": 420,
  "crawl-right": 135,
};

// ── Deterministic noise ─────────────────────────────────────────────

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Integer hash → [0,1). Stable across runs and platforms. */
export function hash01(n: number): number {
  let x = (n | 0) ^ 0x5f356495;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

// ── Lights ──────────────────────────────────────────────────────────

export interface FlickerSpec {
  /** 0 = rock steady, 1 = dying fluorescent. */
  depth: number;
  seed: number;
}

/**
 * Multiplier (≈0.4–1) for a flickering fixture. Slow breathing plus sparse
 * hard dips gated by a hash of the 80ms time bucket — reads as a tube about
 * to fail rather than a sine wave.
 */
export function flickerLevel(tMs: number, spec: FlickerSpec): number {
  if (spec.depth <= 0) return 1;
  const t = tMs / 1000;
  const breathe = 1 - spec.depth * 0.12 * (0.5 + 0.5 * Math.sin(t * 1.7 + spec.seed));
  const bucket = Math.floor(tMs / 80) + spec.seed * 7919;
  const roll = hash01(bucket);
  let dip = 1;
  if (roll < 0.05 * spec.depth) dip = 0.45 + hash01(bucket + 1) * 0.3;
  else if (roll < 0.14 * spec.depth) dip = 0.8 + hash01(bucket + 2) * 0.12;
  return breathe * dip;
}

export interface StrobeSpec {
  color: string;
  periodMs: number;
  intensity: number;
}

/** Rotating-beacon envelope: a sharp peak every period, near-zero between. */
export function strobeLevel(tMs: number, spec: StrobeSpec): number {
  const phase = (tMs % spec.periodMs) / spec.periodMs;
  const c = Math.cos(phase * Math.PI * 2);
  return c <= 0 ? 0 : Math.pow(c, 7) * spec.intensity;
}

/** Gentle practical pulse (screens, indicators). */
export function pulseLevel(tMs: number, periodMs: number, depth: number, seed = 0): number {
  return 1 - depth * (0.5 + 0.5 * Math.sin((tMs / periodMs) * Math.PI * 2 + seed));
}

export interface RaySpec {
  x: number; // fraction of scene width — apex
  y: number; // fraction of scene height — apex
  spread: number; // fraction of scene width at the base
  length: number; // fraction of scene height
  color: string;
  intensity: number;
}

// ── Particles ───────────────────────────────────────────────────────

export interface DustSpec {
  count: number;
  x0: number; // region as fractions of scene size
  y0: number;
  x1: number;
  y1: number;
  color: string;
  alpha: number;
  /** px/s vertical drift; negative rises. */
  rise: number;
  /** px amplitude of lateral wander. */
  wander: number;
  size: number; // px at scene resolution
}

export interface Mote {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

/** Position + opacity of mote `i` at time t. Loops seamlessly inside the region. */
export function dustMote(spec: DustSpec, i: number, tMs: number, w: number, h: number): Mote {
  const t = tMs / 1000;
  const rx0 = spec.x0 * w;
  const ry0 = spec.y0 * h;
  const rw = (spec.x1 - spec.x0) * w;
  const rh = (spec.y1 - spec.y0) * h;
  const h1 = hash01(i * 4 + 1);
  const h2 = hash01(i * 4 + 2);
  const h3 = hash01(i * 4 + 3);
  const h4 = hash01(i * 4 + 4);
  const speed = 0.6 + h3 * 0.8;
  const yRaw = h2 * rh + spec.rise * speed * t;
  const y = ry0 + (((yRaw % rh) + rh) % rh);
  const x = rx0 + h1 * rw + Math.sin(t * (0.5 + h4) + h1 * 6.28) * spec.wander;
  const twinkle = 0.55 + 0.45 * Math.sin(t * (1.2 + h3 * 2) + h2 * 6.28);
  return { x, y, alpha: spec.alpha * twinkle, size: spec.size * (0.7 + h4 * 0.6) };
}

// ── Camera ──────────────────────────────────────────────────────────

/** Layered-sine idle drift so the "filmed" camera never sits perfectly still. */
export function swayOffset(tMs: number): { x: number; y: number; rot: number } {
  const t = tMs / 1000;
  return {
    x: Math.sin(t * 0.7) * 2.5 + Math.sin(t * 1.3) * 1.2,
    y: Math.sin(t * 0.9) * 1.5 + Math.sin(t * 0.5) * 0.8,
    rot: Math.sin(t * 0.4 + 0.5) * 0.003,
  };
}

export interface ShakeSpec {
  atMs: number;
  durationMs: number;
  /** Peak displacement in viewport px. */
  intensity: number;
}

/** Sum of every active impact shake: quadratic decay, two summed frequencies. */
export function shakeOffset(
  tMs: number,
  shakes: ShakeSpec[] | undefined,
): { x: number; y: number; rot: number } {
  let x = 0;
  let y = 0;
  let rot = 0;
  if (!shakes) return { x, y, rot };
  for (const s of shakes) {
    const local = tMs - s.atMs;
    if (local < 0 || local > s.durationMs) continue;
    const p = local / s.durationMs;
    const env = (1 - p) * (1 - p) * s.intensity;
    x += env * (Math.sin(local * 0.071) * 0.6 + Math.sin(local * 0.131 + 1.3) * 0.4);
    y += env * 0.6 * (Math.cos(local * 0.083) * 0.6 + Math.sin(local * 0.157 + 0.4) * 0.4);
    rot += env * 0.0009 * Math.sin(local * 0.05);
  }
  return { x, y, rot };
}

/** Dutch tilt eases in over the first 700ms of a shot. */
export function dutchAngle(tMs: number, radians: number | undefined): number {
  if (!radians) return 0;
  const p = clamp01(tMs / 700);
  return radians * (1 - Math.pow(1 - p, 3));
}

export interface FlashSpec {
  atMs: number;
  durationMs: number;
  color: string;
  /** Peak opacity 0..1. */
  intensity: number;
}

/** Opacity of the brightest active flash at time t (instant attack, cubic decay). */
export function flashLevel(tMs: number, flashes: FlashSpec[] | undefined): { level: number; color: string } {
  let level = 0;
  let color: string = C.highlight;
  if (!flashes) return { level, color };
  for (const f of flashes) {
    const local = tMs - f.atMs;
    if (local < 0 || local > f.durationMs) continue;
    const p = local / f.durationMs;
    const l = f.intensity * Math.pow(1 - p, 3);
    if (l > level) {
      level = l;
      color = f.color;
    }
  }
  return { level, color };
}

export interface GlitchSpec {
  atMs: number;
  durationMs: number;
}

export interface GlitchBand {
  y: number; // scene px
  h: number;
  dx: number; // horizontal tear offset in px
}

/** Envelope 0..1 of the active glitch, stepped at ~22fps so it stutters. */
export function glitchLevel(tMs: number, glitches: GlitchSpec[] | undefined): number {
  if (!glitches) return 0;
  let level = 0;
  for (const g of glitches) {
    const local = tMs - g.atMs;
    if (local < 0 || local > g.durationMs) continue;
    const p = local / g.durationMs;
    level = Math.max(level, 1 - p * p);
  }
  return level;
}

/** Deterministic horizontal tear bands for the current 45ms glitch frame. */
export function glitchBands(tMs: number, level: number, h: number, seed = 0): GlitchBand[] {
  if (level <= 0) return [];
  const frame = Math.floor(tMs / 45) + seed;
  const count = 2 + Math.floor(hash01(frame) * 4);
  const bands: GlitchBand[] = [];
  for (let i = 0; i < count; i++) {
    const a = hash01(frame * 31 + i * 7 + 1);
    const b = hash01(frame * 31 + i * 7 + 2);
    const c = hash01(frame * 31 + i * 7 + 3);
    bands.push({
      y: a * h,
      h: 3 + b * h * 0.09,
      dx: (c - 0.5) * 56 * level,
    });
  }
  return bands;
}

// ── Actor lighting ──────────────────────────────────────────────────

/**
 * Multiplicative tint (0xRRGGBB) for a sprite standing at (px, py) under the
 * scene key. Far from the key the sprite sinks toward the ambient; near it,
 * a little of the key colour bleeds in. `boost` (e.g. an alarm strobe) adds a
 * coloured wash on top.
 */
export function actorTint(
  px: number,
  py: number,
  key: ResolvedLight,
  boost?: { color: string; level: number },
): number {
  const dist = Math.hypot(px - key.x, py - key.y);
  const lit = 0.62 + 0.38 * clamp01(1 - dist / (key.radius * 1.35));
  const kc = rgbOf(key.color);
  let r = 255 * lit * (0.9 + 0.1 * (kc[0] / 255));
  let g = 255 * lit * (0.9 + 0.1 * (kc[1] / 255));
  let b = 255 * lit * (0.9 + 0.1 * (kc[2] / 255));
  if (boost && boost.level > 0) {
    const bc = rgbOf(boost.color);
    const l = clamp01(boost.level);
    r = r + (Math.max(r, bc[0]) - r) * l;
    g = g + (Math.max(g, bc[1]) - g) * l;
    b = b + (Math.max(b, bc[2]) - b) * l;
  }
  return (Math.round(clampByte(r)) << 16) | (Math.round(clampByte(g)) << 8) | Math.round(clampByte(b));
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function rgbOf(color: string): [number, number, number] {
  if (color[0] === "#") {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((s) => parseFloat(s));
    return [r, g, b];
  }
  return [255, 255, 255];
}

// ── Per-scene FX declaration ────────────────────────────────────────

export interface SceneFx {
  flicker: FlickerSpec;
  /** Practical (fill) pulse period + depth. */
  pulse: { periodMs: number; depth: number };
  rays: RaySpec[];
  dust?: DustSpec;
  strobe?: StrobeSpec;
  /** Colour the actor rim light takes in this scene. */
  rim: string;
}

export const SCENE_FX: Record<SceneType, SceneFx> = {
  cell: {
    flicker: { depth: 0.55, seed: 3 },
    pulse: { periodMs: 2600, depth: 0.35 },
    rays: [{ x: 0.42, y: 0.16, spread: 0.46, length: 0.7, color: C.lightWash, intensity: 0.13 }],
    dust: { count: 26, x0: 0.22, y0: 0.14, x1: 0.64, y1: 0.8, color: C.lightWash, alpha: 0.5, rise: -7, wander: 9, size: 2.2 },
    rim: C.termBright,
  },
  corridor: {
    flicker: { depth: 0.35, seed: 11 },
    pulse: { periodMs: 1800, depth: 0.3 },
    rays: [{ x: 0.5, y: 0.02, spread: 0.36, length: 0.6, color: C.lightWash, intensity: 0.1 }],
    dust: { count: 18, x0: 0.28, y0: 0.1, x1: 0.72, y1: 0.82, color: C.lightWash, alpha: 0.4, rise: -5, wander: 7, size: 2 },
    rim: C.signalBright,
  },
  chase: {
    flicker: { depth: 0.7, seed: 23 },
    pulse: { periodMs: 900, depth: 0.5 },
    rays: [{ x: 0.58, y: 0.02, spread: 0.36, length: 0.6, color: C.dangerBright, intensity: 0.12 }],
    dust: { count: 22, x0: 0.25, y0: 0.1, x1: 0.8, y1: 0.85, color: C.lightWash, alpha: 0.42, rise: -9, wander: 12, size: 2 },
    strobe: { color: C.dangerBright, periodMs: 1400, intensity: 0.42 },
    rim: C.dangerBright,
  },
  vent: {
    flicker: { depth: 0.4, seed: 5 },
    pulse: { periodMs: 3200, depth: 0.25 },
    rays: [{ x: 0.5, y: 0.08, spread: 0.3, length: 0.75, color: C.alertBright, intensity: 0.16 }],
    dust: { count: 24, x0: 0.34, y0: 0.15, x1: 0.66, y1: 0.85, color: C.alertBright, alpha: 0.45, rise: 9, wander: 5, size: 2 },
    rim: C.alertBright,
  },
  server: {
    flicker: { depth: 0.2, seed: 17 },
    pulse: { periodMs: 1300, depth: 0.45 },
    rays: [{ x: 0.38, y: 0.06, spread: 0.34, length: 0.7, color: C.termBright, intensity: 0.11 }],
    dust: { count: 12, x0: 0.2, y0: 0.15, x1: 0.6, y1: 0.8, color: C.termBright, alpha: 0.35, rise: -4, wander: 6, size: 2 },
    rim: C.termBright,
  },
  "boss-arena": {
    flicker: { depth: 0.6, seed: 29 },
    pulse: { periodMs: 700, depth: 0.5 },
    rays: [{ x: 0.5, y: 0.04, spread: 0.4, length: 0.7, color: C.dangerBright, intensity: 0.14 }],
    dust: { count: 18, x0: 0.3, y0: 0.3, x1: 0.7, y1: 1, color: C.alertBright, alpha: 0.6, rise: -26, wander: 10, size: 2.2 },
    strobe: { color: C.dangerBright, periodMs: 1100, intensity: 0.3 },
    rim: C.dangerBright,
  },
};

// ── Light textures (painted once, animated by alpha/scale) ──────────

/** Soft radial glow for additive blending. */
export function makeGlowCanvas(radius: number, color: string): HTMLCanvasElement {
  const size = Math.max(4, Math.ceil(radius * 2));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(radius, radius, Math.max(1, radius * 0.04), radius, radius, radius);
  g.addColorStop(0, alpha(color, 1));
  g.addColorStop(0.3, alpha(color, 0.42));
  g.addColorStop(0.7, alpha(color, 0.1));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * Light shaft: a downward cone, brightest along its axis, feathered to the
 * sides and the base. Apex at (w/2, 0).
 */
export function makeConeCanvas(w: number, h: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.ceil(w));
  canvas.height = Math.max(2, Math.ceil(h));
  const ctx = canvas.getContext("2d")!;
  const cx = canvas.width / 2;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.clip();
  const vert = ctx.createLinearGradient(0, 0, 0, canvas.height);
  vert.addColorStop(0, alpha(color, 0.9));
  vert.addColorStop(0.5, alpha(color, 0.35));
  vert.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const horiz = ctx.createLinearGradient(0, 0, canvas.width, 0);
  horiz.addColorStop(0, alpha(C.void, 0.9));
  horiz.addColorStop(0.5, alpha(C.void, 0));
  horiz.addColorStop(1, alpha(C.void, 0.9));
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = horiz;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 2×2 mote for dust particles. */
export function makeMoteCanvas(color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = alpha(color, 0.5);
  ctx.fillRect(0, 0, 4, 4);
  ctx.fillStyle = color;
  ctx.fillRect(1, 1, 2, 2);
  return canvas;
}

/**
 * Extend a painted plane by `bleed` px on every side by stretching its edge
 * pixels, so parallax can slide it without exposing the void.
 */
export function bleedCanvas(src: HTMLCanvasElement, bleed: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width + bleed * 2;
  out.height = src.height + bleed * 2;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const w = src.width;
  const h = src.height;
  // Edges.
  ctx.drawImage(src, 0, 0, 1, h, 0, bleed, bleed, h);
  ctx.drawImage(src, w - 1, 0, 1, h, w + bleed, bleed, bleed, h);
  ctx.drawImage(src, 0, 0, w, 1, bleed, 0, w, bleed);
  ctx.drawImage(src, 0, h - 1, w, 1, bleed, h + bleed, w, bleed);
  // Corners.
  ctx.drawImage(src, 0, 0, 1, 1, 0, 0, bleed, bleed);
  ctx.drawImage(src, w - 1, 0, 1, 1, w + bleed, 0, bleed, bleed);
  ctx.drawImage(src, 0, h - 1, 1, 1, 0, h + bleed, bleed, bleed);
  ctx.drawImage(src, w - 1, h - 1, 1, 1, w + bleed, h + bleed, bleed, bleed);
  ctx.drawImage(src, bleed, bleed);
  return out;
}
