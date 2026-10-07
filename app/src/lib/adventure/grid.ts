// ── Grid: ASCII map parsing, walkability, pathfinding, line of sight ──
// Pure functions. No DOM, no React.

import { TILE_LEGEND, WALKABLE, OPAQUE, INTERACTABLE } from "./types";
import type { Grid, Tile, TileKind, Vec2 } from "./types";

/** Parse an ASCII map into a grid. Rows are padded to the widest row. */
export function parseMap(rows: string[]): Grid {
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const tiles: Tile[] = [];
  const counts: Partial<Record<TileKind, number>> = {};
  const interactables = new Map<string, Tile>();
  let spawn: Vec2 | null = null;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = x < row.length ? row[x] : " ";
      const kind = TILE_LEGEND[ch];
      if (kind === undefined) throw new Error(`Unknown map glyph "${ch}" at ${x},${y}`);
      const tile: Tile = { x, y, kind };
      if (ch === "m") spawn = { x, y };
      if (INTERACTABLE.has(kind)) {
        const n = (counts[kind] ?? 0) + 1;
        counts[kind] = n;
        tile.id = `${kind}-${n}`;
        interactables.set(tile.id, tile);
      }
      tiles.push(tile);
    }
  }

  if (!spawn) throw new Error("Map has no spawn (m)");
  return { width, height, tiles, spawn, interactables };
}

export function tileAt(grid: Grid, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  return grid.tiles[y * grid.width + x];
}

/** The tile under a continuous position. */
export function tileAtPos(grid: Grid, pos: Vec2): Tile | null {
  return tileAt(grid, Math.floor(pos.x), Math.floor(pos.y));
}

export function isWalkable(grid: Grid, x: number, y: number, openDoors?: ReadonlySet<string>): boolean {
  const tile = tileAt(grid, x, y);
  if (!tile) return false;
  if (tile.kind === "door") return !!(openDoors && tile.id && openDoors.has(tile.id));
  return WALKABLE.has(tile.kind);
}

/** Does this tile stop a line of sight? Closed doors do; bars and glass don't. */
export function blocksSight(grid: Grid, x: number, y: number, openDoors?: ReadonlySet<string>): boolean {
  const tile = tileAt(grid, x, y);
  if (!tile) return true;
  if (tile.kind === "void") return true;
  if (tile.kind === "door") return !(openDoors && tile.id && openDoors.has(tile.id));
  return OPAQUE.has(tile.kind);
}

export function tileCenter(t: Vec2): Vec2 {
  return { x: Math.floor(t.x) + 0.5, y: Math.floor(t.y) + 0.5 };
}

const NEIGHBOURS_8: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/**
 * A* on the 8-connected grid; diagonals never cut a solid corner. Returns the
 * list of tiles from the tile after `from` through `to`, or null when
 * unreachable. `to` itself must be walkable.
 */
export function findPath(
  grid: Grid,
  from: Vec2,
  to: Vec2,
  openDoors?: ReadonlySet<string>,
): Vec2[] | null {
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  if (!isWalkable(grid, tx, ty, openDoors)) return null;
  if (sx === tx && sy === ty) return [];

  const key = (x: number, y: number) => y * grid.width + x;
  const start = key(sx, sy);
  const goal = key(tx, ty);
  const g = new Map<number, number>([[start, 0]]);
  const parent = new Map<number, number>();
  const closed = new Set<number>();
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - tx);
    const dy = Math.abs(y - ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  // Small maps: a sorted open list is plenty.
  const open: { k: number; f: number }[] = [{ k: start, f: h(sx, sy) }];

  while (open.length > 0) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { k } = open.splice(bi, 1)[0];
    if (k === goal) break;
    if (closed.has(k)) continue;
    closed.add(k);
    const cx = k % grid.width;
    const cy = Math.floor(k / grid.width);
    const gc = g.get(k)!;
    for (const [dx, dy, cost] of NEIGHBOURS_8) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny, openDoors)) continue;
      if (dx !== 0 && dy !== 0) {
        if (!isWalkable(grid, cx + dx, cy, openDoors) || !isWalkable(grid, cx, cy + dy, openDoors)) continue;
      }
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = gc + cost;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        parent.set(nk, k);
        open.push({ k: nk, f: ng + h(nx, ny) });
      }
    }
  }

  if (!parent.has(goal)) return null;
  const path: Vec2[] = [];
  let cur = goal;
  while (cur !== start) {
    path.push({ x: cur % grid.width, y: Math.floor(cur / grid.width) });
    cur = parent.get(cur)!;
  }
  path.reverse();
  return path;
}

/** Walkable tiles touching (8-neighbourhood) the given tile. */
export function adjacentWalkable(grid: Grid, tile: Vec2, openDoors?: ReadonlySet<string>): Vec2[] {
  const out: Vec2[] = [];
  const tx = Math.floor(tile.x);
  const ty = Math.floor(tile.y);
  for (const [dx, dy] of NEIGHBOURS_8) {
    if (isWalkable(grid, tx + dx, ty + dy, openDoors)) out.push({ x: tx + dx, y: ty + dy });
  }
  // Prefer orthogonal neighbours — they read as "standing at" the object.
  out.sort((a, b) => {
    const da = Math.abs(a.x - tx) + Math.abs(a.y - ty);
    const db = Math.abs(b.x - tx) + Math.abs(b.y - ty);
    return da - db;
  });
  return out;
}

/** True when `pos` is on or next to (8-neighbourhood) the target tile. */
export function isAdjacent(pos: Vec2, tile: Vec2): boolean {
  const dx = Math.abs(Math.floor(pos.x) - Math.floor(tile.x));
  const dy = Math.abs(Math.floor(pos.y) - Math.floor(tile.y));
  return dx <= 1 && dy <= 1;
}

/**
 * Line of sight between two continuous points, stepping through the tiles on
 * the segment (DDA). Returns false when any tile along the way blocks sight.
 */
export function hasLineOfSight(grid: Grid, a: Vec2, b: Vec2, openDoors?: ReadonlySet<string>): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  if (dist < 1e-6) return true;
  const steps = Math.ceil(dist * 4);
  let lastKey = -1;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = Math.floor(a.x + (b.x - a.x) * t);
    const y = Math.floor(a.y + (b.y - a.y) * t);
    const k = y * grid.width + x;
    if (k === lastKey) continue;
    lastKey = k;
    // The viewer's own tile and the target's own tile never block.
    if (i === steps) break;
    if (x === Math.floor(a.x) && y === Math.floor(a.y)) continue;
    if (blocksSight(grid, x, y, openDoors)) return false;
  }
  return true;
}

/** Distance along a ray until it hits an opaque tile (capped at range). */
export function castRay(
  grid: Grid,
  origin: Vec2,
  angle: number,
  range: number,
  openDoors?: ReadonlySet<string>,
): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 0.1;
  for (let d = step; d <= range; d += step) {
    const x = Math.floor(origin.x + dx * d);
    const y = Math.floor(origin.y + dy * d);
    if (x === Math.floor(origin.x) && y === Math.floor(origin.y)) continue;
    if (blocksSight(grid, x, y, openDoors)) return Math.max(0, d - step * 0.5);
  }
  return range;
}

/**
 * Fan polygon (origin first, then rim points) for a vision cone clipped by
 * walls. Used by the renderer to draw exactly what the guard can see.
 */
export function visionPolygon(
  grid: Grid,
  origin: Vec2,
  angle: number,
  halfAngle: number,
  range: number,
  openDoors?: ReadonlySet<string>,
  rays = 20,
): Vec2[] {
  const pts: Vec2[] = [{ x: origin.x, y: origin.y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = castRay(grid, origin, a, range, openDoors);
    pts.push({ x: origin.x + Math.cos(a) * d, y: origin.y + Math.sin(a) * d });
  }
  return pts;
}

/** Is `target` inside the cone (angle + range) and visible from `origin`? */
export function canSee(
  grid: Grid,
  origin: Vec2,
  angle: number,
  halfAngle: number,
  range: number,
  target: Vec2,
  openDoors?: ReadonlySet<string>,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 0.75) {
    let diff = Math.atan2(dy, dx) - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > halfAngle) return false;
  }
  return hasLineOfSight(grid, origin, target, openDoors);
}

/** Resolve a facing name to a grid-space angle. */
export function facingAngle(face: "up" | "down" | "left" | "right"): number {
  switch (face) {
    case "right": return 0;
    case "down": return Math.PI / 2;
    case "left": return Math.PI;
    case "up": return -Math.PI / 2;
  }
}
