// ── Cinematic camera math ──
// Pure helpers shared by PixiScene (render) and CinematicScene (pacing).
// Camera keyframe {x,y} is the world-space point centered in the viewport;
// zoom multiplies the base cinematic scale.

import type { CameraKeyframe, SceneDefinition } from "./scenes";

// TypeText runs at 28ms/char; on-action shots settle 600ms after the last beat.
export const CAPTION_TYPE_SPEED = 28;
export const ON_ACTION_SETTLE_MS = 600;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

export function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Interpolate the centered world point + zoom at a given time into the shot. */
export function getCameraPos(
  keyframes: CameraKeyframe[],
  timeMs: number,
): { x: number; y: number; zoom: number } {
  if (keyframes.length === 0) return { x: 0, y: 0, zoom: 1 };
  if (keyframes.length === 1) {
    return {
      x: keyframes[0].x,
      y: keyframes[0].y,
      zoom: keyframes[0].zoom ?? 1,
    };
  }

  if (timeMs <= keyframes[0].time) {
    return {
      x: keyframes[0].x,
      y: keyframes[0].y,
      zoom: keyframes[0].zoom ?? 1,
    };
  }

  const last = keyframes[keyframes.length - 1];
  if (timeMs >= last.time) {
    return { x: last.x, y: last.y, zoom: last.zoom ?? 1 };
  }

  let prev = keyframes[0];
  let next = keyframes[1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (timeMs <= keyframes[i + 1].time) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const duration = next.time - prev.time;
  const progress = duration > 0 ? (timeMs - prev.time) / duration : 1;
  const eased = easeInOutCubic(progress);

  return {
    x: lerp(prev.x, next.x, eased),
    y: lerp(prev.y, next.y, eased),
    zoom: lerp(prev.zoom ?? 1, next.zoom ?? 1, eased),
  };
}

/**
 * How long a shot actually holds. "timed" (default) uses durationMs. "on-action"
 * ends once the last actor path and caption typing finish (+settle), with
 * durationMs as a hard ceiling.
 */
export function effectiveDurationMs(scene: SceneDefinition): number {
  if (scene.advance !== "on-action") return scene.durationMs;
  let actorEnd = 0;
  for (const actor of scene.actors) {
    if (!actor.path) continue;
    const end = actor.path.reduce((sum, wp) => sum + wp.duration, 0);
    if (end > actorEnd) actorEnd = end;
  }
  const captionEnd = scene.caption ? scene.caption.length * CAPTION_TYPE_SPEED : 0;
  const onAction = Math.max(actorEnd, captionEnd) + ON_ACTION_SETTLE_MS;
  return Math.min(onAction, scene.durationMs);
}
