// ── World builder: turns a parsed grid into Three.js meshes ──
// Browser-only (creates canvases for textures). Everything is procedural:
// no image assets, palette from src/lib/sprites/palette.ts.

import * as THREE from "three";
import { C } from "@/lib/sprites/palette";
import { tileAt } from "./grid";
import type { Grid, LevelTheme, Tile, LevelLight } from "./types";

export const WALL_H = 2.3;
export const BARS_H = 2.3;
export const CUTAWAY_H = 0.42;

interface ThemeColors {
  floor: string;
  floorAlt: string;
  wall: string;
  wallTop: string;
  trim: string;
  fog: string;
  ambient: string;
  key: string;
}

export const THEMES: Record<LevelTheme, ThemeColors> = {
  cell:     { floor: C.floorMid, floorAlt: C.floorDark, wall: C.wallMid, wallTop: C.wallLight, trim: C.metalMid, fog: C.void, ambient: "#283a5c", key: C.lightWash },
  corridor: { floor: C.concreteMid, floorAlt: C.concreteDark, wall: C.wallDark, wallTop: C.wallMid, trim: C.metalDark, fog: C.void, ambient: "#24304a", key: C.lightWash },
  vent:     { floor: C.metalDark, floorAlt: C.concreteDark, wall: C.metalMid, wallTop: C.metalLight, trim: C.metalLight, fog: "#05070c", ambient: "#1c2638", key: C.lightWarm },
  server:   { floor: C.floorDark, floorAlt: C.void, wall: C.concreteDark, wallTop: C.concreteMid, trim: C.metalMid, fog: "#04060a", ambient: "#182c34", key: C.termMid },
  comms:    { floor: C.floorDark, floorAlt: C.concreteDark, wall: C.wallDark, wallTop: C.wallMid, trim: C.metalMid, fog: C.void, ambient: "#1e2c44", key: C.termDim },
  boss:     { floor: C.void, floorAlt: C.floorDark, wall: C.concreteDark, wallTop: C.concreteMid, trim: C.dangerDim, fog: "#06040a", ambient: "#2a1820", key: C.dangerMid },
};

const LIGHT_COLORS: Record<LevelLight["color"], string> = {
  warm: C.lightWarm,
  cool: C.lightWash,
  signal: C.signalBright,
  term: C.termBright,
  danger: C.dangerBright,
  alert: C.alertBright,
};

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Painted floor tile texture: panel seams, grime, a few rivets. */
function floorTexture(base: string, alt: string, seed: number): THREE.CanvasTexture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Grime speckle
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(hash(seed * 7 + i) * size);
    const y = Math.floor(hash(seed * 13 + i * 3) * size);
    ctx.fillStyle = hash(i + seed) > 0.5 ? alt : base;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, 1 + Math.floor(hash(i * 5 + seed) * 2), 1);
  }
  ctx.globalAlpha = 1;
  // Seam
  ctx.fillStyle = alt;
  ctx.fillRect(0, 0, size, 1);
  ctx.fillRect(0, 0, 1, size);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(1, 1, size - 1, 1);
  // Rivets
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(size - 4, size - 4, 1, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Leather book cover: grain, a blind-embossed frame and a gilt title bar. */
function leatherTexture(): THREE.CanvasTexture {
  const w = 48;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#4a1e22";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i * 2) * w);
    const y = Math.floor(hash(i * 3 + 1) * h);
    ctx.fillStyle = hash(i * 5) > 0.5 ? "rgba(0,0,0,0.28)" : "rgba(255,210,190,0.09)";
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.strokeRect(4.5, 4.5, w - 9, h - 9);
  ctx.strokeStyle = "rgba(255,230,180,0.18)";
  ctx.strokeRect(5.5, 5.5, w - 11, h - 11);
  ctx.fillStyle = "#c9a55a";
  ctx.fillRect(14, 12, 20, 2);
  ctx.fillRect(18, 17, 12, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Page block edge: cream paper with fine stacked-page lines. */
function pagesTexture(): THREE.CanvasTexture {
  const w = 32;
  const h = 16;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e9dec4";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = "rgba(90,70,50,0.28)";
    ctx.fillRect(0, y, w, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Painted wall panel texture: horizontal plating with a lit top band. */
function wallTexture(base: string, top: string, trim: string): THREE.CanvasTexture {
  const w = 32;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, y + 1, w, 1);
  }
  ctx.fillStyle = trim;
  ctx.fillRect(0, h - 6, w, 2);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 3);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(Math.floor(hash(i) * w), Math.floor(hash(i * 3) * h), 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface DoorObject {
  id: string;
  mesh: THREE.Mesh;
  lamp: THREE.Mesh;
  /** Axis the door slides along when it opens. */
  slide: THREE.Vector3;
  closedPos: THREE.Vector3;
  openness: number;
}

export interface EmissiveObject {
  id: string;
  kind: Tile["kind"];
  mesh: THREE.Mesh;
  /** Pulsing material (screen, LED, eye). */
  glow: THREE.MeshStandardMaterial;
  light: THREE.PointLight | null;
  seed: number;
}

export interface WallInstance {
  index: number;
  x: number;
  z: number;
  height: number;
}

export interface World {
  group: THREE.Group;
  walls: THREE.InstancedMesh;
  wallInstances: WallInstance[];
  doors: DoorObject[];
  objects: EmissiveObject[];
  /** Objects the player can click on, with their interactable id. */
  pickables: THREE.Object3D[];
  lights: THREE.PointLight[];
  alarmLights: THREE.PointLight[];
  dispose: () => void;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export function setWallHeight(walls: THREE.InstancedMesh, wi: WallInstance, height: number): void {
  wi.height = height;
  _p.set(wi.x, height / 2, wi.z);
  _s.set(1, height, 1);
  _m.compose(_p, _q, _s);
  walls.setMatrixAt(wi.index, _m);
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function emissiveMat(color: string, intensity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
}

function neighbourIsWall(grid: Grid, x: number, y: number): boolean {
  const t = tileAt(grid, x, y);
  return !t || t.kind === "wall" || t.kind === "void" || t.kind === "bars" || t.kind === "door";
}

/** Which way a wall-mounted object (door, keypad) runs: along x or along z. */
function wallAxis(grid: Grid, x: number, y: number): "x" | "z" {
  const horizontal = neighbourIsWall(grid, x - 1, y) || neighbourIsWall(grid, x + 1, y);
  return horizontal ? "x" : "z";
}

export function buildWorld(grid: Grid, theme: LevelTheme, extraLights: LevelLight[] = []): World {
  const colors = THEMES[theme];
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(d: T): T => { disposables.push(d); return d; };

  // ── Floor ──
  const floorGeo = track(new THREE.BoxGeometry(1, 0.12, 1));
  const floorTexA = track(floorTexture(colors.floor, colors.floorAlt, 1));
  const floorTexB = track(floorTexture(colors.floorAlt, colors.floor, 2));
  const ventTex = track(floorTexture(C.metalDark, C.void, 3));
  const floorMatA = track(new THREE.MeshStandardMaterial({ map: floorTexA, roughness: 0.92, metalness: 0.08 }));
  const floorMatB = track(new THREE.MeshStandardMaterial({ map: floorTexB, roughness: 0.92, metalness: 0.08 }));
  const ventMat = track(new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.7, metalness: 0.4, color: "#9ab" }));

  const floorTiles = grid.tiles.filter((t) => t.kind !== "void" && t.kind !== "wall");
  const regular = floorTiles.filter((t) => t.kind !== "vent" && t.kind !== "hatch");
  const vents = floorTiles.filter((t) => t.kind === "vent" || t.kind === "hatch");
  const makeFloor = (tiles: Tile[], mats: THREE.Material[]) => {
    for (const mat of mats) {
      const subset = tiles.filter((_, i) => mats.length === 1 || (i % 2 === 0) === (mat === mats[0]));
      if (subset.length === 0) continue;
      const mesh = new THREE.InstancedMesh(floorGeo, mat, subset.length);
      subset.forEach((t, i) => {
        _p.set(t.x + 0.5, -0.06, t.y + 0.5);
        _s.set(1, 1, 1);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
      });
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  };
  makeFloor(regular, [floorMatA, floorMatB]);
  if (vents.length) makeFloor(vents, [ventMat]);

  // Hide spots: a darker shadowed patch.
  const hideMat = track(new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.45, depthWrite: false }));
  const hideGeo = track(new THREE.PlaneGeometry(0.96, 0.96));
  for (const t of floorTiles) {
    if (t.kind !== "hide") continue;
    const patch = new THREE.Mesh(hideGeo, hideMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(t.x + 0.5, 0.012, t.y + 0.5);
    group.add(patch);
  }

  // Exit: a glowing signal-green strip on the floor.
  const pickables: THREE.Object3D[] = [];
  const objects: EmissiveObject[] = [];
  const lights: THREE.PointLight[] = [];
  for (const t of floorTiles) {
    if (t.kind !== "exit") continue;
    const mat = track(emissiveMat(C.signalMid, 1.4));
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.03, 0.9)), mat);
    strip.position.set(t.x + 0.5, 0.015, t.y + 0.5);
    strip.userData.id = t.id;
    group.add(strip);
    pickables.push(strip);
    const l = new THREE.PointLight(C.signalBright, 8, 5, 2);
    l.position.set(t.x + 0.5, 0.6, t.y + 0.5);
    group.add(l);
    lights.push(l);
    objects.push({ id: t.id!, kind: t.kind, mesh: strip, glow: mat, light: l, seed: t.x });
  }
  for (const t of floorTiles) {
    if (t.kind !== "hatch") continue;
    const grate = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 0.05, 0.8)), track(new THREE.MeshStandardMaterial({ color: C.metalLight, roughness: 0.5, metalness: 0.6 })));
    grate.position.set(t.x + 0.5, 0.03, t.y + 0.5);
    grate.userData.id = t.id;
    group.add(grate);
    pickables.push(grate);
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.02, 0.06)), track(new THREE.MeshStandardMaterial({ color: C.void })));
      slat.position.set(t.x + 0.5, 0.06, t.y + 0.22 + i * 0.19);
      group.add(slat);
    }
  }
  for (const t of floorTiles) {
    if (t.kind !== "hide") continue;
    const marker = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.02, 0.9)), track(new THREE.MeshBasicMaterial({ color: C.void, transparent: true, opacity: 0.01 })));
    marker.position.set(t.x + 0.5, 0.02, t.y + 0.5);
    marker.userData.id = t.id;
    group.add(marker);
    pickables.push(marker);
  }

  // ── Walls ──
  const wallTiles = grid.tiles.filter((t) => t.kind === "wall");
  const wallGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const wallTex = track(wallTexture(colors.wall, colors.wallTop, colors.trim));
  const wallMat = track(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.12 }));
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, Math.max(1, wallTiles.length));
  const wallInstances: WallInstance[] = wallTiles.map((t, i) => ({ index: i, x: t.x + 0.5, z: t.y + 0.5, height: WALL_H }));
  for (const wi of wallInstances) setWallHeight(walls, wi, WALL_H);
  walls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // ── Bars ──
  const barGeo = track(new THREE.BoxGeometry(0.07, BARS_H, 0.07));
  const barMat = track(new THREE.MeshStandardMaterial({ color: C.metalLight, roughness: 0.45, metalness: 0.75 }));
  const railGeo = track(new THREE.BoxGeometry(1, 0.08, 0.12));
  for (const t of grid.tiles) {
    if (t.kind !== "bars") continue;
    const axis = wallAxis(grid, t.x, t.y);
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(barGeo, barMat);
      const off = -0.36 + i * 0.24;
      b.position.set(t.x + 0.5 + (axis === "x" ? off : 0), BARS_H / 2, t.y + 0.5 + (axis === "z" ? off : 0));
      group.add(b);
    }
    for (const y of [0.15, BARS_H - 0.12]) {
      const r = new THREE.Mesh(railGeo, barMat);
      r.position.set(t.x + 0.5, y, t.y + 0.5);
      if (axis === "z") r.rotation.y = Math.PI / 2;
      group.add(r);
    }
  }

  // ── Doors ──
  const doors: DoorObject[] = [];
  const doorMat = track(new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.5, metalness: 0.6 }));
  for (const t of grid.tiles) {
    if (t.kind !== "door") continue;
    const axis = wallAxis(grid, t.x, t.y);
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(axis === "x" ? 1 : 0.3, WALL_H, axis === "x" ? 0.3 : 1)), doorMat);
    mesh.position.set(t.x + 0.5, WALL_H / 2, t.y + 0.5);
    mesh.userData.id = t.id;
    group.add(mesh);
    pickables.push(mesh);
    const lampMat = track(emissiveMat(C.dangerMid, 2));
    const lamp = new THREE.Mesh(track(new THREE.BoxGeometry(axis === "x" ? 0.3 : 0.08, 0.08, axis === "x" ? 0.08 : 0.3)), lampMat);
    lamp.position.set(t.x + 0.5 + (axis === "x" ? 0 : 0.19), WALL_H - 0.3, t.y + 0.5 + (axis === "x" ? 0.19 : 0));
    group.add(lamp);
    // Which way to slide: toward whichever neighbour is a wall.
    const slide = axis === "x"
      ? new THREE.Vector3(neighbourIsWall(grid, t.x - 1, t.y) ? -1 : 1, 0, 0)
      : new THREE.Vector3(0, 0, neighbourIsWall(grid, t.x, t.y - 1) ? -1 : 1);
    doors.push({ id: t.id!, mesh, lamp, slide, closedPos: mesh.position.clone(), openness: 0 });
    objects.push({ id: t.id!, kind: "door", mesh: lamp, glow: lampMat, light: null, seed: t.x + t.y });
  }

  // ── Props ──
  const metal = track(new THREE.MeshStandardMaterial({ color: C.metalMid, roughness: 0.6, metalness: 0.5 }));
  const dark = track(new THREE.MeshStandardMaterial({ color: C.concreteDark, roughness: 0.9 }));
  const bunkMat = track(new THREE.MeshStandardMaterial({ color: C.pantsMid, roughness: 0.95 }));
  const blanket = track(new THREE.MeshStandardMaterial({ color: C.hoodieDark, roughness: 1 }));

  for (const t of grid.tiles) {
    const cx = t.x + 0.5;
    const cz = t.y + 0.5;
    switch (t.kind) {
      case "terminal": {
        const desk = box(0.9, 0.5, 0.7, metal, cx, 0.25, cz);
        desk.userData.id = t.id;
        group.add(desk);
        pickables.push(desk);
        const monitor = box(0.7, 0.5, 0.12, dark, cx, 0.82, cz - 0.05);
        group.add(monitor);
        const screenMat = track(emissiveMat(C.termBright, 1.6));
        const screen = box(0.58, 0.38, 0.02, screenMat, cx, 0.82, cz + 0.02);
        group.add(screen);
        const light = new THREE.PointLight(C.termBright, 12, 5.5, 2);
        light.position.set(cx, 1.1, cz + 0.6);
        group.add(light);
        lights.push(light);
        objects.push({ id: t.id!, kind: t.kind, mesh: screen, glow: screenMat, light, seed: t.x * 3 + t.y });
        break;
      }
      case "panel": {
        const body = box(0.9, 1.4, 0.9, metal, cx, 0.7, cz);
        body.userData.id = t.id;
        group.add(body);
        pickables.push(body);
        const faceMat = track(emissiveMat(C.signalMid, 1.3));
        const face = box(0.5, 0.4, 0.04, faceMat, cx, 1.0, cz - 0.47);
        group.add(face);
        const light = new THREE.PointLight(C.signalBright, 9, 5, 2);
        light.position.set(cx, 1.3, cz - 0.9);
        group.add(light);
        lights.push(light);
        objects.push({ id: t.id!, kind: t.kind, mesh: face, glow: faceMat, light, seed: t.x + t.y * 7 });
        break;
      }
      case "keypad": {
        const axis = wallAxis(grid, t.x, t.y);
        const plate = box(axis === "x" ? 0.42 : 0.1, 0.5, axis === "x" ? 0.1 : 0.42, dark, cx, 1.25, cz);
        plate.userData.id = t.id;
        group.add(plate);
        pickables.push(plate);
        // The keypad sits in a wall slot — add the wall mass around it.
        group.add(box(axis === "x" ? 1 : 0.5, WALL_H, axis === "x" ? 0.5 : 1, wallMat, cx, WALL_H / 2, cz));
        const ledMat = track(emissiveMat(C.alertBright, 2.2));
        const led = box(axis === "x" ? 0.26 : 0.06, 0.18, axis === "x" ? 0.06 : 0.26, ledMat, cx + (axis === "x" ? 0 : 0.28), 1.38, cz + (axis === "x" ? 0.28 : 0));
        group.add(led);
        const light = new THREE.PointLight(C.alertBright, 6, 4, 2);
        light.position.set(cx + (axis === "x" ? 0 : 0.5), 1.4, cz + (axis === "x" ? 0.5 : 0));
        group.add(light);
        lights.push(light);
        objects.push({ id: t.id!, kind: t.kind, mesh: led, glow: ledMat, light, seed: t.x * 5 + t.y });
        break;
      }
      case "bunk": {
        const frame = box(0.92, 0.42, 0.98, bunkMat, cx, 0.21, cz);
        group.add(frame);
        group.add(box(0.86, 0.1, 0.92, blanket, cx, 0.47, cz));
        group.add(box(0.06, 0.9, 0.06, metal, cx - 0.42, 0.45, cz - 0.44));
        group.add(box(0.06, 0.9, 0.06, metal, cx + 0.42, 0.45, cz - 0.44));
        break;
      }
      case "crate": {
        const body = box(0.8, 0.9, 0.7, metal, cx, 0.45, cz);
        body.userData.id = t.id;
        group.add(body);
        pickables.push(body);
        const ledMat = track(emissiveMat(C.alertMid, 1.2));
        const led = box(0.12, 0.06, 0.04, ledMat, cx + 0.2, 0.75, cz - 0.36);
        group.add(led);
        objects.push({ id: t.id!, kind: t.kind, mesh: led, glow: ledMat, light: null, seed: t.x + 11 });
        break;
      }
      case "server": {
        group.add(box(0.8, 2.1, 0.8, dark, cx, 1.05, cz));
        const ledMat = track(emissiveMat(C.signalBright, 1.5));
        for (let i = 0; i < 5; i++) {
          const led = box(0.5, 0.05, 0.03, ledMat, cx, 0.35 + i * 0.38, cz - 0.41);
          group.add(led);
          if (i === 0) objects.push({ id: `${t.id ?? "server"}-${t.x}-${t.y}`, kind: t.kind, mesh: led, glow: ledMat, light: null, seed: t.x * 3 + t.y * 5 });
        }
        break;
      }
      case "lockmaster": {
        const frame = box(0.95, 2.2, 0.95, dark, cx, 1.1, cz);
        frame.userData.id = t.id;
        group.add(frame);
        pickables.push(frame);
        const eyeMat = track(emissiveMat(C.dangerBright, 2.4));
        const eye = new THREE.Mesh(track(new THREE.SphereGeometry(0.34, 10, 8)), eyeMat);
        eye.position.set(cx - 0.5, 1.35, cz);
        group.add(eye);
        const light = new THREE.PointLight(C.dangerBright, 18, 8, 2);
        light.position.set(cx - 1, 1.5, cz);
        group.add(light);
        lights.push(light);
        objects.push({ id: t.id!, kind: t.kind, mesh: eye, glow: eyeMat, light, seed: 99 });
        break;
      }
      case "book": {
        // A real book, lying slightly askew with the front cover lifted: back
        // board, page block, spine, and a cover hinged at the spine.
        const holder = new THREE.Group();
        holder.position.set(cx, 0, cz);
        holder.rotation.y = (hash(t.x * 7 + t.y) - 0.5) * 0.9;
        const leather = track(new THREE.MeshStandardMaterial({ map: track(leatherTexture()), roughness: 0.78, metalness: 0.05 }));
        const paper = track(new THREE.MeshStandardMaterial({ map: track(pagesTexture()), roughness: 0.95 }));
        const back = box(0.46, 0.025, 0.34, leather, 0, 0.0125, 0);
        holder.add(back);
        const pages = box(0.42, 0.07, 0.31, paper, 0.02, 0.06, 0);
        holder.add(pages);
        const spine = box(0.03, 0.115, 0.34, leather, -0.225, 0.058, 0);
        holder.add(spine);
        const hinge = new THREE.Group();
        hinge.position.set(-0.21, 0.1, 0);
        hinge.rotation.z = -0.42;
        hinge.add(box(0.46, 0.025, 0.34, leather, 0.23, 0, 0));
        holder.add(hinge);
        // A loose folded page sticking out — the torn chapter.
        const slip = box(0.2, 0.004, 0.14, paper, 0.18, 0.1, 0.12);
        slip.rotation.y = 0.35;
        holder.add(slip);
        const hit = box(0.6, 0.3, 0.5, track(new THREE.MeshBasicMaterial({ visible: false })), 0, 0.15, 0);
        hit.userData.id = t.id;
        holder.add(hit);
        pickables.push(hit);
        holder.userData.id = t.id;
        group.add(holder);
        const warm = new THREE.PointLight(C.lightWarm, 3.2, 2.6, 2);
        warm.position.set(cx, 0.6, cz);
        group.add(warm);
        lights.push(warm);
        const glowMat = track(emissiveMat(C.lightWarm, 0.0));
        objects.push({ id: t.id!, kind: t.kind, mesh: holder as unknown as THREE.Mesh, glow: glowMat, light: warm, seed: t.x + t.y });
        break;
      }
      case "light": {
        const fixture = box(0.5, 0.06, 0.2, track(emissiveMat(colors.key, 1.6)), cx, WALL_H - 0.08, cz);
        group.add(fixture);
        const l = new THREE.PointLight(colors.key, 20, 8.5, 1.8);
        l.position.set(cx, WALL_H - 0.3, cz);
        group.add(l);
        lights.push(l);
        break;
      }
      default:
        break;
    }
  }

  for (const extra of extraLights) {
    const l = new THREE.PointLight(LIGHT_COLORS[extra.color], (extra.intensity ?? 3) * 4, extra.range ?? 7, 2);
    l.position.set(extra.x + 0.5, WALL_H - 0.4, extra.y + 0.5);
    group.add(l);
    lights.push(l);
  }

  // ── Alarm strobes: one red light per ~8 tiles of floor, off until the siren hits ──
  const alarmLights: THREE.PointLight[] = [];
  const stride = Math.max(4, Math.floor(Math.sqrt(floorTiles.length) / 1.5));
  for (let y = 1; y < grid.height; y += stride) {
    for (let x = 1; x < grid.width; x += stride) {
      const t = tileAt(grid, x, y);
      if (!t || t.kind === "void" || t.kind === "wall") continue;
      const l = new THREE.PointLight(C.dangerBright, 0, 9, 1.6);
      l.position.set(x + 0.5, WALL_H - 0.2, y + 0.5);
      group.add(l);
      alarmLights.push(l);
    }
  }

  // ── Void floor far below so the edge of the map reads as a drop ──
  const abyss = new THREE.Mesh(track(new THREE.PlaneGeometry(grid.width * 6, grid.height * 6)), track(new THREE.MeshBasicMaterial({ color: colors.fog })));
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.set(grid.width / 2, -1.2, grid.height / 2);
  group.add(abyss);

  return {
    group,
    walls,
    wallInstances,
    doors,
    objects,
    pickables,
    lights,
    alarmLights,
    dispose: () => {
      for (const d of disposables) d.dispose();
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh)) {
          o.geometry.dispose();
        }
      });
      wallGeo.dispose();
    },
  };
}

/** Build a flat fan mesh from a vision polygon (grid space → world xz). */
export function updateConeGeometry(geometry: THREE.BufferGeometry, poly: { x: number; y: number }[]): void {
  const n = poly.length;
  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = poly[i].x;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = poly[i].y;
  }
  const indices: number[] = [];
  for (let i = 1; i < n - 1; i++) indices.push(0, i + 1, i);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
}

/** Round blob shadow texture for characters. */
export function blobShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.6, "rgba(0,0,0,0.3)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
