"use client";

import { useRef, useEffect, useCallback } from "react";
import { Application, Container, Sprite, Texture } from "pixi.js";
import { paintScene } from "@/lib/sprites/scene-painter";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import type { SceneDefinition, Actor, CameraKeyframe } from "@/lib/sprites/scenes";

interface PixiSceneProps {
  scene: SceneDefinition;
  width?: number;
  height?: number;
  className?: string;
  crtEffect?: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getCameraPos(keyframes: CameraKeyframe[], timeMs: number): { x: number; y: number } {
  if (keyframes.length === 0) return { x: 0, y: 0 };
  if (keyframes.length === 1) return { x: keyframes[0].x, y: keyframes[0].y };

  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (timeMs >= keyframes[i].time && timeMs <= keyframes[i + 1].time) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  const duration = next.time - prev.time;
  const t = duration > 0 ? (timeMs - prev.time) / duration : 1;
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

  return {
    x: lerp(prev.x, next.x, eased),
    y: lerp(prev.y, next.y, eased),
  };
}

function getActorPos(actor: Actor, timeMs: number): { x: number; y: number } {
  if (!actor.path || actor.path.length === 0) {
    return { x: actor.x, y: actor.y };
  }

  let elapsed = 0;
  let fromX = actor.x;
  let fromY = actor.y;

  for (const wp of actor.path) {
    if (timeMs <= elapsed + wp.duration) {
      const t = (timeMs - elapsed) / wp.duration;
      return { x: lerp(fromX, wp.x, t), y: lerp(fromY, wp.y, t) };
    }
    elapsed += wp.duration;
    fromX = wp.x;
    fromY = wp.y;
  }

  const last = actor.path[actor.path.length - 1];
  return { x: last.x, y: last.y };
}

// Scene canvas is painted larger than viewport for camera panning
const SCENE_PADDING = 200;

/**
 * PixiJS-powered 2D scene renderer.
 * Paints detailed backgrounds with Canvas 2D, animates character sprites.
 * CRT scanline + vignette applied via CSS overlay.
 */
export function PixiScene({
  scene,
  width = 640,
  height = 400,
  className = "",
  crtEffect = true,
}: PixiSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  const buildScene = useCallback(async () => {
    if (!containerRef.current) return;

    // Clean up previous — force WebGL context release
    if (appRef.current) {
      try {
        const gl =
          (appRef.current.renderer as unknown as { gl?: WebGL2RenderingContext }).gl
          ?? (appRef.current.canvas as HTMLCanvasElement).getContext("webgl2")
          ?? (appRef.current.canvas as HTMLCanvasElement).getContext("webgl");
        if (gl) {
          const ext = gl.getExtension("WEBGL_lose_context");
          ext?.loseContext();
        }
      } catch { /* best-effort */ }
      appRef.current.destroy(true, { children: true, texture: true });
      appRef.current = null;
    }

    const app = new Application();
    await app.init({
      width,
      height,
      background: 0x020406,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(app.canvas);
    appRef.current = app;

    // ── Paint background ──
    const sceneW = width + SCENE_PADDING * 2;
    const sceneH = height + SCENE_PADDING;
    const bgCanvas = paintScene(scene.background, sceneW, sceneH);
    const bgTexture = Texture.from({ resource: bgCanvas, antialias: false });
    const bgSprite = new Sprite(bgTexture);

    const world = new Container();
    world.addChild(bgSprite);

    // ── Create character sprites ──
    interface ActorState {
      def: Actor;
      sprite: Sprite;
      textures: Texture[];
      frameIdx: number;
      frameTimer: number;
    }

    const actors: ActorState[] = [];
    const CHAR_SCALE = 3;
    const ANIM_INTERVAL = 120; // ms per frame (8-frame walk cycle)

    for (const actorDef of scene.actors) {
      const frameCanvases =
        actorDef.type === "guard"
          ? paintGuardFrames(actorDef.animation, CHAR_SCALE)
          : paintMayaFrames(actorDef.animation, CHAR_SCALE);

      const textures = frameCanvases.map(
        (c) => Texture.from({ resource: c, antialias: false }),
      );

      const spr = new Sprite(textures[0]);
      spr.anchor.set(0.5, 1); // anchor at feet
      spr.x = actorDef.x;
      spr.y = actorDef.y;
      world.addChild(spr);

      actors.push({
        def: actorDef,
        sprite: spr,
        textures,
        frameIdx: 0,
        frameTimer: 0,
      });
    }

    app.stage.addChild(world);

    // ── Render loop ──
    const startTime = performance.now();

    app.ticker.add(() => {
      const elapsed = performance.now() - startTime;

      // Camera
      const cam = getCameraPos(scene.camera, elapsed);
      world.x = -cam.x;
      world.y = -cam.y;

      // Actors
      for (const a of actors) {
        const pos = getActorPos(a.def, elapsed);
        a.sprite.x = pos.x;
        a.sprite.y = pos.y;

        a.frameTimer += app.ticker.deltaMS;
        if (a.frameTimer >= ANIM_INTERVAL) {
          a.frameTimer -= ANIM_INTERVAL;
          a.frameIdx = (a.frameIdx + 1) % a.textures.length;
          a.sprite.texture = a.textures[a.frameIdx];
        }
      }
    });
  }, [scene, width, height]);

  useEffect(() => {
    buildScene();
    return () => {
      if (appRef.current) {
        // Force WebGL context release before destroying — prevents
        // "WebGL context was lost" when BossArena mounts immediately after.
        try {
          const gl =
            (appRef.current.renderer as unknown as { gl?: WebGL2RenderingContext }).gl
            ?? (appRef.current.canvas as HTMLCanvasElement).getContext("webgl2")
            ?? (appRef.current.canvas as HTMLCanvasElement).getContext("webgl");
          if (gl) {
            const ext = gl.getExtension("WEBGL_lose_context");
            ext?.loseContext();
          }
        } catch { /* best-effort */ }
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [buildScene]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <div ref={containerRef} className="w-full h-full" />

      {crtEffect && (
        <>
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.12) 2px, rgba(0,0,0,.12) 4px)",
              mixBlendMode: "multiply",
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.55) 100%)",
            }}
          />
          {/* Green color tint */}
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: "rgba(110,255,160,0.02)",
              mixBlendMode: "overlay",
            }}
          />
        </>
      )}
    </div>
  );
}
