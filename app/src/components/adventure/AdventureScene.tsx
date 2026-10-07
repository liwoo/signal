"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import { C } from "@/lib/sprites/palette";
import { createSim, stepSim, drainEvents, currentObjective, objectiveTarget, interactPrompt, interactionProgress, DEFAULT_GUARD_HALF_ANGLE, DEFAULT_GUARD_RANGE } from "@/lib/adventure/sim";
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
const CAM_DIST = 14;
const CAM_DIST_COMPACT = 11.5;
const CAM_YAW = -0.55;
const CAM_FOV = 30;
const CAM_DIST_MIN = 7;
const CAM_DIST_MAX = 22;

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
  };
}

function sameSnapshot(a: AdventureSnapshot | null, b: AdventureSnapshot): boolean {
  if (!a) return false;
  return (
    a.objectiveIndex === b.objectiveIndex && a.stake === b.stake && a.thought === b.thought &&
    a.alert === b.alert && a.seen === b.seen && a.hidden === b.hidden && a.status === b.status &&
    a.prompt === b.prompt && a.progress === b.progress && a.captures === b.captures &&
    a.alarm === b.alarm && a.walking === b.walking && a.moving === b.moving && a.crawling === b.crawling
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
    // prop itself out of the dark.
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
    const beamMat = new THREE.MeshBasicMaterial({ color: C.signalBright, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true), beamMat);
    beam.renderOrder = 998;
    beacon.add(beam);
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
      target: new THREE.Vector3(sim.maya.x, 0, sim.maya.y),
      shake: 0,
    };
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const tint = new THREE.Color();

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
      const hit = hits.find((h) => h.object.userData.id);
      if (hit) {
        clickInteract = hit.object.userData.id as string;
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
        cam.pitch = Math.min(1.25, Math.max(0.55, cam.pitch + dy * 0.004));
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
      cam.dist = Math.min(CAM_DIST_MAX, Math.max(CAM_DIST_MIN, cam.dist + e.deltaY * 0.012));
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
      zoom: (delta) => { cam.dist = Math.min(CAM_DIST_MAX, Math.max(CAM_DIST_MIN, cam.dist + delta)); },
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
        cone.material.opacity = 0.14 + heat * 0.16;
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

        // Beacon: hovers over the objective prop and shows through walls so the
        // thing to use is always obvious. Tall marker for a prop, lower for a
        // plain floor destination.
        // Float the marker well clear of the 2.3-tall walls so it reads from
        // across the room; the beam drops from there down onto the prop.
        const foot = !WALKABLE.has(target.kind) ? 1.0 : 0.15;
        const bob = Math.sin(t * 3) * 0.14;
        const chevY = 3.0 + bob;
        beacon.visible = true;
        beacon.position.set(target.x + 0.5, 0, target.y + 0.5);
        chevron.position.y = chevY;
        chevron.scale.setScalar(0.95 + pulse * 0.25);
        halo.position.y = chevY;
        haloMat.opacity = 0.4 + pulse * 0.35;
        beam.scale.y = Math.max(0.1, chevY - foot);
        beam.position.y = (chevY + foot) / 2;
        beaconLight.position.y = foot + 0.4;
        beaconLight.intensity = 3.6 + pulse * 2.4;
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
      let distTarget = compact ? CAM_DIST_COMPACT : CAM_DIST;
      let pitchTarget = cam.pitch;
      let followX = m.x;
      let followZ = m.y;
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
        cam.dist += (8 - cam.dist) * Math.min(1, dtMs / 500);
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

      renderer.render(scene, camera);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __adventure?: unknown }).__adventure = {
          sim,
          cam: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, tx: cam.target.x, tz: cam.target.z },
          // Scripted input for the visual probes (test-visual/probe-adventure.mjs).
          interactWith: (id: string) => { clickInteract = id; },
          moveTo: (x: number, y: number) => { clickMove = { x, y }; },
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
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      chevron.geometry.dispose();
      beaconMat.dispose();
      beam.geometry.dispose();
      beamMat.dispose();
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
