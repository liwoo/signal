import { C } from "./palette";
import type { SceneType } from "./scene-painter";

type Point = [number, number];

function alpha(hex: string, opacity: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function polygon(ctx: CanvasRenderingContext2D, points: Point[], color: string | CanvasGradient) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index++) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function line(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  width = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  top: string = C.metalLight,
  front: string = C.metalMid,
  side: string = C.metalDark,
) {
  polygon(ctx, [[x, y], [x + width, y], [x + width + depth, y + depth], [x + depth, y + depth]], top);
  polygon(ctx, [[x + depth, y + depth], [x + width + depth, y + depth], [x + width + depth, y + depth + height], [x + depth, y + depth + height]], front);
  polygon(ctx, [[x + width, y], [x + width + depth, y + depth], [x + width + depth, y + depth + height], [x + width, y + height]], side);
  line(ctx, [x + depth, y + depth], [x + width + depth, y + depth], alpha(C.metalHighlight, 0.5));
}

function drawLightPool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  opacity: number,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, alpha(color, opacity));
  gradient.addColorStop(0.55, alpha(color, opacity * 0.35));
  gradient.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.18,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.66,
  );
  gradient.addColorStop(0, alpha(C.void, 0));
  gradient.addColorStop(0.72, alpha(C.void, 0.08));
  gradient.addColorStop(1, alpha(C.void, 0.72));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawRoomShell(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  floorColor: string = C.floorMid,
  floorBottomColor: string = C.floorDark,
) {
  const left = width * 0.055;
  const right = width * 0.945;
  const wallTop = height * 0.055;
  const floorTop = height * 0.285;
  const floorBottom = height * 0.92;

  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, width, height);

  polygon(ctx, [
    [left, wallTop],
    [right, wallTop],
    [right, floorTop],
    [left, floorTop],
  ], C.wallDark);

  const wallGradient = ctx.createLinearGradient(0, wallTop, 0, floorTop);
  wallGradient.addColorStop(0, C.wallMid);
  wallGradient.addColorStop(1, C.wallDark);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(left, wallTop, right - left, floorTop - wallTop);

  polygon(ctx, [
    [left, wallTop],
    [left, floorTop],
    [width * 0.015, floorBottom],
    [width * 0.015, height * 0.2],
  ], C.wallDark);
  polygon(ctx, [
    [right, wallTop],
    [right, floorTop],
    [width * 0.985, floorBottom],
    [width * 0.985, height * 0.2],
  ], C.ceilingDark);

  const floorGradient = ctx.createLinearGradient(0, floorTop, 0, floorBottom);
  floorGradient.addColorStop(0, floorColor);
  floorGradient.addColorStop(1, floorBottomColor);
  ctx.fillStyle = floorGradient;
  polygon(ctx, [
    [left, floorTop],
    [right, floorTop],
    [width * 0.985, floorBottom],
    [width * 0.015, floorBottom],
  ], floorGradient);

  // Perspective floor seams make the room read as a high-angle space.
  for (let index = 0; index <= 12; index++) {
    const progress = index / 12;
    const topX = left + (right - left) * progress;
    const bottomX = width * 0.015 + width * 0.97 * progress;
    line(ctx, [topX, floorTop], [bottomX, floorBottom], alpha(C.floorLight, 0.28));
  }
  for (let index = 1; index <= 9; index++) {
    const progress = index / 10;
    const eased = progress * progress;
    const y = floorTop + (floorBottom - floorTop) * eased;
    line(ctx, [left - 18 * progress, y], [right + 18 * progress, y], alpha(C.floorLight, 0.25));
  }

  // Wall panels and architectural frame.
  for (let x = left + 70; x < right; x += 110) {
    line(ctx, [x, wallTop], [x, floorTop], alpha(C.wallHighlight, 0.22));
    ctx.fillStyle = alpha(C.metalHighlight, 0.45);
    ctx.fillRect(x - 1, wallTop + 8, 2, 2);
  }
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(left, floorTop - 7, right - left, 7);
  ctx.fillStyle = C.metalLight;
  ctx.fillRect(left, floorTop - 7, right - left, 1);

  // Exposed upper structure.
  ctx.fillStyle = C.ceilingDark;
  ctx.fillRect(left, wallTop - 16, right - left, 16);
  for (let x = left + 30; x < right; x += 160) {
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(x, wallTop - 14, 95, 6);
    ctx.fillStyle = C.metalMid;
    ctx.fillRect(x, wallTop - 14, 95, 1);
  }
}

function drawWallTerminal(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const width = 110 * scale;
  const height = 68 * scale;
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x - 5 * scale, y - 5 * scale, width + 10 * scale, height + 18 * scale);
  ctx.fillStyle = C.void;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = C.termDim;
  ctx.fillRect(x + 7 * scale, y + 8 * scale, width - 14 * scale, 4 * scale);
  ctx.fillStyle = C.termMid;
  ctx.fillRect(x + 7 * scale, y + 19 * scale, width * 0.72, 3 * scale);
  ctx.fillRect(x + 7 * scale, y + 28 * scale, width * 0.48, 3 * scale);
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(x + 7 * scale, y + 42 * scale, 7 * scale, 7 * scale);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x, y + height + 3 * scale, width, 7 * scale);
  drawLightPool(ctx, x + width / 2, y + height, width * 1.1, C.termBright, 0.12);
}

function drawCabinet(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = C.metalMid;
  ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
  ctx.fillStyle = alpha(C.metalLight, 0.55);
  ctx.fillRect(x + 6, y + 7, width - 12, 2);
  line(ctx, [x + width / 2, y + 4], [x + width / 2, y + height - 4], C.metalDark);
  ctx.fillStyle = C.alertMid;
  ctx.fillRect(x + width / 2 - 1, y + height * 0.55, 2, 5);
}

function drawWallShelf(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = C.ceilingDark;
  ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
  for (let shelf = 1; shelf <= 3; shelf++) {
    const shelfY = y + shelf * (height / 4);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(x + 4, shelfY, width - 8, 3);
    for (let item = 0; item < 5; item++) {
      const itemX = x + 9 + item * ((width - 18) / 5);
      const itemHeight = 7 + ((item + shelf) % 3) * 4;
      ctx.fillStyle = (item + shelf) % 3 === 0
        ? C.alertMid
        : (item + shelf) % 2 === 0
          ? C.termMid
          : C.concreteLight;
      ctx.fillRect(itemX, shelfY - itemHeight, 5, itemHeight);
      ctx.fillStyle = alpha(C.metalHighlight, 0.45);
      ctx.fillRect(itemX + 1, shelfY - itemHeight, 1, itemHeight - 2);
    }
  }
}

function drawPendant(ctx: CanvasRenderingContext2D, x: number, ceilingY: number, floorY: number) {
  line(ctx, [x, ceilingY], [x, ceilingY + 42], C.metalMid, 2);
  polygon(ctx, [[x - 14, ceilingY + 42], [x + 14, ceilingY + 42], [x + 9, ceilingY + 50], [x - 9, ceilingY + 50]], C.metalLight);
  ctx.fillStyle = C.alertBright;
  ctx.fillRect(x - 7, ceilingY + 49, 14, 3);
  drawLightPool(ctx, x, floorY, 145, C.alertBright, 0.14);
}

function drawTableSet(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  drawIsoBox(ctx, x, y, 92 * scale, 17 * scale, 12 * scale, C.metalLight, C.metalMid, C.metalDark);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 15 * scale, y + 28 * scale, 5 * scale, 38 * scale);
  ctx.fillRect(x + 80 * scale, y + 28 * scale, 5 * scale, 38 * scale);
  drawIsoBox(ctx, x - 40 * scale, y + 43 * scale, 27 * scale, 11 * scale, 7 * scale);
  drawIsoBox(ctx, x + 113 * scale, y + 18 * scale, 27 * scale, 11 * scale, 7 * scale);
}

function drawCot(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  drawIsoBox(ctx, x, y, 150 * scale, 15 * scale, 24 * scale, C.concreteLight, C.metalDark, C.metalDark);
  polygon(ctx, [[x + 12, y + 2], [x + 55, y + 2], [x + 70, y + 17], [x + 25, y + 17]], C.concreteHighlight);
  ctx.fillStyle = C.metalDark;
  ctx.fillRect(x + 10, y + 35, 5, 25);
  ctx.fillRect(x + 150 * scale, y + 35, 5, 25);
}

function drawCell(ctx: CanvasRenderingContext2D, width: number, height: number) {
  drawRoomShell(ctx, width, height, C.woodMid, C.woodDark);
  const wallTop = height * 0.055;
  const floorTop = height * 0.285;

  drawWallShelf(ctx, width * 0.075, wallTop + 22, 110, 105);
  drawCabinet(ctx, width * 0.19, wallTop + 28, 88, 98);
  drawWallShelf(ctx, width * 0.29, wallTop + 22, 112, 105);
  drawCabinet(ctx, width * 0.41, wallTop + 28, 86, 98);
  drawWallShelf(ctx, width * 0.51, wallTop + 22, 105, 105);
  drawWallTerminal(ctx, width * 0.66, wallTop + 28, 1.15);

  // Keypad door and side-wall utilities.
  drawIsoBox(ctx, width * 0.87, wallTop + 28, 58, 112, 12, C.metalMid, C.metalDark, C.ceilingDark);
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(width * 0.895, wallTop + 55, 11, 6);
  ctx.fillStyle = C.signalDim;
  ctx.fillRect(width * 0.895, wallTop + 70, 11, 17);

  drawCot(ctx, width * 0.075, height * 0.47, 1.05);
  drawTableSet(ctx, width * 0.24, height * 0.56, 0.88);
  drawTableSet(ctx, width * 0.45, height * 0.66, 0.92);
  drawTableSet(ctx, width * 0.62, height * 0.48, 0.82);
  drawIsoBox(ctx, width * 0.71, height * 0.47, 95, 24, 15, C.metalLight, C.metalMid, C.metalDark);
  drawIsoBox(ctx, width * 0.76, height * 0.69, 58, 45, 12, C.woodLight, C.woodMid, C.woodDark);
  drawIsoBox(ctx, width * 0.83, height * 0.75, 48, 37, 10, C.woodMid, C.woodDark, C.ceilingDark);

  // Sink, drain, signal cable, papers and small floor details.
  drawIsoBox(ctx, width * 0.06, height * 0.71, 60, 36, 11, C.metalLight, C.metalMid, C.metalDark);
  ctx.strokeStyle = C.signalBright;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.69, floorTop + 10);
  ctx.lineTo(width * 0.69, height * 0.42);
  ctx.lineTo(width * 0.58, height * 0.49);
  ctx.lineTo(width * 0.34, height * 0.49);
  ctx.stroke();
  ctx.strokeStyle = alpha(C.signalBright, 0.2);
  ctx.lineWidth = 6;
  ctx.stroke();

  polygon(ctx, [[width * 0.49, height * 0.6], [width * 0.54, height * 0.59], [width * 0.55, height * 0.62], [width * 0.5, height * 0.63]], C.concreteHighlight);
  polygon(ctx, [[width * 0.51, height * 0.64], [width * 0.56, height * 0.63], [width * 0.57, height * 0.66], [width * 0.52, height * 0.67]], C.concreteLight);

  drawPendant(ctx, width * 0.35, wallTop - 12, height * 0.54);
  drawPendant(ctx, width * 0.76, wallTop - 12, height * 0.48);
  drawLightPool(ctx, width * 0.43, height * 0.62, 190, C.alertBright, 0.1);
  drawVignette(ctx, width, height);
}

function drawCorridor(ctx: CanvasRenderingContext2D, width: number, height: number, alarm: boolean) {
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, width, height);
  const top = height * 0.25;
  const bottom = height * 0.75;
  ctx.fillStyle = C.wallDark;
  ctx.fillRect(0, height * 0.05, width, top - height * 0.05);
  ctx.fillRect(0, bottom, width, height * 0.2);
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, C.floorLight);
  gradient.addColorStop(0.5, C.floorMid);
  gradient.addColorStop(1, C.floorDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, top, width, bottom - top);
  for (let x = 0; x < width; x += 85) {
    line(ctx, [x, top], [x + 28, bottom], alpha(C.floorLight, 0.22));
  }
  for (let x = 48; x < width; x += 175) {
    drawIsoBox(ctx, x, height * 0.09, 70, 82, 10, C.metalMid, C.metalDark, C.ceilingDark);
    drawIsoBox(ctx, x + 82, height * 0.79, 70, 74, 10, C.metalMid, C.metalDark, C.ceilingDark);
    ctx.fillStyle = alarm ? C.dangerBright : C.signalBright;
    ctx.fillRect(x + 31, top - 13, 10, 5);
  }
  ctx.fillStyle = alpha(alarm ? C.dangerBright : C.signalBright, 0.85);
  ctx.fillRect(0, height * 0.5, width, 3);
  for (let x = 90; x < width; x += 190) {
    drawLightPool(ctx, x, height * 0.5, 115, alarm ? C.dangerBright : C.alertBright, alarm ? 0.15 : 0.08);
  }
  if (alarm) {
    ctx.fillStyle = alpha(C.dangerBright, 0.08);
    ctx.fillRect(0, 0, width, height);
  }
  drawVignette(ctx, width, height);
}

function drawVent(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = C.ceilingDark;
  ctx.fillRect(0, 0, width, height);
  const top = height * 0.21;
  const bottom = height * 0.79;
  ctx.fillStyle = C.floorDark;
  ctx.fillRect(0, top, width, bottom - top);
  for (let x = 0; x < width; x += 38) {
    ctx.fillStyle = C.metalDark;
    ctx.fillRect(x, top - 30, 8, bottom - top + 60);
    ctx.fillStyle = C.metalLight;
    ctx.fillRect(x + 1, top - 30, 2, bottom - top + 60);
  }
  for (let x = 0; x < width; x += 24) {
    line(ctx, [x, top], [x + 120, bottom], alpha(C.metalLight, 0.18));
  }
  ctx.fillStyle = C.signalBright;
  ctx.fillRect(0, height * 0.61, width, 3);
  drawWallTerminal(ctx, width * 0.68, height * 0.25, 0.75);
  drawLightPool(ctx, width * 0.72, height * 0.5, 140, C.signalBright, 0.1);
  drawVignette(ctx, width, height);
}

function drawLockmasterCore(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const centerX = width * 0.5;
  const top = height * 0.075;
  const coreWidth = width * 0.19;
  const coreHeight = height * 0.2;

  // Recess, armored outer frame, and side weapon rails.
  ctx.fillStyle = C.void;
  ctx.fillRect(centerX - coreWidth * 0.64, top - 10, coreWidth * 1.28, coreHeight + 28);
  ctx.fillStyle = C.guardDark;
  ctx.fillRect(centerX - coreWidth / 2, top, coreWidth, coreHeight);
  ctx.fillStyle = C.guardMid;
  ctx.fillRect(centerX - coreWidth / 2, top, coreWidth, 6);
  ctx.fillRect(centerX - coreWidth / 2, top, 6, coreHeight);
  ctx.fillStyle = C.guardAccent;
  ctx.fillRect(centerX - coreWidth * 0.72, top + coreHeight * 0.28, coreWidth * 0.22, 8);
  ctx.fillRect(centerX + coreWidth * 0.5, top + coreHeight * 0.28, coreWidth * 0.22, 8);
  ctx.fillRect(centerX - coreWidth * 0.72, top + coreHeight * 0.68, coreWidth * 0.22, 8);
  ctx.fillRect(centerX + coreWidth * 0.5, top + coreHeight * 0.68, coreWidth * 0.22, 8);

  // The red eye reads clearly from the wide arena camera.
  ctx.fillStyle = C.ceilingDark;
  ctx.fillRect(centerX - coreWidth * 0.26, top + coreHeight * 0.18, coreWidth * 0.52, coreHeight * 0.32);
  drawLightPool(ctx, centerX, top + coreHeight * 0.34, coreWidth * 0.62, C.dangerBright, 0.24);
  ctx.fillStyle = C.dangerBright;
  ctx.fillRect(centerX - coreWidth * 0.18, top + coreHeight * 0.29, coreWidth * 0.36, 10);
  ctx.fillStyle = C.concreteHighlight;
  ctx.fillRect(centerX + coreWidth * 0.1, top + coreHeight * 0.3, 8, 3);

  // Status matrix and hanging cable bundle.
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 9; column++) {
      ctx.fillStyle = column < 6 ? C.signalBright : column < 8 ? C.alertBright : C.dangerBright;
      ctx.fillRect(
        centerX - coreWidth * 0.32 + column * coreWidth * 0.075,
        top + coreHeight * 0.61 + row * 8,
        4,
        3,
      );
    }
  }
  for (let cable = -2; cable <= 2; cable++) {
    ctx.fillStyle = cable % 2 === 0 ? C.termDim : C.guardAccent;
    ctx.fillRect(centerX + cable * 12, top + coreHeight, 5, height * 0.15);
  }
}

function drawServerRoom(ctx: CanvasRenderingContext2D, width: number, height: number, danger: boolean) {
  drawRoomShell(ctx, width, height, C.ceilingMid);
  const rackTop = height * 0.32;
  const columns = danger ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];

  if (danger) {
    polygon(ctx, [
      [width * 0.43, height * 0.28],
      [width * 0.57, height * 0.28],
      [width * 0.69, height * 0.9],
      [width * 0.31, height * 0.9],
    ], alpha(C.dangerBright, 0.08));
    for (let stripe = 0; stripe < 8; stripe++) {
      const y = height * (0.38 + stripe * 0.06);
      const spread = (y - height * 0.28) * 0.28;
      line(ctx, [width * 0.5 - spread, y], [width * 0.5 + spread, y], alpha(C.alertBright, 0.42), 3);
    }
  }

  for (let row = 0; row < 3; row++) {
    for (const column of columns) {
      const x = width * 0.08 + column * width * 0.18 + row * 12;
      const y = rackTop + row * height * 0.18;
      drawIsoBox(ctx, x, y, width * 0.09, height * 0.1, 15, C.metalMid, C.ceilingDark, C.void);
      for (let led = 0; led < 5; led++) {
        ctx.fillStyle = danger && led > 2 ? C.dangerBright : led % 2 === 0 ? C.signalBright : C.termBright;
        ctx.fillRect(x + 17 + led * 10, y + 27, 4, 3);
      }
    }
  }
  if (danger) {
    drawLockmasterCore(ctx, width, height);
  } else {
    drawWallTerminal(ctx, width * 0.43, height * 0.08, 1.15);
  }
  const lightColor = danger ? C.dangerBright : C.termBright;
  drawLightPool(ctx, width * 0.5, height * 0.52, width * 0.36, lightColor, danger ? 0.16 : 0.1);
  if (danger) {
    ctx.fillStyle = alpha(C.dangerBright, 0.08);
    ctx.fillRect(0, 0, width, height);
  }
  drawVignette(ctx, width, height);
}

/** Paints the wide, high-angle establishing views used only by cut-scenes. */
export function paintCinematicScene(type: SceneType, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case "cell":
      drawCell(ctx, width, height);
      break;
    case "corridor":
      drawCorridor(ctx, width, height, false);
      break;
    case "chase":
      drawCorridor(ctx, width, height, true);
      break;
    case "vent":
      drawVent(ctx, width, height);
      break;
    case "server":
      drawServerRoom(ctx, width, height, false);
      break;
    case "boss-arena":
      drawServerRoom(ctx, width, height, true);
      break;
  }
  return canvas;
}
