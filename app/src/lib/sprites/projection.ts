// ── Shared one-point projection ──
// Generalized from the boss FPS renderer (drawBossFPS), the only correct
// perspective model in the codebase. Every room draws its floor, walls and
// depth-sorted props through the same vanishing-point math.
//
// Depth is non-linear: depth(t) = t^1.3, so recession accelerates toward the
// vanishing point exactly as the boss painter does.

export interface Projection {
  w: number;
  h: number;
  vpX: number; // vanishing point, scene px
  vpY: number;
  // Near plane = screen edges; far plane = a small rect around the VP.
  nearL: number;
  nearR: number;
  nearT: number;
  nearB: number;
  farL: number;
  farR: number;
  farT: number;
  farB: number;
  /** Non-linear depth remap, t ∈ [0,1]. */
  depth(t: number): number;
  /** Interpolate a value from its near to its far position at depth t. */
  atDepth(near: number, far: number, t: number): number;
  /**
   * Map a floor point — xFrac across the near edge (0=left,1=right), t into
   * depth — to screen px plus a scale factor for sizing props at that depth.
   */
  project(xFrac: number, t: number): { x: number; y: number; scale: number };
}

export interface ProjectionOpts {
  /** Vanishing point X as a fraction of width. Off-center per scene. Default 0.5. */
  vpXFrac?: number;
  /** Vanishing point Y as a fraction of height. Default 0.38. */
  vpYFrac?: number;
  /** Width of the far plane relative to the near plane. Default 0.28. */
  farScale?: number;
  /** Height of the far plane relative to height. Default 0.30. */
  farHeightFrac?: number;
}

export function createProjection(
  w: number,
  h: number,
  opts: ProjectionOpts = {},
): Projection {
  const vpX = w * (opts.vpXFrac ?? 0.5);
  const vpY = h * (opts.vpYFrac ?? 0.38);
  const farW = w * (opts.farScale ?? 0.28);
  const farH = h * (opts.farHeightFrac ?? 0.3);

  const nearL = 0;
  const nearR = w;
  const nearT = 0;
  const nearB = h;
  const farL = vpX - farW / 2;
  const farR = vpX + farW / 2;
  const farT = vpY - farH * 0.45;
  const farB = vpY + farH * 0.55;

  const depth = (t: number) => Math.pow(Math.max(0, Math.min(1, t)), 1.3);
  const atDepth = (near: number, far: number, t: number) =>
    near + (far - near) * depth(t);

  return {
    w,
    h,
    vpX,
    vpY,
    nearL,
    nearR,
    nearT,
    nearB,
    farL,
    farR,
    farT,
    farB,
    depth,
    atDepth,
    project(xFrac: number, t: number) {
      const lx = atDepth(nearL, farL, t);
      const rx = atDepth(nearR, farR, t);
      return {
        x: lx + (rx - lx) * xFrac,
        y: atDepth(nearB, farB, t),
        scale: (rx - lx) / (nearR - nearL),
      };
    },
  };
}

/** Depth fog opacity — surfaces fade toward the void with distance. From the boss painter. */
export function depthFogAlpha(t: number): number {
  return Math.max(0.15, 0.6 * (1 - t * 0.8));
}

/**
 * Draw one side-wall trapezoid segment between depth t0 and t1. The wall's near
 * edge sits at screen x = nearX; it converges toward the far plane side.
 * Replaces the old flat vertical `drawSideWall`.
 */
export function wallQuad(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  side: "left" | "right",
  nearX: number,
  t0: number,
  t1: number,
  fill: string,
): void {
  const farX = side === "left" ? p.farL : p.farR;
  const x0 = p.atDepth(nearX, farX, t0);
  const x1 = p.atDepth(nearX, farX, t1);
  const top0 = p.atDepth(p.nearT, p.farT, t0);
  const top1 = p.atDepth(p.nearT, p.farT, t1);
  const bot0 = p.atDepth(p.nearB, p.farB, t0);
  const bot1 = p.atDepth(p.nearB, p.farB, t1);

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x0, top0);
  ctx.lineTo(x1, top1);
  ctx.lineTo(x1, bot1);
  ctx.lineTo(x0, bot0);
  ctx.closePath();
  ctx.fill();
}

/**
 * Perspective floor grid — depth rows + converging columns, all VP-derived.
 * Replaces the old `paintPerspectiveFloor` (linear splay, hardcoded center).
 */
export function floorGrid(
  ctx: CanvasRenderingContext2D,
  p: Projection,
  cols: number,
  rows: number,
  lineColor: string,
): void {
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  // Depth rows (recede toward the VP; spacing compresses with distance).
  for (let r = 1; r <= rows; r++) {
    const t = r / rows;
    const lx = p.atDepth(p.nearL, p.farL, t);
    const rx = p.atDepth(p.nearR, p.farR, t);
    const y = p.atDepth(p.nearB, p.farB, t);
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  }

  // Columns converging toward the vanishing point.
  for (let c = 0; c <= cols; c++) {
    const xFrac = c / cols;
    const near = p.project(xFrac, 0);
    const far = p.project(xFrac, 1);
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(far.x, far.y);
    ctx.stroke();
  }
}
