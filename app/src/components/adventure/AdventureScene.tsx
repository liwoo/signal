"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import { C } from "@/lib/sprites/palette";
import { createSim, stepSim, drainEvents, currentObjective, objectiveTarget, interactPrompt, interactionProgress, patrolProximity, DEFAULT_GUARD_HALF_ANGLE, DEFAULT_GUARD_RANGE } from "@/lib/adventure/sim";
import { visionPolygon } from "@/lib/adventure/grid";
import { buildWorld, setWallHeight, updateConeGeometry, blobShadowTexture, radialGlowTexture, THEMES, WALL_H, CUTAWAY_H } from "@/lib/adventure/world";
import type { World } from "@/lib/adventure/world";
import { WALKABLE } from "@/lib/adventure/types";
import type { AdventureLevel, SimEvent, SimInput, SimState } from "@/lib/adventure/types";
import {
  SpriteActor, makeActor, setActorAnim, tickActor, disposeActor, walkAnimFor, lightLevelAt, SPRITE_W, SPRITE_H,
} from "./scene-actors";

/** What the HUD needs each frame (only re-sent when something changes). */
export interface AdventureSnapshot {
  objectiveIndex: number;
  objectiveCount: number;
  stake: string;
  thought: string | null;
  alert: number;
  seen: boolean;
  hidden: boolean;
  status: SimState["status"];
  prompt: string | null;
  progress: number;
  captures: number;
  alarm: boolean;
  /** Maya is walking a queued path (so the HUD can hint tap-to-cancel). */
  walking: boolean;
  moving: boolean;
  crawling: boolean;
  /** 0..1 how close the nearest patrolling guard is (quantised) — the HUD's patrol call-out. */
  patrol: number;
  /** 0..1 how close the nearest guard mid-stride is (quantised) — his footsteps. */
  boots: number;
}

export interface AdventureApi {
  rotate: (delta: number) => void;
  interact: () => void;
  zoom: (delta: number) => void;
}

interface AdventureSceneProps {
  level: AdventureLevel;
  onSnapshot: (snapshot: AdventureSnapshot) => void;
  onEvent: (event: SimEvent, state: SimState) => void;
  apiRef: React.MutableRefObject<AdventureApi | null>;
  /** Called once if WebGL can't start, so the caller can fall back. */
  onUnsupported: () => void;
  /** Freeze the simulation (the world keeps rendering) — e.g. while a found chapter is shown. */
  paused?: boolean;
  compact?: boolean;
  className?: string;
}

const PIXEL_SCALE = 0.72;
const CAM_PITCH = 0.95;
// Far enough back that Maya's whole cell AND the corridor the patrol walks are
// in frame (playtest: at 14 the corridor was off the top of the screen and the
// guard arrived unseen).
const CAM_DIST = 17;
const CAM_DIST_COMPACT = 14;
const CAM_YAW = -0.55;
const CAM_FOV = 30;
// Never so close that a hanging fixture or the objective beacon fills the frame.
const CAM_DIST_MIN = 10;
const CAM_DIST_MAX = 22;
const CAM_PITCH_MIN = 0.72;
const CAM_PITCH_MAX = 1.25;
/** The camera leans toward a guard within CAM_LEAN_RANGE tiles: this share of the gap, at most CAM_LEAN_MAX tiles. */
const CAM_LEAN = 0.45;
const CAM_LEAN_MAX = 3.2;
const CAM_LEAN_RANGE = 14;
/** ...and toward the current objective: this share of the gap, at most CAM_LEAN_GOAL_MAX tiles. */
const CAM_LEAN_GOAL = 0.35;
const CAM_LEAN_GOAL_MAX = 2.4;
/** Overhead fixtures within this distance (world units) of the camera→Maya sightline fade out. */
const OCCLUDER_CLEARANCE = 1.1;

function snapshotOf(state: SimState): AdventureSnapshot {
  const objective = currentObjective(state);
  return {
    objectiveIndex: state.objectiveIndex,
    objectiveCount: state.level.objectives.length,
    stake: objective?.stake ?? "",
    thought: state.thought,
    alert: Math.round(state.alert * 40) / 40,
    seen: state.guards.some((g) => g.seesMaya),
    hidden: state.maya.hidden,
    status: state.status,
    prompt: interactPrompt(state),
    progress: Math.round(interactionProgress(state) * 50) / 50,
    captures: state.captures,
    alarm: state.alarm,
    walking: state.maya.path !== null,
    moving: state.maya.moving,
    crawling: state.maya.crawling,
    patrol: Math.round(patrolProximity(state) * 4) / 4,
    boots: Math.round(patrolProximity(state, true) * 4) / 4,
  };
}

function sameSnapshot(a: AdventureSnapshot | null, b: AdventureSnapshot): boolean {
  if (!a) return false;
  return (
    a.objectiveIndex === b.objectiveIndex && a.stake === b.stake && a.thought === b.thought &&
    a.alert === b.alert && a.seen === b.seen && a.hidden === b.hidden && a.status === b.status &&
    a.prompt === b.prompt && a.progress === b.progress && a.captures === b.captures &&
    a.alarm === b.alarm && a.walking === b.walking && a.moving === b.moving && a.crawling === b.crawling &&
    a.patrol === b.patrol && a.boots === b.boots
  );
}

/**
 * The 3D stage. One WebGL renderer per level, the simulation stepped in the
 * RAF loop, React only notified when the HUD-relevant snapshot changes.
 */
export function AdventureScene({ level, onSnapshot, onEvent, apiRef, onUnsupported, paused = false, compact = false, className = "" }: AdventureSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const onSnapshotRef = useRef(onSnapshot);
  const onEventRef = useRef(onEvent);
  const onUnsupportedRef = useRef(onUnsupported);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onUnsupportedRef.current = onUnsupported; }, [onUnsupported]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // A fresh canvas per mount: a canvas whose context was lost by a previous
    // mount (React strict-mode double-invoke) would hand back the dead context.
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full cursor-crosshair select-none";
    canvas.style.imageRendering = "pixelated";
    canvas.style.touchAction = "none";
    canvas.setAttribute("aria-label", `${level.title} — steer maya`);
    container.appendChild(canvas);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
      if (!renderer.getContext() || renderer.getContext().isContextLost()) throw new Error("lost");
    } catch {
      container.removeChild(canvas);
      onUnsupportedRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * PIXEL_SCALE);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = false;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const theme = THEMES[level.theme];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.fog);
    scene.fog = new THREE.Fog(theme.fog, 14, 34);

    const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    const hemi = new THREE.HemisphereLight(theme.ambient, theme.fog, 2.4);
    scene.add(hemi);

    // ── Simulation ──
    let sim = createSim(level);
    const world: World = buildWorld(sim.grid, level.theme, level.lights);
    scene.add(world.group);

    // ── Actors ──
    const shadowTex = blobShadowTexture();
    const maya = makeActor((a) => paintMayaFrames(a, 2), shadowTex, "#ffffff");
    scene.add(maya.sprite, maya.shadow);
    const guards = sim.guards.map(() => {
      const g = makeActor((a) => paintGuardFrames(a, 2), shadowTex, "#ffffff");
      scene.add(g.sprite, g.shadow);
      return g;
    });
    const npcs: { actor: SpriteActor; x: number; z: number }[] = [];
    for (const tile of sim.grid.interactables.values()) {
      if (tile.kind !== "npc") continue;
      // Reeves: Maya's frames as a desaturated, half-lit silhouette — someone
      // else in the dark, not her twin.
      const actor = makeActor((a) => paintMayaFrames(a, 2), shadowTex, "#3a4658");
      actor.sprite.scale.set(SPRITE_W * 1.08, SPRITE_H * 1.08, 1);
      actor.sprite.userData.id = tile.id;
      scene.add(actor.sprite, actor.shadow);
      npcs.push({ actor, x: tile.x + 0.5, z: tile.y + 0.5 });
      world.pickables.push(actor.sprite);
    }

    // ── Vision cones + flashlights ──
    const cones = sim.guards.map(() => {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.MeshBasicMaterial({ color: C.alertBright, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = 0.035;
      scene.add(mesh);
      const light = new THREE.SpotLight(C.lightWarm, 34, 7, 0.7, 0.45, 1.4);
      light.position.y = 1.45;
      scene.add(light, light.target);
      return { mesh, material, light };
    });

    // ── Off-screen patrol markers ──
    // A guard you can't see yet still shows up: an amber arrow on the screen
    // edge pointing at him, from the moment he's warned about until he walks
    // into frame. Plain DOM nudged from the loop (no React render per frame).
    const edgeMarkers = sim.guards.map(() => {
      const el = document.createElement("div");
      el.className = "pointer-events-none absolute left-0 top-0 z-10 flex items-center gap-1 font-[family-name:var(--font-display)] text-[8px] tracking-[0.3em]";
      el.style.color = "var(--color-alert)";
      el.style.textShadow = "0 0 8px var(--color-alert)";
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
      // A clipped square, not a "▲" glyph — font fallbacks drew it sideways.
      const arrow = document.createElement("span");
      arrow.style.display = "inline-block";
      arrow.style.width = "14px";
      arrow.style.height = "14px";
      arrow.style.background = "var(--color-alert)";
      arrow.style.clipPath = "polygon(50% 0, 100% 100%, 50% 72%, 0 100%)";
      const label = document.createElement("span");
      label.textContent = "PATROL";
      el.append(arrow, label);
      container.appendChild(el);
      return { el, arrow };
    });
    const projected = new THREE.Vector3();

    // ── Objective marker + path dots ──
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.52, 24),
      new THREE.MeshBasicMaterial({ color: C.signalBright, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    scene.add(ring);
    const dotGeo = new THREE.CircleGeometry(0.07, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: C.signalMid, transparent: true, opacity: 0.8, depthWrite: false });
    const dots = new THREE.InstancedMesh(dotGeo, dotMat, 96);
    dots.count = 0;
    scene.add(dots);

    // ── Objective beacon ──
    // A bright marker that hovers above the current objective's prop and draws
    // ON TOP of the walls (depthTest off), so the terminal / panel / book you
    // need is never lost behind geometry. A soft light at its foot lifts the
    // prop itself out of the dark. No pole down to the prop: chevron-on-a-beam
    // read as a street lamp in playtests ("the marker is under the lamp").
    const beacon = new THREE.Group();
    beacon.renderOrder = 999;
    const beaconMat = new THREE.MeshBasicMaterial({ color: C.signalBright, transparent: true, opacity: 1, depthTest: false, depthWrite: false });
    const chevron = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.66, 4), beaconMat);
    chevron.rotation.x = Math.PI; // point the tip down at the prop
    chevron.rotation.y = Math.PI / 4;
    chevron.renderOrder = 1000;
    beacon.add(chevron);
    const haloMat = new THREE.SpriteMaterial({ map: radialGlowTexture(), color: C.signalBright, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(1.8, 1.8, 1);
    beacon.add(halo);
    const beaconLight = new THREE.PointLight(C.signalBright, 0, 4.5, 2);
    beacon.add(beaconLight);
    beacon.visible = false;
    scene.add(beacon);

    // ── Dust ──
    const dustCount = reducedMotion ? 0 : 160;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = Math.random() * sim.grid.width;
      dustPositions[i * 3 + 1] = Math.random() * WALL_H;
      dustPositions[i * 3 + 2] = Math.random() * sim.grid.height;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: theme.key, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(dust);

    // ── Camera state ──
    const cam = {
      yaw: CAM_YAW,
      pitch: CAM_PITCH,
      dist: compact ? CAM_DIST_COMPACT : CAM_DIST,
      /** The framing the player chose (wheel / pinch); the camera returns here after a capture. */
      userDist: compact ? CAM_DIST_COMPACT : CAM_DIST,
      lean: new THREE.Vector2(0, 0),
      target: new THREE.Vector3(sim.maya.x, 0, sim.maya.y),
      shake: 0,
    };
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const tint = new THREE.Color();
    // A scratch camera for framing decisions: would this point sit inside the
    // frame (NDC within ±margin) if the camera looked at (tx, tz)?
    const probeCam = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    const probePt = new THREE.Vector3();
    const framed = (tx: number, tz: number, px: number, pz: number, margin: number): boolean => {
      const cp = Math.cos(cam.pitch);
      probeCam.aspect = camera.aspect;
      probeCam.updateProjectionMatrix();
      probeCam.position.set(tx + Math.sin(cam.yaw) * cp * cam.userDist, Math.sin(cam.pitch) * cam.userDist, tz + Math.cos(cam.yaw) * cp * cam.userDist);
      probeCam.lookAt(tx, 0.7, tz);
      probeCam.updateMatrixWorld();
      probePt.set(px, 0.8, pz).project(probeCam);
      return probePt.z < 1 && Math.abs(probePt.x) < margin && Math.abs(probePt.y) < margin;
    };
    const sightFrom = new THREE.Vector3();
    const sightTo = new THREE.Vector3();
    const sightLine = new THREE.Line3();

    // ── Input ──
    const keys = new Set<string>();
    let interactEdge = false;
    let clickMove: { x: number; y: number } | null = null;
    let clickInteract: string | null = null;
    const pointer = { down: false, dragging: false, x: 0, y: 0, startX: 0, startY: 0, id: -1 };
    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (pausedRef.current) return; // a card is up — its own handler owns the keys
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "e", "enter", "q", "r"].includes(k)) e.preventDefault();
      if (k === " " || k === "e" || k === "enter") { if (!keys.has(k)) interactEdge = true; }
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); };
    const onBlur = () => keys.clear();

    const pick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(world.pickables, false);
      const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
      const hit = hits.find((h) => (h.object.userData.id || h.object.userData.tile) && shown(h.object.parent));
      if (hit?.object.userData.id) {
        // An object: walk to the nearest spot beside it and use it.
        clickInteract = hit.object.userData.id as string;
        return;
      }
      if (hit?.object.userData.tile) {
        // Furniture: walk up beside it (the sim picks the spot).
        const t = hit.object.userData.tile as { x: number; y: number };
        clickMove = { x: t.x + 0.5, y: t.y + 0.5 };
        return;
      }
      if (raycaster.ray.intersectPlane(floorPlane, tmp)) clickMove = { x: tmp.x, y: tmp.z };
    };
    const onPointerDown = (e: PointerEvent) => {
      if (pointer.down) return;
      pointer.down = true;
      pointer.dragging = false;
      pointer.id = e.pointerId;
      pointer.x = pointer.startX = e.clientX;
      pointer.y = pointer.startY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointer.down || e.pointerId !== pointer.id) return;
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.dragging && Math.hypot(e.clientX - pointer.startX, e.clientY - pointer.startY) > 8) pointer.dragging = true;
      if (pointer.dragging) {
        cam.yaw -= dx * 0.0062;
        cam.pitch = Math.min(CAM_PITCH_MAX, Math.max(CAM_PITCH_MIN, cam.pitch + dy * 0.004));
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pointer.down || e.pointerId !== pointer.id) return;
      pointer.down = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (!pointer.dragging) pick(e.clientX, e.clientY);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.userDist = Math.min(CAM_DIST_MAX, Math.max(CAM_DIST_MIN, cam.userDist + e.deltaY * 0.012));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    apiRef.current = {
      rotate: (delta) => { cam.yaw += delta; },
      interact: () => { interactEdge = true; },
      zoom: (delta) => { cam.userDist = Math.min(CAM_DIST_MAX, Math.max(CAM_DIST_MIN, cam.userDist + delta)); },
    };

    // ── Resize ──
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ── Loop ──
    let raf = 0;
    let last = performance.now();
    let lastSnapshot: AdventureSnapshot | null = null;
    let disposed = false;
    const alarmPhase = { t: 0 };
    let coneTick = 0;
    const mayaTint = new THREE.Color();

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dtMs = Math.min(50, now - last);
      last = now;
      const t = now / 1000;

      // Camera basis on the floor plane.
      forward.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)).normalize();
      // Screen-right = forward × up.
      right.set(-forward.z, 0, forward.x);

      // Keyboard → world-space move vector.
      let mx = 0;
      let mz = 0;
      const kx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      const kz = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      if (kx !== 0 || kz !== 0) {
        mx = right.x * kx + forward.x * kz;
        mz = right.z * kx + forward.z * kz;
      }
      if (keys.has("q")) cam.yaw += dtMs * 0.0018;
      if (keys.has("r")) cam.yaw -= dtMs * 0.0018;

      const input: SimInput = {
        move: { x: mx, y: mz },
        interact: interactEdge,
        moveTo: clickMove ?? undefined,
        interactWith: clickInteract ?? undefined,
      };
      interactEdge = false;
      clickMove = null;
      clickInteract = null;

      const prevStatus = sim.status;
      if (pausedRef.current) { keys.clear(); interactEdge = false; clickMove = null; clickInteract = null; }
      else sim = stepSim(sim, input, dtMs);
      const events = pausedRef.current ? [] : drainEvents(sim);
      for (const ev of events) {
        if (ev.type === "shake") cam.shake = Math.max(cam.shake, ev.intensity * 0.02);
        if (ev.type === "captured") cam.shake = Math.max(cam.shake, 0.16);
        onEventRef.current(ev, sim);
      }
      if (sim.status === "ending" && prevStatus !== "ending") cam.shake = 0;

      // ── Maya ──
      const m = sim.maya;
      maya.sprite.position.set(m.x, 0, m.y);
      maya.shadow.position.set(m.x, 0.02, m.y);
      let anim: CharAnimation = m.anim;
      if (m.anim === "walk-right" || m.anim === "crawl-right") {
        anim = walkAnimFor(m.facing.x, m.facing.y, right, forward, m.crawling);
      }
      setActorAnim(maya, anim);
      tickActor(maya, dtMs);
      lightLevelAt(m.x, m.y, world.lights, mayaTint);
      if (sim.alarm) mayaTint.lerp(tint.set(C.dangerBright), 0.25 + 0.2 * Math.sin(t * 9));
      if (m.hidden) mayaTint.multiplyScalar(0.55);
      maya.material.color.copy(mayaTint);
      maya.material.opacity = m.hidden ? 0.8 : 1;

      // ── Guards ──
      coneTick++;
      sim.guards.forEach((g, i) => {
        const actor = guards[i];
        const cone = cones[i];
        const visible = g.active && !g.gone;
        actor.sprite.visible = visible;
        actor.shadow.visible = visible;
        cone.mesh.visible = visible;
        cone.light.visible = visible;
        if (!visible) return;
        actor.sprite.position.set(g.x, 0, g.y);
        actor.shadow.position.set(g.x, 0.02, g.y);
        const fx = Math.cos(g.angle);
        const fz = Math.sin(g.angle);
        setActorAnim(actor, g.moving ? walkAnimFor(fx, fz, right, forward, false) : "idle");
        tickActor(actor, dtMs);
        lightLevelAt(g.x, g.y, world.lights, tint);
        tint.multiplyScalar(0.9);
        if (g.seesMaya) tint.lerp(new THREE.Color(C.dangerBright), 0.5);
        actor.material.color.copy(tint);

        const def = level.guards[i];
        const halfAngle = def.halfAngle ?? DEFAULT_GUARD_HALF_ANGLE;
        const range = def.range ?? DEFAULT_GUARD_RANGE;
        if ((coneTick + i) % 2 === 0) {
          updateConeGeometry(cone.mesh.geometry, visionPolygon(sim.grid, g, g.angle, halfAngle, range, sim.openDoors, 18));
        }
        const heat = g.seesMaya ? 1 : Math.min(1, sim.alert * 1.5);
        cone.material.color.set(C.alertBright).lerp(tint.set(C.dangerBright), heat);
        // Readable at a glance: the cone is the thing a first-timer must learn to avoid.
        cone.material.opacity = 0.2 + heat * 0.14;
        cone.light.position.set(g.x, 1.45, g.y);
        cone.light.target.position.set(g.x + fx * range, 0, g.y + fz * range);
        cone.light.angle = halfAngle;
        cone.light.distance = range + 1.2;
        cone.light.color.set(C.lightWarm).lerp(tint.set(C.dangerBright), heat);
      });

      // ── NPCs ──
      for (const npc of npcs) {
        npc.actor.sprite.position.set(npc.x, 0, npc.z);
        npc.actor.shadow.position.set(npc.x, 0.02, npc.z);
        tickActor(npc.actor, dtMs);
        lightLevelAt(npc.x, npc.z, world.lights, tint);
        tint.lerp(npc.actor.tint, 0.75);
        npc.actor.material.color.copy(tint);
      }

      // ── Objective marker + path dots ──
      const objective = currentObjective(sim);
      const target = objectiveTarget(sim, objective);
      if (target && sim.status === "playing") {
        ring.visible = true;
        ring.position.x = target.x + 0.5;
        ring.position.z = target.y + 0.5;
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ring.scale.setScalar(1 + pulse * 0.22);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.45;
        if (!WALKABLE.has(target.kind)) ring.position.y = 0.05;

        // Beacon: hovers over the objective and shows through walls so the
        // thing to use is always obvious. It bobs a little way above the prop
        // (lower over a plain floor spot), pointing straight down at it.
        const foot = !WALKABLE.has(target.kind) ? 1.0 : 0.15;
        const bob = Math.abs(Math.sin(t * 3)) * 0.22;
        const chevY = foot + 1.35 + bob;
        // Once Maya is at the spot the beacon has done its job — and it draws
        // over everything, so standing under it would hide her (playtest: "the
        // lamp blocks the view"). Fade it out as she arrives; the floor ring stays.
        const near = Math.hypot(target.x + 0.5 - m.x, target.y + 0.5 - m.y);
        const show = Math.min(1, Math.max(0, (near - 0.9) / 1.1));
        // (Toggle the meshes, not the group: hiding the group would drop its
        // light and force a shader recompile mid-walk.)
        beacon.visible = true;
        chevron.visible = halo.visible = show > 0.01;
        beacon.position.set(target.x + 0.5, 0, target.y + 0.5);
        chevron.position.y = chevY;
        chevron.scale.setScalar(0.8 + pulse * 0.2);
        beaconMat.opacity = show;
        halo.position.y = chevY;
        haloMat.opacity = (0.35 + pulse * 0.3) * show;
        beaconLight.position.y = foot + 0.4;
        beaconLight.intensity = (3.6 + pulse * 2.4) * Math.max(0.35, show);
      } else {
        ring.visible = false;
        beacon.visible = false;
        beaconLight.intensity = 0;
      }
      if (m.path && m.path.length > 0) {
        const n = Math.min(dots.instanceMatrix.count, m.path.length);
        const mtx = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          mtx.makeRotationX(-Math.PI / 2);
          mtx.setPosition(m.path[i].x, 0.03, m.path[i].y);
          dots.setMatrixAt(i, mtx);
        }
        dots.count = n;
        dots.instanceMatrix.needsUpdate = true;
      } else {
        dots.count = 0;
      }

      // ── Doors + emissive pulses + alarm ──
      for (const door of world.doors) {
        const open = sim.openDoors.has(door.id);
        door.openness += ((open ? 1 : 0) - door.openness) * Math.min(1, dtMs / 220);
        door.mesh.position.copy(door.closedPos).addScaledVector(door.slide, door.openness * 0.94);
        const lampMat = door.lamp.material as THREE.MeshStandardMaterial;
        lampMat.color.set(open ? C.signalBright : C.dangerMid);
        lampMat.emissive.set(open ? C.signalBright : C.dangerMid);
      }
      for (const obj of world.objects) {
        const isTarget = objective?.target === obj.id;
        if (obj.kind === "book") {
          const taken = sim.taken.has(obj.id);
          obj.mesh.visible = !taken;
          if (obj.light) obj.light.intensity = taken ? 0 : 2.4 + 1.6 * Math.sin(t * 3 + obj.seed) * (isTarget ? 1 : 0.4);
          continue;
        }
        const base = obj.kind === "terminal" ? 2.2 : obj.kind === "lockmaster" ? 2.6 : 1.8;
        const pulse = 0.85 + 0.15 * Math.sin(t * (obj.kind === "server" ? 7 : 3) + obj.seed);
        obj.glow.emissiveIntensity = base * pulse * (isTarget ? 1.5 : 1);
        if (obj.light) obj.light.intensity = (obj.kind === "terminal" ? 17 : obj.kind === "lockmaster" ? 20 : 11) * pulse * (isTarget ? 1.4 : 1);
      }
      if (sim.alarm) {
        alarmPhase.t += dtMs;
        const strobe = 0.5 + 0.5 * Math.sin(alarmPhase.t * 0.006);
        for (const l of world.alarmLights) l.intensity = 6 + strobe * 26;
        hemi.color.set(theme.ambient).lerp(tint.set(C.dangerDim), 0.35 + strobe * 0.4);
      } else {
        for (const l of world.alarmLights) l.intensity = 0;
        hemi.color.set(theme.ambient);
      }

      // ── Dust drift ──
      if (dustCount > 0) {
        const arr = dust.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          arr[i * 3 + 1] += Math.sin(t * 0.7 + i) * 0.0006 + 0.0002;
          arr[i * 3] += Math.cos(t * 0.5 + i * 1.3) * 0.0008;
          if (arr[i * 3 + 1] > WALL_H) arr[i * 3 + 1] = 0.1;
        }
        dust.geometry.attributes.position.needsUpdate = true;
      }

      // ── Camera ──
      let distTarget = cam.userDist;
      let pitchTarget = cam.pitch;
      // Framing: lean toward the objective, and toward the nearest patrol so he
      // and his cone are on screen before he's a danger (playtest: he arrived
      // off the top edge) — but only as far as keeps Maya and the objective
      // themselves comfortably in frame.
      let guardX = 0;
      let guardZ = 0;
      let nearest = CAM_LEAN_RANGE;
      for (const g of sim.guards) {
        if (!g.active || g.gone) continue;
        const d = Math.hypot(g.x - m.x, g.y - m.y);
        if (d >= nearest) continue;
        nearest = d;
        const k = Math.min(CAM_LEAN_MAX / Math.max(d, 0.001), CAM_LEAN);
        guardX = (g.x - m.x) * k;
        guardZ = (g.y - m.y) * k;
      }
      let goalX = 0;
      let goalZ = 0;
      if (target) {
        const ox = target.x + 0.5 - m.x;
        const oz = target.y + 0.5 - m.y;
        const k = Math.min(CAM_LEAN_GOAL_MAX / Math.max(Math.hypot(ox, oz), 0.001), CAM_LEAN_GOAL);
        goalX = ox * k;
        goalZ = oz * k;
      }
      let leanX = 0;
      let leanZ = 0;
      if (sim.status === "playing") {
        const goalVisibleAlone = !target || framed(m.x + goalX, m.y + goalZ, target.x + 0.5, target.y + 0.5, 0.86);
        for (const scale of [1, 0.6, 0.3, 0]) {
          let lx = goalX + guardX * scale;
          let lz = goalZ + guardZ * scale;
          const len = Math.hypot(lx, lz);
          if (len > CAM_LEAN_MAX) { lx *= CAM_LEAN_MAX / len; lz *= CAM_LEAN_MAX / len; }
          leanX = lx;
          leanZ = lz;
          const mayaOk = framed(m.x + lx, m.y + lz, m.x, m.y, 0.72);
          const goalOk = !target || !goalVisibleAlone || framed(m.x + lx, m.y + lz, target.x + 0.5, target.y + 0.5, 0.86);
          if (mayaOk && goalOk) break;
        }
      }
      const leanEase = Math.min(1, dtMs / 700);
      cam.lean.x += (leanX - cam.lean.x) * leanEase;
      cam.lean.y += (leanZ - cam.lean.y) * leanEase;
      let followX = m.x + cam.lean.x;
      let followZ = m.y + cam.lean.y;
      if (sim.status === "ending") {
        if (level.ending === "relinquish") {
          distTarget = 6.5;
          pitchTarget = 0.62;
          if (target) {
            followX = (m.x + target.x + 0.5) / 2;
            followZ = (m.y + target.y + 0.5) / 2;
          }
        } else {
          distTarget = 20;
          pitchTarget = 1.15;
        }
        cam.dist += (distTarget - cam.dist) * Math.min(1, dtMs / 900);
        cam.pitch += (pitchTarget - cam.pitch) * Math.min(1, dtMs / 900);
      } else if (sim.status === "captured") {
        // A short push-in on the capture...
        cam.dist += (Math.max(CAM_DIST_MIN, cam.userDist - 3) - cam.dist) * Math.min(1, dtMs / 500);
      } else {
        // ...and back out to the player's framing afterwards. (Playtest: the
        // capture zoom used to stick, leaving the camera jammed in close.)
        cam.dist += (distTarget - cam.dist) * Math.min(1, dtMs / 600);
      }
      const follow = Math.min(1, dtMs / 160);
      cam.target.x += (followX - cam.target.x) * follow;
      cam.target.z += (followZ - cam.target.z) * follow;
      const sway = reducedMotion ? 0 : 0.03;
      const sx = Math.sin(t * 0.6) * sway;
      const sz = Math.cos(t * 0.45) * sway;
      cam.shake *= Math.pow(0.0005, dtMs / 1000);
      if (cam.shake < 0.002) cam.shake = 0;
      const shx = (Math.random() - 0.5) * cam.shake * 2;
      const shy = (Math.random() - 0.5) * cam.shake * 2;
      const cp = Math.cos(cam.pitch);
      camera.position.set(
        cam.target.x + Math.sin(cam.yaw) * cp * cam.dist + sx + shx,
        Math.sin(cam.pitch) * cam.dist + shy,
        cam.target.z + Math.cos(cam.yaw) * cp * cam.dist + sz,
      );
      camera.lookAt(cam.target.x + shx, 0.7 + shy, cam.target.z);

      // ── Cutaway: walls between the camera and Maya drop to knee height ──
      let wallsDirty = false;
      for (const wi of world.wallInstances) {
        const relX = wi.x - m.x;
        const relZ = wi.z - m.y;
        const along = relX * forward.x + relZ * forward.z;
        const across = relX * right.x + relZ * right.z;
        const near = along < -0.6 && Math.abs(across) < 9;
        const goal = near ? CUTAWAY_H : WALL_H;
        if (Math.abs(wi.height - goal) > 0.01) {
          setWallHeight(world.walls, wi, wi.height + (goal - wi.height) * Math.min(1, dtMs / 140));
          wallsDirty = true;
        }
      }
      if (wallsDirty) world.walls.instanceMatrix.needsUpdate = true;

      // ── Occluders: hanging fixtures on the camera→Maya sightline fade out ──
      sightFrom.copy(camera.position);
      sightTo.set(m.x, 0.9, m.y);
      sightLine.set(sightFrom, sightTo);
      for (const o of world.overhead) {
        sightLine.closestPointToPoint(o.mesh.position, true, tmp);
        const blocking = tmp.distanceTo(o.mesh.position) < OCCLUDER_CLEARANCE;
        const goal = blocking ? 0.06 : 1;
        o.material.opacity += (goal - o.material.opacity) * Math.min(1, dtMs / 160);
        o.mesh.visible = o.material.opacity > 0.08;
      }

      // ── Off-screen patrol markers ──
      camera.updateMatrixWorld();
      sim.guards.forEach((g, i) => {
        const marker = edgeMarkers[i];
        const def = level.guards[i];
        const started = sim.time - sim.statusSince >= (def.delayMs ?? 0);
        const relevant = sim.status === "playing" && g.active && !g.gone && def.route.length > 1 &&
          (g.warned || (!def.warning && started)) && Math.hypot(g.x - m.x, g.y - m.y) < 16;
        if (!relevant) { marker.el.style.display = "none"; return; }
        projected.set(g.x, 1.0, g.y).project(camera);
        let px = projected.x;
        let py = projected.y;
        const behind = projected.z > 1;
        if (behind) { px = -px; py = -py; }
        if (!behind && Math.abs(px) < 0.92 && Math.abs(py) < 0.86) { marker.el.style.display = "none"; return; }
        const s = Math.max(Math.abs(px) / 0.88, Math.abs(py) / 0.8, 1e-3);
        px /= s;
        py /= s;
        const w = container.clientWidth;
        const h = container.clientHeight;
        const sx = (px * 0.5 + 0.5) * w;
        const sy = (-py * 0.5 + 0.5) * h;
        marker.el.style.display = "flex";
        marker.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
        marker.arrow.style.transform = `rotate(${Math.round((Math.atan2(px, py) * 180) / Math.PI)}deg)`;
      });

      renderer.render(scene, camera);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __adventure?: unknown }).__adventure = {
          sim,
          cam: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, tx: cam.target.x, tz: cam.target.z },
          // Scripted input for the visual probes (test-visual/probe-adventure.mjs).
          interactWith: (id: string) => { clickInteract = id; },
          moveTo: (x: number, y: number) => { clickMove = { x, y }; },
          // Where a world point lands on screen (CSS px) — lets probes click real props.
          toScreen: (x: number, y: number, h = 0) => {
            const p = new THREE.Vector3(x, h, y).project(camera);
            const r = canvas.getBoundingClientRect();
            return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
          },
        };
      }

      const snap = snapshotOf(sim);
      if (!sameSnapshot(lastSnapshot, snap)) {
        lastSnapshot = snap;
        onSnapshotRef.current(snap);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      apiRef.current = null;
      disposeActor(maya);
      for (const g of guards) disposeActor(g);
      for (const n of npcs) disposeActor(n.actor);
      for (const c of cones) { c.mesh.geometry.dispose(); c.material.dispose(); }
      for (const mk of edgeMarkers) mk.el.remove();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      chevron.geometry.dispose();
      beaconMat.dispose();
      haloMat.map?.dispose();
      haloMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      dustGeo.dispose();
      (dust.material as THREE.Material).dispose();
      shadowTex.dispose();
      world.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, [level, compact, apiRef]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`} />;
}
