// ── Act 1 Game Map — pixel art facility blueprint ──
// Shows Maya's path through Sublevel 3: Cell → Keypad → Vent → Lockmaster
// Painted with Canvas 2D in the same style as scene-painter.

import { C } from "./palette";

export type NodeStatus = "complete" | "current" | "locked";

export interface MapNode {
  id: string;
  label: string;
  sublabel: string;
  x: number; // center position in map coords
  y: number;
  status: NodeStatus;
  isBoss?: boolean;
}

const MAP_W = 480;
const MAP_H = 200;

export function paintActOneMap(
  nodes: MapNode[],
  scale: number = 2,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = MAP_W * scale;
  canvas.height = MAP_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);

  // ── Background: dark blueprint grid ──
  ctx.fillStyle = "#040a14";
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // Grid lines
  ctx.strokeStyle = "rgba(110,255,160,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_H);
    ctx.stroke();
  }
  for (let y = 0; y < MAP_H; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_W, y);
    ctx.stroke();
  }

  // Blueprint title
  ctx.fillStyle = "rgba(110,255,160,0.12)";
  ctx.font = "7px monospace";
  ctx.fillText("SUBLEVEL 3 · FACILITY BLUEPRINT", 8, 12);

  // Compass rose (top right)
  ctx.fillStyle = "rgba(110,255,160,0.08)";
  ctx.fillText("N", MAP_W - 16, 12);
  ctx.fillRect(MAP_W - 14, 14, 1, 6);
  ctx.fillRect(MAP_W - 17, 17, 7, 1);

  // ── Facility structure: rooms and corridors ──
  drawFacilityOutline(ctx);

  // ── Connection paths between nodes ──
  for (let i = 0; i < nodes.length - 1; i++) {
    drawPath(ctx, nodes[i], nodes[i + 1]);
  }

  // ── Nodes (drawn on top) ──
  for (const node of nodes) {
    drawNode(ctx, node);
  }

  // ── Maya marker on current node ──
  const current = nodes.find((n) => n.status === "current");
  if (current) {
    drawMayaMarker(ctx, current.x, current.y - 18);
  }

  // ── Legend ──
  drawLegend(ctx);

  return canvas;
}

function drawFacilityOutline(ctx: CanvasRenderingContext2D) {
  const wallColor = "rgba(110,255,160,0.06)";
  const wallStroke = "rgba(110,255,160,0.10)";

  ctx.strokeStyle = wallStroke;
  ctx.lineWidth = 1;

  // Cell block (left section)
  ctx.fillStyle = wallColor;
  ctx.fillRect(20, 50, 80, 100);
  ctx.strokeRect(20, 50, 80, 100);

  // Cell room labels
  ctx.fillStyle = "rgba(110,255,160,0.06)";
  ctx.font = "5px monospace";
  ctx.fillText("B-07", 24, 68);
  ctx.fillText("B-08", 24, 90);
  ctx.fillText("B-09", 24, 118);
  ctx.fillText("B-10", 64, 68);
  ctx.fillText("B-11", 64, 90);
  ctx.fillText("B-12", 64, 118);

  // Internal cell walls
  ctx.strokeStyle = "rgba(110,255,160,0.05)";
  ctx.beginPath();
  ctx.moveTo(20, 75); ctx.lineTo(100, 75);
  ctx.moveTo(20, 97); ctx.lineTo(100, 97);
  ctx.moveTo(58, 50); ctx.lineTo(58, 150);
  ctx.stroke();

  // Corridor from cells
  ctx.fillStyle = wallColor;
  ctx.fillRect(100, 80, 80, 40);
  ctx.strokeStyle = wallStroke;
  ctx.strokeRect(100, 80, 80, 40);

  // Corridor label
  ctx.fillStyle = "rgba(110,255,160,0.06)";
  ctx.fillText("CORRIDOR B", 112, 104);

  // Vent shaft (diagonal duct)
  ctx.fillStyle = "rgba(110,255,160,0.03)";
  ctx.fillRect(180, 55, 100, 25);
  ctx.strokeStyle = wallStroke;
  ctx.strokeRect(180, 55, 100, 25);

  // Vent ribs
  ctx.strokeStyle = "rgba(110,255,160,0.04)";
  for (let vx = 190; vx < 280; vx += 12) {
    ctx.beginPath();
    ctx.moveTo(vx, 55);
    ctx.lineTo(vx, 80);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(110,255,160,0.06)";
  ctx.fillText("VENT SHAFT", 205, 70);

  // Lock controller room (right)
  ctx.fillStyle = wallColor;
  ctx.fillRect(310, 50, 120, 100);
  ctx.strokeStyle = wallStroke;
  ctx.strokeRect(310, 50, 120, 100);

  // Server rack indicators inside controller room
  for (let rx = 320; rx < 420; rx += 20) {
    ctx.fillStyle = "rgba(110,255,160,0.03)";
    ctx.fillRect(rx, 60, 8, 30);
    ctx.strokeStyle = "rgba(110,255,160,0.05)";
    ctx.strokeRect(rx, 60, 8, 30);
  }

  ctx.fillStyle = "rgba(110,255,160,0.06)";
  ctx.fillText("LOCK CONTROLLER", 330, 106);

  // Connection from corridor to vent
  ctx.strokeStyle = "rgba(110,255,160,0.06)";
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(165, 90);
  ctx.lineTo(185, 68);
  ctx.stroke();
  ctx.setLineDash([]);

  // Connection from vent to controller room
  ctx.strokeStyle = "rgba(110,255,160,0.06)";
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(280, 68);
  ctx.lineTo(315, 90);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPath(ctx: CanvasRenderingContext2D, from: MapNode, to: MapNode) {
  const isActive = from.status === "complete";
  const color = isActive ? C.signalBright : "rgba(110,255,160,0.12)";

  ctx.strokeStyle = color;
  ctx.lineWidth = isActive ? 2 : 1;
  ctx.setLineDash(isActive ? [] : [3, 3]);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);

  // Route path with a midpoint bend for visual interest
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 8;
  ctx.quadraticCurveTo(midX, midY, to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Glow on active paths
  if (isActive) {
    ctx.strokeStyle = "rgba(110,255,160,0.15)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(midX, midY, to.x, to.y);
    ctx.stroke();
  }

  // Direction arrow on active paths
  if (isActive) {
    const arrowX = (from.x + to.x) / 2 + 4;
    const arrowY = midY + 4;
    ctx.fillStyle = C.signalBright;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY - 3);
    ctx.lineTo(arrowX + 4, arrowY);
    ctx.lineTo(arrowX, arrowY + 3);
    ctx.fill();
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: MapNode) {
  const { x, y, status, isBoss } = node;
  const size = isBoss ? 10 : 7;

  // Node background
  if (status === "complete") {
    ctx.fillStyle = "rgba(110,255,160,0.15)";
  } else if (status === "current") {
    ctx.fillStyle = "rgba(255,159,28,0.15)";
  } else {
    ctx.fillStyle = "rgba(110,255,160,0.04)";
  }
  ctx.fillRect(x - size, y - size, size * 2, size * 2);

  // Node border
  if (status === "complete") {
    ctx.strokeStyle = C.signalBright;
    ctx.lineWidth = 2;
  } else if (status === "current") {
    ctx.strokeStyle = "#ff9f1c";
    ctx.lineWidth = 2;
  } else {
    ctx.strokeStyle = "rgba(110,255,160,0.15)";
    ctx.lineWidth = 1;
  }
  ctx.strokeRect(x - size, y - size, size * 2, size * 2);

  // Boss diamond overlay
  if (isBoss) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = status === "locked" ? "rgba(255,64,64,0.2)" : C.dangerBright;
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  }

  // Inner icon
  if (status === "complete") {
    // Checkmark
    ctx.strokeStyle = C.signalBright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x - 1, y + 3);
    ctx.lineTo(x + 4, y - 3);
    ctx.stroke();
  } else if (status === "current") {
    // Pulsing dot
    ctx.fillStyle = "#ff9f1c";
    ctx.fillRect(x - 2, y - 2, 4, 4);
  } else {
    // Lock icon
    ctx.fillStyle = "rgba(110,255,160,0.12)";
    ctx.fillRect(x - 2, y - 1, 4, 3);
    ctx.strokeStyle = "rgba(110,255,160,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 1);
    ctx.lineTo(x - 1, y - 3);
    ctx.lineTo(x + 1, y - 3);
    ctx.lineTo(x + 1, y - 1);
    ctx.stroke();
  }

  // Labels
  ctx.font = "bold 6px monospace";
  ctx.fillStyle =
    status === "complete" ? C.signalBright
    : status === "current" ? "#ff9f1c"
    : "rgba(110,255,160,0.18)";
  ctx.textAlign = "center";
  ctx.fillText(node.label, x, y + size + 10);

  ctx.font = "5px monospace";
  ctx.fillStyle =
    status === "locked" ? "rgba(110,255,160,0.10)" : "rgba(110,255,160,0.3)";
  ctx.fillText(node.sublabel, x, y + size + 18);

  ctx.textAlign = "left";
}

function drawMayaMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Small Maya head icon above current node
  // Hair
  ctx.fillStyle = C.hairDark;
  ctx.fillRect(x - 4, y - 5, 8, 4);
  ctx.fillRect(x - 5, y - 3, 10, 6);
  // Green streak
  ctx.fillStyle = C.signalMid;
  ctx.fillRect(x + 2, y - 5, 3, 5);
  // Face
  ctx.fillStyle = "#b08868";
  ctx.fillRect(x - 3, y - 1, 6, 7);
  // Eyes
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(x - 2, y + 1, 2, 2);
  ctx.fillRect(x + 1, y + 1, 2, 2);

  // Bouncing arrow below marker
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 9);
  ctx.lineTo(x, y + 12);
  ctx.lineTo(x + 3, y + 9);
  ctx.fill();
}

function drawLegend(ctx: CanvasRenderingContext2D) {
  const lx = 8;
  const ly = MAP_H - 18;
  ctx.font = "5px monospace";
  ctx.fillStyle = "rgba(110,255,160,0.2)";

  // Complete
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(lx, ly, 5, 5);
  ctx.fillStyle = "rgba(110,255,160,0.25)";
  ctx.fillText("CLEAR", lx + 8, ly + 5);

  // Current
  ctx.fillStyle = "#ff9f1c";
  ctx.fillRect(lx + 44, ly, 5, 5);
  ctx.fillStyle = "rgba(110,255,160,0.25)";
  ctx.fillText("ACTIVE", lx + 52, ly + 5);

  // Locked
  ctx.fillStyle = "rgba(110,255,160,0.12)";
  ctx.fillRect(lx + 92, ly, 5, 5);
  ctx.fillStyle = "rgba(110,255,160,0.25)";
  ctx.fillText("LOCKED", lx + 100, ly + 5);
}

// ── Predefined Act 1 node positions ──
export const ACT_ONE_NODES: Omit<MapNode, "status">[] = [
  { id: "chapter-01", label: "CH.01", sublabel: "CELL B-09", x: 40, y: 118 },
  { id: "chapter-02", label: "CH.02", sublabel: "KEYPAD", x: 140, y: 100 },
  { id: "chapter-03", label: "CH.03", sublabel: "VENT SHAFT", x: 240, y: 68 },
  { id: "boss-01", label: "BOSS", sublabel: "LOCKMASTER", x: 370, y: 100, isBoss: true },
];
