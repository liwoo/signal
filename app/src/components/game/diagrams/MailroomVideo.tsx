"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAudio } from "@/hooks/useAudio";
import type { SfxName } from "@/hooks/useAudio";

// ── The Mailroom — how a Go program runs, as a narrated video ──
// A beat-scripted explainer for absolute beginners. Every beat pairs one short
// subtitle with one visible action (a worker walks, an envelope travels, the
// display prints) and one highlighted line of code, so the analogy and the
// syntax are always on screen together. Pacing is derived from the subtitle
// length, not a fixed timer, so nothing flashes past before it can be read.

const T = {
  ink: "#e2e8f0", inkMid: "#94a3b8", inkFade: "#475569", line: "#2a3040",
  paper: "#1a1e28", steelLt: "#2d3f5c", red: "#c0392b",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
  result: "#00ff88", sticker: "#86efac", bubbleBg: "#e8eef7", bubbleInk: "#0a0e18",
};

const KEYFRAMES = `
  @keyframes mv-fade-in   {from{opacity:0}to{opacity:1}}
  @keyframes mv-pop       {from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes mv-bob       {0%,100%{transform:translateY(0)}50%{transform:translateY(-6%)}}
  @keyframes mv-work      {0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
  @keyframes mv-courier-r {0%{left:46%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:59%;opacity:0}}
  @keyframes mv-courier-l {0%{left:59%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:46%;opacity:0}}
  @keyframes mv-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes mv-glow      {0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0)}50%{box-shadow:0 0 24px 4px rgba(0,255,136,.35)}}
  @keyframes mv-pulse-red {0%,100%{box-shadow:0 0 6px 2px rgba(239,68,68,.35)}50%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
  @keyframes mv-bubble    {from{transform:translate(-50%,6px) scale(.85);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}
  @keyframes mv-slide-in  {from{transform:translateX(-140%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes mv-title     {0%{opacity:0;letter-spacing:.6em;filter:blur(6px)}100%{opacity:1;letter-spacing:.25em;filter:blur(0)}}
`;

// ── Script ──────────────────────────────────────────────────────────

const CODE = [
  "package main",
  "",
  'import "fmt"',
  "",
  "func main() {",
  '    const favLang = "Go"',
  '    name := "maya"',
  "    fmt.Println(favLang)",
  "    fmt.Println(name)",
  "}",
];

type Spot = "door" | "shelf" | "mainDesk" | "slotMain" | "slotFmt" | "fmtDesk" | "button";

// Percent positions inside the rooms area (feet anchor).
// Workers stand in front of the furniture (feet on the floor line at 90%);
// envelopes sit on the table tops; the package rests on the shelf.
const SPOT: Record<Spot, { x: number; y: number }> = {
  door: { x: 13, y: 78 },
  shelf: { x: 22, y: 62 },
  mainDesk: { x: 31, y: 90 },
  slotMain: { x: 44, y: 90 },
  slotFmt: { x: 62, y: 90 },
  fmtDesk: { x: 80, y: 90 },
  button: { x: 17, y: 90 },
};

type Mood = "idle" | "walk" | "work" | "wait" | "done";

interface Worker {
  at: Spot;
  say?: string;
  mood?: Mood;
}

interface Envelope {
  id: string;
  label: string;
  kind: "func" | "const" | "var";
  value?: string;
  at: "mainDesk" | "fmtDesk";
  fresh?: boolean;
}

interface Stage {
  focus: "both" | "main" | "fmt" | "display";
  zainab: Worker;
  jijo: Worker;
  pkg: "none" | "arriving" | "desk";
  addrLabel: boolean;
  envelopes: Envelope[];
  courier?: { dir: "to-fmt" | "to-main"; label: string };
  display: string[];
  button: "locked" | "pressed";
  overlay?: "title" | "recap";
}

interface Beat {
  id: string;
  part: string;
  caption: string;
  codeLine: number | null;
  stage: Stage;
  holdMs?: number;
  sfx?: SfxName;
  sfxVolume?: number;
}

const MAIN_ENV: Envelope = { id: "main", label: "main", kind: "func", at: "mainDesk" };
const FAV: Envelope = { id: "favLang", label: "favLang", kind: "const", value: '"Go"', at: "mainDesk" };
const NAME: Envelope = { id: "name", label: "name", kind: "var", value: '"maya"', at: "mainDesk" };

const BASE: Stage = {
  focus: "both",
  zainab: { at: "mainDesk", mood: "idle" },
  jijo: { at: "fmtDesk", mood: "idle" },
  pkg: "none",
  addrLabel: false,
  envelopes: [],
  display: [],
  button: "locked",
};

function stage(patch: Partial<Stage>): Stage {
  return { ...BASE, ...patch };
}

const P1 = "1 · THE PACKAGE";
const P2 = "2 · THE ADDRESS LABEL";
const P3 = "3 · THE MAIN ENVELOPE";
const P4 = "4 · STICKERS";
const P5 = "5 · POSTING TO FMT";
const P6 = "6 · DONE";

export const BEATS: Beat[] = [
  {
    id: "title", part: P1, codeLine: null, holdMs: 1600, sfx: "terminal-beep", sfxVolume: 0.25,
    caption: "meet the mailroom. two rooms, two workers, one job: run your program.",
    stage: stage({ overlay: "title" }),
  },
  {
    id: "meet-zainab", part: P1, codeLine: null,
    caption: "left room: the MAIN department. this is zainab. she runs your program.",
    stage: stage({ focus: "main", zainab: { at: "mainDesk", say: "hi 👋", mood: "idle" } }),
  },
  {
    id: "meet-jijo", part: P1, codeLine: null,
    caption: "right room: the FMT department. this is jijo. he owns the display panel.",
    stage: stage({ focus: "fmt", jijo: { at: "fmtDesk", say: "i print things", mood: "idle" } }),
  },
  {
    id: "package-in", part: P1, codeLine: 0, sfx: "door-slide", sfxVolume: 0.25,
    caption: "you type go run main.go — and a package slides in through the wall.",
    stage: stage({ focus: "main", pkg: "arriving", zainab: { at: "door", mood: "walk" }, display: ["$ go run main.go"] }),
  },
  {
    id: "read-label", part: P1, codeLine: 0,
    caption: "zainab reads the label: PACKAGE NAME: main. that's the entry package — the one go starts with.",
    stage: stage({ focus: "main", pkg: "desk", zainab: { at: "mainDesk", say: "package main ✓", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "attachments", part: P2, codeLine: 2,
    caption: "the package lists one required attachment: fmt.",
    stage: stage({ focus: "main", pkg: "desk", zainab: { at: "mainDesk", say: "needs: fmt", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "fetch-label", part: P2, codeLine: 2,
    caption: "import means: go fetch the address label for the fmt department.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, zainab: { at: "shelf", say: "fetching 📋", mood: "walk" }, display: ["$ go run main.go"] }),
  },
  {
    id: "have-label", part: P2, codeLine: 2,
    caption: "now she knows where to send things later. no label, no delivery.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, zainab: { at: "mainDesk", say: "got the address", mood: "idle" }, display: ["$ go run main.go"] }),
  },
  {
    id: "main-env", part: P3, codeLine: 4,
    caption: "inside the package: one envelope, named main. go always opens main first.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [{ ...MAIN_ENV, fresh: true }], zainab: { at: "mainDesk", say: "func main", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "no-inputs", part: P3, codeLine: 4,
    caption: "it needs no information to open — that's why the brackets are empty: ( )",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], zainab: { at: "mainDesk", say: "( ) nothing needed", mood: "idle" }, display: ["$ go run main.go"] }),
  },
  {
    id: "instructions", part: P3, codeLine: 5,
    caption: "inside are instructions. zainab reads them top to bottom, one at a time.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], zainab: { at: "mainDesk", say: "reading…", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "const-make", part: P4, codeLine: 5,
    caption: "instruction 1: make a sealed envelope called favLang.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, { ...FAV, value: undefined, fresh: true }], zainab: { at: "mainDesk", say: "const favLang", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "const-seal", part: P4, codeLine: 5,
    caption: 'she sticks the word "Go" inside and seals it. sealed = const. it can never change.',
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, FAV], zainab: { at: "mainDesk", say: "🔒 sealed", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "var-make", part: P4, codeLine: 6,
    caption: "instruction 2: make an open envelope called name.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, FAV, { ...NAME, value: undefined, fresh: true }], zainab: { at: "mainDesk", say: "name :=", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "var-fill", part: P4, codeLine: 6,
    caption: 'she sticks "maya" inside and leaves it open. open = variable. you can swap the sticker later.',
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, FAV, NAME], zainab: { at: "mainDesk", say: "open ✉ swappable", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "post-1", part: P5, codeLine: 7,
    caption: "instruction 3: fmt.Println(favLang). that means: post favLang to the fmt department.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, FAV, NAME], zainab: { at: "mainDesk", say: "post it →", mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "courier-1", part: P5, codeLine: 7, sfx: "message-receive", sfxVolume: 0.3,
    caption: "she uses the fmt address label and drops the envelope through the wall slot.",
    stage: stage({ focus: "both", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, NAME], courier: { dir: "to-fmt", label: "TO: fmt.Println · favLang" }, zainab: { at: "slotMain", mood: "work" }, jijo: { at: "slotFmt", say: "incoming…", mood: "wait" }, display: ["$ go run main.go"] }),
  },
  {
    id: "jijo-reads-1", part: P5, codeLine: 7,
    caption: "jijo opens it and reads the sticker: Go.",
    stage: stage({ focus: "fmt", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, NAME, { ...FAV, at: "fmtDesk" }], zainab: { at: "mainDesk", say: "⏳", mood: "wait" }, jijo: { at: "fmtDesk", say: 'sticker says "Go"', mood: "work" }, display: ["$ go run main.go"] }),
  },
  {
    id: "print-1", part: P5, codeLine: 7, sfx: "terminal-beep", sfxVolume: 0.3,
    caption: "he prints it on the display panel. Println = print a line.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, NAME, { ...FAV, at: "fmtDesk" }], zainab: { at: "mainDesk", mood: "wait" }, jijo: { at: "fmtDesk", say: "printing ⌨", mood: "work" }, display: ["$ go run main.go", "Go"] }),
  },
  {
    id: "reply-1", part: P5, codeLine: 7,
    caption: "he posts a DONE reply back through the slot. zainab can move on.",
    stage: stage({ focus: "both", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, NAME], courier: { dir: "to-main", label: "REPLY: done ✓" }, zainab: { at: "mainDesk", say: "next!", mood: "idle" }, jijo: { at: "slotFmt", mood: "idle" }, display: ["$ go run main.go", "Go"] }),
  },
  {
    id: "post-2", part: P5, codeLine: 8, sfx: "message-receive", sfxVolume: 0.3,
    caption: "instruction 4: fmt.Println(name). same trip, different envelope.",
    stage: stage({ focus: "both", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], courier: { dir: "to-fmt", label: "TO: fmt.Println · name" }, zainab: { at: "slotMain", say: "post name →", mood: "work" }, jijo: { at: "slotFmt", say: "incoming…", mood: "wait" }, display: ["$ go run main.go", "Go"] }),
  },
  {
    id: "print-2", part: P5, codeLine: 8, sfx: "terminal-beep", sfxVolume: 0.3,
    caption: "jijo reads the sticker — maya — and prints it.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV, { ...NAME, at: "fmtDesk" }], zainab: { at: "mainDesk", mood: "wait" }, jijo: { at: "fmtDesk", say: '"maya" ⌨', mood: "work" }, display: ["$ go run main.go", "Go", "maya"] }),
  },
  {
    id: "done", part: P6, codeLine: 9, sfx: "handshake-confirm", sfxVolume: 0.4,
    caption: "no instructions left. zainab presses the button. program complete.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], button: "pressed", zainab: { at: "button", say: "done ✅", mood: "done" }, jijo: { at: "fmtDesk", say: "done ✓", mood: "done" }, display: ["$ go run main.go", "Go", "maya"] }),
  },
  {
    id: "output", part: P6, codeLine: null,
    caption: "your program ran. the display shows two lines: Go, then maya.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], button: "pressed", zainab: { at: "mainDesk", mood: "done" }, jijo: { at: "fmtDesk", mood: "done" }, display: ["$ go run main.go", "Go", "maya"] }),
  },
  {
    id: "recap", part: P6, codeLine: null, holdMs: 6000,
    caption: "that's the whole trick: package, import, func main, const or :=, fmt.Println.",
    stage: stage({ overlay: "recap", pkg: "desk", addrLabel: true, envelopes: [MAIN_ENV], button: "pressed", display: ["$ go run main.go", "Go", "maya"] }),
  },
];

const RECAP: Array<{ a: string; c: string; col: string }> = [
  { a: "package card", c: "package main", col: T.purple },
  { a: "address label", c: 'import "fmt"', col: T.blue },
  { a: "the envelope", c: "func main()", col: T.pink },
  { a: "sealed envelope", c: "const", col: T.amber },
  { a: "open envelope", c: ":= variable", col: T.blue },
  { a: "post to fmt", c: "fmt.Println", col: T.green },
  { a: "display panel", c: "the terminal", col: T.result },
];

// Subtitle pacing — typed at a reading speed, then held.
const TYPE_MS = 34;
const HOLD_MS = 1300;
export function beatDurationMs(beat: Beat): number {
  return 400 + beat.caption.length * TYPE_MS + (beat.holdMs ?? HOLD_MS);
}
export const TOTAL_MS = BEATS.reduce((sum, b) => sum + beatDurationMs(b), 0);

// ── Pieces ──────────────────────────────────────────────────────────

function SHLine({ line, u, dim }: { line: string; u: number; dim: boolean }) {
  const tokens = line.split(/((?:package|import|func|var|const|return)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|[{}()])/g);
  const kw = ["package", "import", "func", "var", "const", "return"];
  return (
    <span style={{ opacity: dim ? 0.45 : 1, transition: "opacity .3s" }}>
      {tokens.map((t, i) => {
        let color: string = T.ink;
        if (kw.includes(t)) color = T.purple;
        else if (t.startsWith('"')) color = T.sticker;
        else if (t === "fmt") color = "#60a5fa";
        else if (t === "Println") color = "#fbbf24";
        else if (t === ":=") color = T.pink;
        return <span key={i} style={{ color, fontSize: u * 1.55 }}>{t}</span>;
      })}
    </span>
  );
}

function WorkerFigure({ w, emoji, name, u, color }: { w: Worker; emoji: string; name: string; u: number; color: string }) {
  const pos = SPOT[w.at];
  const anim =
    w.mood === "walk" ? "mv-bob .5s ease-in-out infinite" :
    w.mood === "work" ? "mv-work .7s ease-in-out infinite" :
    "none";
  return (
    <div
      style={{
        position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
        transform: "translate(-50%,-100%)",
        transition: "left .9s cubic-bezier(.4,0,.2,1), top .9s cubic-bezier(.4,0,.2,1)",
        zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center",
      }}
    >
      {w.say && (
        <div
          key={w.say}
          style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            marginBottom: u * 1.2, background: T.bubbleBg, color: T.bubbleInk,
            fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: u * 1.6, lineHeight: 1.2,
            padding: `${u * 0.6}px ${u * 1.1}px`, whiteSpace: "nowrap",
            animation: "mv-bubble .3s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          {w.say}
          <div style={{ position: "absolute", left: "50%", bottom: -u * 0.55, width: u * 1.1, height: u * 1.1, background: T.bubbleBg, transform: "translateX(-50%) rotate(45deg)" }} />
        </div>
      )}
      <div style={{ fontSize: u * 5.2, lineHeight: 1, animation: anim, transformOrigin: "50% 100%", filter: w.mood === "done" ? `drop-shadow(0 0 ${u}px ${T.green})` : "none" }}>
        {emoji}
      </div>
      {/* Name tag hangs below the feet so the figure itself stands on `top`. */}
      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: u * 0.3, fontFamily: "var(--font-mono)", fontSize: u * 1.25, fontWeight: 700, letterSpacing: 1, color, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {name}
      </div>
    </div>
  );
}

function EnvelopeCard({ env, u, x, y }: { env: Envelope; u: number; x: number; y: number }) {
  const color = env.kind === "func" ? T.pink : env.kind === "const" ? T.amber : T.blue;
  const w = env.kind === "func" ? u * 7 : u * 6.6;
  return (
    <div
      style={{
        position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
        transition: "left .7s ease, top .7s ease", zIndex: env.kind === "func" ? 8 : 9,
        animation: env.fresh ? "mv-pop .45s cubic-bezier(.34,1.56,.64,1) both" : "mv-fade-in .3s ease-out both",
      }}
    >
      <div style={{ width: w, background: "#080c14", border: `${u * 0.2}px solid ${color}`, overflow: "hidden" }}>
        <div style={{ height: u * 1.9, background: color + "33", display: "flex", alignItems: "center", justifyContent: "center", gap: u * 0.4, fontFamily: "var(--font-mono)", fontSize: u * 0.95, fontWeight: 700, color, whiteSpace: "nowrap" }}>
          {env.kind === "const" ? "🔒 SEALED" : env.kind === "var" ? "OPEN" : "func"}
        </div>
        <div style={{ padding: `${u * 0.5}px ${u * 0.7}px ${u * 0.7}px` }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.35, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{env.label}</div>
          {env.value ? (
            <div style={{ marginTop: u * 0.4, display: "inline-flex", alignItems: "center", gap: u * 0.3, background: "#0d2a18", border: `1px solid ${T.sticker}`, padding: `${u * 0.15}px ${u * 0.5}px`, fontFamily: "var(--font-mono)", fontSize: u * 1.1, color: T.sticker, fontWeight: 700, whiteSpace: "nowrap" }}>
              🔤 {env.value}
            </div>
          ) : env.kind !== "func" ? (
            <div style={{ marginTop: u * 0.5, fontFamily: "var(--font-mono)", fontSize: u * 1.1, color: color + "88", fontStyle: "italic" }}>empty</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Rooms ───────────────────────────────────────────────────────────

function Rooms({ st, u, beatKey }: { st: Stage; u: number; beatKey: string }) {
  const WALL_L = 50;
  const WALL_W = 5;
  const dimMain = st.focus === "fmt" || st.focus === "display";
  const dimFmt = st.focus === "main" || st.focus === "display";
  const dimRooms = st.overlay !== undefined;
  const label = (text: string, color: string, left: number) => (
    <div style={{ position: "absolute", top: "4%", left: `${left}%`, fontFamily: "var(--font-mono)", fontSize: u * 1.5, fontWeight: 700, letterSpacing: 2, color, textTransform: "uppercase" }}>{text}</div>
  );

  const deskEnvs = st.envelopes.filter((e) => e.at === "mainDesk");
  const fmtEnvs = st.envelopes.filter((e) => e.at === "fmtDesk");

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg,#0b1220 0%,#090e1a 100%)" }}>
      {/* Floor line + ceiling lights */}
      <div style={{ position: "absolute", left: "5%", right: 0, top: "93%", height: 1, background: T.steelLt }} />
      <div style={{ position: "absolute", top: 0, left: "6%", width: `${WALL_L - 8}%`, height: u * 0.4, background: `linear-gradient(90deg,transparent,${T.amber}66,transparent)` }} />
      <div style={{ position: "absolute", top: 0, left: `${WALL_L + WALL_W + 2}%`, right: "2%", height: u * 0.4, background: `linear-gradient(90deg,transparent,${T.blue}66,transparent)` }} />

      {/* Left wall with the package slot */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "5%", background: "#0c1420", borderRight: `1px solid ${T.steelLt}66` }}>
        <div style={{ position: "absolute", top: "48%", left: "10%", right: "10%", height: "22%", background: "#0a0f14", border: `1px solid ${T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1, color: T.inkFade, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>slot</span>
        </div>
      </div>

      {label("MAIN dept · zainab", T.amber, 7)}
      {label("FMT dept · jijo", T.blue, WALL_L + WALL_W + 2)}

      {/* Address label pinned to the MAIN wall */}
      {st.addrLabel && (
        <div style={{ position: "absolute", top: "11%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}`, padding: `${u * 0.4}px ${u * 1}px`, fontFamily: "var(--font-mono)", fontSize: u * 1.3, fontWeight: 700, color: T.blue, animation: "mv-fade-in .4s", display: "flex", gap: u * 0.5, alignItems: "center" }}>
          📋 fmt <span style={{ fontSize: u * 1, color: T.blue + "99" }}>address label</span>
        </div>
      )}
      {/* Shelf */}
      <div style={{ position: "absolute", left: "12%", top: "42%", width: "16%", height: u * 0.5, background: T.steelLt }} />
      <div style={{ position: "absolute", left: "12%", top: "44%", fontFamily: "var(--font-mono)", fontSize: u * 1, color: T.inkFade, textTransform: "uppercase", letterSpacing: 1 }}>shelf</div>

      {/* Worktables */}
      <div style={{ position: "absolute", left: "16%", width: `${WALL_L - 20}%`, top: "66%", height: "14%", background: "linear-gradient(180deg,#121c2e,#0e1522)", border: `1px solid ${T.steelLt}88`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: u * 0.5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, color: T.inkFade, textTransform: "uppercase", letterSpacing: 1 }}>worktable</span>
      </div>
      <div style={{ position: "absolute", left: `${WALL_L + WALL_W + 8}%`, right: "6%", top: "66%", height: "14%", background: "linear-gradient(180deg,#0e1c2e,#0a1320)", border: `1px solid ${T.blue}55`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: u * 0.5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, color: T.inkFade, textTransform: "uppercase", letterSpacing: 1 }}>fmt table</span>
      </div>

      {/* The package: slides in from the wall, then sits on the worktable */}
      {st.pkg !== "none" && (
        <div
          style={{
            position: "absolute",
            left: st.pkg === "arriving" ? "6%" : "13%",
            top: st.pkg === "arriving" ? "70%" : "42%",
            transform: "translate(0,-100%)",
            transition: "left .9s cubic-bezier(.4,0,.2,1), top .9s cubic-bezier(.4,0,.2,1)",
            animation: st.pkg === "arriving" ? "mv-slide-in .8s cubic-bezier(.22,1,.36,1) both" : "none",
            width: u * 8, background: T.paper, border: `1px solid ${T.steelLt}`, zIndex: 7,
          }}
        >
          <div style={{ height: u * 1.6, background: T.red, display: "flex", alignItems: "center", paddingLeft: u * 0.5, fontFamily: "var(--font-mono)", fontSize: u * 0.85, color: "#fff", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>GO PACKAGE</div>
          <div style={{ padding: `${u * 0.3}px ${u * 0.5}px`, fontFamily: "var(--font-mono)" }}>
            <div style={{ fontSize: u * 0.8, color: T.inkFade, textTransform: "uppercase" }}>name:</div>
            <div style={{ fontSize: u * 1.4, color: T.ink, fontWeight: 700 }}>main</div>
          </div>
        </div>
      )}

      {/* Envelopes on the tables */}
      {deskEnvs.map((e, i) => <EnvelopeCard key={e.id} env={e} u={u} x={22 + i * 10.5} y={52} />)}
      {fmtEnvs.map((e, i) => <EnvelopeCard key={e.id} env={e} u={u} x={74 + i * 10.5} y={53} />)}

      {/* Complete button */}
      <div style={{ position: "absolute", left: "8%", top: "84%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 0.4, zIndex: 12 }}>
        <div style={{
          width: u * 4.2, height: u * 4.2, borderRadius: "50%",
          background: st.button === "pressed" ? `radial-gradient(circle,${T.green},#008866)` : "radial-gradient(circle,#7f1d1d,#3a0808)",
          border: `${u * 0.25}px solid ${st.button === "pressed" ? T.green : "#991b1b"}`,
          animation: st.button === "pressed" ? "mv-pop .4s ease-out" : "mv-pulse-red 1.2s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: u * 1.8,
        }}>{st.button === "pressed" ? "✅" : "🔴"}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: u * 1, fontWeight: 700, letterSpacing: 1, color: st.button === "pressed" ? T.green : "#b91c1c", textTransform: "uppercase" }}>
          {st.button === "pressed" ? "done" : "not done"}
        </div>
      </div>

      {/* Dividing wall + postal slot */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${WALL_L}%`, width: `${WALL_W}%`, background: "linear-gradient(180deg,#0c1520,#0a1018)", borderLeft: `1px solid ${T.steelLt}`, borderRight: `1px solid ${T.steelLt}` }}>
        <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: "14%", background: st.courier ? "#0d2a18" : "#080d14", border: `1px solid ${st.courier ? T.green : T.steelLt}`, transition: "all .3s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: u * 1.6 }}>📪</div>
        <div style={{ position: "absolute", top: "66%", left: 0, right: 0, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: u * 0.9, color: T.inkFade, textTransform: "uppercase", lineHeight: 1.3 }}>postal<br />slot</div>
      </div>

      {/* Courier: an envelope crossing the wall */}
      {st.courier && (
        <div key={`${beatKey}-courier`} style={{ position: "absolute", top: "52%", zIndex: 30, animation: `${st.courier.dir === "to-fmt" ? "mv-courier-r" : "mv-courier-l"} 1.6s cubic-bezier(.4,0,.2,1) both`, transform: "translate(-50%,-50%)" }}>
          <div style={{ background: T.paper, border: `${u * 0.15}px solid ${T.green}`, padding: `${u * 0.4}px ${u * 0.8}px`, fontSize: u * 2, lineHeight: 1, boxShadow: `0 0 ${u * 1.5}px ${T.green}66` }}>✉</div>
        </div>
      )}
      {st.courier && (
        <div key={`${beatKey}-tag`} style={{ position: "absolute", top: "24%", left: `${WALL_L + WALL_W / 2}%`, transform: "translateX(-50%)", background: "#0d2a18", border: `1px solid ${T.green}`, padding: `${u * 0.4}px ${u * 1}px`, fontFamily: "var(--font-mono)", fontSize: u * 1.25, fontWeight: 700, color: T.green, whiteSpace: "nowrap", zIndex: 31, animation: "mv-fade-in .3s" }}>
          {st.courier.dir === "to-fmt" ? "→ " : "← "}{st.courier.label}
        </div>
      )}

      {/* Workers */}
      <WorkerFigure w={st.zainab} emoji="🧕🏿" name="zainab" u={u} color={T.amber} />
      <WorkerFigure w={st.jijo} emoji="👨🏿‍💻" name="jijo" u={u} color={T.blue} />

      {/* Spotlight: the room without the action falls back */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${WALL_L}%`, background: "#05080f", opacity: dimRooms ? 0.7 : dimMain ? 0.55 : 0, transition: "opacity .6s ease", pointerEvents: "none", zIndex: 40 }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${WALL_L + WALL_W}%`, right: 0, background: "#05080f", opacity: dimRooms ? 0.7 : dimFmt ? 0.55 : 0, transition: "opacity .6s ease", pointerEvents: "none", zIndex: 40 }} />
    </div>
  );
}

function DisplayPanel({ st, u }: { st: Stage; u: number }) {
  const lit = st.focus === "display";
  return (
    <div style={{ position: "absolute", inset: 0, background: "#020d04", borderTop: `1px solid ${lit ? T.result : "#0d1a10"}`, display: "flex", alignItems: "center", gap: u * 1.2, padding: `0 ${u * 1.4}px`, transition: "border-color .4s", animation: lit ? "mv-glow 1.6s ease-in-out infinite" : "none" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.1, color: lit ? T.result : "#1a5c2a", textTransform: "uppercase", letterSpacing: 1.5, borderRight: "1px solid #0d2a10", paddingRight: u * 1.2, flexShrink: 0 }}>display panel</span>
      <div style={{ display: "flex", alignItems: "center", gap: u * 1.6, overflow: "hidden", flex: 1 }}>
        {st.display.map((line, i) => {
          const isResult = i > 0;
          return (
            <span key={`${i}-${line}`} style={{ fontFamily: "var(--font-mono)", fontSize: isResult ? u * 2.2 : u * 1.3, color: isResult ? T.result : "#2f8a45", fontWeight: isResult ? 700 : 400, textShadow: isResult ? `0 0 ${u}px ${T.result}` : "none", whiteSpace: "nowrap", animation: i === st.display.length - 1 ? "mv-pop .4s ease-out both" : "none" }}>
              {line}
            </span>
          );
        })}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.6, color: "#2f8a45", animation: "mv-blink 1s step-end infinite" }}>█</span>
      </div>
    </div>
  );
}

function CodeFollow({ line, u, part }: { line: number | null; u: number; part: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#070b14", borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: `${u * 1}px ${u * 1.4}px`, borderBottom: `1px solid ${T.line}`, fontFamily: "var(--font-mono)", fontSize: u * 1.05, letterSpacing: 1.5, color: T.inkFade, textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
        <span>main.go</span>
        <span style={{ color: T.green }}>{part}</span>
      </div>
      <div style={{ padding: `${u * 1}px 0`, flex: 1 }}>
        {CODE.map((text, i) => {
          const active = line === i;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: u * 0.8, padding: `${u * 0.35}px ${u * 1}px`, background: active ? T.green + "18" : "transparent", borderLeft: `${u * 0.3}px solid ${active ? T.green : "transparent"}`, transition: "background .3s, border-color .3s" }}>
              <span style={{ width: u * 1.6, fontFamily: "var(--font-mono)", fontSize: u * 1, color: active ? T.green : "#2a3040", textAlign: "right" }}>{active ? "▶" : i + 1}</span>
              <span style={{ fontFamily: "var(--font-mono)", whiteSpace: "pre" }}><SHLine line={text} u={u} dim={line !== null && !active} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Player ──────────────────────────────────────────────────────────

interface MailroomVideoProps {
  autoPlay?: boolean;
  soundEnabled?: boolean;
}

export function MailroomVideo({ autoPlay = true, soundEnabled = true }: MailroomVideoProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 360 });
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  // Typed subtitle length, keyed to its beat so a new beat starts from zero
  // without a synchronous reset inside an effect.
  const [typedState, setTypedState] = useState({ index: 0, n: 0 });
  const typed = typedState.index === index ? typedState.n : 0;
  const [ended, setEnded] = useState(false);
  const audio = useAudio(soundEnabled);
  const audioRef = useRef(audio);
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  const beat = BEATS[index];
  const u = size.w / 100;

  // Fit a 16:9 picture into whatever box the overlay gives us.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const fit = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(280, Math.min(rect.width, (rect.height * 16) / 9));
      setSize({ w, h: (w * 9) / 16 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Subtitle typing.
  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setTypedState((prev) => {
        const n = prev.index === index ? prev.n : 0;
        if (n >= beat.caption.length) {
          clearInterval(iv);
          return prev;
        }
        return { index, n: n + 1 };
      });
    }, TYPE_MS);
    return () => clearInterval(iv);
  }, [index, playing, beat.caption.length]);

  // Beat clock: fire the beat's sound, then advance after its reading time.
  useEffect(() => {
    if (!playing) return;
    if (beat.sfx) audioRef.current.playSfx(beat.sfx, beat.sfxVolume ?? 0.3);
    const timer = setTimeout(() => {
      if (index >= BEATS.length - 1) {
        setPlaying(false);
        setEnded(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, beatDurationMs(beat));
    return () => clearTimeout(timer);
  }, [index, playing, beat]);

  const goTo = useCallback((i: number, play: boolean) => {
    setIndex(Math.max(0, Math.min(BEATS.length - 1, i)));
    setEnded(false);
    setPlaying(play);
    const clamped = Math.max(0, Math.min(BEATS.length - 1, i));
    if (!play) setTypedState({ index: clamped, n: BEATS[clamped].caption.length });
  }, []);

  const replay = useCallback(() => goTo(0, true), [goTo]);

  const elapsedMs = useMemo(
    () => BEATS.slice(0, index).reduce((sum, b) => sum + beatDurationMs(b), 0),
    [index],
  );
  const fmtTime = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // Chapter markers (first beat index of each part).
  const parts = useMemo(() => {
    const seen = new Map<string, number>();
    BEATS.forEach((b, i) => {
      if (!seen.has(b.part)) seen.set(b.part, i);
    });
    return [...seen.entries()];
  }, []);

  const caption = playing ? beat.caption.slice(0, typed) : beat.caption;
  const st = beat.stage;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <style>{KEYFRAMES}</style>

      {/* Picture */}
      <div ref={hostRef} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          role="img"
          aria-label={`The mailroom explainer, part ${beat.part}: ${beat.caption}`}
          style={{ position: "relative", width: size.w, height: size.h, background: "#070b14", border: `1px solid ${T.steelLt}`, overflow: "hidden", fontFamily: "var(--font-mono)" }}
        >
          {/* Rooms (left column) */}
          <div style={{ position: "absolute", left: 0, top: 0, width: "66%", height: "70%" }}>
            <Rooms st={st} u={u} beatKey={beat.id} />
          </div>
          {/* Display panel under the rooms */}
          <div style={{ position: "absolute", left: 0, top: "70%", width: "66%", height: "14%" }}>
            <DisplayPanel st={st} u={u} />
          </div>
          {/* Code follow-along (right column) */}
          <div style={{ position: "absolute", left: "66%", top: 0, width: "34%", height: "84%" }}>
            <CodeFollow line={beat.codeLine} u={u} part={beat.part} />
          </div>

          {/* Overlays: title card, recap */}
          {st.overlay === "title" && (
            <div style={{ position: "absolute", left: 0, top: 0, width: "66%", height: "84%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: u * 4.2, fontWeight: 900, color: "var(--color-signal)", textShadow: "0 0 24px rgba(110,255,160,.5)", animation: "mv-title 1s cubic-bezier(.22,1,.36,1) both", letterSpacing: ".25em" }}>
                HOW A GO PROGRAM RUNS
              </div>
              <div style={{ marginTop: u * 1.2, fontSize: u * 1.5, letterSpacing: 4, color: T.inkMid, textTransform: "uppercase", animation: "mv-fade-in .8s .5s both" }}>the mailroom · under two minutes</div>
            </div>
          )}
          {st.overlay === "recap" && (
            <div style={{ position: "absolute", left: 0, top: 0, width: "66%", height: "84%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, padding: u * 2 }}>
              <div style={{ fontSize: u * 1.3, letterSpacing: 3, color: T.green, textTransform: "uppercase", marginBottom: u * 1.4, animation: "mv-fade-in .4s both" }}>recap · analogy → go</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(28%, 1fr))", gap: u * 0.9, width: "100%" }}>
                {RECAP.map((item, i) => (
                  <div key={item.c} style={{ border: `1px solid ${item.col}66`, background: "#080c14ee", padding: `${u * 0.8}px ${u * 1}px`, animation: `mv-pop .4s ${i * 0.12}s cubic-bezier(.34,1.56,.64,1) both` }}>
                    <div style={{ fontSize: u * 1.15, color: T.inkMid }}>{item.a}</div>
                    <div style={{ fontSize: u * 1.5, color: item.col, fontWeight: 700, marginTop: u * 0.3 }}>{item.c}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtitles */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", background: "linear-gradient(180deg,#05080fcc,#05080f)", borderTop: `1px solid ${T.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `0 ${u * 3}px`, textAlign: "center", zIndex: 60 }}>
            <div style={{ fontSize: u * 0.95, letterSpacing: 3, color: T.amber, textTransform: "uppercase", marginBottom: u * 0.5 }}>part {beat.part}</div>
            <div style={{ fontSize: u * 2, lineHeight: 1.35, color: T.ink, fontWeight: 600, minHeight: u * 2.7 }}>
              {caption}
              {playing && typed < beat.caption.length && <span style={{ color: T.green, animation: "mv-blink .8s step-end infinite" }}>▍</span>}
            </div>
          </div>

          {/* Ended: replay prompt over the picture */}
          {ended && (
            <button onClick={replay} className="cursor-pointer" style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(5,8,15,.55)", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: u * 1.2, animation: "mv-fade-in .4s both" }}>
              <span style={{ fontSize: u * 5, lineHeight: 1 }}>↻</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: u * 1.6, letterSpacing: 4, color: "var(--color-signal)" }}>WATCH AGAIN</span>
            </button>
          )}
        </div>
      </div>

      {/* Transport */}
      <div style={{ flexShrink: 0, width: size.w, alignSelf: "center", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Chaptered progress bar */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }} aria-label="video progress">
          {BEATS.map((b, i) => (
            <button
              key={b.id}
              onClick={() => goTo(i, true)}
              title={`${b.part} — ${b.caption}`}
              className="cursor-pointer"
              style={{ flex: beatDurationMs(b), height: 5, border: "none", padding: 0, background: i < index ? T.green : i === index ? T.green + "99" : T.line, transition: "background .3s", marginLeft: parts.some(([, start]) => start === i && i > 0) ? 6 : 0 }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => goTo(index - 1, playing)} disabled={index === 0} className="bg-transparent cursor-pointer" style={{ padding: "6px 12px", border: `1px solid ${T.line}`, color: index === 0 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)" }}>◀</button>
          {ended ? (
            <button onClick={replay} className="bg-transparent cursor-pointer" style={{ padding: "6px 18px", border: "1px solid var(--color-signal)", color: "var(--color-signal)", fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 2 }}>↻ REPLAY</button>
          ) : (
            <button onClick={() => (playing ? setPlaying(false) : goTo(index, true))} className="bg-transparent cursor-pointer" style={{ padding: "6px 18px", border: "1px solid var(--color-signal)", color: "var(--color-signal)", fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: 2, minWidth: 92 }}>
              {playing ? "❚❚ PAUSE" : "▶ PLAY"}
            </button>
          )}
          <button onClick={() => goTo(index + 1, playing)} disabled={index >= BEATS.length - 1} className="bg-transparent cursor-pointer" style={{ padding: "6px 12px", border: `1px solid ${T.line}`, color: index >= BEATS.length - 1 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)" }}>▶</button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.inkMid }}>{fmtTime(elapsedMs)} / {fmtTime(TOTAL_MS)}</span>
          <div className="hidden sm:flex" style={{ marginLeft: "auto", gap: 10, flexWrap: "wrap" }}>
            {parts.map(([name, start]) => (
              <button key={name} onClick={() => goTo(start, true)} className="bg-transparent cursor-pointer" style={{ border: "none", padding: 0, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, color: beat.part === name ? T.green : T.inkMid, textTransform: "uppercase" }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
