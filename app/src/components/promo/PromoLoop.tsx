"use client";

import { useEffect, useRef, useCallback } from "react";
import type { CharAnimation } from "@/lib/sprites/character-painter";
import type { BossAnimation } from "@/lib/sprites/boss-painter";

// ── Audio cue schedule ──
// One-shot SFX triggered at specific loop times
const SFX_CUES: Array<{ time: number; src: string; vol: number }> = [
  // Title
  { time: 0.5,  src: "/audio/sfx/terminal-beep.ogg",     vol: 0.4 },
  // Cell
  { time: 5.0,  src: "/audio/sfx/maya-message.ogg",       vol: 0.3 },
  // Code typing — keypress sounds as lines appear
  { time: 8.5,  src: "/audio/sfx/keypress-1.ogg",         vol: 0.25 },
  { time: 9.2,  src: "/audio/sfx/keypress-2.ogg",         vol: 0.25 },
  { time: 9.9,  src: "/audio/sfx/keypress-3.ogg",         vol: 0.25 },
  { time: 10.6, src: "/audio/sfx/keypress-1.ogg",         vol: 0.25 },
  { time: 11.3, src: "/audio/sfx/keypress-2.ogg",         vol: 0.25 },
  { time: 12.0, src: "/audio/sfx/code-submit.ogg",        vol: 0.35 },
  // Corridor — footsteps
  { time: 14.0, src: "/audio/sfx/footstep-metal-1.ogg",   vol: 0.3 },
  { time: 14.6, src: "/audio/sfx/footstep-metal-2.ogg",   vol: 0.3 },
  { time: 15.2, src: "/audio/sfx/footstep-metal-3.ogg",   vol: 0.3 },
  { time: 15.8, src: "/audio/sfx/footstep-metal-4.ogg",   vol: 0.3 },
  { time: 16.4, src: "/audio/sfx/footstep-metal-1.ogg",   vol: 0.3 },
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
  { start: 4, stop: 13, src: "/audio/ambience/cell-ambient.mp3", vol: 0.12, key: "ambient" },
  { start: 17.5, stop: 37, src: "/audio/music/boss-loop.mp3", vol: 0.2, key: "music" },
];

// ── Canvas dimensions ──
const W = 960;
const H = 540;

// ── Shot timing (seconds) ──
const SHOT_TITLE_START   =  0;
const SHOT_CELL_START    =  4;
const SHOT_CODE_START    =  8;
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
    // Leading whitespace
    if (line[i] === " " || line[i] === "\t") {
      let ws = "";
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        ws += line[i++];
      }
      spans.push({ text: ws, color: SYN_IDENT });
      continue;
    }

    // Comment
    if (line[i] === "/" && line[i + 1] === "/") {
      spans.push({ text: line.slice(i), color: SYN_COMMENT });
      break;
    }

    // String literal
    if (line[i] === '"') {
      let str = '"';
      i++;
      while (i < line.length && line[i] !== '"') {
        str += line[i++];
      }
      if (i < line.length) str += line[i++]; // closing "
      spans.push({ text: str, color: SYN_STRING });
      continue;
    }

    // Number
    if (/[0-9]/.test(line[i])) {
      let num = "";
      while (i < line.length && /[0-9]/.test(line[i])) {
        num += line[i++];
      }
      spans.push({ text: num, color: SYN_NUMBER });
      continue;
    }

    // Operator / punctuation chars
    if (/[{}()\[\]%=+\-*/&|<>!:,;.]/.test(line[i])) {
      spans.push({ text: line[i], color: SYN_OPERATOR });
      i++;
      continue;
    }

    // Identifier or keyword
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

    // Fallback: any other char
    spans.push({ text: line[i], color: SYN_IDENT });
    i++;
  }

  return spans;
}

// ── Asset cache ──
interface AssetCache {
  cellBg: HTMLCanvasElement | null;
  corridorBg: HTMLCanvasElement | null;
  bossFpsBg: HTMLCanvasElement | null;
  mayaIdle: HTMLCanvasElement[];
  mayaWalk: HTMLCanvasElement[];
  guardWalk: HTMLCanvasElement[];
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
  // Moving scan sweep
  const sweepY = (t * 80) % H;
  ctx.globalAlpha = opacity * 0.8;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, sweepY, W, 1);
  ctx.restore();
}

// ── Shot 1: TITLE ──
function drawTitle(ctx: CanvasRenderingContext2D, shotT: number) {
  const dur = SHOT_CELL_START - SHOT_TITLE_START; // 4s

  // Background
  ctx.fillStyle = CLR_BG;
  ctx.fillRect(0, 0, W, H);

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

  // SIGNAL title — glow pulse
  const pulse = 0.7 + Math.sin(shotT * 3) * 0.3;
  ctx.save();
  ctx.font = "bold 48px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = CLR_SIGNAL;
  ctx.shadowBlur = 24 * pulse;
  ctx.globalAlpha = Math.min(1, shotT / 0.5);
  ctx.fillStyle = CLR_SIGNAL;
  ctx.fillText("SIGNAL", W / 2, H / 2 - 18);
  ctx.shadowBlur = 0;
  ctx.restore();

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

  // Only apply exit fade (no entrance fade for title since it starts from black)
  if (shotT > dur - FADE_DUR) {
    drawFade(ctx, (shotT - (dur - FADE_DUR)) / FADE_DUR);
  }
}

// ── Shot 2: CELL ──
function drawCell(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
) {
  const dur = SHOT_CODE_START - SHOT_CELL_START;

  // Background
  if (cache.cellBg) {
    ctx.drawImage(cache.cellBg, 0, 0);
  }

  // Maya idle cycle
  const frames = cache.mayaIdle;
  if (frames.length > 0) {
    const frameIdx = Math.floor(shotT / 0.12) % frames.length;
    const frame = frames[frameIdx];
    // frame is CHAR_W*scale × CHAR_H*scale = 48*3 × 80*3 = 144 × 240
    const frameW = frame.width;
    const frameH = frame.height;
    const mayaX = 350 - frameW / 2;
    const mayaY = 340 - frameH;
    ctx.drawImage(frame, mayaX, mayaY);
  }

  // Location label
  ctx.save();
  ctx.font = "bold 9px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = CLR_LABEL;
  ctx.fillText("SUBLEVEL 3 · CELL B-09", 12, 12);
  ctx.restore();

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 3: CODE TYPING ──
function drawCode(ctx: CanvasRenderingContext2D, shotT: number) {
  const dur = SHOT_CORRIDOR_START - SHOT_CODE_START;
  const LINE_TIME = 0.4; // seconds per line reveal
  const visibleLines = Math.min(
    GO_CODE_LINES.length,
    Math.floor(shotT / LINE_TIME) + 1,
  );

  // Background
  ctx.fillStyle = "#030810";
  ctx.fillRect(0, 0, W, H);

  const FONT_SIZE = 13;
  const LINE_H = 20;
  const LEFT_MARGIN = 56; // after line numbers
  const TOP_Y = 60;

  ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
  ctx.textBaseline = "top";

  for (let i = 0; i < visibleLines; i++) {
    const lineY = TOP_Y + i * LINE_H;
    const isCurrentLine = i === visibleLines - 1;
    const line = GO_CODE_LINES[i];

    // Line number
    ctx.textAlign = "right";
    ctx.fillStyle = "#1a3040";
    ctx.fillText(String(i + 1), LEFT_MARGIN - 10, lineY);

    // Left border strip
    ctx.fillStyle = "#0d1820";
    ctx.fillRect(0, lineY - 1, 2, LINE_H);

    // Syntax-highlighted tokens
    ctx.textAlign = "left";
    const tokens = tokenizeLine(line);
    let xOffset = LEFT_MARGIN;

    for (const tok of tokens) {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, xOffset, lineY);
      xOffset += ctx.measureText(tok.text).width;
    }

    // Blinking cursor at end of current line
    if (isCurrentLine && Math.floor(shotT * 2) % 2 === 0) {
      ctx.fillStyle = CLR_SIGNAL;
      ctx.fillRect(xOffset + 1, lineY, 2, FONT_SIZE + 1);
    }
  }

  // "▸ TRANSMIT" label bottom-right
  ctx.save();
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = CLR_SIGNAL;
  ctx.globalAlpha = 0.7 + Math.sin(shotT * 4) * 0.3;
  ctx.fillText("▸ TRANSMIT", W - 16, H - 16);
  ctx.restore();

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 4: CORRIDOR ──
function drawCorridor(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
) {
  const dur = SHOT_BOSS_START - SHOT_CORRIDOR_START;

  // Background
  if (cache.corridorBg) {
    ctx.drawImage(cache.corridorBg, 0, 0);
  }

  // Maya walk-right: moves from x=-50 to x=600 across shot duration
  const mayaWalkFrames = cache.mayaWalk;
  if (mayaWalkFrames.length > 0) {
    const frameIdx = Math.floor(shotT / 0.12) % mayaWalkFrames.length;
    const frame = mayaWalkFrames[frameIdx];
    const progress = shotT / dur;
    const mayaX = -50 + progress * 650;
    const mayaFeetY = 330;
    ctx.drawImage(frame, mayaX - frame.width / 2, mayaFeetY - frame.height);
  }

  // Guard walk-right: static position x=750, dimmed
  const guardFrames = cache.guardWalk;
  if (guardFrames.length > 0) {
    const frameIdx = Math.floor(shotT / 0.12) % guardFrames.length;
    const frame = guardFrames[frameIdx];
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(frame, 750 - frame.width / 2, 320 - frame.height);
    ctx.restore();
  }

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 5: BOSS ARENA ──
function drawBossArena(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
) {
  const dur = SHOT_COMBAT_START - SHOT_BOSS_START;
  const vpX = 480;
  const vpY = 205;
  const BOSS_SCALE = 3;
  const BOSS_BASE_W = 64;
  const BOSS_BASE_H = 80;
  const bossW = BOSS_BASE_W * BOSS_SCALE; // 192
  const bossH = BOSS_BASE_H * BOSS_SCALE; // 240

  // Background
  if (cache.bossFpsBg) {
    ctx.drawImage(cache.bossFpsBg, 0, 0);
  }

  // Boss idle frames cycling
  const frames = cache.bossIdle;
  if (frames.length > 0) {
    const frameIdx = Math.floor(shotT / 0.2) % frames.length;
    const frame = frames[frameIdx];
    const bossX = vpX - bossW / 2;
    const bossY = vpY - bossH * 0.4;
    ctx.drawImage(frame, bossX, bossY);
  }

  // "LOCKMASTER" label top-center
  ctx.save();
  ctx.font = "bold 12px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = CLR_BOSS_RED;
  ctx.fillText("LOCKMASTER", W / 2, 14);
  ctx.restore();

  // HP bar — full at start of shot
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

  // Targeting grid overlay injected by RAF loop at t=3s (needs live drawTargetingGrid ref)

  drawFade(ctx, shotFadeAlpha(shotT, dur));
}

// ── Shot 6: COMBAT ──
function drawCombat(
  ctx: CanvasRenderingContext2D,
  shotT: number,
  cache: AssetCache,
  drawExplosionFn: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number) => void,
  drawBloodFn: (ctx: CanvasRenderingContext2D, w: number, h: number, lost: number, max: number) => void,
  drawTargetingGridFn: (ctx: CanvasRenderingContext2D, w: number, h: number, sector: number, scan: number) => void,
) {
  const dur = SHOT_DEFEAT_START - SHOT_COMBAT_START;
  const BOSS_SCALE = 3;
  const BOSS_BASE_W = 64;
  const BOSS_BASE_H = 80;
  const bossW = BOSS_BASE_W * BOSS_SCALE;
  const bossH = BOSS_BASE_H * BOSS_SCALE;
  const vpX = 480;
  const vpY = 205;
  const bossCenterX = vpX;
  const bossCenterY = vpY - bossH * 0.15;

  // Background (FPS cached)
  if (cache.bossFpsBg) {
    // Camera shake on specific hits
    let shakeX = 0, shakeY = 0;
    if ((shotT >= 2.8 && shotT <= 3.2) || (shotT >= 4.8 && shotT <= 5.2)) {
      const shakeMag = 4;
      shakeX = (Math.sin(shotT * 47) * shakeMag) | 0;
      shakeY = (Math.cos(shotT * 31) * shakeMag * 0.6) | 0;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.drawImage(cache.bossFpsBg, 0, 0);
    ctx.restore();
  }

  // Targeting grid — persistent throughout combat
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawTargetingGridFn(ctx, W, H, 5, shotT % 1);
  ctx.restore();

  // 0–2s: boss hit-react frames cycling
  const bossFrames = shotT < 5 ? cache.bossHitReact : cache.bossLowHp;
  if (bossFrames.length > 0) {
    const frameIdx = Math.floor(shotT / 0.12) % bossFrames.length;
    const frame = bossFrames[frameIdx];
    const bossX = vpX - bossW / 2;
    const bossY = vpY - bossH * 0.4;
    ctx.drawImage(frame, bossX, bossY);
  }

  // First explosion: cycles in first 2.5s
  if (shotT < 2.5) {
    const expProgress = (shotT % 0.8) / 0.8;
    drawExplosionFn(ctx, bossCenterX, bossCenterY, 60, expProgress);
  }

  // "▸ HIT — 20 DMG" text fades in at t=1, fades out by t=2.2
  if (shotT >= 1 && shotT < 2.5) {
    const hitAlpha = shotT < 1.4
      ? (shotT - 1) / 0.4
      : Math.max(0, 1 - (shotT - 1.4) / 0.8);
    ctx.save();
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = hitAlpha;
    ctx.fillStyle = CLR_SIGNAL;
    ctx.fillText("▸ HIT — 20 DMG", W / 2, H * 0.7);
    ctx.restore();
  }

  // t=2.5: blood splatters (1 heart lost)
  if (shotT >= 2.5) {
    drawBloodFn(ctx, W, H, 1, 5);
  }

  // t=3: second explosion
  if (shotT >= 3 && shotT < 4.5) {
    const expProgress = ((shotT - 3) % 0.8) / 0.8;
    drawExplosionFn(ctx, bossCenterX - 20, bossCenterY - 10, 50, expProgress);
  }

  // HP bar — drops over time: 100 → 60 → 40
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

  // t=4s: more blood splatters
  if (shotT >= 4) {
    drawBloodFn(ctx, W, H, 2, 5);
  }

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
  // Background
  if (cache.bossFpsBg) {
    ctx.drawImage(cache.bossFpsBg, 0, 0);
  }

  // The defeat sequence handles its own fade to black internally
  drawDefeatSeqFn(ctx, W, H, 480, 205, shotT, cache.defeatExplosions);

  // No extra fade — defeat sequence fades to black naturally
}

// ── Shot 8: END CARD ──
function drawEndCard(ctx: CanvasRenderingContext2D, shotT: number) {
  const dur = LOOP_DURATION - SHOT_ENDCARD_START;

  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  // Fade from black — 0.5s
  const overallAlpha = Math.min(1, shotT / 0.5);

  ctx.save();
  ctx.globalAlpha = overallAlpha;

  // "SIGNAL" title
  const pulse = 0.7 + Math.sin(shotT * 2.5) * 0.3;
  ctx.font = "bold 56px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = CLR_SIGNAL;
  ctx.shadowBlur = 28 * pulse;
  ctx.fillStyle = CLR_SIGNAL;
  ctx.fillText("SIGNAL", W / 2, H / 2 - 44);
  ctx.shadowBlur = 0;

  // Subtitle at t=1.5
  if (shotT >= 1.5) {
    const sub1Alpha = Math.min(1, (shotT - 1.5) / 0.5);
    ctx.globalAlpha = overallAlpha * sub1Alpha;
    ctx.font = "13px 'JetBrains Mono', monospace";
    ctx.fillStyle = CLR_ENDCARD_2;
    ctx.fillText("learn go through gameplay", W / 2, H / 2 + 8);
  }

  // CTA box at t=2.5
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
    // Border box
    ctx.strokeStyle = CLR_SIGNAL;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = CLR_SIGNAL;
    ctx.fillText(label, W / 2, boxY + boxH / 2 + 1);
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // Fade to black in last 1.5s
  if (shotT >= dur - 1.5) {
    const fadeOut = (shotT - (dur - 1.5)) / 1.5;
    drawFade(ctx, Math.min(1, fadeOut));
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
  soundRef.current = soundEnabled;
  const loopElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const cacheRef = useRef<AssetCache>({
    cellBg: null,
    corridorBg: null,
    bossFpsBg: null,
    mayaIdle: [],
    mayaWalk: [],
    guardWalk: [],
    bossIdle: [],
    bossHitReact: [],
    bossLowHp: [],
    defeatExplosions: [],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Dynamically import painters (client-only) ──
    let cancelled = false;

    async function init() {
      const [
        { paintScene },
        { paintBossFPS },
        { paintMayaFrames, paintGuardFrames },
        { paintBossFrames },
        { drawExplosion, drawBloodSplatters, drawDefeatSequence, generateDefeatExplosions, drawTargetingGrid },
      ] = await Promise.all([
        import("@/lib/sprites/scene-painter"),
        import("@/lib/sprites/scene-painter"),
        import("@/lib/sprites/character-painter"),
        import("@/lib/sprites/boss-painter"),
        import("@/lib/sprites/weapon-painter"),
      ]);

      if (cancelled) return;

      // Pre-render all scene backgrounds
      const cache = cacheRef.current;
      cache.cellBg = paintScene("cell", W, H);
      cache.corridorBg = paintScene("corridor", W, H);
      cache.bossFpsBg = paintBossFPS(W, H);

      // Pre-render character frames
      cache.mayaIdle     = paintMayaFrames("idle" as CharAnimation, 3);
      cache.mayaWalk     = paintMayaFrames("walk-right" as CharAnimation, 3);
      cache.guardWalk    = paintGuardFrames("walk-right" as CharAnimation, 3);
      cache.bossIdle     = paintBossFrames("idle" as BossAnimation, 3, 100);
      cache.bossHitReact = paintBossFrames("hit-react" as BossAnimation, 3, 60);
      cache.bossLowHp    = paintBossFrames("low-hp" as BossAnimation, 3, 30);

      // Pre-generate defeat explosions (vpX=480, vpY=205, bossW=192, bossH=240)
      cache.defeatExplosions = generateDefeatExplosions(480, 205, 192, 240);

      if (cancelled) return;

      // ── RAF loop ──
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

        // ── Audio cues ──
        const sndOn = soundRef.current;

        // Detect loop wrap — reset fired cues
        if (t < prevLoopT) firedCues.clear();
        prevLoopT = t;

        if (sndOn) {
          // One-shot SFX
          for (let i = 0; i < SFX_CUES.length; i++) {
            if (!firedCues.has(i) && t >= SFX_CUES[i].time) {
              firedCues.add(i);
              const el = new Audio(SFX_CUES[i].src);
              el.volume = SFX_CUES[i].vol;
              el.play().catch(() => {});
            }
          }

          // Loop zones (ambient/music)
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
          // Sound disabled — kill any playing loops
          for (const [key, el] of loopElsRef.current) {
            el.pause();
            loopElsRef.current.delete(key);
          }
        }

        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);

        if (t < SHOT_CELL_START) {
          // Shot 1: Title
          drawTitle(ctx, t - SHOT_TITLE_START);

        } else if (t < SHOT_CODE_START) {
          // Shot 2: Cell
          drawCell(ctx, t - SHOT_CELL_START, cache);

        } else if (t < SHOT_CORRIDOR_START) {
          // Shot 3: Code typing
          drawCode(ctx, t - SHOT_CODE_START);

        } else if (t < SHOT_BOSS_START) {
          // Shot 4: Corridor
          drawCorridor(ctx, t - SHOT_CORRIDOR_START, cache);

        } else if (t < SHOT_COMBAT_START) {
          // Shot 5: Boss arena
          const shotT = t - SHOT_BOSS_START;
          drawBossArena(ctx, shotT, cache);
          // Targeting grid injection at t=3s
          if (shotT >= 3) {
            const gridAlpha = Math.min(1, (shotT - 3) / 0.4);
            ctx.save();
            ctx.globalAlpha = gridAlpha * 0.35;
            drawTargetingGrid(ctx, W, H, 5, (shotT * 0.3) % 1);
            ctx.restore();
          }

        } else if (t < SHOT_DEFEAT_START) {
          // Shot 6: Combat
          drawCombat(
            ctx,
            t - SHOT_COMBAT_START,
            cache,
            drawExplosion,
            drawBloodSplatters,
            drawTargetingGrid,
          );

        } else if (t < SHOT_ENDCARD_START) {
          // Shot 7: Defeat
          drawDefeat(ctx, t - SHOT_DEFEAT_START, cache, drawDefeatSequence);

        } else {
          // Shot 8: End card
          drawEndCard(ctx, t - SHOT_ENDCARD_START);
        }

        // Global scanlines (very subtle, always on)
        drawScanlines(ctx, t, 0.04);

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Stop any playing loop audio
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
