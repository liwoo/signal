import type { Actor, SceneDefinition } from "./scenes";
import { clamp01, getCameraPos, lerp } from "./camera";

/** One coordinate system for the authored paths, actors, props and camera. */
export function cinematicPosition(x: number, y: number) {
  return { x: (x - 520) / 55, z: (y - 440) / 32 };
}

/** Linear travel keeps footsteps grounded; easing belongs to the camera. */
export function cinematicActorAt(actor: Actor, timeMs: number) {
  let x = actor.x;
  let y = actor.y;
  let remaining = Math.max(0, timeMs);
  let heading = actor.animation === "walk-left" ? -Math.PI / 2
    : actor.animation === "walk-right" || actor.animation === "crawl-right" ? Math.PI / 2
    : actor.animation === "walk-up" || actor.animation === "hack" ? Math.PI : 0;
  for (const point of actor.path ?? []) {
    const dx = (point.x - x) / 55;
    const dz = (point.y - y) / 32;
    if (dx || dz) heading = Math.atan2(dx, dz);
    if (point.duration > 0 && remaining < point.duration) {
      const t = remaining / point.duration;
      return { ...cinematicPosition(lerp(x, point.x, t), lerp(y, point.y, t)), heading,
        moving: !!(dx || dz), animation: actor.animation };
    }
    remaining -= Math.max(0, point.duration);
    x = point.x;
    y = point.y;
  }
  return { ...cinematicPosition(x, y), heading, moving: false,
    animation: actor.endAnimation ?? actor.animation };
}

export function cinematicCameraAt(scene: SceneDefinition, timeMs: number, reducedMotion = false) {
  const frame = getCameraPos(scene.camera, reducedMotion ? 0 : timeMs);
  const focus = cinematicPosition(frame.x, 440);
  const close = clamp01((frame.zoom - 1) / 0.9);
  const progress = reducedMotion ? 0.5 : clamp01(timeMs / scene.durationMs);
  const lead = scene.actors.find((actor) => actor.type === "maya") ?? scene.actors[0];
  const actor = lead ? cinematicActorAt(lead, timeMs) : null;
  const targetX = lerp(focus.x, actor?.x ?? focus.x, close * 0.8);
  const targetZ = actor?.z ?? -1;
  // Keep the missions' elevated perspective, narrow lens and minimum distance.
  // Tension comes from the timed push/orbit, without changing the game's style.
  const pitch = 0.95;
  const distance = lerp(17, 10, close);
  const yaw = -0.55 + (progress - 0.5) * 0.16;
  return {
    target: [targetX, 0.7, targetZ] as const,
    position: [targetX + Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance, targetZ + Math.cos(yaw) * Math.cos(pitch) * distance] as const,
    fov: 30,
  };
}
