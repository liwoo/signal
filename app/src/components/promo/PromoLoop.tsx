"use client";

import { useEffect, useRef } from "react";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import type { BossAnimation } from "@/lib/sprites/boss-painter";
import type { PaintedScene, SceneType } from "@/lib/sprites/scene-painter";
import type { ResolvedLight } from "@/lib/sprites/lighting";
import type { ShakeSpec, FlashSpec, GlitchSpec } from "@/lib/sprites/scene-fx";
import type { Projection } from "@/lib/sprites/projection";

// ── Audio cue schedule ──
// One-shot SFX triggered at specific loop times
const SFX_CUES: Array<{ time: number; src: string; vol: number }> = [
  // Title
  { time: 0.5,  src: "/audio/sfx/terminal-beep.ogg",     vol: 0.4 },
  { time: 2.2,  src: "/audio/sfx/warning-beep.ogg",      vol: 0.12 },
  // Cell
  { time: 5.0,  src: "/audio/sfx/maya-message.ogg",       vol: 0.3 },
  { time: 6.8,  src: "/audio/sfx/door-slide.ogg",         vol: 0.1 },
  // Code typing — keypress sounds as lines appear
  { time: 8.5,  src: "/audio/sfx/keypress-1.ogg",         vol: 0.25 },
  { time: 9.2,  src: "/audio/sfx/keypress-2.ogg",         vol: 0.25 },
  { time: 9.9,  src: "/audio/sfx/keypress-3.ogg",         vol: 0.25 },
  { time: 10.6, src: "/audio/sfx/keypress-1.ogg",         vol: 0.25 },
  { time: 11.3, src: "/audio/sfx/keypress-2.ogg",         vol: 0.25 },
  { time: 12.0, src: "/audio/sfx/code-submit.ogg",        vol: 0.35 },
  // Corridor — footsteps, then the guard
  { time: 14.0, src: "/audio/sfx/footstep-metal-1.ogg",   vol: 0.3 },
  { time: 14.6, src: "/audio/sfx/footstep-metal-2.ogg",   vol: 0.3 },
  { time: 15.0, src: "/audio/sfx/dread-sting.ogg",        vol: 0.35 },
  { time: 15.2, src: "/audio/sfx/footstep-metal-3.ogg",   vol: 0.3 },
  { time: 15.5, src: "/audio/sfx/footstep-boots-1.ogg",   vol: 0.35 },
  { time: 15.8, src: "/audio/sfx/footstep-metal-4.ogg",   vol: 0.3 },
  { time: 16.1, src: "/audio/sfx/footstep-boots-2.ogg",   vol: 0.4 },
  { time: 16.4, src: "/audio/sfx/footstep-metal-1.ogg",   vol: 0.3 },
  { time: 16.7, src: "/audio/sfx/footstep-boots-1.ogg",   vol: 0.45 },
  // Boss arena
  { time: 18.0, src: "/audio/sfx/warning-beep.ogg",       vol: 0.35 },
  { time: 20.0, src: "/audio/sfx/target-lock.ogg",        vol: 0.3 },
  // Combat
  { time: 22.8, src: "/audio/sfx/laser-fire.ogg",         vol: 0.35 },
  { time: 23.5, src: "/audio/sfx/explosion-small.ogg",    vol: 0.4 },
  { time: 24.0, src: "/audio/sfx/hit-confirm.ogg",        vol: 0.35 },
  { time: 25.0, src: "/audio/sfx/boss-hit.ogg",           vol: 0.3 },
  { time: 27.0, src: "/audio/sfx/laser-fire.ogg",         vol: 0.35 },
  { time: 27.5, src: "/audio/sfx/explosion-small.ogg",    vol: 0.4 },
  // Defeat chain
  { time: 29.5, src: "/audio/sfx/explosion-small.ogg",    vol: 0.45 },
  { time: 30.5, src: "/audio/sfx/explosion-small.ogg",    vol: 0.5 },
  { time: 31.5, src: "/audio/sfx/explosion-small.ogg",    vol: 0.5 },
  { time: 33.0, src: "/audio/sfx/shield-break.ogg",       vol: 0.4 },
  // End card
  { time: 38.0, src: "/audio/sfx/handshake-confirm.ogg",  vol: 0.35 },
];

// Loop audio zones — start/stop ambient and music at shot boundaries
interface LoopZone {
  start: number;
  stop: number;
  src: string;
  vol: number;
  key: string;
}
const LOOP_ZONES: LoopZone[] = [
  { start: 0, stop: 4, src: "/audio/ambience/dark-drone-1.mp3", vol: 0.1, key: "drone" },
  { start: 4, stop: 13, src: "/audio/ambience/cell-ambient.mp3", vol: 0.12, key: "ambient" },
  { start: 13.5, stop: 17.5, src: "/audio/ambience/corridor-ambient.mp3", vol: 0.12, key: "corridor" },
  { start: 17.5, stop: 37, src: "/audio/music/boss-loop.mp3", vol: 0.2, key: "music" },
];

// ── Canvas dimensions ──
const W = 960;
const H = 540;
// Character scale so the sprite ≈ the scene's prop reference height (ch = 0.32*H).
const CHAR_SCALE = 2.2;
// Floor lines the characters stand on (scene px). Floor bands (see projection):
// cell far edge ≈ 305 → 540, corridor far edge ≈ 283 → 540.
const CELL_MAYA = { x: 400, y: 445 };
const CORRIDOR_FEET_Y = 470;

// ── Shot timing (seconds) ──
const SHOT_TITLE_START   =  0;
const SHOT_CELL_START    =  4;
const SHOT_CODE_START    =  8.5;
const SHOT_CORRIDOR_START = 13.5;
const SHOT_BOSS_START    = 17.5;
const SHOT_COMBAT_START  = 22.5;
const SHOT_DEFEAT_START  = 29;
const SHOT_ENDCARD_START = 37;
const LOOP_DURATION      = 45;

const FADE_DUR = 0.35; // seconds for cross-shot fade

// ── Colors ──
const CLR_BG        = "#040810";
const CLR_SIGNAL    = "#6effa0";
const CLR_SUBTITLE  = "#1a5a4a";
const CLR_LABEL     = "#1a5a4a";
const CLR_BOSS_RED  = "#ff4040";
const CLR_BOSS_HP   = "#40c870";
const CLR_ENDCARD_2 = "#3a7a5a";
const CLR_VOID      = "#080c14";
const CLR_WHITE     = "#ffffff";

// ── Go code for Shot 3 ──
const GO_CODE_LINES = [
  "package main",
  "",
  `import "fmt"`,
  "",
  "func main() {",
  "    for i := 1; i <= 10; i++ {",
  "        switch {",
  "        case i%3 == 0 && i%5 == 0:",
  `            fmt.Println(i, "BOTH")`,
  "        case i%2 == 0:",
  `            fmt.Println(i, "EVEN")`,
  "        default:",
  `            fmt.Println(i, "ODD")`,
  "        }",
  "    }",
  "}",
];

// ── Syntax token colors ──
const SYN_KEYWORD   = "#6ea8e0";
const SYN_STRING    = "#d4a84b";
const SYN_NUMBER    = "#b0d4a8";
const SYN_BUILTIN   = "#e08080";
const SYN_IDENT     = "#b8d4a0";
const SYN_COMMENT   = "#4a6880";
const SYN_OPERATOR  = "#8ab4c8";

const GO_KEYWORDS = new Set([
  "package", "import", "func", "for", "switch", "case", "default", "if",
  "else", "return", "var", "const", "type", "struct", "interface", "map",
  "range", "go", "defer", "select", "chan", "break", "continue",
]);
const GO_BUILTINS = new Set([
  "Println", "Printf", "Print", "Sprintf", "Fprintf", "Scanf",
  "len", "cap", "make", "new", "append", "copy", "delete", "close",
  "panic", "recover", "error",
]);

interface TokenSpan {
  text: string;
  color: string;
}

function tokenizeLine(line: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") {
      let ws = "";
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        ws += line[i++];
      }
      spans.push({ text: ws, color: SYN_IDENT });
      continue;
    }

    if (line[i] === "/" && line[i + 1] === "/") {
      spans.push({ text: line.slice(i), color: SYN_COMMENT });
      break;
    }

    if (line[i] === '"') {
      let str = '"';
      i++;
      while (i < line.length && line[i] !== '"') {
        str += line[i++];
      }
      if (i < line.length) str += line[i++];
      spans.push({ text: str, color: SYN_STRING });
      continue;
    }

    if (/[0-9]/.test(line[i])) {
      let num = "";
      while (i < line.length && /[0-9]/.test(line[i])) {
        num += line[i++];
      }
      spans.push({ text: num, color: SYN_NUMBER });
      continue;
    }

    if (/[{}()\[\]%=+\-*/&|<>!:,;.]/.test(line[i])) {
      spans.push({ text: line[i], color: SYN_OPERATOR });
      i++;
      continue;
    }

    if (/[a-zA-Z_]/.test(line[i])) {
      let word = "";
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i++];
      }
      if (GO_KEYWORDS.has(word)) {
        spans.push({ text: word, color: SYN_KEYWORD });
      } else if (GO_BUILTINS.has(word)) {
        spans.push({ text: word, color: SYN_BUILTIN });
      } else {
        spans.push({ text: word, color: SYN_IDENT });
      }
      continue;
    }

    spans.push({ text: line[i], color: SYN_IDENT });
    i++;
  }

  return spans;
}

// ══════════════════════════════════════════════════════════════
// 3.5D room stage — the promo draws through the same planes, lights and
// camera body as the in-game cinematics (see PixiScene), in Canvas 2D.
// ══════════════════════════════════════════════════════════════

type FxModule = typeof import("@/lib/sprites/scene-fx");
type ProjModule = typeof import("@/lib/sprites/projection");

interface GlowLight {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  radius: number;
  base: number;
  kind: "key" | "fill" | "ray";
  seed: number;
}

interface RoomStage {
  type: SceneType;
  layers: PaintedScene;
  backBleed: HTMLCanvasElement;
  key: ResolvedLight;
  lights: GlowLight[];
  moteColor: string;
}

interface DrawActor {
  frames: HTMLCanvasElement[];
  animation: CharAnimation;
  x: number;
  y: number;
  alpha?: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
  rot?: number;
}

interface RoomMods {
  shakes?: ShakeSpec[];
  /** Extra alpha on the strobe wash (0..1) for scenes that declare one. */
  strobeBoost?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeInOut(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Draw a room through the composed camera: back plane (0.92×), depth-sorted
 * mid props + actors, additive lights with flicker/pulse, dust, fore plane
 * (1.12×). `tMs` is shot-elapsed time in ms.
 */
function drawRoom(
  ctx: CanvasRenderingContext2D,
  fx: FxModule,
  stage: RoomStage,
  cam: Camera,
  tMs: number,
  actors: DrawActor[],
  mods: RoomMods = {},
) {
  const sceneFx = fx.SCENE_FX[stage.type];
  const z = cam.zoom;
  const halfW = W / 2 / z;
  const halfH = H / 2 / z;
  const cx = clamp(cam.x, halfW, W - halfW);
  const cy = clamp(cam.y, halfH, H - halfH);
  const sway = fx.swayOffset(tMs);
  const shake = fx.shakeOffset(tMs, mods.shakes);
  const flick = fx.flickerLevel(tMs, sceneFx.flicker);

  ctx.save();
  ctx.translate(W / 2 + sway.x + shake.x, H / 2 + sway.y + shake.y);
  ctx.rotate(sway.rot + shake.rot + (cam.rot ?? 0));
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);

  // Back plane, lagging the camera.
  const bleed = fx.BACK_BLEED_PX;
  ctx.drawImage(
    stage.backBleed,
    -bleed + fx.parallaxOffset(fx.PARALLAX.back, cx, W / 2),
    -bleed + fx.parallaxOffset(fx.PARALLAX.back, cy, H / 2),
  );

  // Mid props + actors, sorted by foot line.
  const items: Array<{ footY: number; draw: () => void }> = [];
  for (const prop of stage.layers.mid) {
    items.push({ footY: prop.footY, draw: () => ctx.drawImage(prop.canvas, prop.x, prop.y) });
  }
  for (const actor of actors) {
    items.push({
      footY: actor.y,
      draw: () => {
        const interval = fx.CHAR_ANIM_INTERVAL_MS[actor.animation];
        const frame = actor.frames[Math.floor(tMs / interval) % actor.frames.length];
        const ds = fx.depthScale(stage.type, actor.y, H);
        const fw = frame.width * ds;
        const fh = frame.height * ds;
        const lightDir = Math.sign(actor.x - stage.key.x) || 1;
        ctx.save();
        if (actor.alpha !== undefined) ctx.globalAlpha = actor.alpha;
        // Contact shadow, offset away from the key.
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath();
        ctx.ellipse(actor.x + lightDir * 7 * ds, actor.y - 2, 26 * ds, 8 * ds, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(frame, actor.x - fw / 2, actor.y - fh, fw, fh);
        ctx.restore();
      },
    });
  }
  items.sort((a, b) => a.footY - b.footY);
  for (const item of items) item.draw();

  // Lights — additive.
  ctx.globalCompositeOperation = "lighter";
  for (const light of stage.lights) {
    let a = light.base;
    if (light.kind === "key") a *= flick;
    else if (light.kind === "ray") a *= 0.7 + 0.3 * flick;
    else a *= fx.pulseLevel(tMs, sceneFx.pulse.periodMs, sceneFx.pulse.depth, light.seed);
    ctx.globalAlpha = a;
    if (light.kind === "ray") {
      ctx.drawImage(light.canvas, light.x - light.canvas.width / 2, light.y);
    } else {
      ctx.drawImage(light.canvas, light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
    }
  }
  if (sceneFx.strobe) {
    const s = fx.strobeLevel(tMs, sceneFx.strobe) + (mods.strobeBoost ?? 0);
    if (s > 0) {
      ctx.globalAlpha = Math.min(1, s);
      ctx.fillStyle = sceneFx.strobe.color;
      ctx.fillRect(-bleed, -bleed, W + bleed * 2, H + bleed * 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // Dust in the light.
  if (sceneFx.dust) {
    for (let i = 0; i < sceneFx.dust.count; i++) {
      const m = fx.dustMote(sceneFx.dust, i, tMs, W, H);
      ctx.fillStyle = stage.moteColor;
      ctx.globalAlpha = m.alpha * (0.6 + 0.4 * flick);
      ctx.fillRect(m.x, m.y, m.size, m.size);
    }
    ctx.globalAlpha = 1;
  }

  // Fore plane, leading the camera.
  if (stage.layers.fore) {
    ctx.drawImage(
      stage.layers.fore,
      fx.parallaxOffset(fx.PARALLAX.fore, cx, W / 2),
      fx.parallaxOffset(fx.PARALLAX.fore, cy, H / 2),
    );
  }

  ctx.restore();
}

/** Flash + signal-tear post pass over the finished frame. */
function drawPost(
  ctx: CanvasRenderingContext2D,
  fx: FxModule,
  tMs: number,
  flashes: FlashSpec[] | undefined,
  glitches: GlitchSpec[] | undefined,
) {
  const glitch = fx.glitchLevel(tMs, glitches);
  if (glitch > 0) {
    const canvas = ctx.canvas;
    for (const band of fx.glitchBands(tMs, glitch, H)) {
      const y = Math.floor(band.y);
      const h = Math.max(1, Math.floor(band.h));
      ctx.drawImage(canvas, 0, y, W, h, band.dx, y, W, h);
      ctx.fillStyle = `rgba(110,255,160,${0.14 * glitch})`;
      ctx.fillRect(band.dx, y, W, h);
      ctx.fillStyle = `rgba(255,72,72,${0.1 * glitch})`;
      ctx.fillRect(-band.dx * 0.6, y + 1, W, Math.max(1, h * 0.4));
      ctx.fillStyle = `rgba(255,255,255,${0.3 * glitch})`;
      ctx.fillRect(0, y, W, 1);
    }
  }
  const flash = fx.flashLevel(tMs, flashes);
  if (flash.level > 0) {
    ctx.save();
    ctx.globalAlpha = flash.level;
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

/** Receding floor grid that scrolls toward the camera — the title backdrop. */
function drawTitleGrid(ctx: CanvasRenderingContext2D, p: Projection, tSec: number, brightness: number) {
  const rows = 16;
  const cols = 14;
  const scroll = (tSec * 0.16) % 1;
  ctx.lineWidth = 1;
  for (let r = 0; r < rows; r++) {
    const tt = ((r / rows + 1 - scroll) % 1);
    const y = p.atDepth(p.nearB, p.farB, tt);
    const lx = p.atDepth(p.nearL, p.farL, tt);
    const rx = p.atDepth(p.nearR, p.farR, tt);
    ctx.strokeStyle = `rgba(110,255,160,${(0.26 * (1 - tt) * (1 - tt) + 0.02) * brightness})`;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    const near = p.project(c / cols, 0);
    const far = p.project(c / cols, 1);
    const g = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
    g.addColorStop(0, `rgba(110,255,160,${0.2 * brightness})`);
    g.addColorStop(1, "rgba(110,255,160,0)");
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(far.x, far.y);
    ctx.stroke();
  }
  // Horizon glow.
  const glow = ctx.createRadialGradient(p.vpX, p.vpY, 2, p.vpX, p.vpY, W * 0.42);
  glow.addColorStop(0, `rgba(110,255,160,${0.28 * brightness})`);
  glow.addColorStop(0.35, `rgba(110,255,160,${0.06 * brightness})`);
  glow.addColorStop(1, "rgba(110,255,160,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Ceiling half stays void so the wordmark floats above the horizon.
  ctx.fillStyle = "rgba(4,8,16,0.55)";
  ctx.fillRect(0, 0, W, p.vpY);
}

// ── Asset cache ──
interface AssetCache {
  fx: FxModule | null;
  proj: ProjModule | null;
  cell: RoomStage | null;
  corridor: RoomStage | null;
  bossFpsBg: HTMLCanvasElement | null;
  titleGrid: Projection | null;
  titleText: HTMLCanvasElement | null;
  mayaIdle: HTMLCanvasElement[];
  mayaWalk: HTMLCanvasElement[];
  guardDown: HTMLCanvasElement[];
  bossIdle: HTMLCanvasElement[];
  bossHitReact: HTMLCanvasElement[];
  bossLowHp: HTMLCanvasElement[];
  defeatExplosions: { x: number; y: number; delay: number; size: number }[];
}

// ── Helper: draw a black overlay with given alpha (for fade transitions) ──
function drawFade(ctx: CanvasRenderingContext2D, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── Helper: compute per-shot fade overlay alpha ──
function shotFadeAlpha(shotT: number, shotDur: number): number {
  if (shotT < FADE_DUR) return 1 - shotT / FADE_DUR;
  if (shotT > shotDur - FADE_DUR) return (shotT - (shotDur - FADE_DUR)) / FADE_DUR;
  return 0;
}

// ── Scanline helper ──
function drawScanlines(ctx: CanvasRenderingContext2D, t: number, opacity = 0.06) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#000000";
  for (let y = 0; y < H; y += 3) {
    ctx.fillRect(0, y, W, 1);
  }
  const sweepY = (t * 80) % H;
  ctx.globalAlpha = opacity * 0.8;
  ctx.fillStyle = CLR_WHITE;
  ctx.fillRect(0, sweepY, W, 1);
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, strength: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Zoom the whole canvas about its centre with a camera-body offset. */
function withCamera(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  offX: number,
  offY: number,
  rot: number,
  draw: () => void,
) {
  ctx.save();
  ctx.translate(W / 2 + offX, H / 2 + offY);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  draw();
  ctx.restore();
}

// ── Shot 1: TITLE ──
const TITLE_GLITCHES: GlitchSpec[] = [
  { atMs: 250, durationMs: 520 },
  { atMs: 2200, durationMs: 220 },
];

function drawTitle(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = SHOT_CELL_START - SHOT_TITLE_START; // 4s
  const fx = cache.fx!;

  ctx.fillStyle = CLR_BG;
  ctx.fillRect(0, 0, W, H);

  // Perspective floor rushing at the camera, brightening as the title lands.
  if (cache.titleGrid) {
    const brightness = Math.min(1, shotT / 1.2);
    drawTitleGrid(ctx, cache.titleGrid, shotT, brightness);
  }

  // Scanline sweep
  const sweepY = (shotT * 120) % (H + 20) - 10;
  ctx.save();
  ctx.strokeStyle = "rgba(110,255,160,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, sweepY);
  ctx.lineTo(W, sweepY);
  ctx.stroke();
  ctx.restore();

  // SIGNAL wordmark — pre-rendered, blitted through the glitch bands so the
  // letters tear as the signal locks.
  const pulse = 0.7 + Math.sin(shotT * 3) * 0.3;
  if (cache.titleText) {
    const tx = 0;
    const ty = H / 2 - 18 - cache.titleText.height / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, shotT / 0.5);
    ctx.shadowColor = CLR_SIGNAL;
    ctx.shadowBlur = 24 * pulse;
    const glitch = fx.glitchLevel(shotT * 1000, TITLE_GLITCHES);
    if (glitch > 0) {
      for (const band of fx.glitchBands(shotT * 1000, glitch, cache.titleText.height, 7)) {
        const y = Math.floor(band.y);
        const h = Math.max(1, Math.floor(band.h));
        ctx.drawImage(cache.titleText, 0, y, W, h, tx + band.dx, ty + y, W, h);
      }
      ctx.globalAlpha *= 0.55;
    }
    ctx.drawImage(cache.titleText, tx, ty);
    ctx.restore();
  }

  // Subtitle — fades in at t=1.5s
  if (shotT >= 1.5) {
    const subAlpha = Math.min(1, (shotT - 1.5) / 0.6);
    ctx.save();
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = subAlpha;
    ctx.fillStyle = CLR_SUBTITLE;
    ctx.fillText("learn go. save maya.", W / 2, H / 2 + 26);
    ctx.restore();
  }

  drawVignette(ctx, 0.5);
  if (shotT > dur - FADE_DUR) {
    drawFade(ctx, (shotT - (dur - FADE_DUR)) / FADE_DUR);
  }
}

// ── Shot 2: CELL ──
function drawCell(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = SHOT_CODE_START - SHOT_CELL_START;
  const fx = cache.fx!;
  if (!cache.cell) return;

  // Slow push-in from a wide of the cell toward Maya under the pendant.
  const p = easeInOut(shotT / dur);
  const cam: Camera = {
    x: lerp(470, 420, p),
    y: lerp(330, 340, p),
    zoom: lerp(1.0, 1.24, p),
  };
  drawRoom(ctx, fx, cache.cell, cam, shotT * 1000, [
    { frames: cache.mayaIdle, animation: "idle", x: CELL_MAYA.x, y: CELL_MAYA.y },
  ]);

  ctx.save();
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  const label = "SUBLEVEL 3 · CELL B-09";
  ctx.fillStyle = "rgba(4,8,16,0.7)";
  ctx.fillRect(8, H - 28, ctx.measureText(label).width + 12, 20);
  ctx.fillStyle = CLR_LABEL;
  ctx.fillText(label, 14, H - 14);
  ctx.restore();

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 3: CODE TYPING ──
const CODE_FLASHES: FlashSpec[] = [{ atMs: 3500, durationMs: 420, color: "#00d4ff", intensity: 0.28 }];

function drawCode(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = SHOT_CORRIDOR_START - SHOT_CODE_START;
  const fx = cache.fx!;
  const LINE_TIME = 0.4;
  const visibleLines = Math.min(GO_CODE_LINES.length, Math.floor(shotT / LINE_TIME) + 1);

  // The cell keeps breathing behind the editor — dim, drifting, out of focus.
  if (cache.cell) {
    const p = shotT / dur;
    drawRoom(ctx, fx, cache.cell, { x: lerp(500, 520, p), y: 300, zoom: lerp(1.3, 1.4, p) }, shotT * 1000, []);
  } else {
    ctx.fillStyle = "#030810";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = "rgba(3,8,16,0.55)";
  ctx.fillRect(0, 0, W, H);

  // Editor panel.
  const panelX = W * 0.09;
  const panelY = 36;
  const panelW = W * 0.82;
  const panelH = H - 72;
  ctx.fillStyle = "rgba(4,8,16,0.6)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(110,255,160,0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
  ctx.fillStyle = "rgba(110,255,160,0.06)";
  ctx.fillRect(panelX, panelY, panelW, 22);
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = CLR_LABEL;
  ctx.fillText("MAIN.GO · CELL B-09 TERMINAL", panelX + 12, panelY + 7);

  const FONT_SIZE = 13;
  const LINE_H = 20;
  const LEFT_MARGIN = panelX + 56;
  const TOP_Y = panelY + 44;

  ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
  ctx.textBaseline = "top";

  for (let i = 0; i < visibleLines; i++) {
    const lineY = TOP_Y + i * LINE_H;
    const isCurrentLine = i === visibleLines - 1;
    const line = GO_CODE_LINES[i];

    ctx.textAlign = "right";
    ctx.fillStyle = "#1a3040";
    ctx.fillText(String(i + 1), LEFT_MARGIN - 10, lineY);

    ctx.fillStyle = "#0d1820";
    ctx.fillRect(panelX + 1, lineY - 1, 2, LINE_H);

    ctx.textAlign = "left";
    const tokens = tokenizeLine(line);
    let xOffset = LEFT_MARGIN;

    for (const tok of tokens) {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, xOffset, lineY);
      xOffset += ctx.measureText(tok.text).width;
    }

    if (isCurrentLine && Math.floor(shotT * 2) % 2 === 0) {
      ctx.fillStyle = CLR_SIGNAL;
      ctx.fillRect(xOffset + 1, lineY, 2, FONT_SIZE + 1);
    }
  }

  ctx.save();
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = CLR_SIGNAL;
  ctx.globalAlpha = 0.7 + Math.sin(shotT * 4) * 0.3;
  ctx.fillText("▸ TRANSMIT", panelX + panelW - 16, panelY + panelH - 12);
  ctx.restore();

  drawPost(ctx, fx, shotT * 1000, CODE_FLASHES, undefined);
  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 4: CORRIDOR ──
const CORRIDOR_SHAKES: ShakeSpec[] = [
  { atMs: 2000, durationMs: 220, intensity: 1.5 },
  { atMs: 2600, durationMs: 240, intensity: 2 },
  { atMs: 3200, durationMs: 260, intensity: 2.6 },
];

function drawCorridor(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = SHOT_BOSS_START - SHOT_CORRIDOR_START;
  const fx = cache.fx!;
  if (!cache.corridor) return;

  const progress = shotT / dur;
  // Maya crosses left → right; a guard comes straight down the corridor at
  // the lens, growing with every step.
  const mayaX = 40 + progress * 440;
  const guardP = easeInOut(progress);
  const guardX = lerp(700, 730, guardP);
  const guardY = lerp(300, 505, guardP);

  const cam: Camera = {
    x: clamp(mayaX + 150, 0, W),
    y: lerp(330, 350, progress),
    zoom: lerp(1.08, 1.16, progress),
    rot: 0.012 * easeInOut(shotT / 0.7),
  };
  drawRoom(
    ctx,
    fx,
    cache.corridor,
    cam,
    shotT * 1000,
    [
      { frames: cache.mayaWalk, animation: "walk-right", x: mayaX, y: CORRIDOR_FEET_Y },
      { frames: cache.guardDown, animation: "walk-down", x: guardX, y: guardY },
    ],
    { shakes: CORRIDOR_SHAKES },
  );

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 5: BOSS ARENA ──
const BOSS_SHAKES: ShakeSpec[] = [{ atMs: 2500, durationMs: 380, intensity: 5 }];

function drawBossArena(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = SHOT_COMBAT_START - SHOT_BOSS_START;
  const fx = cache.fx!;
  const vpX = 480;
  const vpY = 205;
  const BOSS_SCALE = 3;
  const bossW = 64 * BOSS_SCALE;
  const bossH = 80 * BOSS_SCALE;
  const tMs = shotT * 1000;
  const sway = fx.swayOffset(tMs);
  const shake = fx.shakeOffset(tMs, BOSS_SHAKES);
  const zoom = lerp(1.0, 1.09, easeInOut(shotT / dur));

  withCamera(ctx, zoom, sway.x + shake.x, sway.y + shake.y, sway.rot + shake.rot, () => {
    if (cache.bossFpsBg) ctx.drawImage(cache.bossFpsBg, 0, 0);

    const frames = cache.bossIdle;
    if (frames.length > 0) {
      const frame = frames[Math.floor(shotT / 0.2) % frames.length];
      ctx.drawImage(frame, vpX - bossW / 2, vpY - bossH * 0.4);
    }

    // Rotating beacon wash + the eye's own glow.
    const strobe = fx.strobeLevel(tMs, fx.SCENE_FX["boss-arena"].strobe!);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = strobe * 0.7;
    ctx.fillStyle = CLR_BOSS_RED;
    ctx.fillRect(0, 0, W, H);
    const eye = ctx.createRadialGradient(vpX, vpY - 20, 4, vpX, vpY - 20, 220);
    eye.addColorStop(0, `rgba(255,64,64,${0.28 * fx.pulseLevel(tMs, 700, 0.6)})`);
    eye.addColorStop(1, "rgba(255,64,64,0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = eye;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  });

  ctx.save();
  ctx.font = "bold 12px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = CLR_BOSS_RED;
  ctx.fillText("LOCKMASTER", W / 2, 14);
  ctx.restore();

  const hpBarW = 200;
  const hpBarH = 6;
  const hpBarX = (W - hpBarW) / 2;
  const hpBarY = 30;
  ctx.fillStyle = "#0a1218";
  ctx.fillRect(hpBarX - 2, hpBarY - 2, hpBarW + 4, hpBarH + 4);
  ctx.fillStyle = CLR_BOSS_HP;
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.save();
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = CLR_BOSS_HP;
  ctx.fillText("HP 100", W / 2, hpBarY + hpBarH + 4);
  ctx.restore();

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 6: COMBAT ──
const COMBAT_SHAKES: ShakeSpec[] = [
  { atMs: 300, durationMs: 420, intensity: 6 },
  { atMs: 2800, durationMs: 460, intensity: 9 },
  { atMs: 4800, durationMs: 460, intensity: 9 },
];
const COMBAT_FLASHES: FlashSpec[] = [
  { atMs: 300, durationMs: 220, color: "#ffffff", intensity: 0.35 },
  { atMs: 2800, durationMs: 260, color: "#ff4040", intensity: 0.3 },
  { atMs: 4800, durationMs: 260, color: "#ff4040", intensity: 0.34 },
];

function drawCombat(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
  drawExplosionFn: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number) => void,
  drawBloodFn: (ctx: CanvasRenderingContext2D, w: number, h: number, lost: number, max: number) => void,
  drawTargetingGridFn: (ctx: CanvasRenderingContext2D, w: number, h: number, sector: number, scan: number) => void,
) {
  const dur = SHOT_DEFEAT_START - SHOT_COMBAT_START;
  const fx = cache.fx!;
  const BOSS_SCALE = 3;
  const bossW = 64 * BOSS_SCALE;
  const bossH = 80 * BOSS_SCALE;
  const vpX = 480;
  const vpY = 205;
  const bossCenterX = vpX;
  const bossCenterY = vpY - bossH * 0.15;
  const tMs = shotT * 1000;
  const sway = fx.swayOffset(tMs);
  const shake = fx.shakeOffset(tMs, COMBAT_SHAKES);

  withCamera(ctx, 1.06, sway.x + shake.x, sway.y + shake.y, sway.rot + shake.rot, () => {
    if (cache.bossFpsBg) ctx.drawImage(cache.bossFpsBg, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.5;
    drawTargetingGridFn(ctx, W, H, 5, shotT % 1);
    ctx.restore();

    const bossFrames = shotT < 5 ? cache.bossHitReact : cache.bossLowHp;
    if (bossFrames.length > 0) {
      const frame = bossFrames[Math.floor(shotT / 0.12) % bossFrames.length];
      ctx.drawImage(frame, vpX - bossW / 2, vpY - bossH * 0.4);
    }

    if (shotT < 2.5) {
      drawExplosionFn(ctx, bossCenterX, bossCenterY, 60, (shotT % 0.8) / 0.8);
    }
    if (shotT >= 3 && shotT < 4.5) {
      drawExplosionFn(ctx, bossCenterX - 20, bossCenterY - 10, 50, ((shotT - 3) % 0.8) / 0.8);
    }

    // Beacon wash keeps sweeping through the fight.
    const strobe = fx.strobeLevel(tMs, fx.SCENE_FX["boss-arena"].strobe!);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = strobe * 0.6;
    ctx.fillStyle = CLR_BOSS_RED;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  });

  if (shotT >= 1 && shotT < 2.5) {
    const hitAlpha = shotT < 1.4 ? (shotT - 1) / 0.4 : Math.max(0, 1 - (shotT - 1.4) / 0.8);
    ctx.save();
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = hitAlpha;
    ctx.fillStyle = CLR_SIGNAL;
    ctx.fillText("▸ HIT — 20 DMG", W / 2, H * 0.7);
    ctx.restore();
  }

  if (shotT >= 2.5) drawBloodFn(ctx, W, H, 1, 5);

  const currentHp = shotT < 3 ? 100 : shotT < 5 ? 60 : 40;
  const hpBarW = 200;
  const hpBarH = 6;
  const hpBarX = (W - hpBarW) / 2;
  const hpBarY = 30;
  const hpFrac = currentHp / 100;
  const hpColor = currentHp > 60 ? CLR_BOSS_HP : currentHp > 30 ? "#e0c040" : "#e04040";
  ctx.fillStyle = "#0a1218";
  ctx.fillRect(hpBarX - 2, hpBarY - 2, hpBarW + 4, hpBarH + 4);
  ctx.fillStyle = hpColor;
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpFrac, hpBarH);
  ctx.save();
  ctx.font = "8px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = hpColor;
  ctx.fillText(`HP ${currentHp}`, W / 2, hpBarY + hpBarH + 4);
  ctx.restore();

  if (shotT >= 4) drawBloodFn(ctx, W, H, 2, 5);

  drawPost(ctx, fx, tMs, COMBAT_FLASHES, undefined);
  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 7: DEFEAT ──
function drawDefeat(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
  drawDefeatSeqFn: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    vpX: number,
    vpY: number,
    t: number,
    explosions: { x: number; y: number; delay: number; size: number }[],
  ) => void,
) {
  const fx = cache.fx!;
  const tMs = shotT * 1000;
  const sway = fx.swayOffset(tMs);
  // The arena shudders continuously as the Lockmaster comes apart.
  const rumble = shotT < 4.5 ? 3.5 * (1 - shotT / 4.5) : 0;
  const rx = Math.sin(tMs * 0.07) * rumble;
  const ry = Math.cos(tMs * 0.09) * rumble * 0.6;
  withCamera(ctx, 1.03, sway.x + rx, sway.y + ry, sway.rot, () => {
    if (cache.bossFpsBg) ctx.drawImage(cache.bossFpsBg, 0, 0);
    drawDefeatSeqFn(ctx, W, H, 480, 205, shotT, cache.defeatExplosions);
  });
}

// ── Shot 8: END CARD ──
function drawEndCard(ctx: CanvasRenderingContext2D, shotT: number, cache: AssetCache) {
  const dur = LOOP_DURATION - SHOT_ENDCARD_START;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  const overallAlpha = Math.min(1, shotT / 0.5);
  if (cache.titleGrid) {
    ctx.save();
    ctx.globalAlpha = overallAlpha * 0.6;
    drawTitleGrid(ctx, cache.titleGrid, shotT + 20, 0.7);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = overallAlpha;

  const pulse = 0.7 + Math.sin(shotT * 2.5) * 0.3;
  ctx.font = "bold 56px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = CLR_SIGNAL;
  ctx.shadowBlur = 28 * pulse;
  ctx.fillStyle = CLR_SIGNAL;
  ctx.fillText("SIGNAL", W / 2, H / 2 - 44);
  ctx.shadowBlur = 0;

  if (shotT >= 1.5) {
    const sub1Alpha = Math.min(1, (shotT - 1.5) / 0.5);
    ctx.globalAlpha = overallAlpha * sub1Alpha;
    ctx.font = "13px 'JetBrains Mono', monospace";
    ctx.fillStyle = CLR_ENDCARD_2;
    ctx.fillText("learn go through gameplay", W / 2, H / 2 + 8);
  }

  if (shotT >= 2.5) {
    const ctaAlpha = Math.min(1, (shotT - 2.5) / 0.5);
    ctx.globalAlpha = overallAlpha * ctaAlpha;
    const label = "▸ PLAY FREE · ACT I";
    ctx.font = "11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    const measured = ctx.measureText(label).width;
    const boxW = measured + 28;
    const boxH = 22;
    const boxX = (W - boxW) / 2;
    const boxY = H / 2 + 36;
    ctx.strokeStyle = CLR_SIGNAL;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = CLR_SIGNAL;
    ctx.fillText(label, W / 2, boxY + boxH / 2 + 1);
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  if (shotT >= dur - 1.5) {
    drawFade(ctx, Math.min(1, (shotT - (dur - 1.5)) / 1.5));
  }
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export function PromoLoop({ className, soundEnabled = false }: { className?: string; soundEnabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const soundRef = useRef(soundEnabled);
  const loopElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const cacheRef = useRef<AssetCache>({
    fx: null,
    proj: null,
    cell: null,
    corridor: null,
    bossFpsBg: null,
    titleGrid: null,
    titleText: null,
    mayaIdle: [],
    mayaWalk: [],
    guardDown: [],
    bossIdle: [],
    bossHitReact: [],
    bossLowHp: [],
    defeatExplosions: [],
  });

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let cancelled = false;

    async function init() {
      const [
        { paintSceneLayers, paintBossFPS },
        { paintMayaFrames, paintGuardFrames },
        { paintBossFrames },
        { drawExplosion, drawBloodSplatters, drawDefeatSequence, generateDefeatExplosions, drawTargetingGrid },
        fx,
        proj,
        lighting,
      ] = await Promise.all([
        import("@/lib/sprites/scene-painter"),
        import("@/lib/sprites/character-painter"),
        import("@/lib/sprites/boss-painter"),
        import("@/lib/sprites/weapon-painter"),
        import("@/lib/sprites/scene-fx"),
        import("@/lib/sprites/projection"),
        import("@/lib/sprites/lighting"),
      ]);

      if (cancelled) return;

      const cache = cacheRef.current;
      cache.fx = fx;
      cache.proj = proj;

      // Build a room stage: planes + baked light textures.
      const buildStage = (type: SceneType): RoomStage => {
        const layers = paintSceneLayers(type, W, H);
        const light = lighting.SCENE_LIGHTING[type];
        const key = lighting.resolveLight(light.key, W, H);
        const lights: GlowLight[] = [];
        const pushGlow = (l: ResolvedLight, kind: GlowLight["kind"], base: number, seed: number) => {
          const r = Math.min(256, l.radius);
          lights.push({ canvas: fx.makeGlowCanvas(r, l.color), x: l.x, y: l.y, radius: l.radius, base, kind, seed });
        };
        pushGlow(key, "key", key.intensity * 0.45, 1);
        (light.fills ?? []).forEach((f, i) => pushGlow(lighting.resolveLight(f, W, H), "fill", f.intensity * 0.6, i + 2));
        for (const ray of fx.SCENE_FX[type].rays) {
          lights.push({
            canvas: fx.makeConeCanvas(ray.spread * W, ray.length * H, ray.color),
            x: ray.x * W,
            y: ray.y * H,
            radius: 0,
            base: ray.intensity,
            kind: "ray",
            seed: 0,
          });
        }
        return {
          type,
          layers,
          backBleed: fx.bleedCanvas(layers.back, fx.BACK_BLEED_PX),
          key,
          lights,
          moteColor: fx.SCENE_FX[type].dust?.color ?? "#ffffff",
        };
      };

      cache.cell = buildStage("cell");
      cache.corridor = buildStage("corridor");
      cache.bossFpsBg = paintBossFPS(W, H);
      cache.titleGrid = proj.createProjection(W, H, { vpYFrac: 0.52, farScale: 0.06, farHeightFrac: 0.02 });

      // Pre-render the wordmark once so the title shot can tear it into bands.
      const title = document.createElement("canvas");
      title.width = W;
      title.height = 120;
      const tctx = title.getContext("2d")!;
      tctx.font = "bold 60px Orbitron, sans-serif";
      tctx.textAlign = "center";
      tctx.textBaseline = "middle";
      tctx.fillStyle = CLR_SIGNAL;
      tctx.fillText("SIGNAL", W / 2, 60);
      cache.titleText = title;

      cache.mayaIdle     = paintMayaFrames("idle" as CharAnimation, CHAR_SCALE);
      cache.mayaWalk     = paintMayaFrames("walk-right" as CharAnimation, CHAR_SCALE);
      cache.guardDown    = paintGuardFrames("walk-down" as CharAnimation, CHAR_SCALE);
      cache.bossIdle     = paintBossFrames("idle" as BossAnimation, 3, 100);
      cache.bossHitReact = paintBossFrames("hit-react" as BossAnimation, 3, 60);
      cache.bossLowHp    = paintBossFrames("low-hp" as BossAnimation, 3, 30);

      cache.defeatExplosions = generateDefeatExplosions(480, 205, 192, 240);

      if (cancelled) return;

      startTimeRef.current = performance.now();
      const firedCues = new Set<number>();
      let prevLoopT = 0;

      function tick(now: number) {
        if (cancelled) return;
        if (document.hidden) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        const elapsed = (now - startTimeRef.current) / 1000;
        const t = elapsed % LOOP_DURATION;

        const sndOn = soundRef.current;
        if (t < prevLoopT) firedCues.clear();
        prevLoopT = t;

        if (sndOn) {
          for (let i = 0; i < SFX_CUES.length; i++) {
            if (!firedCues.has(i) && t >= SFX_CUES[i].time) {
              firedCues.add(i);
              const el = new Audio(SFX_CUES[i].src);
              el.volume = SFX_CUES[i].vol;
              el.play().catch(() => {});
            }
          }

          for (const zone of LOOP_ZONES) {
            const active = t >= zone.start && t < zone.stop;
            const existing = loopElsRef.current.get(zone.key);
            if (active && !existing) {
              const el = new Audio(zone.src);
              el.loop = true;
              el.volume = zone.vol;
              el.play().catch(() => {});
              loopElsRef.current.set(zone.key, el);
            }
            if (!active && existing) {
              existing.pause();
              loopElsRef.current.delete(zone.key);
            }
          }
        } else {
          for (const [key, el] of loopElsRef.current) {
            el.pause();
            loopElsRef.current.delete(key);
          }
        }

        if (!ctx) return;
        ctx.fillStyle = CLR_VOID;
        ctx.fillRect(0, 0, W, H);

        if (t < SHOT_CELL_START) {
          drawTitle(ctx, t - SHOT_TITLE_START, cache);
        } else if (t < SHOT_CODE_START) {
          drawCell(ctx, t - SHOT_CELL_START, cache);
        } else if (t < SHOT_CORRIDOR_START) {
          drawCode(ctx, t - SHOT_CODE_START, cache);
        } else if (t < SHOT_BOSS_START) {
          drawCorridor(ctx, t - SHOT_CORRIDOR_START, cache);
        } else if (t < SHOT_COMBAT_START) {
          const shotT = t - SHOT_BOSS_START;
          drawBossArena(ctx, shotT, cache);
          if (shotT >= 3) {
            const gridAlpha = Math.min(1, (shotT - 3) / 0.4);
            ctx.save();
            ctx.globalAlpha = gridAlpha * 0.35;
            drawTargetingGrid(ctx, W, H, 5, (shotT * 0.3) % 1);
            ctx.restore();
          }
        } else if (t < SHOT_DEFEAT_START) {
          drawCombat(ctx, t - SHOT_COMBAT_START, cache, drawExplosion, drawBloodSplatters, drawTargetingGrid);
        } else if (t < SHOT_ENDCARD_START) {
          drawDefeat(ctx, t - SHOT_DEFEAT_START, cache, drawDefeatSequence);
        } else {
          drawEndCard(ctx, t - SHOT_ENDCARD_START, cache);
        }

        drawScanlines(ctx, t, 0.04);

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const el of loopElsRef.current.values()) {
        el.pause();
      }
      loopElsRef.current.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: CLR_BG,
      }}
    />
  );
}
