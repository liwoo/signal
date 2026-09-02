// ── Declared scene lighting ──
// Every scene declares exactly one key light; all shading, contact shadows and
// glow passes derive from it. No hand-placed glows outside this system.
//
// Positions are stored as fractions of the scene (scenes render at 640×420 in
// tests and 1040×600 in game), resolved to px by `resolveLight`.

import type { SceneType } from "./scene-painter";
import { C, alpha } from "./palette";

export interface SceneLight {
  x: number; // fraction of scene width [0,1]
  y: number; // fraction of scene height [0,1]
  color: string; // palette accent only
  radius: number; // fraction of scene width
  intensity: number; // 0..1
}

export interface SceneLighting {
  /** THE light. Exactly one. */
  key: SceneLight;
  /** ≤2 practicals (screen glow, indicator) at ≤0.3 intensity. */
  fills?: SceneLight[];
  /** Base fill, from palette. */
  ambient: string;
}

export const SCENE_LIGHTING: Record<SceneType, SceneLighting> = {
  // Blue-steel + terminal-cyan. Key = ceiling pendant; terminal + door are fills.
  cell: {
    key: { x: 0.35, y: 0.18, color: C.lightWash, radius: 0.72, intensity: 0.5 },
    fills: [
      { x: 0.49, y: 0.4, color: C.termBright, radius: 0.26, intensity: 0.3 },
      { x: 0.86, y: 0.5, color: C.lightWarm, radius: 0.16, intensity: 0.16 },
    ],
    ambient: C.wallDark,
  },
  // Blue-steel + signal-green. Key = the door at the vanishing point.
  corridor: {
    key: { x: 0.5, y: 0.36, color: C.lightWash, radius: 0.62, intensity: 0.5 },
    fills: [{ x: 0.5, y: 0.5, color: C.signalBright, radius: 0.34, intensity: 0.22 }],
    ambient: C.wallDark,
  },
  // Corridor + danger-red wash.
  chase: {
    key: { x: 0.58, y: 0.36, color: C.lightWash, radius: 0.6, intensity: 0.42 },
    fills: [{ x: 0.5, y: 0.55, color: C.dangerBright, radius: 0.5, intensity: 0.26 }],
    ambient: C.dangerDim,
  },
  // Concrete grays + alert-amber shaft.
  vent: {
    key: { x: 0.5, y: 0.3, color: C.alertBright, radius: 0.5, intensity: 0.5 },
    fills: [{ x: 0.5, y: 0.62, color: C.alertMid, radius: 0.3, intensity: 0.2 }],
    ambient: C.concreteDark,
  },
  // Blue-steel + terminal-cyan.
  server: {
    key: { x: 0.38, y: 0.38, color: C.lightWash, radius: 0.58, intensity: 0.44 },
    fills: [{ x: 0.5, y: 0.5, color: C.termBright, radius: 0.4, intensity: 0.26 }],
    ambient: C.wallDark,
  },
  // Red-black.
  "boss-arena": {
    key: { x: 0.5, y: 0.38, color: C.dangerBright, radius: 0.55, intensity: 0.4 },
    fills: [{ x: 0.5, y: 0.5, color: C.dangerMid, radius: 0.4, intensity: 0.24 }],
    ambient: C.void,
  },
};

export interface ResolvedLight {
  x: number; // px
  y: number; // px
  color: string;
  radius: number; // px
  intensity: number;
}

export function resolveLight(light: SceneLight, w: number, h: number): ResolvedLight {
  return {
    x: light.x * w,
    y: light.y * h,
    color: light.color,
    radius: light.radius * w,
    intensity: light.intensity,
  };
}

/**
 * Which face of a prop at screen x=px is lit by the key.
 * -1 = left face lit (key is to the left), +1 = right face lit.
 * Mirrors the character `lightDir` convention (default -1, lit-left).
 */
export function lightDir(px: number, keyX: number): -1 | 1 {
  return keyX < px ? -1 : 1;
}

/** Emit a radial glow at a resolved light position. The only source of glow gradients. */
export function paintGlow(ctx: CanvasRenderingContext2D, light: ResolvedLight): void {
  const inner = Math.max(2, light.radius * 0.05);
  const g = ctx.createRadialGradient(light.x, light.y, inner, light.x, light.y, light.radius);
  g.addColorStop(0, alpha(light.color, light.intensity));
  g.addColorStop(0.35, alpha(light.color, light.intensity * 0.4));
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
}

/**
 * Contact shadow for a floor-standing prop or character. An ellipse offset away
 * from the key light, its length scaled by distance to the key.
 */
export function contactShadow(
  ctx: CanvasRenderingContext2D,
  px: number,
  footY: number,
  width: number,
  key: ResolvedLight,
): void {
  const dir = Math.sign(px - key.x) || 1;
  const dist = Math.hypot(px - key.x, footY - key.y);
  const stretch = 1 + Math.min(0.8, dist / (key.radius * 2 + 1));
  const rx = (width / 2) * stretch;
  const ry = Math.max(2, width * 0.14);
  const offX = dir * width * 0.18 * stretch;
  ctx.fillStyle = alpha(C.shadow, 0.4);
  ctx.beginPath();
  ctx.ellipse(px + offX, footY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
