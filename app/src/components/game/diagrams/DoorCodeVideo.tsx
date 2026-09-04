"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAudio } from "@/hooks/useAudio";
import type { SfxName } from "@/hooks/useAudio";

// ── The Door Code — a loop + switch, as a narrated video ──
// The chapter-2 sibling of MailroomVideo. Same mailroom, same two workers, same
// beat engine (one subtitle + one visible action + one highlighted line, paced by
// reading length, not a fixed timer). New objects appear inside the room as the
// concept is introduced: a sealed folder of label constants, a revolving door for
// the for-loop, and a sorting room for the switch. ~26 beats, ~1:50.

const T = {
  ink: "#e2e8f0", inkMid: "#94a3b8", inkFade: "#475569", line: "#2a3040",
  paper: "#1a1e28", steelLt: "#2d3f5c", red: "#c0392b",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
  result: "#00ff88", sticker: "#86efac", bubbleBg: "#e8eef7", bubbleInk: "#0a0e18",
};

const LANE_COLORS: Record<string, string> = { deny: T.red, warn: T.amber, grant: T.green, override: "#ff6b6b" };

const KEYFRAMES = `
  @keyframes dv-fade-in   {from{opacity:0}to{opacity:1}}
  @keyframes dv-pop       {from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes dv-bob       {0%,100%{transform:translateY(0)}50%{transform:translateY(-6%)}}
  @keyframes dv-work      {0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
  @keyframes dv-courier-r {0%{left:46%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:59%;opacity:0}}
  @keyframes dv-courier-l {0%{left:59%;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:46%;opacity:0}}
  @keyframes dv-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes dv-glow      {0%,100%{box-shadow:0 0 0 0 rgba(0,255,136,0)}50%{box-shadow:0 0 24px 4px rgba(0,255,136,.35)}}
  @keyframes dv-pulse-red {0%,100%{box-shadow:0 0 6px 2px rgba(239,68,68,.35)}50%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
  @keyframes dv-bubble    {from{transform:translate(-50%,6px) scale(.85);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}
  @keyframes dv-slide-in  {from{transform:translateX(-140%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes dv-spin      {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes dv-title     {0%{opacity:0;letter-spacing:.6em;filter:blur(6px)}100%{opacity:1;letter-spacing:.25em;filter:blur(0)}}
`;

// ── Script ──────────────────────────────────────────────────────────

const CODE = [
  "package main",              // 0
  "",                          // 1
  'import "fmt"',              // 2
  "",                          // 3
  "const (",                   // 4
  '    deny     = "DENY"',     // 5
  '    warn     = "WARN"',     // 6
  '    grant    = "GRANT"',    // 7
  '    override = "OVERRIDE"', // 8
  ")",                         // 9
  "",                          // 10
  "func main() {",             // 11
  "    for i := 1; i <= 10; i++ {", // 12
  "        switch {",          // 13
  "        case i <= 3:",      // 14
  "            fmt.Println(i, deny)",  // 15
  "        case i <= 6:",      // 16
  "            fmt.Println(i, warn)",  // 17
  "        case i <= 9:",      // 18
  "            fmt.Println(i, grant)", // 19
  "        default:",          // 20
  "            fmt.Println(i, override)", // 21
  "        }",                 // 22
  "    }",                     // 23
  "}",                         // 24
];

type Spot = "door" | "shelf" | "mainDesk" | "slotMain" | "slotFmt" | "fmtDesk" | "button";

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

interface Stage {
  focus: "both" | "main" | "fmt" | "display";
  zainab: Worker;
  jijo: Worker;
  pkg: "none" | "arriving" | "desk";
  addrLabel: boolean;
  constFolder: boolean;
  constTags: string[];                       // which name tags are lit
  loop: { i: number; condTrue: boolean } | null;
  lane: "deny" | "warn" | "grant" | "override" | null;
  courier?: { dir: "to-fmt" | "to-main"; label: string };
  display: string[];
  button: "locked" | "pressed";
  overlay?: "title" | "recap";
}

interface Beat {
  id: string;
  part: string;
  caption: string;
  codeLine: number | number[] | null;
  stage: Stage;
  holdMs?: number;
  sfx?: SfxName;
  sfxVolume?: number;
}

const BASE: Stage = {
  focus: "both",
  zainab: { at: "mainDesk", mood: "idle" },
  jijo: { at: "fmtDesk", mood: "idle" },
  pkg: "none",
  addrLabel: false,
  constFolder: false,
  constTags: [],
  loop: null,
  lane: null,
  display: [],
  button: "locked",
};

function stage(patch: Partial<Stage>): Stage {
  return { ...BASE, ...patch };
}

const ALL_TAGS = ["deny", "warn", "grant", "override"];
const RUN = "$ go run main.go";

const P1 = "1 · THE KEYPAD";
const P2 = "2 · SEALED LABELS";
const P3 = "3 · THE REVOLVING DOOR";
const P4 = "4 · THE SORTING ROOM";
const P5 = "5 · TEN SPINS";
const P6 = "6 · DONE";

export const BEATS: Beat[] = [
  {
    id: "title", part: P1, codeLine: null, holdMs: 1600, sfx: "terminal-beep", sfxVolume: 0.25,
    caption: "the cell door has a keypad. ten codes, and each one needs the right action.",
    stage: stage({ overlay: "title" }),
  },
  {
    id: "same-room", part: P1, codeLine: null,
    caption: "same mailroom as before. zainab runs your program, jijo owns the display.",
    stage: stage({ focus: "both", zainab: { at: "mainDesk", say: "hi again 👋", mood: "idle" }, jijo: { at: "fmtDesk", mood: "idle" } }),
  },
  {
    id: "the-job", part: P1, codeLine: null,
    caption: "this time one job repeats: for each code 1 to 10, decide DENY, WARN, GRANT or OVERRIDE.",
    stage: stage({ focus: "main", zainab: { at: "mainDesk", say: "1..10", mood: "idle" } }),
  },
  {
    id: "package-in", part: P1, codeLine: 0, sfx: "door-slide", sfxVolume: 0.25,
    caption: "you run the program and the package slides in: package main. the entry point.",
    stage: stage({ focus: "main", pkg: "arriving", zainab: { at: "door", mood: "walk" }, display: [RUN] }),
  },
  {
    id: "fetch-label", part: P1, codeLine: 2,
    caption: "import fmt again — the address label so zainab can post results to the display.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, zainab: { at: "shelf", say: "fetching 📋", mood: "walk" }, display: [RUN] }),
  },
  {
    id: "sealed-folder", part: P2, codeLine: [4, 9],
    caption: "new on the shelf: a sealed folder marked ACCESS LABELS. inside are constants.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, zainab: { at: "shelf", say: "const ( )", mood: "work" }, display: [RUN] }),
  },
  {
    id: "name-tags", part: P2, codeLine: [5, 6, 7, 8],
    caption: "four name tags: deny, warn, grant, override. each maps a short name to fixed text.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, constTags: ALL_TAGS, zainab: { at: "shelf", say: "🏷 four labels", mood: "work" }, display: [RUN] }),
  },
  {
    id: "why-const", part: P2, codeLine: 8,
    caption: "sealed means const — locked. write \"OVERRIDE\" once here, not scattered through the code.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["override"], zainab: { at: "mainDesk", say: "🔒 one source", mood: "idle" }, display: [RUN] }),
  },
  {
    id: "open-main", part: P3, codeLine: 11,
    caption: "zainab opens the main envelope and reads the first instruction inside.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, zainab: { at: "mainDesk", say: "func main", mood: "work" }, display: [RUN] }),
  },
  {
    id: "revolving-door", part: P3, codeLine: 12,
    caption: "instruction: step into the revolving door. that door is a for loop.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "🔄 for", mood: "work" }, display: [RUN] }),
  },
  {
    id: "init", part: P3, codeLine: 12,
    caption: "the counter sign sets i to 1. that's the start — it runs exactly once.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "i := 1", mood: "work" }, display: [RUN] }),
  },
  {
    id: "cond", part: P3, codeLine: 12,
    caption: "the wall sign says keep spinning while i <= 10. it's checked before every spin.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "i <= 10 ✅", mood: "work" }, display: [RUN] }),
  },
  {
    id: "post", part: P3, codeLine: 12,
    caption: "after each spin the counter ticks up: i++. in go there's just one way to count.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "i++", mood: "work" }, display: [RUN] }),
  },
  {
    id: "sorting-room", part: P4, codeLine: 13,
    caption: "inside every spin is a sorting room. that room is a switch with no variable.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "switch { }", mood: "work" }, display: [RUN] }),
  },
  {
    id: "first-match", part: P4, codeLine: [14, 16, 18],
    caption: "it reads the cases top to bottom and takes the FIRST one that's true.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "first true wins", mood: "work" }, display: [RUN] }),
  },
  {
    id: "no-break", part: P4, codeLine: 15,
    caption: "no break needed — a go case exits on its own. safe by default, no fallthrough.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 1, condTrue: true }, zainab: { at: "mainDesk", say: "no break ✓", mood: "work" }, display: [RUN] }),
  },
  {
    id: "spin-1", part: P5, codeLine: [14, 15], sfx: "terminal-beep", sfxVolume: 0.3,
    caption: "spin one. i = 1. is i <= 3? yes → the DENY lane. post \"1 DENY\" to jijo.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["deny"], loop: { i: 1, condTrue: true }, lane: "deny", jijo: { at: "fmtDesk", say: "printing ⌨", mood: "work" }, display: [RUN, "1 DENY"] }),
  },
  {
    id: "spin-2-3", part: P5, codeLine: [14, 15], sfx: "terminal-beep", sfxVolume: 0.25,
    caption: "spins two and three are still <= 3. same lane: 2 DENY, 3 DENY.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["deny"], loop: { i: 3, condTrue: true }, lane: "deny", jijo: { at: "fmtDesk", say: "deny…", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY"] }),
  },
  {
    id: "spin-4", part: P5, codeLine: [16, 17], sfx: "terminal-beep", sfxVolume: 0.3,
    caption: "spin four. i = 4. not <= 3, but <= 6 → the WARN lane. post \"4 WARN\".",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["warn"], loop: { i: 4, condTrue: true }, lane: "warn", jijo: { at: "fmtDesk", say: "warn…", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN"] }),
  },
  {
    id: "spin-5-6", part: P5, codeLine: [16, 17], sfx: "terminal-beep", sfxVolume: 0.25,
    caption: "five and six take the same lane: 5 WARN, 6 WARN.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["warn"], loop: { i: 6, condTrue: true }, lane: "warn", jijo: { at: "fmtDesk", say: "warn…", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN"] }),
  },
  {
    id: "spin-7", part: P5, codeLine: [18, 19], sfx: "terminal-beep", sfxVolume: 0.3,
    caption: "seven. past 3 and past 6, but <= 9 → the GRANT lane. post \"7 GRANT\".",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["grant"], loop: { i: 7, condTrue: true }, lane: "grant", jijo: { at: "fmtDesk", say: "grant…", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT"] }),
  },
  {
    id: "spin-8-9", part: P5, codeLine: [18, 19], sfx: "terminal-beep", sfxVolume: 0.25,
    caption: "eight and nine follow: 8 GRANT, 9 GRANT.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["grant"], loop: { i: 9, condTrue: true }, lane: "grant", jijo: { at: "fmtDesk", say: "grant…", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT"] }),
  },
  {
    id: "spin-10", part: P5, codeLine: [20, 21], sfx: "terminal-beep", sfxVolume: 0.35,
    caption: "ten. no case matched, so it falls to default — the catch-all: 10 OVERRIDE.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, constTags: ["override"], loop: { i: 10, condTrue: true }, lane: "override", jijo: { at: "fmtDesk", say: "override!", mood: "work" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"] }),
  },
  {
    id: "exit-loop", part: P6, codeLine: 12,
    caption: "the counter ticks to 11. is i <= 10? no. the door locks and zainab steps out.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, loop: { i: 11, condTrue: false }, zainab: { at: "mainDesk", say: "i=11 · ⛔", mood: "idle" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"] }),
  },
  {
    id: "done", part: P6, codeLine: 24, sfx: "handshake-confirm", sfxVolume: 0.4,
    caption: "no instructions left. zainab presses the button. program complete.",
    stage: stage({ focus: "main", pkg: "desk", addrLabel: true, constFolder: true, button: "pressed", zainab: { at: "button", say: "done ✅", mood: "done" }, jijo: { at: "fmtDesk", say: "done ✓", mood: "done" }, display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"] }),
  },
  {
    id: "output", part: P6, codeLine: null,
    caption: "the display shows all ten codes classified, in order — the keypad's full sequence.",
    stage: stage({ focus: "display", pkg: "desk", addrLabel: true, constFolder: true, button: "pressed", display: [RUN, "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"] }),
  },
  {
    id: "recap", part: P6, codeLine: null, holdMs: 6000,
    caption: "the whole trick: const labels, a for loop to count, and a switch to classify.",
    stage: stage({ overlay: "recap", pkg: "desk", addrLabel: true, constFolder: true, button: "pressed", display: [RUN, "1 DENY", "…", "10 OVERRIDE"] }),
  },
];

const RECAP: Array<{ a: string; c: string; col: string }> = [
  { a: "sealed folder", c: "const ( )", col: T.amber },
  { a: "🏷 name tag", c: 'deny = "DENY"', col: T.sticker },
  { a: "revolving door", c: "for i := 1..10", col: T.green },
  { a: "counter tick", c: "i++", col: T.pink },
  { a: "sorting room", c: "switch { }", col: T.purple },
  { a: "labelled bay", c: "case i <= 3", col: T.red },
  { a: "catch-all bay", c: "default", col: "#ff6b6b" },
  { a: "post to fmt", c: "fmt.Println", col: T.green },
];

// Subtitle pacing — typed at a reading speed, then held.
const TYPE_MS = 34;
const HOLD_MS = 1300;
export function beatDurationMs(beat: Beat): number {
  return 400 + beat.caption.length * TYPE_MS + (beat.holdMs ?? HOLD_MS);
}
export const TOTAL_MS = BEATS.reduce((sum, b) => sum + beatDurationMs(b), 0);

function isActiveLine(line: number | number[] | null, i: number): boolean {
  if (line === null) return false;
  return Array.isArray(line) ? line.includes(i) : line === i;
}

// ── Pieces ──────────────────────────────────────────────────────────

function SHLine({ line, u, dim }: { line: string; u: number; dim: boolean }) {
  const tokens = line.split(/((?:package|import|func|var|const|return|for|switch|case|default|if|else)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|\+\+|<=|[{}()])/g);
  const kw = ["package", "import", "func", "var", "const", "return", "for", "switch", "case", "default", "if", "else"];
  return (
    <span style={{ opacity: dim ? 0.45 : 1, transition: "opacity .3s" }}>
      {tokens.map((t, i) => {
        let color: string = T.ink;
        if (kw.includes(t)) color = T.purple;
        else if (t.startsWith('"')) color = T.sticker;
        else if (t === "fmt") color = "#60a5fa";
        else if (t === "Println") color = "#fbbf24";
        else if (t === ":=" || t === "++" || t === "<=") color = T.pink;
        return <span key={i} style={{ color, fontSize: u * 1.4 }}>{t}</span>;
      })}
    </span>
  );
}

function WorkerFigure({ w, emoji, name, u, color }: { w: Worker; emoji: string; name: string; u: number; color: string }) {
  const pos = SPOT[w.at];
  const anim =
    w.mood === "walk" ? "dv-bob .5s ease-in-out infinite" :
    w.mood === "work" ? "dv-work .7s ease-in-out infinite" :
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
            animation: "dv-bubble .3s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          {w.say}
          <div style={{ position: "absolute", left: "50%", bottom: -u * 0.55, width: u * 1.1, height: u * 1.1, background: T.bubbleBg, transform: "translateX(-50%) rotate(45deg)" }} />
        </div>
      )}
      <div style={{ fontSize: u * 5.2, lineHeight: 1, animation: anim, transformOrigin: "50% 100%", filter: w.mood === "done" ? `drop-shadow(0 0 ${u}px ${T.green})` : "none" }}>
        {emoji}
      </div>
      <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: u * 0.3, fontFamily: "var(--font-mono)", fontSize: u * 1.25, fontWeight: 700, letterSpacing: 1, color, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {name}
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
        <div style={{ position: "absolute", top: "11%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}`, padding: `${u * 0.4}px ${u * 1}px`, fontFamily: "var(--font-mono)", fontSize: u * 1.3, fontWeight: 700, color: T.blue, animation: "dv-fade-in .4s", display: "flex", gap: u * 0.5, alignItems: "center" }}>
          📋 fmt <span style={{ fontSize: u * 1, color: T.blue + "99" }}>address label</span>
        </div>
      )}

      {/* Sealed const folder on the shelf */}
      {st.constFolder && (
        <div style={{ position: "absolute", left: "12%", top: "20%", width: "30%", background: T.amber + "14", border: `1px solid ${T.amber}66`, padding: `${u * 0.5}px ${u * 0.7}px`, animation: "dv-fade-in .4s", zIndex: 6 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: u * 1, fontWeight: 700, color: T.amber, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: u * 0.4 }}>
            📂 access labels <span style={{ fontSize: u * 0.85 }}>🔒 const</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: u * 0.5, marginTop: u * 0.5 }}>
            {ALL_TAGS.map((tag) => {
              const col = LANE_COLORS[tag];
              const lit = st.constTags.includes(tag);
              return (
                <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, fontWeight: 700, color: lit ? col : col + "66", background: lit ? col + "22" : "transparent", border: `1px solid ${lit ? col : "transparent"}`, padding: `${u * 0.1}px ${u * 0.5}px`, transition: "all .3s" }}>
                  🏷{tag}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Shelf ledge */}
      <div style={{ position: "absolute", left: "12%", top: "42%", width: "16%", height: u * 0.5, background: T.steelLt }} />

      {/* Worktables */}
      <div style={{ position: "absolute", left: "16%", width: `${WALL_L - 20}%`, top: "66%", height: "14%", background: "linear-gradient(180deg,#121c2e,#0e1522)", border: `1px solid ${T.steelLt}88`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: u * 0.5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, color: T.inkFade, textTransform: "uppercase", letterSpacing: 1 }}>worktable</span>
      </div>
      <div style={{ position: "absolute", left: `${WALL_L + WALL_W + 8}%`, right: "6%", top: "66%", height: "14%", background: "linear-gradient(180deg,#0e1c2e,#0a1320)", border: `1px solid ${T.blue}55`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: u * 0.5 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, color: T.inkFade, textTransform: "uppercase", letterSpacing: 1 }}>fmt table</span>
      </div>

      {/* Revolving door + sorting station over the worktable */}
      {st.loop && (
        <div style={{ position: "absolute", left: "16%", width: `${WALL_L - 20}%`, top: "40%", height: "25%", border: `1.5px solid ${st.loop.condTrue ? T.green + "88" : T.red + "88"}`, background: "#080d14dd", animation: "dv-fade-in .4s", overflow: "hidden", zIndex: 8, transition: "border-color .4s" }}>
          {/* Loop header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${u * 0.3}px ${u * 0.7}px`, borderBottom: `1px solid ${T.steelLt}66`, background: "#0a0e1899" }}>
            <div style={{ display: "flex", alignItems: "center", gap: u * 0.5 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.1, fontWeight: 700, color: T.green, textTransform: "uppercase" }}>for</span>
              {st.loop.condTrue
                ? <span style={{ fontSize: u * 1.4, display: "inline-block", animation: "dv-spin 2s linear infinite" }}>🔄</span>
                : <span style={{ fontSize: u * 1.1, color: T.red }}>⛔</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: u * 0.5 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.5, fontWeight: 700, color: T.blue }}>i={st.loop.i}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.2, color: st.loop.condTrue ? T.green : T.red }}>{st.loop.condTrue ? "✅" : "❌"}</span>
            </div>
          </div>
          {/* Sorting lanes */}
          <div style={{ display: "flex", flexDirection: "column", gap: u * 0.15, padding: `${u * 0.3}px ${u * 0.5}px` }}>
            {([
              { lane: "deny", label: "i ≤ 3 → DENY" },
              { lane: "warn", label: "i ≤ 6 → WARN" },
              { lane: "grant", label: "i ≤ 9 → GRANT" },
              { lane: "override", label: "default → OVERRIDE" },
            ] as const).map((l) => {
              const col = LANE_COLORS[l.lane];
              const active = st.lane === l.lane;
              return (
                <div key={l.lane} style={{ display: "flex", alignItems: "center", gap: u * 0.5, padding: `${u * 0.1}px ${u * 0.5}px`, background: active ? col + "33" : "transparent", borderLeft: `${u * 0.4}px solid ${active ? col : "transparent"}`, transition: "all .3s" }}>
                  <div style={{ width: u * 0.8, height: u * 0.8, background: active ? col : col + "33" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.05, color: active ? col : T.inkFade, fontWeight: active ? 700 : 400 }}>{l.label}</span>
                  {active && <span style={{ marginLeft: "auto", color: col, fontSize: u * 1.1 }}>◄</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The package: slides in from the wall, then sits on the shelf */}
      {st.pkg !== "none" && (
        <div
          style={{
            position: "absolute",
            left: st.pkg === "arriving" ? "6%" : "13%",
            top: st.pkg === "arriving" ? "70%" : "13%",
            transform: "translate(0,-100%)",
            transition: "left .9s cubic-bezier(.4,0,.2,1), top .9s cubic-bezier(.4,0,.2,1)",
            animation: st.pkg === "arriving" ? "dv-slide-in .8s cubic-bezier(.22,1,.36,1) both" : "none",
            width: u * 7.5, background: T.paper, border: `1px solid ${T.steelLt}`, zIndex: 7,
          }}
        >
          <div style={{ height: u * 1.5, background: T.red, display: "flex", alignItems: "center", paddingLeft: u * 0.5, fontFamily: "var(--font-mono)", fontSize: u * 0.8, color: "#fff", fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap" }}>GO PACKAGE</div>
          <div style={{ padding: `${u * 0.3}px ${u * 0.5}px`, fontFamily: "var(--font-mono)" }}>
            <div style={{ fontSize: u * 0.75, color: T.inkFade, textTransform: "uppercase" }}>name:</div>
            <div style={{ fontSize: u * 1.3, color: T.ink, fontWeight: 700 }}>main</div>
          </div>
        </div>
      )}

      {/* Complete button */}
      <div style={{ position: "absolute", left: "8%", top: "84%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: u * 0.4, zIndex: 12 }}>
        <div style={{
          width: u * 4.2, height: u * 4.2, borderRadius: "50%",
          background: st.button === "pressed" ? `radial-gradient(circle,${T.green},#008866)` : "radial-gradient(circle,#7f1d1d,#3a0808)",
          border: `${u * 0.25}px solid ${st.button === "pressed" ? T.green : "#991b1b"}`,
          animation: st.button === "pressed" ? "dv-pop .4s ease-out" : "dv-pulse-red 1.2s ease-in-out infinite",
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
        <div key={`${beatKey}-courier`} style={{ position: "absolute", top: "52%", zIndex: 30, animation: `${st.courier.dir === "to-fmt" ? "dv-courier-r" : "dv-courier-l"} 1.6s cubic-bezier(.4,0,.2,1) both`, transform: "translate(-50%,-50%)" }}>
          <div style={{ background: T.paper, border: `${u * 0.15}px solid ${T.green}`, padding: `${u * 0.4}px ${u * 0.8}px`, fontSize: u * 2, lineHeight: 1, boxShadow: `0 0 ${u * 1.5}px ${T.green}66` }}>✉</div>
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
    <div style={{ position: "absolute", inset: 0, background: "#020d04", borderTop: `1px solid ${lit ? T.result : "#0d1a10"}`, display: "flex", alignItems: "center", gap: u * 1.2, padding: `0 ${u * 1.4}px`, transition: "border-color .4s", animation: lit ? "dv-glow 1.6s ease-in-out infinite" : "none" }}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.1, color: lit ? T.result : "#1a5c2a", textTransform: "uppercase", letterSpacing: 1.5, borderRight: "1px solid #0d2a10", paddingRight: u * 1.2, flexShrink: 0 }}>display panel</span>
      <div style={{ display: "flex", alignItems: "center", gap: u * 1.4, overflow: "hidden", flex: 1 }}>
        {st.display.map((line, i) => {
          const isCmd = line.startsWith("$");
          const parts = line.split(" ");
          const laneKey = parts[1]?.toLowerCase();
          const col = isCmd ? "#2f8a45" : (LANE_COLORS[laneKey] || T.result);
          return (
            <span key={`${i}-${line}`} style={{ fontFamily: "var(--font-mono)", fontSize: isCmd ? u * 1.2 : u * 1.6, color: col, fontWeight: isCmd ? 400 : 700, textShadow: !isCmd ? `0 0 ${u}px ${col}` : "none", whiteSpace: "nowrap", animation: i === st.display.length - 1 ? "dv-pop .4s ease-out both" : "none" }}>
              {line}
            </span>
          );
        })}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: u * 1.6, color: "#2f8a45", animation: "dv-blink 1s step-end infinite" }}>█</span>
      </div>
    </div>
  );
}

function CodeFollow({ line, u, part }: { line: number | number[] | null; u: number; part: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#070b14", borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: `${u * 0.8}px ${u * 1.2}px`, borderBottom: `1px solid ${T.line}`, fontFamily: "var(--font-mono)", fontSize: u * 1, letterSpacing: 1.5, color: T.inkFade, textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
        <span>main.go</span>
        <span style={{ color: T.green }}>{part}</span>
      </div>
      <div style={{ padding: `${u * 0.6}px 0`, flex: 1, overflow: "hidden" }}>
        {CODE.map((text, i) => {
          const active = isActiveLine(line, i);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: u * 0.6, padding: `${u * 0.12}px ${u * 0.8}px`, background: active ? T.green + "18" : "transparent", borderLeft: `${u * 0.3}px solid ${active ? T.green : "transparent"}`, transition: "background .3s, border-color .3s" }}>
              <span style={{ width: u * 1.6, fontFamily: "var(--font-mono)", fontSize: u * 0.9, color: active ? T.green : "#2a3040", textAlign: "right" }}>{active ? "▶" : i + 1}</span>
              <span style={{ fontFamily: "var(--font-mono)", whiteSpace: "pre" }}><SHLine line={text} u={u} dim={line !== null && !active} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Player ──────────────────────────────────────────────────────────

interface DoorCodeVideoProps {
  autoPlay?: boolean;
  soundEnabled?: boolean;
}

export function DoorCodeVideo({ autoPlay = true, soundEnabled = true }: DoorCodeVideoProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 360 });
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
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
          aria-label={`The door code explainer, part ${beat.part}: ${beat.caption}`}
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
              <div style={{ fontFamily: "var(--font-display)", fontSize: u * 3.8, fontWeight: 900, color: "var(--color-signal)", textShadow: "0 0 24px rgba(110,255,160,.5)", animation: "dv-title 1s cubic-bezier(.22,1,.36,1) both", letterSpacing: ".25em" }}>
                CRACKING THE DOOR CODE
              </div>
              <div style={{ marginTop: u * 1.2, fontSize: u * 1.5, letterSpacing: 4, color: T.inkMid, textTransform: "uppercase", animation: "dv-fade-in .8s .5s both" }}>a loop and a switch · under two minutes</div>
            </div>
          )}
          {st.overlay === "recap" && (
            <div style={{ position: "absolute", left: 0, top: 0, width: "66%", height: "84%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, padding: u * 2 }}>
              <div style={{ fontSize: u * 1.3, letterSpacing: 3, color: T.green, textTransform: "uppercase", marginBottom: u * 1.4, animation: "dv-fade-in .4s both" }}>recap · analogy → go</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(28%, 1fr))", gap: u * 0.9, width: "100%" }}>
                {RECAP.map((item, i) => (
                  <div key={item.c} style={{ border: `1px solid ${item.col}66`, background: "#080c14ee", padding: `${u * 0.8}px ${u * 1}px`, animation: `dv-pop .4s ${i * 0.1}s cubic-bezier(.34,1.56,.64,1) both` }}>
                    <div style={{ fontSize: u * 1.1, color: T.inkMid }}>{item.a}</div>
                    <div style={{ fontSize: u * 1.4, color: item.col, fontWeight: 700, marginTop: u * 0.3 }}>{item.c}</div>
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
              {playing && typed < beat.caption.length && <span style={{ color: T.green, animation: "dv-blink .8s step-end infinite" }}>▍</span>}
            </div>
          </div>

          {/* Ended: replay prompt over the picture */}
          {ended && (
            <button onClick={replay} className="cursor-pointer" style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(5,8,15,.55)", border: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: u * 1.2, animation: "dv-fade-in .4s both" }}>
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
