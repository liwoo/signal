// ── Shared billboard-sprite actors for the 3D stages ──
// Pixel-art character frames painted to canvases, shown as Three.js sprites with
// a flat blob shadow. Used by both the stealth stage (AdventureScene) and the
// boss-fight stage (BossFightStage).

import * as THREE from "three";
import type { CharAnimation } from "@/lib/sprites/character-painter";

export const SPRITE_H = 1.5;
export const SPRITE_W = SPRITE_H * (48 / 80);

export const ANIM_INTERVAL: Partial<Record<CharAnimation, number>> = {
  idle: 260, "walk-right": 110, "walk-left": 110, "walk-up": 110, "walk-down": 110,
  hack: 170, keypad: 170, captured: 400, "crawl-right": 150,
};

export interface SpriteActor {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  shadow: THREE.Sprite;
  frames: Map<CharAnimation, THREE.Texture[]>;
  anim: CharAnimation;
  frame: number;
  frameTimer: number;
  painter: (anim: CharAnimation) => HTMLCanvasElement[];
  tint: THREE.Color;
}

export function makeActor(painter: SpriteActor["painter"], shadowTex: THREE.Texture, tint: string): SpriteActor {
  const material = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.08, depthWrite: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(SPRITE_W, SPRITE_H, 1);
  sprite.center.set(0.5, 0);
  const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
  shadow.scale.set(0.9, 0.42, 1);
  const actor: SpriteActor = { sprite, material, shadow, frames: new Map(), anim: "idle", frame: 0, frameTimer: 0, painter, tint: new THREE.Color(tint) };
  setActorAnim(actor, "idle");
  return actor;
}

export function framesFor(actor: SpriteActor, anim: CharAnimation): THREE.Texture[] {
  let frames = actor.frames.get(anim);
  if (!frames) {
    frames = actor.painter(anim).map((canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
    actor.frames.set(anim, frames);
  }
  return frames;
}

export function setActorAnim(actor: SpriteActor, anim: CharAnimation): void {
  if (actor.anim === anim && actor.material.map) return;
  actor.anim = anim;
  actor.frame = 0;
  actor.frameTimer = 0;
  actor.material.map = framesFor(actor, anim)[0];
  actor.material.needsUpdate = true;
}

export function tickActor(actor: SpriteActor, dtMs: number): void {
  const frames = framesFor(actor, actor.anim);
  if (frames.length <= 1) return;
  actor.frameTimer += dtMs;
  const interval = ANIM_INTERVAL[actor.anim] ?? 150;
  if (actor.frameTimer >= interval) {
    actor.frameTimer -= interval;
    actor.frame = (actor.frame + 1) % frames.length;
    actor.material.map = frames[actor.frame];
  }
}

export function disposeActor(actor: SpriteActor): void {
  for (const frames of actor.frames.values()) for (const t of frames) t.dispose();
  actor.material.dispose();
  (actor.shadow.material as THREE.Material).dispose();
}

/** Pick a walk cycle from a world-space velocity, relative to where the camera looks. */
export function walkAnimFor(vx: number, vz: number, right: THREE.Vector3, forward: THREE.Vector3, crawling: boolean): CharAnimation {
  if (crawling) return "crawl-right";
  const lx = vx * right.x + vz * right.z;
  const lz = vx * forward.x + vz * forward.z;
  if (Math.abs(lx) >= Math.abs(lz)) return lx >= 0 ? "walk-right" : "walk-left";
  return lz >= 0 ? "walk-up" : "walk-down";
}

/** Rough light level at a point from the world's point lights, for sprite tinting. */
export function lightLevelAt(x: number, z: number, lights: THREE.PointLight[], out: THREE.Color): void {
  out.setRGB(0.22, 0.26, 0.34);
  for (const l of lights) {
    if (l.intensity <= 0) continue;
    const dx = l.position.x - x;
    const dz = l.position.z - z;
    const dy = l.position.y - 0.9;
    const d2 = dx * dx + dz * dz + dy * dy;
    if (l.distance > 0 && d2 > l.distance * l.distance) continue;
    const k = Math.min(1.4, l.intensity / (d2 + 0.6)) * 0.14;
    out.r += l.color.r * k;
    out.g += l.color.g * k;
    out.b += l.color.b * k;
  }
  out.r = Math.min(1.25, out.r);
  out.g = Math.min(1.25, out.g);
  out.b = Math.min(1.25, out.b);
}
