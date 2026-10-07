import { describe, it, expect } from "vitest";
import { parseMap, findPath, hasLineOfSight, canSee, visionPolygon, adjacentWalkable, isWalkable, castRay } from "./grid";

const MAP = [
  "#########",
  "#m..#...#",
  "#...d...#",
  "#...#=..#",
  "#T..#..x#",
  "#########",
];

describe("parseMap", () => {
  it("reads dimensions, spawn and interactable ids in reading order", () => {
    const grid = parseMap(MAP);
    expect(grid.width).toBe(9);
    expect(grid.height).toBe(6);
    expect(grid.spawn).toEqual({ x: 1, y: 1 });
    expect([...grid.interactables.keys()]).toEqual(["door-1", "terminal-1", "exit-1"]);
    expect(grid.interactables.get("terminal-1")).toMatchObject({ x: 1, y: 4, kind: "terminal" });
  });

  it("rejects unknown glyphs and maps without a spawn", () => {
    expect(() => parseMap(["#?#"])).toThrow(/Unknown map glyph/);
    expect(() => parseMap(["###", "#.#", "###"])).toThrow(/spawn/);
  });

  it("treats closed doors as solid and open doors as floor", () => {
    const grid = parseMap(MAP);
    expect(isWalkable(grid, 4, 2)).toBe(false);
    expect(isWalkable(grid, 4, 2, new Set(["door-1"]))).toBe(true);
  });
});

describe("findPath", () => {
  it("routes around walls and never cuts solid corners", () => {
    const grid = parseMap(MAP);
    const path = findPath(grid, { x: 1, y: 1 }, { x: 3, y: 3 });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 3 });
    for (let i = 0; i < path!.length; i++) {
      const prev = i === 0 ? { x: 1, y: 1 } : path![i - 1];
      const cur = path![i];
      expect(Math.abs(cur.x - prev.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(cur.y - prev.y)).toBeLessThanOrEqual(1);
      expect(isWalkable(grid, cur.x, cur.y)).toBe(true);
    }
  });

  it("is blocked by a closed door and passes once it opens", () => {
    const grid = parseMap(MAP);
    expect(findPath(grid, { x: 1, y: 1 }, { x: 7, y: 4 })).toBeNull();
    const path = findPath(grid, { x: 1, y: 1 }, { x: 7, y: 4 }, new Set(["door-1"]));
    expect(path).not.toBeNull();
    expect(path!.some((p) => p.x === 4 && p.y === 2)).toBe(true);
  });

  it("returns an empty path when already there and null for solid targets", () => {
    const grid = parseMap(MAP);
    expect(findPath(grid, { x: 1.5, y: 1.5 }, { x: 1.2, y: 1.8 })).toEqual([]);
    expect(findPath(grid, { x: 1, y: 1 }, { x: 0, y: 0 })).toBeNull();
  });

  it("lists walkable neighbours of an object, orthogonal first", () => {
    const grid = parseMap(MAP);
    const near = adjacentWalkable(grid, { x: 1, y: 4 });
    expect(near[0]).toEqual({ x: 2, y: 4 });
    expect(near.length).toBeGreaterThan(1);
  });
});

describe("line of sight", () => {
  it("is blocked by walls and closed doors, not by bars", () => {
    const grid = parseMap(MAP);
    expect(hasLineOfSight(grid, { x: 1.5, y: 2.5 }, { x: 7.5, y: 2.5 })).toBe(false);
    expect(hasLineOfSight(grid, { x: 1.5, y: 2.5 }, { x: 7.5, y: 2.5 }, new Set(["door-1"]))).toBe(true);
    // Through the bars at (5,3): (5.5,2.5) looking down to (5.5,4.5).
    expect(hasLineOfSight(grid, { x: 5.5, y: 2.5 }, { x: 5.5, y: 4.5 })).toBe(true);
  });

  it("canSee respects range and cone angle", () => {
    const grid = parseMap(MAP);
    const origin = { x: 1.5, y: 1.5 };
    expect(canSee(grid, origin, 0, 0.6, 5, { x: 3.5, y: 1.5 })).toBe(true);
    expect(canSee(grid, origin, Math.PI, 0.6, 5, { x: 3.5, y: 1.5 })).toBe(false);
    expect(canSee(grid, origin, 0, 0.6, 1, { x: 3.5, y: 1.5 })).toBe(false);
  });

  it("vision polygon rays stop at walls", () => {
    const grid = parseMap(MAP);
    const poly = visionPolygon(grid, { x: 1.5, y: 2.5 }, 0, 0.3, 8);
    expect(poly[0]).toEqual({ x: 1.5, y: 2.5 });
    for (const p of poly.slice(1)) expect(p.x).toBeLessThan(4.2);
    expect(castRay(grid, { x: 1.5, y: 2.5 }, Math.PI, 8)).toBeLessThan(1);
  });
});
