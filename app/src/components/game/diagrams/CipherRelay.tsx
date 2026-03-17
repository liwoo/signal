"use client";

import { useState, useEffect, useCallback } from "react";

// ── Design tokens (same as GoAppliance / DoorCodeMachine / ShaftFunctions / GuardRoster) ──
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};

const KEYFRAMES = `
  @keyframes cr-fadeIn    {from{opacity:0}to{opacity:1}}
  @keyframes cr-popIn2    {from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes cr-slideR    {0%{left:-20%}100%{left:110%}}
  @keyframes cr-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes cr-blinkRed  {0%,49%{opacity:1;box-shadow:0 0 10px #ef444466}50%,100%{opacity:0.25;box-shadow:none}}
  @keyframes cr-slideDown {from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes cr-pulse     {0%,100%{opacity:1}50%{opacity:0.5}}
  @keyframes cr-spin      {0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
  @keyframes cr-snip      {0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0 0 0)}}
`;

// ── Syntax highlight ──
function SHLine({ line }: { line: string }) {
  const tokens = line.split(/((?:package|import|func|var|const|return|for|if|else|range|nil)\b|"[^"]*"|\bfmt\b|\bstrings\b|\bstrconv\b|\bPrintln\b|\bFields\b|\bJoin\b|\bItoa\b|\bAtoi\b|\breverseWord\b|\bencode\b|\brelayHeader\b|:=|!=|<=|[{}()\[\];,!])/g);
  const kw = ["package", "import", "func", "var", "const", "return", "for", "if", "else", "range", "nil"];
  return (
    <span>
      {tokens.map((t, i) => {
        if (kw.includes(t)) return <span key={i} style={{ color: T.purple }}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{ color: "#86efac" }}>{t}</span>;
        if (t === "fmt" || t === "strings" || t === "strconv") return <span key={i} style={{ color: "#60a5fa" }}>{t}</span>;
        if (t === "Println" || t === "Fields" || t === "Join" || t === "Itoa" || t === "Atoi") return <span key={i} style={{ color: "#fbbf24" }}>{t}</span>;
        if (t === "reverseWord") return <span key={i} style={{ color: T.green }}>{t}</span>;
        if (t === "encode") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        if (t === "relayHeader") return <span key={i} style={{ color: T.amber }}>{t}</span>;
        if (t === ":=" || t === "!=" || t === "<=" || t === "!") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        return <span key={i} style={{ color: T.ink }}>{t}</span>;
      })}
    </span>
  );
}

// ── Code Panel ──
const ANIM_CODE = `package main

import (
    "fmt"
    "strings"
    "strconv"
)

func reverseWord(s string) string {
    runes := []rune(s)
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    return string(runes)
}

func encode(msg string) string {
    words := strings.Fields(msg)
    result := []string{}
    for _, w := range words {
        result = append(result, reverseWord(w))
    }
    return strings.Join(result, " ")
}

func relayHeader(floor int, code string) string {
    f := strconv.Itoa(floor)
    c, err := strconv.Atoi(code)
    if err != nil {
        return "F" + f + "-ERR"
    }
    return "F" + f + "-C" + strconv.Itoa(c*2)
}

func main() {
    fmt.Println(encode("move to floor 4"))
    fmt.Println(relayHeader(3, "50"))
}`;

interface Annotation { label: string; color: string }

function CodePanel({ highlightLines = [], annotate = {} }: { highlightLines?: number[]; annotate?: Record<number, Annotation> }) {
  return (
    <div style={{ background: "var(--color-code-bg, #0a0e18)", padding: 16, border: "1px solid rgba(110,255,160,.08)", fontFamily: "var(--font-mono)", fontSize: 12, overflowX: "auto" }}>
      {ANIM_CODE.split("\n").map((line, i) => {
        const hl = highlightLines.includes(i);
        const note = annotate[i];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, background: hl ? "#00d4aa11" : "transparent", borderLeft: hl ? "3px solid #00d4aa" : "3px solid transparent", padding: "1px 10px" }}>
              <span style={{ color: "#2a3040", minWidth: 18, fontSize: 11, userSelect: "none" }}>{i + 1}</span>
              <SHLine line={line} />
            </div>
            {note && (
              <span style={{ fontSize: 10, color: note.color, background: note.color + "18", border: `1px solid ${note.color}33`, padding: "2px 10px", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                {note.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Scene types ──
interface WorkerData { id: string; emoji: string; label: string; x: number; y: number; action: string }

interface Scene {
  id: string; narr: string;
  workers: WorkerData[];
  pkg: boolean; stringsBox: boolean; strconvBox: boolean;
  letterVisible: boolean; letterText: string;
  tilesVisible: boolean; tiles: string[];
  tilesReversed: boolean;
  scissorsVisible: boolean; wordTiles: string[];
  machineVisible: boolean; machineInput: string; machineOutput: string;
  tapeVisible: boolean; tapeResult: string;
  stampVisible: boolean; stampInput: string; stampOutput: string;
  readerVisible: boolean; readerInput: string; readerOutput: string; readerError: boolean;
  postalDir: null | "to_fmt"; postalLabel: string;
  display: string[]; displayResult: boolean;
  completeBtn: "locked" | "pressed";
  highlight: number[];
}

const PA = { DOOR: { x: 11, y: 28 }, SHELF: { x: 17, y: 22 }, MAIN_DESK: { x: 26, y: 52 }, WALL_SLOT: { x: 48, y: 47 }, FMT_SLOT: { x: 62, y: 47 }, FMT_DESK: { x: 74, y: 47 } };

// ── SCENES ──
const SCENES: Scene[] = [
  {
    id: "intro",
    narr: "the go machine is powered on. same appliance.\n\ntwo rooms. dividing wall. postal slot.\nzainab in MAIN dept. jijo in FMT/STRINGS dept.\n\nthis time: strings as rune slices.\na sealed letter arrives.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: false, strconvBox: false,
    letterVisible: true, letterText: "hello", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "rune_tiles",
    narr: "zainab opens the sealed letter.\n\na string is read-only bytes under the hood.\nto manipulate individual characters safely,\nshe cuts it into rune tiles:\n\n[]rune(s)\n\nh | e | l | l | o\n\neach tile is one unicode character.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "cutting tiles", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: false, strconvBox: false,
    letterVisible: false, letterText: "", tilesVisible: true, tiles: ["h", "e", "l", "l", "o"], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [8, 9],
  },
  {
    id: "reverse_swap",
    narr: "reversing: swap tiles from both ends.\n\ni starts at 0, j starts at len-1.\neach step: swap runes[i] and runes[j],\nthen i moves right, j moves left.\n\ni=0,j=4: h<->o\ni=1,j=3: e<->l\ni=2,j=2: stop (i >= j)\n\ngo's multi-assign: runes[i], runes[j] = runes[j], runes[i]",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "swapping i,j", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: false, strconvBox: false,
    letterVisible: false, letterText: "", tilesVisible: true, tiles: ["o", "l", "l", "e", "h"], tilesReversed: true,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [10, 11],
  },
  {
    id: "reverse_done",
    narr: "tiles reassembled into a new string:\n\nstring(runes) seals them back into a new letter.\n\n\"hello\" became \"olleh\"\n\nthe original string was never changed\n(strings are read-only in go).\nreverseWord is complete.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "sealing letter", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: false, strconvBox: false,
    letterVisible: true, letterText: "olleh", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [8, 9, 10, 11, 12, 13, 14],
  },
  {
    id: "fields_cut",
    narr: "now a sentence letter arrives:\n\"move to floor 4\"\n\nzainab needs the strings package.\nshe grabs the scissors: strings.Fields\n\nscissors cut at every space.\nresult: 4 word tiles:\n[ move ] [ to ] [ floor ] [ 4 ]",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "cutting words", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: true, strconvBox: false,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: true, wordTiles: ["move", "to", "floor", "4"], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [17, 18],
  },
  {
    id: "encode_loop",
    narr: "zainab feeds each word tile through\nthe reverseWord machine.\n\ncomposition: one function feeds another.\n\nmove -> evom\nto -> ot\nfloor -> roolf\n4 -> 4\n\neach reversed word goes into result[].",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "encoding...", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: true, strconvBox: false,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: true, machineInput: "move", machineOutput: "evom",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [19, 20, 21],
  },
  {
    id: "join_tape",
    narr: "all 4 word tiles reversed.\nresult = [evom, ot, roolf, 4]\n\nnow tape them back together:\nstrings.Join(result, \" \")\n\ntape connects tiles with a space between each.\n\nfinal string: \"evom ot roolf 4\"",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "taping words", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, stringsBox: true, strconvBox: false,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: true, tapeResult: "evom ot roolf 4", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [22],
  },
  {
    id: "itoa_stamp",
    narr: "now jijo enters. he has the strconv package.\n\nrelayHeader needs to turn numbers into strings\nand strings back into numbers.\n\nfirst tool: strconv.Itoa (number stamp)\n\nfloor = 3\nItoa(3) stamps it onto a label: \"3\"",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "stamping", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "create" }],
    pkg: true, stringsBox: true, strconvBox: true,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: true, stampInput: "3", stampOutput: "\"3\"",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [25, 26],
  },
  {
    id: "atoi_reader",
    narr: "second tool: strconv.Atoi (label reader)\n\njijo reads a string label and returns the number.\n\nAtoi(\"50\") -> 50, nil (success!)\nAtoi(\"abc\") -> 0, error (can't read!)\n\natoi always returns TWO values: (int, error).\nif err != nil, something went wrong.\ngo's error pattern: check every time.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "reading label", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, stringsBox: true, strconvBox: true,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: true, readerInput: "\"50\"", readerOutput: "50", readerError: false,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [27, 28, 29],
  },
  {
    id: "relay_done",
    narr: "programme complete.\n\nencode(\"move to floor 4\") -> \"evom ot roolf 4\"\nrelayHeader(3, \"50\") -> \"F3-C100\"\n\nresults posted to fmt.Println.\n\nsix concepts:\n📨 sealed letter = string (read-only bytes)\n🔲 character tiles = []rune (mutable unicode)\n✂️ scissors = strings.Fields (split at spaces)\n🔗 tape = strings.Join (rejoin with separator)\n🔢 number stamp = strconv.Itoa (int to string)\n🔍 label reader = strconv.Atoi (string to int, may error)",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "✅ complete!", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "done" }, { id: "jijo", emoji: "👨🏿‍💻", label: "done ✓", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "done" }],
    pkg: true, stringsBox: true, strconvBox: true,
    letterVisible: false, letterText: "", tilesVisible: false, tiles: [], tilesReversed: false,
    scissorsVisible: false, wordTiles: [], machineVisible: false, machineInput: "", machineOutput: "",
    tapeVisible: false, tapeResult: "", stampVisible: false, stampInput: "", stampOutput: "",
    readerVisible: false, readerInput: "", readerOutput: "", readerError: false,
    postalDir: "to_fmt", postalLabel: "TO: fmt.Println | \"evom ot roolf 4\"", display: ["$ go run main.go", "evom ot roolf 4", "F3-C100"], displayResult: true, completeBtn: "pressed", highlight: [],
  },
];

// ── Worker Chip ──
function WorkerChip({ w }: { w: WorkerData }) {
  const aC: Record<string, string> = { read: T.amber, create: T.blue, post: T.green, collect: T.green, open: T.pink, wait: "#94a3b8", done: T.green };
  const c = aC[w.action] || "#475569";
  return (
    <div style={{ position: "absolute", left: `${w.x}%`, top: `${w.y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "left 0.8s cubic-bezier(.4,0,.2,1), top 0.8s cubic-bezier(.4,0,.2,1)", zIndex: 10 }}>
      <div style={{ fontSize: 28, lineHeight: 1, filter: w.action === "done" ? `drop-shadow(0 0 8px ${T.green})` : "none" }}>{w.emoji}</div>
      {w.label && (
        <div style={{ fontSize: 10, color: c, fontFamily: "var(--font-mono)", fontWeight: 700, whiteSpace: "nowrap", background: c + "22", border: `1px solid ${c}44`, padding: "2px 6px", maxWidth: 110, textAlign: "center" }}>{w.label}</div>
      )}
    </div>
  );
}

// ── Office Room ──
function OfficeRoom({ sc }: { sc: Scene }) {
  const wallX = 54, wallW = 5, slotY = 38, slotH = 14;
  const postalActive = sc.postalDir !== null;
  const toFmt = sc.postalDir === "to_fmt";

  return (
    <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0, background: "linear-gradient(180deg,#0b1220 0%,#090e1a 100%)", border: `1px solid ${T.steelLt}`, overflow: "hidden" }}>
      {/* Ceiling lights */}
      <div style={{ position: "absolute", top: 0, left: "5%", width: `${wallX - 6}%`, height: 3, background: `linear-gradient(90deg,transparent,${T.amber}33,transparent)` }} />
      <div style={{ position: "absolute", top: 0, left: `${wallX + wallW + 1}%`, right: "1%", height: 3, background: `linear-gradient(90deg,transparent,${T.blue}33,transparent)` }} />

      {/* Left wall (package slot) */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "5%", background: "#0c1420", borderRight: `1px solid ${T.steelLt}44` }}>
        <div style={{ position: "absolute", top: "10%", left: "8%", right: "8%", height: "25%", background: sc.pkg ? "#0d1e0d" : "#0a0f14", border: `1px solid ${sc.pkg ? T.green + "66" : T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s" }}>
          {sc.pkg ? (
            <div style={{ width: "72%", background: T.paper, border: `1px solid ${T.steelLt}`, padding: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: "100%", height: 5, background: T.red, marginBottom: 1 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: T.ink, fontWeight: 700 }}>main</span>
            </div>
          ) : (
            <span style={{ fontSize: 8, color: "#1a2d40", fontFamily: "var(--font-mono)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>slot</span>
          )}
        </div>
      </div>

      {/* MAIN dept label */}
      <div style={{ position: "absolute", top: "3%", left: "7%", fontSize: 10, color: "#1a3d30", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>MAIN dept.</div>

      {/* strings address label badge */}
      {sc.stringsBox && <div style={{ position: "absolute", top: "10%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}66`, padding: "2px 8px", fontSize: 9, color: T.blue, fontWeight: 700, fontFamily: "var(--font-mono)", animation: "cr-fadeIn 0.4s", display: "flex", alignItems: "center", gap: 4 }}>
        {"✂️"} strings <span style={{ fontSize: 7, color: T.blue + "88" }}>pkg</span>
      </div>}

      {/* strconv address label badge */}
      {sc.strconvBox && <div style={{ position: "absolute", top: "18%", left: "7%", background: "#1e0f33", border: `1px solid ${T.purple}66`, padding: "2px 8px", fontSize: 9, color: T.purple, fontWeight: 700, fontFamily: "var(--font-mono)", animation: "cr-fadeIn 0.4s", display: "flex", alignItems: "center", gap: 4 }}>
        {"🔢"} strconv <span style={{ fontSize: 7, color: T.purple + "88" }}>pkg</span>
      </div>}

      {/* ── Sealed Letter ── */}
      {sc.letterVisible && (
        <div style={{ position: "absolute", left: "18%", top: "16%", width: "24%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.amber + "11", border: `1.5px solid ${T.amber}55`, padding: "6px 8px" }}>
            <div style={{ fontSize: 7, color: T.amber, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"📨"}</span> SEALED LETTER <span style={{ fontSize: 6, color: T.amber + "88" }}>string</span>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#86efac", fontWeight: 700, padding: "2px 6px", background: "#0a0e1866" }}>
              &quot;{sc.letterText}&quot;
            </div>
          </div>
        </div>
      )}

      {/* ── Rune Tiles ── */}
      {sc.tilesVisible && (
        <div style={{ position: "absolute", left: "18%", top: "16%", width: "28%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.blue + "11", border: `1.5px solid ${T.blue}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: T.blue, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"🔲"}</span> RUNE TILES <span style={{ fontSize: 6, color: T.blue + "88" }}>[]rune</span>
              {sc.tilesReversed && <span style={{ fontSize: 7, color: T.green, marginLeft: 4 }}>REVERSED</span>}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {sc.tiles.map((tile, i) => (
                <div key={i} style={{ background: sc.tilesReversed ? T.green + "22" : T.blue + "22", border: `1px solid ${sc.tilesReversed ? T.green : T.blue}55`, padding: "3px 6px", fontSize: 12, fontFamily: "var(--font-mono)", color: T.ink, fontWeight: 700, textAlign: "center", minWidth: 20 }}>
                  {tile}
                </div>
              ))}
            </div>
            {sc.tilesReversed && (
              <div style={{ fontSize: 7, color: T.inkFade, fontFamily: "var(--font-mono)", marginTop: 3 }}>
                {"i→"} <span style={{ color: T.pink }}>swap</span> {"←j"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scissors (strings.Fields) ── */}
      {sc.scissorsVisible && (
        <div style={{ position: "absolute", left: "18%", top: "16%", width: "30%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.pink + "11", border: `1.5px solid ${T.pink}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: T.pink, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"✂️"}</span> SCISSORS <span style={{ fontSize: 6, color: T.pink + "88" }}>strings.Fields</span>
            </div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {sc.wordTiles.map((w, i) => (
                <div key={i} style={{ background: T.amber + "22", border: `1px solid ${T.amber}55`, padding: "3px 8px", fontSize: 10, fontFamily: "var(--font-mono)", color: T.ink, fontWeight: 700 }}>
                  {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ReverseWord Machine ── */}
      {sc.machineVisible && (
        <div style={{ position: "absolute", left: "18%", top: "16%", width: "28%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.green + "11", border: `1.5px solid ${T.green}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: T.green, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, animation: "cr-spin 1.5s linear infinite", display: "inline-block" }}>{"⚙️"}</span> REVERSE MACHINE <span style={{ fontSize: 6, color: T.green + "88" }}>reverseWord</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: T.ink }}>&quot;{sc.machineInput}&quot;</span>
              <span style={{ color: T.green, fontWeight: 700 }}>{"→"}</span>
              <span style={{ color: "#86efac", fontWeight: 700 }}>&quot;{sc.machineOutput}&quot;</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tape (strings.Join) ── */}
      {sc.tapeVisible && (
        <div style={{ position: "absolute", left: "18%", top: "16%", width: "28%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.amber + "11", border: `1.5px solid ${T.amber}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: T.amber, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"🔗"}</span> TAPE <span style={{ fontSize: 6, color: T.amber + "88" }}>strings.Join</span>
            </div>
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#86efac", fontWeight: 700, padding: "2px 6px", background: "#0a0e1866" }}>
              &quot;{sc.tapeResult}&quot;
            </div>
          </div>
        </div>
      )}

      {/* ── Number Stamp (strconv.Itoa) ── */}
      {sc.stampVisible && (
        <div style={{ position: "absolute", left: `${wallX + wallW + 4}%`, top: "16%", width: "18%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.purple + "11", border: `1.5px solid ${T.purple}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: T.purple, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"🔢"}</span> STAMP <span style={{ fontSize: 6, color: T.purple + "88" }}>Itoa</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: T.amber, fontWeight: 700 }}>{sc.stampInput}</span>
              <span style={{ color: T.purple, fontWeight: 700 }}>{"→"}</span>
              <span style={{ color: "#86efac", fontWeight: 700 }}>{sc.stampOutput}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Label Reader (strconv.Atoi) ── */}
      {sc.readerVisible && (
        <div style={{ position: "absolute", left: `${wallX + wallW + 4}%`, top: "30%", width: "20%", animation: "cr-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: (sc.readerError ? T.red : T.green) + "11", border: `1.5px solid ${sc.readerError ? T.red : T.green}55`, padding: "4px 5px" }}>
            <div style={{ fontSize: 7, color: sc.readerError ? T.red : T.green, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 3, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>{"🔍"}</span> READER <span style={{ fontSize: 6, color: (sc.readerError ? T.red : T.green) + "88" }}>Atoi</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#86efac", fontWeight: 700 }}>{sc.readerInput}</span>
              <span style={{ color: sc.readerError ? T.red : T.green, fontWeight: 700 }}>{"→"}</span>
              <span style={{ color: sc.readerError ? T.red : T.amber, fontWeight: 700 }}>{sc.readerOutput}{sc.readerError ? " ❌" : ""}</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN worktable */}
      <div style={{ position: "absolute", left: "14%", width: `${wallX - 22}%`, top: "58%", height: 3, background: T.steelLt }} />
      <div style={{ position: "absolute", left: "18%", width: `${wallX - 26}%`, top: "44%", height: "14%", background: "linear-gradient(180deg,#121c2e,#0e1522)", border: `1px solid ${T.steelLt}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>worktable</span>
      </div>

      {/* Complete button */}
      <div style={{
        position: "absolute", left: "12%", top: "67%", width: 36, height: 36, borderRadius: "50%",
        background: sc.completeBtn === "pressed" ? `radial-gradient(circle,${T.green},#008866)` : `radial-gradient(circle,#7f1d1d,#3a0808)`,
        border: `2px solid ${sc.completeBtn === "pressed" ? T.green : "#991b1b"}`,
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12,
        animation: sc.completeBtn === "pressed" ? "cr-popIn2 0.4s ease-out" : "cr-blinkRed 1s step-end infinite",
      }}>
        <span style={{ fontSize: sc.completeBtn === "pressed" ? 16 : 14 }}>{sc.completeBtn === "pressed" ? "✅" : "🔴"}</span>
      </div>
      <div style={{ position: "absolute", left: "6%", top: "82%", fontSize: 8, color: sc.completeBtn === "pressed" ? T.green : "#7f1d1d", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", textAlign: "center", width: "20%", lineHeight: 1.3, transition: "color 0.5s" }}>
        {sc.completeBtn === "pressed" ? "done!" : "locked"}
      </div>

      {/* Dividing wall */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wallX}%`, width: `${wallW}%`, background: "linear-gradient(180deg,#0c1520,#0a1018)", borderLeft: `1px solid ${T.steelLt}`, borderRight: `1px solid ${T.steelLt}` }}>
        <div style={{ position: "absolute", top: "4%", left: 0, right: 0, textAlign: "center", fontSize: 7, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", lineHeight: 1.4 }}>DIV<br />WALL</div>
        {/* Postal slot */}
        <div style={{ position: "absolute", top: `${slotY}%`, left: "10%", right: "10%", height: `${slotH}%`, background: postalActive ? "#0d2a18" : "#080d14", border: `1px solid ${postalActive ? T.green + "99" : T.steelLt}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
          {postalActive && (
            <div style={{ position: "absolute", width: "70%", height: 10, background: T.paper, border: `1px solid ${T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center", animation: toFmt ? "cr-slideR 0.6s ease-in-out infinite" : undefined }}>
              <span style={{ fontSize: 7, color: T.inkMid }}>{"✉"}</span>
            </div>
          )}
          {!postalActive && <span style={{ fontSize: 10, color: "#1a2d40" }}>{"📪"}</span>}
        </div>
        {postalActive && <div style={{ position: "absolute", top: `${slotY + slotH + 2}%`, left: 0, right: 0, textAlign: "center", fontSize: 14, color: T.green, animation: "cr-fadeIn 0.2s" }}>{"→"}</div>}
        {postalActive && sc.postalLabel && (
          <div style={{ position: "absolute", top: `${slotY - 18}%`, left: "-200%", width: 260, background: "#0d2a18", border: `1px solid ${T.green}55`, padding: "4px 8px", fontSize: 9, color: T.green, fontFamily: "var(--font-mono)", animation: "cr-fadeIn 0.3s", whiteSpace: "nowrap", zIndex: 20 }}>{sc.postalLabel}</div>
        )}
      </div>

      {/* FMT/STRINGS dept */}
      <div style={{ position: "absolute", top: "3%", left: `${wallX + wallW + 2}%`, fontSize: 10, color: "#1a2d40", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>FMT / STRINGS</div>
      <div style={{ position: "absolute", left: `${wallX + wallW + 4}%`, right: "4%", top: "58%", height: 3, background: T.steelLt }} />
      <div style={{ position: "absolute", left: `${wallX + wallW + 8}%`, right: "8%", top: "44%", height: "14%", background: "linear-gradient(180deg,#0e1c2e,#0a1320)", border: `1px solid ${T.blue}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>fmt table</span>
      </div>

      {/* Display panel */}
      <div style={{ position: "absolute", bottom: 0, left: "5%", right: 0, height: "14%", background: "#020d04", borderTop: `1px solid ${sc.displayResult ? "#1a5c2a" : "#0d1a10"}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
        <span style={{ fontSize: 8, color: "#1a3d20", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8, flexShrink: 0, borderRight: "1px solid #0d2a10", paddingRight: 8 }}>display</span>
        <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1px 6px", overflow: "hidden" }}>
          {sc.display.map((l, i) => {
            const isCmd = l.startsWith("$");
            return (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: isCmd ? 9 : 10, color: isCmd ? "#1a5c2a" : "#00ff88", fontWeight: isCmd ? 400 : 600, textShadow: !isCmd && sc.displayResult ? "0 0 8px #00ff8844" : "none", animation: i === sc.display.length - 1 ? "cr-fadeIn 0.4s" : "none", whiteSpace: "nowrap" }}>{l}</span>
            );
          })}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1a3d20", animation: "cr-blink 1s step-end infinite" }}>{"█"}</span>
        </div>
      </div>

      {/* Workers */}
      {sc.workers.map((w) => <WorkerChip key={w.id} w={w} />)}
    </div>
  );
}

// ── Card Parts ──
interface CardPart {
  id: string; label: string; sub: string; color: string;
  lines: number[]; desc: string;
}

const CARD_PARTS: CardPart[] = [
  { id: "card", label: "Package", sub: "package main", color: T.red, lines: [0], desc: "the package label. same as every chapter -- this is a runnable program." },
  { id: "imports", label: "Imports", sub: "import (\"fmt\", \"strings\", \"strconv\")", color: T.blue, lines: [2, 3, 4, 5, 6], desc: "three address labels this time: fmt for printing, strings for Fields/Join, strconv for Itoa/Atoi." },
  { id: "revEnv", label: "Envelope: reverseWord", sub: "func reverseWord(s string) string", color: T.green, lines: [8, 9, 10, 11, 12, 13, 14], desc: "takes a sealed letter (string), cuts into rune tiles, swaps from both ends, seals back. returns a new string." },
  { id: "runeConv", label: "Rune Conversion", sub: "[]rune(s)", color: T.blue, lines: [9], desc: "cuts the sealed letter into character tiles. each tile is one rune -- safe for any unicode character." },
  { id: "swapLoop", label: "Swap Loop", sub: "for i, j := 0, len-1; i < j", color: T.pink, lines: [10, 11], desc: "two pointers start at opposite ends. each step swaps and moves inward. go's multi-assign handles both at once." },
  { id: "sealBack", label: "Seal Back", sub: "string(runes)", color: T.amber, lines: [13], desc: "seals the rune tiles back into a new string. the original was never modified." },
  { id: "encEnv", label: "Envelope: encode", sub: "func encode(msg string) string", color: T.pink, lines: [16, 17, 18, 19, 20, 21, 22, 23], desc: "splits msg into words (scissors), reverses each (machine), joins them back (tape). composition." },
  { id: "fields", label: "Scissors", sub: "strings.Fields(msg)", color: T.pink, lines: [17], desc: "cuts the sentence at every whitespace boundary. returns a slice of word tiles. handles multiple spaces cleanly." },
  { id: "compose", label: "Composition", sub: "reverseWord(w)", color: T.green, lines: [20], desc: "feeding each word through the reverseWord machine. one function's output becomes another's input." },
  { id: "join", label: "Tape", sub: "strings.Join(result, \" \")", color: T.amber, lines: [22], desc: "sticks the reversed word tiles back together with a space between each. the final encoded message." },
  { id: "relayEnv", label: "Envelope: relayHeader", sub: "func relayHeader(floor int, code string) string", color: T.amber, lines: [25, 26, 27, 28, 29, 30, 31, 32], desc: "builds a relay header string using Itoa and Atoi. demonstrates int<->string conversion and error handling." },
  { id: "itoa", label: "Number Stamp", sub: "strconv.Itoa(floor)", color: T.purple, lines: [26], desc: "stamps a number onto a string label. 3 becomes \"3\". always succeeds -- numbers always have a string form." },
  { id: "atoi", label: "Label Reader", sub: "strconv.Atoi(code)", color: T.purple, lines: [27], desc: "reads a string label and returns the number + an error. \"50\" -> 50, nil. \"abc\" -> 0, error." },
  { id: "errCheck", label: "Error Check", sub: "if err != nil", color: T.red, lines: [28, 29], desc: "go's error pattern. no exceptions. atoi returns (int, error). you check the error every time. if something went wrong, handle it." },
  { id: "mainEnv", label: "Main Envelope", sub: "func main()", color: T.pink, lines: [34, 35, 36], desc: "calls encode and relayHeader, posts results to fmt.Println." },
];

// ── Analog Card ──
function AnalogCard({ active, onPartClick }: { active: string | null; onPartClick: (id: string) => void }) {
  const part = active ? CARD_PARTS.find((p) => p.id === active) : null;
  const isA = (id: string) => active === id;
  const col = (id: string) => CARD_PARTS.find((p) => p.id === id)?.color || "#888";
  const ring = (id: string) => isA(id) ? `0 0 0 2px ${col(id)}, 0 0 12px ${col(id)}44` : "none";
  const tog = (id: string, e?: React.MouseEvent) => { e?.stopPropagation(); onPartClick(id); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {/* Card */}
        <div style={{ flex: "1 1 260px" }}>
          <div onClick={() => tog("card")} style={{ background: T.paper, border: `1px solid ${isA("card") ? T.amber : T.line}`, boxShadow: ring("card"), padding: "0 0 14px", cursor: "pointer", transition: "box-shadow 0.2s, border-color 0.2s", position: "relative" }}>
            {/* Header bar */}
            <div style={{ height: 30, background: T.red, display: "flex", alignItems: "center", padding: "0 12px", marginBottom: 14 }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>GO PROGRAMME PACKAGE</span>
              <span style={{ color: "#ffaaaa", fontSize: 9, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>rev 4.2</span>
            </div>
            <div style={{ padding: "0 14px" }}>
              {/* Imports */}
              <div onClick={(e) => tog("imports", e)} style={{ marginBottom: 14, cursor: "pointer", background: isA("imports") ? T.blue + "11" : "transparent", boxShadow: ring("imports"), padding: "6px 8px", border: `1px dashed ${isA("imports") ? T.blue : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Required Attachments:</div>
                {["fmt (printer)", "strings (scissors + tape)", "strconv (stamp + reader)"].map((pkg, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4, marginTop: 2 }}>
                    <span style={{ color: T.green, fontSize: 13 }}>{"☑"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: T.ink }}>{pkg}</span>
                  </div>
                ))}
              </div>

              {/* reverseWord Envelope */}
              <div onClick={(e) => tog("revEnv", e)} style={{ marginBottom: 8, cursor: "pointer", background: isA("revEnv") ? T.green + "11" : "transparent", boxShadow: ring("revEnv"), padding: "6px 8px", border: `1px solid ${isA("revEnv") ? T.green : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.green, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)", marginBottom: 4 }}>{"✉"} ENVELOPE: reverseWord</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div onClick={(e) => tog("runeConv", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("runeConv") ? T.blue + "11" : T.paperAlt, border: `1px solid ${isA("runeConv") ? T.blue : T.line}`, boxShadow: ring("runeConv"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>CUT TO TILES</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.blue, fontWeight: 700 }}>{"🔲"} []rune(s)</div>
                  </div>
                  <div onClick={(e) => tog("swapLoop", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("swapLoop") ? T.pink + "11" : T.paperAlt, border: `1px solid ${isA("swapLoop") ? T.pink : T.line}`, boxShadow: ring("swapLoop"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>SWAP LOOP</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.pink, fontWeight: 700 }}>i,j swap</div>
                  </div>
                  <div onClick={(e) => tog("sealBack", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("sealBack") ? T.amber + "11" : T.paperAlt, border: `1px solid ${isA("sealBack") ? T.amber : T.line}`, boxShadow: ring("sealBack"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>SEAL BACK</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.amber, fontWeight: 700 }}>string(runes)</div>
                  </div>
                </div>
              </div>

              {/* encode Envelope */}
              <div onClick={(e) => tog("encEnv", e)} style={{ marginBottom: 8, cursor: "pointer", background: isA("encEnv") ? T.pink + "11" : "transparent", boxShadow: ring("encEnv"), padding: "6px 8px", border: `1px solid ${isA("encEnv") ? T.pink : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.pink, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)", marginBottom: 4 }}>{"✉"} ENVELOPE: encode</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div onClick={(e) => tog("fields", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("fields") ? T.pink + "11" : T.paperAlt, border: `1px solid ${isA("fields") ? T.pink : T.line}`, boxShadow: ring("fields"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>SCISSORS</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.pink, fontWeight: 700 }}>{"✂️"} Fields</div>
                  </div>
                  <div onClick={(e) => tog("compose", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("compose") ? T.green + "11" : T.paperAlt, border: `1px solid ${isA("compose") ? T.green : T.line}`, boxShadow: ring("compose"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>MACHINE</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.green, fontWeight: 700 }}>{"⚙️"} reverseWord</div>
                  </div>
                  <div onClick={(e) => tog("join", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("join") ? T.amber + "11" : T.paperAlt, border: `1px solid ${isA("join") ? T.amber : T.line}`, boxShadow: ring("join"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>TAPE</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.amber, fontWeight: 700 }}>{"🔗"} Join</div>
                  </div>
                </div>
              </div>

              {/* relayHeader Envelope */}
              <div onClick={(e) => tog("relayEnv", e)} style={{ marginBottom: 8, cursor: "pointer", background: isA("relayEnv") ? T.amber + "11" : "transparent", boxShadow: ring("relayEnv"), padding: "6px 8px", border: `1px solid ${isA("relayEnv") ? T.amber : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.amber, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)", marginBottom: 4 }}>{"✉"} ENVELOPE: relayHeader</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div onClick={(e) => tog("itoa", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("itoa") ? T.purple + "11" : T.paperAlt, border: `1px solid ${isA("itoa") ? T.purple : T.line}`, boxShadow: ring("itoa"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>STAMP</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.purple, fontWeight: 700 }}>{"🔢"} Itoa</div>
                  </div>
                  <div onClick={(e) => tog("atoi", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("atoi") ? T.purple + "11" : T.paperAlt, border: `1px solid ${isA("atoi") ? T.purple : T.line}`, boxShadow: ring("atoi"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>READER</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.purple, fontWeight: 700 }}>{"🔍"} Atoi</div>
                  </div>
                  <div onClick={(e) => tog("errCheck", e)} style={{ flex: "1 1 80px", padding: "3px 6px", background: isA("errCheck") ? T.red + "11" : T.paperAlt, border: `1px solid ${isA("errCheck") ? T.red : T.line}`, boxShadow: ring("errCheck"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 7, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>ERROR CHECK</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.red, fontWeight: 700 }}>if err != nil</div>
                  </div>
                </div>
              </div>

              {/* Main Envelope */}
              <div onClick={(e) => tog("mainEnv", e)} style={{ background: T.paperAlt, border: `1.5px solid ${isA("mainEnv") ? T.pink : T.line}`, boxShadow: ring("mainEnv"), overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ width: "100%", height: 28, background: T.steelMid, borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: T.pink, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>ENVELOPE: main</span>
                </div>
                <div style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 12, color: T.ink, lineHeight: 2 }}>
                  <span style={{ display: "block", padding: "0 4px" }}>{"📮"} encode(&quot;move to floor 4&quot;) {"→"} fmt.Println</span>
                  <span style={{ display: "block", padding: "0 4px" }}>{"📮"} relayHeader(3, &quot;50&quot;) {"→"} fmt.Println</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: T.inkFade, textAlign: "center", marginTop: 6, fontFamily: "var(--font-mono)" }}>tap any section to see the connection</div>
        </div>

        {/* Code panel */}
        <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 10, color: T.inkFade, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>GO CODE</div>
          <CodePanel highlightLines={part ? part.lines : []} annotate={part ? Object.fromEntries(part.lines.map((l) => [l, { label: part!.label, color: part!.color }])) : {}} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
            {CARD_PARTS.map((p) => (
              <div key={p.id} onClick={() => onPartClick(p.id)} style={{ cursor: "pointer", border: `1px solid ${active === p.id ? p.color : p.color + "44"}`, padding: "3px 10px", background: active === p.id ? p.color + "22" : "transparent", color: active === p.id ? p.color : p.color + "88", fontSize: 11, fontWeight: 700, transition: "all 0.2s", fontFamily: "var(--font-mono)" }}>{p.sub}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div style={{ minHeight: 56, background: part ? part.color + "0d" : "#0a0e18", border: `1px solid ${part ? part.color + "44" : T.line}`, padding: "12px 16px", fontSize: 14, color: T.ink, lineHeight: 1.7, transition: "all 0.3s", fontFamily: "var(--font-mono)" }}>
        {part ? (
          <>
            <span style={{ color: part.color, fontWeight: 700 }}>{part.label}</span>
            <span style={{ color: T.inkFade }}>{" → "}</span>
            <code style={{ color: part.color, fontSize: 13, background: part.color + "18", padding: "2px 8px" }}>{part.sub}</code>
            <br /><br />{part.desc}
          </>
        ) : (
          <span style={{ color: T.inkFade }}>tap any section of the card or a code pill to see the connection</span>
        )}
      </div>
    </div>
  );
}

// ── Analogy Map Modal ──
interface AnalogyItem { a: string; c: string; col: string }

function AnalogyMapModal({ items }: { items: AnalogyItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ marginTop: 18, borderTop: `1px solid ${T.line}`, paddingTop: 14, display: "flex", justifyContent: "center" }}>
        <button onClick={() => setOpen(true)} className="bg-transparent cursor-pointer" style={{ border: `1px solid ${T.green}44`, padding: "8px 24px", display: "flex", alignItems: "center", gap: 8, transition: "border-color 0.2s" }}>
          <span style={{ fontSize: 11, color: T.green, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Analogy Map</span>
          <span style={{ fontSize: 13, color: T.green }}>{"→"}</span>
        </button>
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", animation: "cr-fadeIn .2s ease forwards" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#0a0e18", border: `1px solid ${T.green}33`, maxWidth: 560, width: "90%", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 11, color: T.green, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Analogy Map</span>
              <button onClick={() => setOpen(false)} className="bg-transparent cursor-pointer" style={{ border: `1px solid ${T.line}`, padding: "4px 12px", color: T.inkFade, fontSize: 11, fontFamily: "var(--font-mono)" }}>close</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {items.map((item) => (
                <div key={item.a} style={{ border: `1px solid ${item.col}33`, padding: "8px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 90 }}>
                  <span style={{ fontSize: 11, color: T.inkFade }}>{item.a}</span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: item.col, fontWeight: 700 }}>{item.c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Component ──
interface Props {
  onHotspotClick?: (id: string) => void;
  clickedIds?: Set<string>;
  view?: "animation" | "card";
  mode?: "animation" | "card";
  fontScale?: number;
}

export function CipherRelay({ onHotspotClick, clickedIds = new Set(), view, mode }: Props) {
  const resolvedView = view ?? mode ?? "animation";
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cardActive, setCardActive] = useState<string | null>(null);
  const sc = SCENES[scene];

  // Auto-play
  useEffect(() => {
    if (!playing) return;
    if (scene >= SCENES.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setScene((s) => s + 1), 4500);
    return () => clearTimeout(t);
  }, [playing, scene]);

  const handleCardPartClick = useCallback((id: string) => {
    setCardActive((prev) => (prev === id ? null : id));
    if (!clickedIds.has(id) && onHotspotClick) onHotspotClick(id);
  }, [clickedIds, onHotspotClick]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style>{KEYFRAMES}</style>

      {/* Animation view */}
      {resolvedView === "animation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0 }}>
          {/* Illustration area */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            <OfficeRoom sc={sc} />

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
              {[{ dot: T.amber, l: "Sealed letter (string)" }, { dot: T.blue, l: "Rune tiles ([]rune)" }, { dot: T.pink, l: "Scissors (Fields)" }, { dot: T.green, l: "Reverse machine" }, { dot: T.amber, l: "Tape (Join)" }, { dot: T.purple, l: "Stamp/Reader (strconv)" }, { dot: "#00ff88", l: "Display" }].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 7, height: 7, background: item.dot }} />
                  <span style={{ fontSize: 10, color: T.inkFade, fontFamily: "var(--font-mono)" }}>{item.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Narration + code (fixed height, flush with controls) */}
          <div style={{ flexShrink: 0, display: "flex", gap: 12, alignItems: "stretch", height: 300 }}>
            <div style={{ flex: "1 1 300px", border: `1px solid ${T.line}`, overflow: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "6px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, background: T.green }} />
                <div>
                  <div style={{ fontSize: 10, color: T.green, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Scene {scene + 1}/{SCENES.length}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: "var(--font-mono)" }}>{sc.id.replace(/_/g, " ")}</div>
                </div>
              </div>
              <div style={{ padding: "8px 12px", fontSize: 12, lineHeight: 1.7, color: T.inkMid, whiteSpace: "pre-line", borderLeft: `3px solid ${T.amber}`, fontFamily: "var(--font-mono)", flex: 1 }}>{sc.narr}</div>
            </div>

            {sc.highlight.length > 0 && (
              <div style={{ flex: "1 1 260px", border: `1px solid ${T.line}`, padding: 8, overflow: "auto" }}>
                <div style={{ fontSize: 9, color: T.inkFade, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-mono)" }}>related code</div>
                <CodePanel highlightLines={sc.highlight} />
              </div>
            )}
          </div>

          {/* Controls (flush below narration) */}
          <div style={{ flexShrink: 0, paddingTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {SCENES.map((_, i) => (
                <button key={i} onClick={() => { setScene(i); setPlaying(false); }} style={{ width: 26, height: 26, borderRadius: "50%", background: i === scene ? T.green : i < scene ? T.green + "33" : "#1a1a2e", border: i === scene ? `2px solid ${T.green}` : `1px solid ${T.line}`, color: i === scene ? "#0a0a1a" : i < scene ? T.green : "#555", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{i + 1}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setScene(Math.max(0, scene - 1))} disabled={scene === 0} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: scene === 0 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)", opacity: scene === 0 ? 0.3 : 1 }}>{"← BACK"}</button>
              <button onClick={() => { setScene(0); setPlaying(true); }} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.green}44`, color: T.green, fontSize: 12, fontFamily: "var(--font-mono)" }}>{"▶ PLAY"}</button>
              {playing && <button onClick={() => setPlaying(false)} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: T.ink, fontSize: 12, fontFamily: "var(--font-mono)" }}>{"⏸"}</button>}
              <button onClick={() => setScene(Math.min(SCENES.length - 1, scene + 1))} disabled={scene === SCENES.length - 1} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: scene === SCENES.length - 1 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)", opacity: scene === SCENES.length - 1 ? 0.3 : 1 }}>{"NEXT →"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Card view */}
      {resolvedView === "card" && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div style={{ border: "1px solid rgba(110,255,160,.08)", padding: 18 }}>
            <div style={{ fontSize: 12, color: T.inkFade, marginBottom: 14, fontFamily: "var(--font-mono)" }}>tap any section of the card or the code pills to see how each part maps to Go syntax.</div>
            <AnalogCard active={cardActive} onPartClick={handleCardPartClick} />
          </div>

          {/* Analogy map button + modal -- cumulative ch01-04.2 */}
          <AnalogyMapModal items={[
            { a: "Package card", c: "package main", col: T.red },
            { a: "Address label", c: "import", col: T.blue },
            { a: "Envelope", c: "func", col: T.pink },
            { a: "Sealed envelope", c: "const", col: T.amber },
            { a: "Open envelope", c: "variable", col: T.blue },
            { a: "Sticker", c: "value/data", col: "#86efac" },
            { a: "Postal slot", c: "func call", col: T.green },
            { a: "Extra envelope", c: "function", col: T.green },
            { a: "Revolving door", c: "for loop", col: T.green },
            { a: "Stretchy pouch", c: "...int (variadic)", col: T.purple },
            { a: "Outbox slot", c: "return value", col: T.amber },
            { a: "Two outbox slots", c: "(int, bool)", col: T.amber },
            { a: "Tip pouch into", c: "codes... (spread)", col: T.purple },
            { a: "Reuse envelope", c: "composition", col: T.green },
            { a: "Open folder", c: "map[K]V", col: T.amber },
            { a: "Labelled slot", c: "key: value", col: T.blue },
            { a: "Range door", c: "for range", col: T.green },
            { a: "Clipboard", c: "map[T]bool set", col: T.green },
            { a: "Sticker printer", c: "fmt.Sprintf", col: T.blue },
            { a: "Sealed letter", c: "string (read-only)", col: T.amber },
            { a: "Character tiles", c: "[]rune (mutable)", col: T.blue },
            { a: "Scissors", c: "strings.Fields", col: T.pink },
            { a: "Tape", c: "strings.Join", col: T.amber },
            { a: "Number stamp", c: "strconv.Itoa", col: T.purple },
            { a: "Label reader", c: "strconv.Atoi", col: T.purple },
          ]} />
        </div>
      )}
    </div>
  );
}
