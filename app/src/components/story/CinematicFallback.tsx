"use client";

import { useEffect, useRef } from "react";
import type { SceneDefinition } from "@/lib/sprites/scenes";
import { paintScene } from "@/lib/sprites/scene-painter";
import { paintGuardFrames, paintMayaFrames } from "@/lib/sprites/character-painter";
import { cinematicActorAt } from "@/lib/sprites/cinematic-motion";

/** Canvas 2D remains available even when WebGL creation or restoration fails. */
export function CinematicFallback({ scene, onReady }: { scene: SceneDefinition; onReady: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) { onReady(); return; }
    const background = paintScene(scene.background, 1040, 600);
    const actors = scene.actors.map((actor) => {
      const painter = actor.type === "maya" ? paintMayaFrames : paintGuardFrames;
      return { actor, frames: painter(actor.animation, 1), endFrames: painter(actor.endAnimation ?? actor.animation, 1) };
    });
    const start = performance.now();
    let frame = 0;
    const draw = () => {
      const elapsed = performance.now() - start;
      ctx.drawImage(background, 0, 0);
      for (const { actor, frames, endFrames } of actors) {
        const pose = cinematicActorAt(actor, elapsed);
        const sprites = pose.animation === actor.animation ? frames : endFrames;
        const sprite = sprites[Math.floor(elapsed / 120) % sprites.length];
        const scale = (actor.scale ?? 1) * 2;
        ctx.drawImage(sprite, pose.x * 55 + 520 - sprite.width * scale / 2,
          pose.z * 32 + 440 - sprite.height * scale, sprite.width * scale, sprite.height * scale);
      }
      frame = requestAnimationFrame(draw);
    };
    draw(); onReady();
    return () => cancelAnimationFrame(frame);
  }, [scene, onReady]);
  return <canvas ref={ref} width={1040} height={600} className="absolute inset-0 h-full w-full object-cover" aria-label="Story scene" />;
}
