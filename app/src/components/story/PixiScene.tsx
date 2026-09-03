"use client";

import { useRef, useEffect, useCallback } from "react";
import { Application, Container, Sprite, Texture } from "pixi.js";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import { C, alpha } from "@/lib/sprites/palette";
import { paintSceneLayers } from "@/lib/sprites/scene-painter";
import type { SceneDefinition, Actor } from "@/lib/sprites/scenes";
import { clamp01, easeInOutCubic, getCameraPos, lerp } from "@/lib/sprites/camera";
import { SCENE_LIGHTING, resolveLight } from "@/lib/sprites/lighting";
import type { ResolvedLight } from "@/lib/sprites/lighting";
import {
  SCENE_FX,
  PARALLAX,
  BACK_BLEED_PX,
  CHAR_ANIM_INTERVAL_MS,
  actorTint,
  bleedCanvas,
  depthScale,
  dustMote,
  dutchAngle,
  flashLevel,
  flickerLevel,
  glitchBands,
  glitchLevel,
  hash01,
  makeConeCanvas,
  makeGlowCanvas,
  makeMoteCanvas,
  parallaxOffset,
  pulseLevel,
  shakeOffset,
  strobeLevel,
  swayOffset,
} from "@/lib/sprites/scene-fx";
import type { FlashSpec, GlitchSpec } from "@/lib/sprites/scene-fx";

interface PixiSceneProps {
  scene: SceneDefinition;
  width?: number;
  height?: number;
  className?: string;
  crtEffect?: boolean;
  /** Replay the shot when it ends: "restart" jumps back, "pingpong" mirrors it. */
  loop?: "restart" | "pingpong";
}

interface ActorState {
  def: Actor;
  sprite: Sprite;
  shadow: Sprite;
  rim: Sprite;
  textures: Texture[];
  walkTextures: Texture[];
  endTextures: Texture[] | null;
  pathEndMs: number;
  usingEnd: boolean;
  intervalMs: number;
  frameIdx: number;
  frameTimer: number;
}

interface LightState {
  sprite: Sprite;
  baseAlpha: number;
  kind: "key" | "fill" | "ray" | "strobe";
  seed: number;
}

interface SceneLayer {
  world: Container;
  back: Sprite;
  fore: Sprite | null;
  lights: LightState[];
  motes: Sprite[];
  actors: ActorState[];
  textures: Texture[];
  scene: SceneDefinition;
  key: ResolvedLight;
  flashes: FlashSpec[];
  glitches: GlitchSpec[];
  startedAt: number;
  enteredAt: number;
  leavingAt?: number;
}

const SCENE_PADDING = 200;
// ≈ 0.32*sceneH/80 so the character matches the scene's prop reference height.
const CHAR_SCALE = 2.4;
const SHOT_DISSOLVE_MS = 720;
// 0.85 → the 1040×600 scene renders 884×510 into the 640×400 viewport, leaving
// ~244×110px of crop headroom so the camera can actually frame a shot.
const CINEMATIC_WORLD_SCALE = 0.85;
// Default auto push-in for static (single-keyframe) shots: zoom eases +0.05.
const AUTO_PUSH_IN = 0.05;
// Transition bursts layered under the first frames of a shot.
const TRANSITION_FLASH_MS = 460;
const TRANSITION_GLITCH_MS = 280;
// Glow textures are painted at most this large and scaled up by the sprite.
const GLOW_TEX_RADIUS = 256;

const Z_BACK = -1000;
const Z_LIGHTS = 9000;
const Z_DUST = 9500;
const Z_FORE = 10000;

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

function pathEnd(actor: Actor): number {
  if (!actor.path) return 0;
  return actor.path.reduce((sum, wp) => sum + wp.duration, 0);
}

function paintFrames(actor: Actor, animation: CharAnimation): HTMLCanvasElement[] {
  return actor.type === "guard"
    ? paintGuardFrames(animation, CHAR_SCALE)
    : paintMayaFrames(animation, CHAR_SCALE);
}

/**
 * PixiJS-powered 3.5D scene renderer.
 *
 * One WebGL application stays mounted for the whole cinematic. Each shot is
 * installed as a world of planes — back (parallax 0.92×), depth-sorted mid
 * props + actors (1×), additive lights + dust, and a near-camera fore plane
 * (1.12×) — under a composed camera with idle sway, impact shake and dutch
 * tilt. Shots cut, dissolve, flash or glitch into each other.
 */
export function PixiScene({
  scene,
  width = 640,
  height = 400,
  className = "",
  crtEffect = true,
  loop,
}: PixiSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const layersRef = useRef<SceneLayer[]>([]);
  const latestSceneRef = useRef(scene);
  const installedSceneRef = useRef<SceneDefinition | null>(null);
  const reducedMotionRef = useRef(false);
  const loopRef = useRef(loop);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

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
    const textures: Texture[] = [];
    const texOf = (canvas: HTMLCanvasElement) => {
      const t = Texture.from({ resource: canvas, antialias: false, scaleMode: "nearest" });
      textures.push(t);
      return t;
    };

    const world = new Container();
    world.sortableChildren = true;

    // ── Planes ──
    const painted = paintSceneLayers(nextScene.background, sceneW, sceneH);
    const back = new Sprite(texOf(bleedCanvas(painted.back, BACK_BLEED_PX)));
    back.x = -BACK_BLEED_PX;
    back.y = -BACK_BLEED_PX;
    back.zIndex = Z_BACK;
    world.addChild(back);

    for (const prop of painted.mid) {
      const sprite = new Sprite(texOf(prop.canvas));
      sprite.x = prop.x;
      sprite.y = prop.y;
      sprite.zIndex = prop.footY;
      world.addChild(sprite);
    }

    let fore: Sprite | null = null;
    if (painted.fore) {
      fore = new Sprite(texOf(painted.fore));
      fore.zIndex = Z_FORE;
      world.addChild(fore);
    }

    // ── Lights (additive, animated per frame) ──
    const lighting = SCENE_LIGHTING[nextScene.background];
    const fx = SCENE_FX[nextScene.background];
    const key = resolveLight(lighting.key, sceneW, sceneH);
    const lights: LightState[] = [];
    const addGlow = (light: ResolvedLight, kind: LightState["kind"], baseAlpha: number, seed: number) => {
      const r = Math.min(GLOW_TEX_RADIUS, light.radius);
      const sprite = new Sprite(texOf(makeGlowCanvas(r, light.color)));
      sprite.anchor.set(0.5);
      sprite.x = light.x;
      sprite.y = light.y;
      sprite.scale.set(light.radius / r);
      sprite.blendMode = "add";
      sprite.alpha = baseAlpha;
      sprite.zIndex = Z_LIGHTS;
      world.addChild(sprite);
      lights.push({ sprite, baseAlpha, kind, seed });
    };
    addGlow(key, "key", key.intensity * 0.45, 1);
    (lighting.fills ?? []).forEach((f, i) => {
      addGlow(resolveLight(f, sceneW, sceneH), "fill", f.intensity * 0.6, i + 2);
    });
    for (const ray of fx.rays) {
      const sprite = new Sprite(texOf(makeConeCanvas(ray.spread * sceneW, ray.length * sceneH, ray.color)));
      sprite.anchor.set(0.5, 0);
      sprite.x = ray.x * sceneW;
      sprite.y = ray.y * sceneH;
      sprite.blendMode = "add";
      sprite.alpha = ray.intensity;
      sprite.zIndex = Z_LIGHTS + 1;
      world.addChild(sprite);
      lights.push({ sprite, baseAlpha: ray.intensity, kind: "ray", seed: 0 });
    }
    if (fx.strobe) {
      const sprite = new Sprite(Texture.WHITE);
      sprite.width = sceneW + BACK_BLEED_PX * 2;
      sprite.height = sceneH + BACK_BLEED_PX * 2;
      sprite.x = -BACK_BLEED_PX;
      sprite.y = -BACK_BLEED_PX;
      sprite.tint = fx.strobe.color;
      sprite.blendMode = "add";
      sprite.alpha = 0;
      sprite.zIndex = Z_LIGHTS + 2;
      world.addChild(sprite);
      lights.push({ sprite, baseAlpha: fx.strobe.intensity, kind: "strobe", seed: 0 });
    }

    // ── Dust ──
    const motes: Sprite[] = [];
    if (fx.dust) {
      const moteTex = texOf(makeMoteCanvas(fx.dust.color));
      for (let i = 0; i < fx.dust.count; i++) {
        const sprite = new Sprite(moteTex);
        sprite.anchor.set(0.5);
        sprite.blendMode = "add";
        sprite.zIndex = Z_DUST;
        world.addChild(sprite);
        motes.push(sprite);
      }
    }

    // ── Actors ──
    const actors: ActorState[] = [];
    for (const actorDef of nextScene.actors) {
      const actorTextures = paintFrames(actorDef, actorDef.animation).map(texOf);
      const endTextures = actorDef.endAnimation
        ? paintFrames(actorDef, actorDef.endAnimation).map(texOf)
        : null;

      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 56;
      shadowCanvas.height = 18;
      const shadowContext = shadowCanvas.getContext("2d")!;
      const sg = shadowContext.createRadialGradient(28, 9, 2, 28, 9, 26);
      sg.addColorStop(0, alpha(C.shadow, 0.5));
      sg.addColorStop(0.6, alpha(C.shadow, 0.3));
      sg.addColorStop(1, alpha(C.shadow, 0));
      shadowContext.fillStyle = sg;
      shadowContext.beginPath();
      shadowContext.ellipse(28, 9, 26, 8, 0, 0, Math.PI * 2);
      shadowContext.fill();
      const shadow = new Sprite(texOf(shadowCanvas));
      shadow.anchor.set(0.5);
      world.addChild(shadow);

      // Rim light: a tinted copy offset toward the scene accent, so the flat
      // sprite catches the room's light colour along one edge.
      const rim = new Sprite(actorTextures[0]);
      rim.anchor.set(0.5, 1);
      rim.tint = fx.rim;
      rim.alpha = 0.22;
      world.addChild(rim);

      const sprite = new Sprite(actorTextures[0]);
      sprite.anchor.set(0.5, 1);
      world.addChild(sprite);

      actors.push({
        def: actorDef,
        sprite,
        shadow,
        rim,
        textures: actorTextures,
        walkTextures: actorTextures,
        endTextures,
        pathEndMs: pathEnd(actorDef),
        usingEnd: false,
        intervalMs: CHAR_ANIM_INTERVAL_MS[actorDef.animation],
        frameIdx: 0,
        frameTimer: 0,
      });
    }

    const now = performance.now();
    const hasPreviousShot = layersRef.current.length > 0;
    const reduced = reducedMotionRef.current;
    // Cut by default; dissolve only when the shot opts in (reserved for
    // time/place jumps). Reduced motion always hard-cuts.
    const transition = hasPreviousShot && !reduced ? nextScene.transition ?? "cut" : "cut";
    const dissolve = transition === "dissolve";

    if (dissolve) {
      for (const layer of layersRef.current) {
        if (layer.leavingAt === undefined) layer.leavingAt = now;
      }
    } else {
      for (const layer of layersRef.current) destroyLayer(layer);
      layersRef.current = [];
    }

    const flashes = [...(nextScene.flashes ?? [])];
    const glitches = [...(nextScene.glitches ?? [])];
    if (transition === "flash") {
      flashes.push({ atMs: 0, durationMs: TRANSITION_FLASH_MS, color: fx.rim, intensity: 0.7 });
    }
    if (transition === "glitch") {
      glitches.push({ atMs: 0, durationMs: TRANSITION_GLITCH_MS });
    }

    world.alpha = dissolve ? 0 : 1;
    app.stage.addChild(world);
    layersRef.current.push({
      world,
      back,
      fore,
      lights,
      motes,
      actors,
      textures,
      scene: nextScene,
      key,
      flashes,
      glitches,
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

      const sceneW = width + SCENE_PADDING * 2;
      const sceneH = height + SCENE_PADDING;
      let postDirty = false;

      app.ticker.add(() => {
        const now = performance.now();
        const reduced = reducedMotionRef.current;
        let postLevel = 0;
        let postColor: string = C.highlight;
        let postGlitch = 0;
        let postTime = 0;

        for (const layer of [...layersRef.current]) {
          const { scene: shot } = layer;
          const dur = Math.max(1, shot.durationMs);
          let elapsed = now - layer.startedAt;
          const looping = loopRef.current;
          if (looping === "restart") {
            elapsed %= dur;
          } else if (looping === "pingpong") {
            const m = elapsed % (dur * 2);
            elapsed = m <= dur ? m : dur * 2 - m;
          }

          const camera = getCameraPos(shot.camera, elapsed);

          // Auto push-in on static (single-keyframe) shots — eases the base
          // zoom up by AUTO_PUSH_IN over the shot. Multi-keyframe shots use
          // their authored zoom only.
          let zoom = camera.zoom;
          if (!reduced && shot.camera.length === 1) {
            const pushT = easeInOutCubic(clamp01(elapsed / dur));
            zoom = (shot.camera[0].zoom ?? 1) + AUTO_PUSH_IN * pushT;
          }

          const worldScale = CINEMATIC_WORLD_SCALE * zoom;

          // camera.{x,y} is the world-space point centered in the viewport.
          // Clamp it so the visible rect never slides past the scene bounds.
          const halfViewW = width / 2 / worldScale;
          const halfViewH = height / 2 / worldScale;
          const centerX = Math.min(Math.max(camera.x, halfViewW), sceneW - halfViewW);
          const centerY = Math.min(Math.max(camera.y, halfViewH), sceneH - halfViewH);

          // Camera body: idle sway + impact shake + dutch tilt. All keyed off
          // scene-elapsed time (deterministic for captures). Off under
          // reduced motion.
          let offX = 0;
          let offY = 0;
          let rot = 0;
          const glitch = reduced ? 0 : glitchLevel(elapsed, layer.glitches);
          if (!reduced) {
            const sway = swayOffset(elapsed);
            const shake = shakeOffset(elapsed, shot.shakes);
            offX = sway.x + shake.x;
            offY = sway.y + shake.y;
            rot = sway.rot + shake.rot + dutchAngle(elapsed, shot.dutch);
            if (glitch > 0) {
              const frame = Math.floor(elapsed / 45);
              offX += (hash01(frame * 3 + 1) - 0.5) * 18 * glitch;
              offY += (hash01(frame * 3 + 2) - 0.5) * 6 * glitch;
            }
          }

          layer.world.scale.set(worldScale);
          layer.world.pivot.set(centerX, centerY);
          layer.world.rotation = rot;
          layer.world.skew.x = glitch > 0 ? 0.03 * glitch * Math.sin(elapsed * 0.09) : 0;
          layer.world.x = width / 2 + offX;
          layer.world.y = height / 2 + offY;

          // Parallax: planes slide relative to the actor plane by their factor.
          layer.back.x = -BACK_BLEED_PX + parallaxOffset(PARALLAX.back, centerX, sceneW / 2);
          layer.back.y = -BACK_BLEED_PX + parallaxOffset(PARALLAX.back, centerY, sceneH / 2);
          if (layer.fore) {
            layer.fore.x = parallaxOffset(PARALLAX.fore, centerX, sceneW / 2);
            layer.fore.y = parallaxOffset(PARALLAX.fore, centerY, sceneH / 2);
          }

          // Lights: key flickers, practicals pulse, the beacon sweeps.
          const fx = SCENE_FX[shot.background];
          const flick = reduced ? 1 : flickerLevel(elapsed, fx.flicker);
          let strobe = 0;
          for (const light of layer.lights) {
            switch (light.kind) {
              case "key":
                light.sprite.alpha = light.baseAlpha * flick;
                break;
              case "ray":
                light.sprite.alpha = light.baseAlpha * (0.7 + 0.3 * flick);
                break;
              case "fill":
                light.sprite.alpha = light.baseAlpha * pulseLevel(elapsed, fx.pulse.periodMs, fx.pulse.depth, light.seed);
                break;
              case "strobe":
                strobe = fx.strobe ? strobeLevel(elapsed, fx.strobe) : 0;
                light.sprite.alpha = strobe;
                break;
            }
          }

          // Dust drifting through the light.
          if (fx.dust && layer.motes.length > 0) {
            const visible = !reduced;
            for (let i = 0; i < layer.motes.length; i++) {
              const m = dustMote(fx.dust, i, elapsed, sceneW, sceneH);
              const s = layer.motes[i];
              s.visible = visible;
              s.x = m.x;
              s.y = m.y;
              s.alpha = m.alpha * (0.6 + 0.4 * flick);
              s.scale.set(m.size / 2);
            }
          }

          for (const actor of layer.actors) {
            const position = getActorPos(actor.def, elapsed);
            const ds = depthScale(shot.background, position.y, sceneH) * (actor.def.scale ?? 1);
            const lightDir = Math.sign(position.x - layer.key.x) || 1;

            actor.sprite.x = position.x;
            actor.sprite.y = position.y;
            actor.sprite.scale.set(ds);
            actor.sprite.zIndex = position.y + 2;
            actor.sprite.tint = actorTint(
              position.x,
              position.y - 60 * ds,
              layer.key,
              fx.strobe ? { color: fx.strobe.color, level: strobe * 1.4 } : undefined,
            );

            actor.rim.x = position.x - lightDir * 2;
            actor.rim.y = position.y - 2;
            actor.rim.scale.set(ds);
            actor.rim.zIndex = position.y + 1;

            actor.shadow.x = position.x + lightDir * 7 * ds;
            actor.shadow.y = position.y - 2;
            actor.shadow.scale.set(ds * 1.05, ds);
            actor.shadow.zIndex = position.y - 1;

            // Walk → end animation once the path has been covered.
            if (actor.endTextures && !actor.usingEnd && elapsed >= actor.pathEndMs) {
              actor.usingEnd = true;
              actor.textures = actor.endTextures;
              actor.intervalMs = CHAR_ANIM_INTERVAL_MS[actor.def.endAnimation!];
              actor.frameIdx = 0;
              actor.frameTimer = 0;
              actor.sprite.texture = actor.textures[0];
              actor.rim.texture = actor.textures[0];
            } else if (actor.endTextures && actor.usingEnd && elapsed < actor.pathEndMs) {
              // Looped playback rewound past the switch point.
              actor.usingEnd = false;
              actor.textures = actor.walkTextures;
              actor.intervalMs = CHAR_ANIM_INTERVAL_MS[actor.def.animation];
              actor.frameIdx = 0;
              actor.sprite.texture = actor.textures[0];
              actor.rim.texture = actor.textures[0];
            }

            actor.frameTimer += app.ticker.deltaMS;
            if (actor.frameTimer >= actor.intervalMs) {
              actor.frameTimer %= actor.intervalMs;
              actor.frameIdx = (actor.frameIdx + 1) % actor.textures.length;
              actor.sprite.texture = actor.textures[actor.frameIdx];
              actor.rim.texture = actor.textures[actor.frameIdx];
            }
          }

          // Post: flash + glitch bands are drawn on the 2D overlay canvas.
          if (!reduced) {
            const flash = flashLevel(elapsed, layer.flashes);
            if (flash.level > postLevel) {
              postLevel = flash.level;
              postColor = flash.color;
            }
            if (glitch > postGlitch) {
              postGlitch = glitch;
              postTime = elapsed;
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

        const post = postRef.current;
        if (post) {
          const ctx = post.getContext("2d");
          if (ctx) {
            if (postLevel > 0 || postGlitch > 0) {
              ctx.clearRect(0, 0, width, height);
              if (postLevel > 0) {
                ctx.fillStyle = alpha(postColor, postLevel);
                ctx.fillRect(0, 0, width, height);
              }
              if (postGlitch > 0) {
                for (const band of glitchBands(postTime, postGlitch, height)) {
                  ctx.fillStyle = alpha(C.signalBright, 0.16 * postGlitch);
                  ctx.fillRect(band.dx, band.y, width, band.h);
                  ctx.fillStyle = alpha(C.dangerBright, 0.12 * postGlitch);
                  ctx.fillRect(-band.dx * 0.6, band.y + 1, width, Math.max(1, band.h * 0.4));
                  ctx.fillStyle = alpha(C.highlight, 0.35 * postGlitch);
                  ctx.fillRect(0, band.y, width, 1);
                }
              }
              postDirty = true;
            } else if (postDirty) {
              ctx.clearRect(0, 0, width, height);
              postDirty = false;
            }
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

      {/* Post layer: flashes + signal-tear bands, above the CRT stack. */}
      <canvas
        ref={postRef}
        width={width}
        height={height}
        className="absolute inset-0 z-20 pointer-events-none h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
