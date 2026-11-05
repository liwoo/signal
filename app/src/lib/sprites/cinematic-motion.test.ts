import { describe, expect, it } from "vitest";
import { cinematicActorAt, cinematicCameraAt, cinematicPosition } from "./cinematic-motion";
import * as definitions from "./scenes";
import type { Actor, SceneDefinition } from "./scenes";
import { cinematicSet, CINEMATIC_ORIGIN } from "./cinematic-set";
import { parseMap } from "@/lib/adventure/grid";
import { THEMES } from "@/lib/adventure/world";

const actor: Actor = { type: "maya", x: 520, y: 440, animation: "walk-right",
  path: [{ x: 575, y: 440, duration: 1000 }, { x: 575, y: 472, duration: 500 }], endAnimation: "hack" };

describe("3D cinematic choreography", () => {
  it("keeps authored coordinates and waypoints in the same world space", () => {
    expect(cinematicPosition(520, 440)).toEqual({ x: 0, z: 0 });
    expect(cinematicActorAt(actor, 500)).toMatchObject({ x: 0.5, z: 0, moving: true, heading: Math.PI / 2 });
    expect(cinematicActorAt(actor, 1250)).toMatchObject({ x: 1, z: 0.5, moving: true, heading: 0 });
    expect(cinematicActorAt(actor, 2000)).toMatchObject({ x: 1, z: 1, moving: false, animation: "hack" });
  });
  it("holds still during delayed entrances and handles instant waypoints", () => {
    const delayed = { ...actor, path: [{ x: 520, y: 440, duration: 600 }, { x: 575, y: 440, duration: 0 }] };
    expect(cinematicActorAt(delayed, 300).moving).toBe(false);
    expect(cinematicActorAt(delayed, 600)).toMatchObject({ x: 1, z: 0, moving: false });
  });
  it("preserves standing poses and clamps time before a path starts", () => {
    expect(cinematicActorAt(actor, -500)).toMatchObject({ x: 0, z: 0 });
    expect(cinematicActorAt({ ...actor, path: undefined, endAnimation: undefined }, 8000))
      .toMatchObject({ x: 0, z: 0, moving: false, animation: "walk-right" });
  });
  it("frames every authored shot with finite positions throughout its runtime", () => {
    const sequences = Object.values(definitions).filter(Array.isArray) as SceneDefinition[][];
    for (const sequence of sequences) for (const scene of sequence) {
      for (const t of [0, scene.durationMs / 2, scene.durationMs]) {
        const camera = cinematicCameraAt(scene, t);
        expect([...camera.position, ...camera.target, camera.fov].every(Number.isFinite)).toBe(true);
        for (const actor of scene.actors) {
          const pose = cinematicActorAt(actor, t);
          expect([pose.x, pose.z, pose.heading].every(Number.isFinite)).toBe(true);
        }
      }
    }
  });
  it("removes camera drift and dolly movement in reduced motion for static actors", () => {
    const scene = definitions.PROLOGUE_SCENES[0];
    expect(cinematicCameraAt(scene, 0, true)).toEqual(cinematicCameraAt(scene, 3000, true));
    expect(cinematicCameraAt(scene, 0)).not.toEqual(cinematicCameraAt(scene, 3000));
  });
  it("keeps every shot in the mission camera's elevated perspective", () => {
    const sequences = Object.values(definitions).filter(Array.isArray) as SceneDefinition[][];
    for (const scenes of sequences) for (const scene of scenes) {
      const camera = cinematicCameraAt(scene, scene.durationMs / 2);
      const [x, y, z] = camera.position;
      expect(camera.fov).toBe(30);
      expect(Math.atan2(y, Math.hypot(x - camera.target[0], z - camera.target[2])))
        .toBeCloseTo(0.95);
    }
  });
  it("builds every set from the mission legend and keeps choreography inside its bounds", () => {
    const sequences = Object.values(definitions).filter(Array.isArray) as SceneDefinition[][];
    for (const scenes of sequences) for (const scene of scenes) {
      const set = cinematicSet(scene.background);
      expect(THEMES[set.theme]).toBeDefined();
      const grid = parseMap(set.map);
      expect(new Set(set.map.map((row) => row.length)).size).toBe(1);
      for (const actor of scene.actors) for (const t of [0, scene.durationMs / 2, scene.durationMs]) {
        const pose = cinematicActorAt(actor, t);
        expect(pose.x + CINEMATIC_ORIGIN.x).toBeGreaterThan(0);
        expect(pose.x + CINEMATIC_ORIGIN.x).toBeLessThan(grid.width - 1);
        expect(pose.z + CINEMATIC_ORIGIN.z).toBeGreaterThan(0);
        expect(pose.z + CINEMATIC_ORIGIN.z).toBeLessThan(grid.height - 1);
      }
    }
  });
});
