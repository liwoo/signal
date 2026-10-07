"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { paintMayaFrames } from "@/lib/sprites/character-painter";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import { paintBossFrames } from "@/lib/sprites/boss-painter";
import type { BossAnimation } from "@/lib/sprites/boss-painter";
import { C } from "@/lib/sprites/palette";
import {
  createBossFight, stepBossFight, armWeapon, drainBossEvents, bossHpFraction, telegraphProgress, canFire,
} from "@/lib/adventure/boss-sim";
import { buildWorld, setWallHeight, blobShadowTexture, THEMES, WALL_H, CUTAWAY_H } from "@/lib/adventure/world";
import type { World } from "@/lib/adventure/world";
import {
  makeActor, setActorAnim, tickActor, disposeActor, walkAnimFor, lightLevelAt,
} from "@/components/adventure/scene-actors";
import type { AdventureLevel, BossFightEvent, BossFightState, WeaponConfig } from "@/lib/adventure/types";

/** What the HUD needs each frame (only re-sent when something changes). */
export interface BossSnapshot {
  hp: number;
  hpFraction: number;
  hearts: number;
  heartsLost: number;
  phaseIndex: number;
  phaseCount: number;
  armed: boolean;
  canFire: boolean;
  telegraph: number;
  status: BossFightState["status"];
  thought: string | null;
}

export interface BossStageApi {
  /** Resume the fight after a correct submission at cover. */
  arm: (weapon: WeaponConfig) => void;
  rotate: (delta: number) => void;
  zoom: (delta: number) => void;
}

interface BossFightStageProps {
  level: AdventureLevel;
  hearts: number;
  onSnapshot: (snap: BossSnapshot) => void;
  onEvent: (event: BossFightEvent, state: BossFightState) => void;
  apiRef: React.MutableRefObject<BossStageApi | null>;
  onUnsupported: () => void;
  /** Freeze stepping (coding overlay is up). The world keeps rendering. */
  paused?: boolean;
  compact?: boolean;
  className?: string;
}

const PIXEL_SCALE = 0.72;
const CAM_PITCH = 0.92;
const CAM_DIST = 15;
const CAM_DIST_COMPACT = 12.5;
const CAM_YAW = -0.55;
const CAM_FOV = 32;
const CAM_DIST_MIN = 8;
const CAM_DIST_MAX = 24;
/** Boss billboard size (taller than Maya — it's a mainframe). */
const BOSS_H = 4.0;
const BOSS_W = BOSS_H * (64 / 80);

const BOSS_ANIM_INTERVAL: Record<BossAnimation, number> = {
  idle: 220, charge: 90, "hit-react": 90, attack: 80, "low-hp": 240, defeat: 140,
};

interface BossActor {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  frames: Map<string, THREE.Texture[]>;
  anim: BossAnimation;
  frame: number;
  frameTimer: number;
  lastHpBucket: number;
}

function bossFramesFor(actor: BossActor, anim: BossAnimation, hpPercent: number): THREE.Texture[] {
  // Repaint when the damage bucket changes, so the boss looks beaten at low HP.
  const bucket = hpPercent <= 30 ? 30 : hpPercent <= 60 ? 60 : 100;
  const key = `${anim}:${bucket}`;
  let frames = actor.frames.get(key);
  if (!frames) {
    frames = paintBossFrames(anim, 3, bucket).map((canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
    actor.frames.set(key, frames);
  }
  return frames;
}

function snapshotOf(s: BossFightState): BossSnapshot {
  return {
    hp: Math.round(s.boss.hp),
    hpFraction: Math.round(bossHpFraction(s) * 60) / 60,
    hearts: s.hearts,
    heartsLost: s.heartsLost,
    phaseIndex: s.boss.phaseIndex,
    phaseCount: s.def.phases.length,
    armed: s.boss.armed,
    canFire: canFire(s),
    telegraph: Math.round(telegraphProgress(s) * 30) / 30,
    status: s.status,
    thought: s.thought,
  };
}

function sameSnapshot(a: BossSnapshot | null, b: BossSnapshot): boolean {
  if (!a) return false;
  return a.hp === b.hp && a.hpFraction === b.hpFraction && a.hearts === b.hearts &&
    a.phaseIndex === b.phaseIndex && a.armed === b.armed && a.canFire === b.canFire &&
    a.telegraph === b.telegraph && a.status === b.status && a.thought === b.thought;
}

/**
 * The boss-fight 3D stage. One WebGL renderer per mount (canvas-per-mount rule),
 * the combat sim stepped in the RAF loop, React only notified when the HUD
 * snapshot changes. Mirrors AdventureScene's lifecycle discipline.
 */
export function BossFightStage({ level, hearts, onSnapshot, onEvent, apiRef, onUnsupported, paused = false, compact = false, className = "" }: BossFightStageProps) {
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

    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full cursor-crosshair select-none";
    canvas.style.imageRendering = "pixelated";
    canvas.style.touchAction = "none";
    canvas.setAttribute("aria-label", `${level.title} — fight the lockmaster`);
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
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = false;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const theme = THEMES[level.theme];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.fog);
    scene.fog = new THREE.Fog(theme.fog, 16, 40);

    const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    const hemi = new THREE.HemisphereLight(theme.ambient, theme.fog, 2.2);
    scene.add(hemi);

    // ── Simulation ──
    let sim = createBossFight(level, hearts);
    const world: World = buildWorld(sim.grid, level.theme, level.lights);
    scene.add(world.group);

    // ── Maya ──
    const shadowTex = blobShadowTexture();
    const maya = makeActor((a) => paintMayaFrames(a, 2), shadowTex, "#ffffff");
    scene.add(maya.sprite, maya.shadow);
    const mayaTint = new THREE.Color();

    // ── Boss billboard ──
    const bossMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.06, depthWrite: true });
    const bossSprite = new THREE.Sprite(bossMat);
    bossSprite.scale.set(BOSS_W, BOSS_H, 1);
    bossSprite.center.set(0.5, 0);
    bossSprite.position.set(sim.bossPos.x, 0.1, sim.bossPos.y);
    scene.add(bossSprite);
    const boss: BossActor = { sprite: bossSprite, material: bossMat, frames: new Map(), anim: "idle", frame: 0, frameTimer: 0, lastHpBucket: 100 };
    const bossGlow = new THREE.PointLight(C.dangerBright, 16, 10, 2);
    bossGlow.position.set(sim.bossPos.x, 2.2, sim.bossPos.y);
    scene.add(bossGlow);

    const setBossAnim = (anim: BossAnimation, hpPercent: number) => {
      const bucket = hpPercent <= 30 ? 30 : hpPercent <= 60 ? 60 : 100;
      if (boss.anim === anim && boss.lastHpBucket === bucket && boss.material.map) return;
      boss.anim = anim;
      boss.lastHpBucket = bucket;
      boss.frame = 0;
      boss.frameTimer = 0;
      boss.material.map = bossFramesFor(boss, anim, hpPercent)[0];
      boss.material.needsUpdate = true;
    };
    const tickBoss = (dtMs: number, hpPercent: number) => {
      const frames = bossFramesFor(boss, boss.anim, hpPercent);
      if (frames.length <= 1) return;
      boss.frameTimer += dtMs;
      const interval = BOSS_ANIM_INTERVAL[boss.anim] ?? 150;
      if (boss.frameTimer >= interval) {
        boss.frameTimer -= interval;
        boss.frame = (boss.frame + 1) % frames.length;
        boss.material.map = frames[boss.frame];
      }
    };
    setBossAnim("idle", 100);

    // ── Cover markers: pulse the hide tiles when the weapon is offline ──
    const coverRings: THREE.Mesh[] = [];
    const coverMat = new THREE.MeshBasicMaterial({ color: C.signalBright, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    for (const t of sim.grid.tiles) {
      if (t.kind !== "hide") continue;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 20), coverMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x + 0.5, 0.05, t.y + 0.5);
      scene.add(ring);
      coverRings.push(ring);
    }

    // ── Projectiles (pooled by id) ──
    const projGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const projMat = new THREE.MeshBasicMaterial({ color: C.dangerBright });
    const projMeshes = new Map<number, THREE.Mesh>();
    // Landing reticle, shown on the floor where the shot will hit.
    const reticleGeo = new THREE.RingGeometry(0.5, 0.62, 20);
    const reticleMat = new THREE.MeshBasicMaterial({ color: C.dangerBright, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
    const reticles = new Map<number, THREE.Mesh>();

    // ── Weapon beam (brief flash from Maya to the boss on a shot) ──
    const beamMat = new THREE.MeshBasicMaterial({ color: C.signalBright, transparent: true, opacity: 0, depthWrite: false });
    const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), beamMat);
    scene.add(beamMesh);
    let beamUntil = 0;

    // ── Impact flashes (transient) ──
    const flashes: { mesh: THREE.Mesh; born: number; life: number }[] = [];
    const flashGeo = new THREE.SphereGeometry(0.4, 8, 6);

    // ── Dust ──
    const dustCount = reducedMotion ? 0 : 140;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = Math.random() * sim.grid.width;
      dustPositions[i * 3 + 1] = Math.random() * WALL_H;
      dustPositions[i * 3 + 2] = Math.random() * sim.grid.height;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: theme.key, size: 0.045, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
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
    let clickMove: { x: number; y: number } | null = null;
    const pointer = { down: false, dragging: false, x: 0, y: 0, startX: 0, startY: 0, id: -1 };
    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (pausedRef.current) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "r"].includes(k)) e.preventDefault();
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.key.toLowerCase()); };
    const onBlur = () => keys.clear();

    const pick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
      raycaster.setFromCamera(ndc, camera);
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
      if (!pointer.dragging && !pausedRef.current) pick(e.clientX, e.clientY);
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
      arm: (weapon) => { sim = armWeapon(sim, weapon); },
      rotate: (delta) => { cam.yaw += delta; },
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
    let lastSnapshot: BossSnapshot | null = null;
    let disposed = false;

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dtMs = Math.min(50, now - last);
      last = now;
      const t = now / 1000;

      forward.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)).normalize();
      right.set(-forward.z, 0, forward.x);

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

      if (pausedRef.current) { keys.clear(); clickMove = null; }
      else {
        sim = stepBossFight(sim, { move: { x: mx, y: mz }, moveTo: clickMove ?? undefined }, dtMs);
        clickMove = null;
        for (const ev of drainBossEvents(sim)) {
          if (ev.type === "shake") cam.shake = Math.max(cam.shake, ev.intensity);
          if (ev.type === "weapon-fire") beamUntil = now + 110;
          if (ev.type === "projectile-land") {
            const mesh = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: ev.hit ? C.dangerBright : theme.key, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
            mesh.position.set(ev.x, 0.4, ev.y);
            scene.add(mesh);
            flashes.push({ mesh, born: now, life: ev.hit ? 420 : 260 });
          }
          onEventRef.current(ev, sim);
        }
      }

      const hpPercent = bossHpFraction(sim) * 100;

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
      if (m.hidden) mayaTint.multiplyScalar(0.6);
      maya.material.color.copy(mayaTint);
      maya.material.opacity = m.hidden ? 0.82 : 1;

      // ── Boss ──
      let bossAnim: BossAnimation = sim.boss.anim;
      if (sim.status === "won") bossAnim = "defeat";
      setBossAnim(bossAnim, hpPercent);
      tickBoss(dtMs, hpPercent);
      lightLevelAt(sim.bossPos.x, sim.bossPos.y, world.lights, tint);
      tint.lerp(new THREE.Color(C.dangerBright), 0.4 + 0.3 * (1 - hpPercent / 100));
      if (sim.boss.telegraphUntil > 0) tint.lerp(new THREE.Color(C.alertBright), 0.4 + 0.4 * Math.sin(t * 22));
      boss.material.color.copy(tint);
      bossGlow.intensity = 10 + (sim.boss.telegraphUntil > 0 ? 18 * (0.5 + 0.5 * Math.sin(t * 22)) : 6 * (0.6 + 0.4 * Math.sin(t * 2)));
      bossGlow.color.set(sim.boss.telegraphUntil > 0 ? C.alertBright : C.dangerBright);

      // ── Cover rings ──
      const showCover = !sim.boss.armed && sim.status === "fighting";
      const coverPulse = 0.45 + 0.4 * Math.sin(t * 4);
      for (const ring of coverRings) {
        ring.visible = showCover;
        ring.scale.setScalar(1 + coverPulse * 0.25);
      }
      coverMat.opacity = 0.35 + coverPulse * 0.4;

      // ── Projectiles ──
      const liveIds = new Set<number>();
      for (const p of sim.projectiles) {
        liveIds.add(p.id);
        const prog = Math.min(1, (sim.time - p.firedAt) / Math.max(1, p.landAt - p.firedAt));
        let mesh = projMeshes.get(p.id);
        if (!mesh) { mesh = new THREE.Mesh(projGeo, projMat); scene.add(mesh); projMeshes.set(p.id, mesh); }
        mesh.visible = !p.landed;
        const px = p.x0 + (p.tx - p.x0) * prog;
        const pz = p.y0 + (p.ty - p.y0) * prog;
        const arc = Math.sin(prog * Math.PI) * 0.9;
        mesh.position.set(px, 0.6 + arc, pz);
        // Landing reticle grows as the shot nears.
        let ret = reticles.get(p.id);
        if (!ret) { ret = new THREE.Mesh(reticleGeo, reticleMat); ret.rotation.x = -Math.PI / 2; scene.add(ret); reticles.set(p.id, ret); }
        ret.visible = !p.landed;
        ret.position.set(p.tx, 0.04, p.ty);
        ret.scale.setScalar(0.6 + prog * 0.6);
      }
      for (const [id, mesh] of projMeshes) if (!liveIds.has(id)) { scene.remove(mesh); projMeshes.delete(id); }
      for (const [id, ret] of reticles) if (!liveIds.has(id)) { scene.remove(ret); reticles.delete(id); }

      // ── Weapon beam ──
      if (now < beamUntil) {
        const a = new THREE.Vector3(m.x, 0.7, m.y);
        const b = new THREE.Vector3(sim.bossPos.x, 1.6, sim.bossPos.y);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        beamMesh.position.copy(mid);
        beamMesh.scale.set(1, a.distanceTo(b), 1);
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        beamMat.opacity = Math.max(0, (beamUntil - now) / 110) * 0.85;
        beamMesh.visible = true;
      } else {
        beamMesh.visible = false;
      }

      // ── Impact flashes ──
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const age = (now - f.born) / f.life;
        if (age >= 1) { scene.remove(f.mesh); (f.mesh.material as THREE.Material).dispose(); flashes.splice(i, 1); continue; }
        f.mesh.scale.setScalar(0.5 + age * 2.2);
        (f.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - age) * 0.9;
      }

      // ── Dust ──
      if (dustCount > 0) {
        const arr = dust.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          arr[i * 3 + 1] += 0.0003;
          arr[i * 3] += Math.cos(t * 0.5 + i * 1.3) * 0.0006;
          if (arr[i * 3 + 1] > WALL_H) arr[i * 3 + 1] = 0.1;
        }
        dust.geometry.attributes.position.needsUpdate = true;
      }

      // ── Camera: follow Maya, biased toward the boss so both stay framed ──
      let followX = m.x + (sim.bossPos.x - m.x) * 0.32;
      let followZ = m.y + (sim.bossPos.y - m.y) * 0.32;
      let distTarget = compact ? CAM_DIST_COMPACT : CAM_DIST;
      if (sim.status === "coding") {
        followX = m.x;
        followZ = m.y;
        distTarget = compact ? 9 : 10;
      } else if (sim.status === "won" || sim.status === "lost") {
        followX = m.x + (sim.bossPos.x - m.x) * 0.5;
        followZ = m.y + (sim.bossPos.y - m.y) * 0.5;
      }
      cam.dist += (distTarget - cam.dist) * Math.min(1, dtMs / 600);
      const follow = Math.min(1, dtMs / 180);
      cam.target.x += (followX - cam.target.x) * follow;
      cam.target.z += (followZ - cam.target.z) * follow;
      cam.shake *= Math.pow(0.0006, dtMs / 1000);
      if (cam.shake < 0.002) cam.shake = 0;
      const shx = (Math.random() - 0.5) * cam.shake * 2;
      const shy = (Math.random() - 0.5) * cam.shake * 2;
      const cp = Math.cos(cam.pitch);
      camera.position.set(
        cam.target.x + Math.sin(cam.yaw) * cp * cam.dist + shx,
        Math.sin(cam.pitch) * cam.dist + shy,
        cam.target.z + Math.cos(cam.yaw) * cp * cam.dist,
      );
      camera.lookAt(cam.target.x + shx, 0.9 + shy, cam.target.z);

      // ── Cutaway ──
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
        (window as unknown as { __bossfight?: unknown }).__bossfight = {
          sim,
          moveTo: (x: number, y: number) => { clickMove = { x, y }; },
          arm: (w: WeaponConfig) => { sim = armWeapon(sim, w); },
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
      bossMat.dispose();
      for (const frames of boss.frames.values()) for (const tx of frames) tx.dispose();
      for (const ring of coverRings) ring.geometry.dispose();
      coverMat.dispose();
      projGeo.dispose();
      projMat.dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      for (const mesh of projMeshes.values()) scene.remove(mesh);
      for (const ret of reticles.values()) scene.remove(ret);
      beamMesh.geometry.dispose();
      beamMat.dispose();
      flashGeo.dispose();
      for (const f of flashes) { scene.remove(f.mesh); (f.mesh.material as THREE.Material).dispose(); }
      dustGeo.dispose();
      (dust.material as THREE.Material).dispose();
      shadowTex.dispose();
      world.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, [level, hearts, compact, apiRef]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`} />;
}
