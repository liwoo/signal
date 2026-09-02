"use client";

import { useRef, useEffect, useCallback } from "react";
import { Application, Container, Sprite, Texture } from "pixi.js";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import { C } from "@/lib/sprites/palette";
import { paintScene } from "@/lib/sprites/scene-painter";
import type { SceneDefinition, Actor } from "@/lib/sprites/scenes";
import { clamp01, easeInOutCubic, getCameraPos, lerp } from "@/lib/sprites/camera";

interface PixiSceneProps {
  scene: SceneDefinition;
  width?: number;
  height?: number;
  className?: string;
  crtEffect?: boolean;
}

interface ActorState {
  def: Actor;
  sprite: Sprite;
  shadow: Sprite;
  depth: Sprite;
  rim: Sprite;
  textures: Texture[];
  frameIdx: number;
  frameTimer: number;
}

interface SceneLayer {
  world: Container;
  actors: ActorState[];
  textures: Texture[];
  scene: SceneDefinition;
  startedAt: number;
  enteredAt: number;
  leavingAt?: number;
}

const SCENE_PADDING = 200;
// ≈ 0.32*sceneH/80 so the character matches the scene's prop reference height.
const CHAR_SCALE = 2.4;
const ANIM_INTERVAL = 120;
const SHOT_DISSOLVE_MS = 720;
// 0.85 → the 1040×600 scene renders 884×510 into the 640×400 viewport, leaving
// ~244×110px of crop headroom so the camera can actually frame a shot.
const CINEMATIC_WORLD_SCALE = 0.85;
// Default auto push-in for static (single-keyframe) shots: zoom eases +0.05.
const AUTO_PUSH_IN = 0.05;

function getActorPos(actor: Actor, timeMs: number): { x: number; y: number } {
  if (!actor.path || actor.path.length === 0) {
    return { x: actor.x, y: actor.y };
  }

  let elapsed = 0;
  let fromX = actor.x;
  let fromY = actor.y;

  for (let index = 0; index < actor.path.length; index++) {
    const waypoint = actor.path[index];
    if (timeMs <= elapsed + waypoint.duration) {
      const rawProgress = (timeMs - elapsed) / waypoint.duration;
      const isEdgeSegment = index === 0 || index === actor.path.length - 1;
      const progress = isEdgeSegment ? easeInOutCubic(rawProgress) : clamp01(rawProgress);
      return {
        x: lerp(fromX, waypoint.x, progress),
        y: lerp(fromY, waypoint.y, progress),
      };
    }
    elapsed += waypoint.duration;
    fromX = waypoint.x;
    fromY = waypoint.y;
  }

  const last = actor.path[actor.path.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * PixiJS-powered 2D scene renderer.
 *
 * One WebGL application stays mounted for the whole cinematic. New shots are
 * painted into a second world and dissolved over the previous one, avoiding
 * the blank frame caused by rebuilding the WebGL context between scenes.
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
  const layersRef = useRef<SceneLayer[]>([]);
  const latestSceneRef = useRef(scene);
  const installedSceneRef = useRef<SceneDefinition | null>(null);
  const reducedMotionRef = useRef(false);

  const destroyLayer = useCallback((layer: SceneLayer) => {
    if (layer.world.parent) layer.world.parent.removeChild(layer.world);
    layer.world.destroy({ children: true });
    for (const texture of layer.textures) texture.destroy(true);
  }, []);

  const installScene = useCallback((nextScene: SceneDefinition) => {
    const app = appRef.current;
    if (!app || installedSceneRef.current === nextScene) return;

    const sceneW = width + SCENE_PADDING * 2;
    const sceneH = height + SCENE_PADDING;
    const backgroundCanvas = paintScene(nextScene.background, sceneW, sceneH);
    const backgroundTexture = Texture.from({ resource: backgroundCanvas, antialias: false });
    const backgroundSprite = new Sprite(backgroundTexture);
    const world = new Container();
    world.sortableChildren = true;
    backgroundSprite.zIndex = -1;
    world.addChild(backgroundSprite);

    const textures: Texture[] = [backgroundTexture];
    const actors: ActorState[] = [];

    for (const actorDef of nextScene.actors) {
      const frameCanvases = actorDef.type === "guard"
        ? paintGuardFrames(actorDef.animation, CHAR_SCALE)
        : paintMayaFrames(actorDef.animation, CHAR_SCALE);
      const actorTextures = frameCanvases.map(
        (canvas) => Texture.from({ resource: canvas, antialias: false }),
      );
      textures.push(...actorTextures);

      const sprite = new Sprite(actorTextures[0]);

      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 52;
      shadowCanvas.height = 18;
      const shadowContext = shadowCanvas.getContext("2d")!;
      shadowContext.fillStyle = C.void;
      shadowContext.globalAlpha = 0.42;
      shadowContext.beginPath();
      shadowContext.ellipse(26, 9, 23, 7, 0, 0, Math.PI * 2);
      shadowContext.fill();
      const shadowTexture = Texture.from({ resource: shadowCanvas, antialias: false });
      textures.push(shadowTexture);
      const shadow = new Sprite(shadowTexture);
      shadow.anchor.set(0.5);
      shadow.x = actorDef.x;
      shadow.y = actorDef.y - 3;
      shadow.zIndex = actorDef.y - 1;
      world.addChild(shadow);

      // Offset silhouette and rim layers give the flat sprite a small amount
      // of physical depth while preserving the hand-painted pixel edges.
      const depth = new Sprite(actorTextures[0]);
      depth.anchor.set(0.5, 1);
      depth.x = actorDef.x + 4;
      depth.y = actorDef.y + 4;
      depth.zIndex = actorDef.y;
      depth.tint = C.void;
      depth.alpha = 0.72;
      world.addChild(depth);

      const rim = new Sprite(actorTextures[0]);
      rim.anchor.set(0.5, 1);
      rim.x = actorDef.x - 2;
      rim.y = actorDef.y - 2;
      rim.zIndex = actorDef.y + 1;
      rim.tint = actorDef.type === "guard" ? C.dangerBright : C.signalBright;
      rim.alpha = 0.2;
      world.addChild(rim);

      sprite.anchor.set(0.5, 1);
      sprite.x = actorDef.x;
      sprite.y = actorDef.y;
      sprite.zIndex = actorDef.y + 2;
      world.addChild(sprite);
      actors.push({
        def: actorDef,
        sprite,
        shadow,
        depth,
        rim,
        textures: actorTextures,
        frameIdx: 0,
        frameTimer: 0,
      });
    }

    const now = performance.now();
    const hasPreviousShot = layersRef.current.length > 0;
    // Cut by default; dissolve only when the shot opts in (reserved for
    // time/place jumps). Reduced motion always hard-cuts.
    const dissolve =
      hasPreviousShot &&
      !reducedMotionRef.current &&
      nextScene.transition === "dissolve";

    if (dissolve) {
      for (const layer of layersRef.current) {
        if (layer.leavingAt === undefined) layer.leavingAt = now;
      }
    } else {
      for (const layer of layersRef.current) destroyLayer(layer);
      layersRef.current = [];
    }

    world.alpha = dissolve ? 0 : 1;
    app.stage.addChild(world);
    layersRef.current.push({
      world,
      actors,
      textures,
      scene: nextScene,
      startedAt: now,
      enteredAt: now,
    });
    installedSceneRef.current = nextScene;
  }, [destroyLayer, height, width]);

  useEffect(() => {
    latestSceneRef.current = scene;
    installScene(scene);
  }, [installScene, scene]);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    let cancelled = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = media.matches;
    const handleMotionChange = () => {
      reducedMotionRef.current = media.matches;
    };
    media.addEventListener("change", handleMotionChange);

    const app = new Application();

    void app.init({
      width,
      height,
      background: C.void,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (cancelled) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      host.replaceChildren(app.canvas);
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      app.canvas.style.display = "block";
      appRef.current = app;
      installScene(latestSceneRef.current);

      app.ticker.add(() => {
        const now = performance.now();

        for (const layer of [...layersRef.current]) {
          const elapsed = now - layer.startedAt;
          const camera = getCameraPos(layer.scene.camera, elapsed);
          const reduced = reducedMotionRef.current;

          // Auto push-in on static (single-keyframe) shots — eases the base
          // zoom up by AUTO_PUSH_IN over the shot. Multi-keyframe shots use
          // their authored zoom only.
          let zoom = camera.zoom;
          if (!reduced && layer.scene.camera.length === 1) {
            const dur = layer.scene.durationMs || 1;
            const pushT = easeInOutCubic(clamp01(elapsed / dur));
            zoom = (layer.scene.camera[0].zoom ?? 1) + AUTO_PUSH_IN * pushT;
          }

          const worldScale = CINEMATIC_WORLD_SCALE * zoom;
          const sceneWidth = width + SCENE_PADDING * 2;
          const sceneHeight = height + SCENE_PADDING;

          // camera.{x,y} is the world-space point centered in the viewport.
          // Clamp it so the visible rect never slides past the scene bounds.
          const halfViewW = width / 2 / worldScale;
          const halfViewH = height / 2 / worldScale;
          const centerX = Math.min(
            Math.max(camera.x, halfViewW),
            sceneWidth - halfViewW,
          );
          const centerY = Math.min(
            Math.max(camera.y, halfViewH),
            sceneHeight - halfViewH,
          );

          // Layered-sine idle sway keyed off scene-elapsed time (deterministic
          // for visual captures). Disabled under reduced motion.
          let swayX = 0;
          let swayY = 0;
          let swayRot = 0;
          if (!reduced) {
            const t = elapsed / 1000;
            swayX = Math.sin(t * 0.7) * 2.5 + Math.sin(t * 1.3) * 1.2;
            swayY = Math.sin(t * 0.9) * 1.5 + Math.sin(t * 0.5) * 0.8;
            swayRot = Math.sin(t * 0.4 + 0.5) * 0.003;
          }

          layer.world.scale.set(worldScale);
          layer.world.pivot.set(centerX, centerY);
          layer.world.rotation = swayRot;
          layer.world.x = width / 2 + swayX;
          layer.world.y = height / 2 + swayY;

          for (const actor of layer.actors) {
            const position = getActorPos(actor.def, elapsed);
            actor.sprite.x = position.x;
            actor.sprite.y = position.y;
            actor.sprite.zIndex = position.y + 2;
            actor.shadow.x = position.x;
            actor.shadow.y = position.y - 3;
            actor.shadow.zIndex = position.y - 1;
            actor.depth.x = position.x + 4;
            actor.depth.y = position.y + 4;
            actor.depth.zIndex = position.y;
            actor.rim.x = position.x - 2;
            actor.rim.y = position.y - 2;
            actor.rim.zIndex = position.y + 1;

            actor.frameTimer += app.ticker.deltaMS;
            if (actor.frameTimer >= ANIM_INTERVAL) {
              actor.frameTimer %= ANIM_INTERVAL;
              actor.frameIdx = (actor.frameIdx + 1) % actor.textures.length;
              actor.sprite.texture = actor.textures[actor.frameIdx];
              actor.depth.texture = actor.textures[actor.frameIdx];
              actor.rim.texture = actor.textures[actor.frameIdx];
            }
          }

          if (layer.leavingAt !== undefined) {
            const progress = (now - layer.leavingAt) / SHOT_DISSOLVE_MS;
            layer.world.alpha = 1 - easeInOutCubic(progress);
            if (progress >= 1) {
              destroyLayer(layer);
              layersRef.current = layersRef.current.filter((item) => item !== layer);
            }
          } else if (layersRef.current.length > 1) {
            const progress = (now - layer.enteredAt) / SHOT_DISSOLVE_MS;
            layer.world.alpha = easeInOutCubic(progress);
          } else {
            layer.world.alpha = 1;
          }
        }
      });
    });

    return () => {
      cancelled = true;
      media.removeEventListener("change", handleMotionChange);
      for (const layer of layersRef.current) destroyLayer(layer);
      layersRef.current = [];
      installedSceneRef.current = null;
      if (appRef.current === app) appRef.current = null;
      if (app.renderer) app.destroy(true, { children: true, texture: true });
    };
  }, [destroyLayer, height, installScene, width]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div ref={containerRef} className="h-full w-full" aria-hidden="true" />

      {crtEffect && (
        <>
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--color-background) 12%, transparent) 2px, color-mix(in srgb, var(--color-background) 12%, transparent) 4px)",
              mixBlendMode: "multiply",
            }}
          />
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 42%, color-mix(in srgb, var(--color-background) 72%, transparent) 100%)",
            }}
          />
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: "color-mix(in srgb, var(--color-signal) 2%, transparent)",
              mixBlendMode: "overlay",
            }}
          />
        </>
      )}
    </div>
  );
}
