"use client";

import { useState, useEffect, useCallback } from "react";

// ── Design tokens (same as GoAppliance / DoorCodeMachine) ──
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};

const KEYFRAMES = `
  @keyframes sf-fadeIn    {from{opacity:0}to{opacity:1}}
  @keyframes sf-popIn2    {from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes sf-slideR    {0%{left:-20%}100%{left:110%}}
  @keyframes sf-slideL    {0%{left:110%}100%{left:-20%}}
  @keyframes sf-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes sf-blinkRed  {0%,49%{opacity:1;box-shadow:0 0 10px #ef444466}50%,100%{opacity:0.25;box-shadow:none}}
  @keyframes sf-slideDown {from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes sf-pulse     {0%,100%{opacity:1}50%{opacity:0.5}}
`;

// ── Syntax highlight ──
function SHLine({ line }: { line: string }) {
  const tokens = line.split(/((?:package|import|func|var|const|return|for|if|else)\b|"[^"]*"|\bfmt\b|\bPrintln\b|\bPrintf\b|\bsumCodes\b|\bvalidateCode\b|:=|\+=|\.\.\.|[{}();,])/g);
  const kw = ["package", "import", "func", "var", "const", "return", "for", "if", "else"];
  return (
    <span>
      {tokens.map((t, i) => {
        if (kw.includes(t)) return <span key={i} style={{ color: T.purple }}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{ color: "#86efac" }}>{t}</span>;
        if (t === "fmt") return <span key={i} style={{ color: "#60a5fa" }}>{t}</span>;
        if (t === "Println" || t === "Printf") return <span key={i} style={{ color: "#fbbf24" }}>{t}</span>;
        if (t === "sumCodes") return <span key={i} style={{ color: T.green }}>{t}</span>;
        if (t === "validateCode") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        if (t === ":=" || t === "+=" || t === "...") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        return <span key={i} style={{ color: T.ink }}>{t}</span>;
      })}
    </span>
  );
}

// ── Code Panel ──
const ANIM_CODE = `package main

import "fmt"

func sumCodes(codes ...int) int {
    total := 0
    for _, c := range codes {
        total += c
    }
    return total
}

func validateCode(codes ...int) (int, bool) {
    total := sumCodes(codes...)
    return total, total > 100
}

func main() {
    fmt.Println("Sum:", sumCodes(25, 30, 50, 10))
    s, v := validateCode(25, 30, 50, 10)
    fmt.Printf("Result: %d, Valid: %v\\n", s, v)
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
  pkg: boolean; fmtBox: boolean;
  // Envelopes on shelf/worktable
  envelopes: { id: string; label: string; color: string; visible: boolean; position: "shelf" | "worktable" | "zainab" }[];
  // Pouch (variadic) state
  pouchVisible: boolean; pouchItems: string[];
  // Outbox slots (multiple returns)
  outboxSlots: { label: string; value: string; color: string }[];
  // Postal
  postalDir: null | "to_fmt" | "to_main"; postalLabel: string;
  display: string[]; displayResult: boolean;
  completeBtn: "locked" | "pressed";
  highlight: number[];
  // When true, show sumCodes nested inside validateCode on the worktable
  composing?: boolean;
}

const PA = { DOOR: { x: 11, y: 28 }, SHELF: { x: 17, y: 22 }, MAIN_DESK: { x: 26, y: 52 }, WALL_SLOT: { x: 48, y: 47 }, FMT_SLOT: { x: 62, y: 47 }, FMT_DESK: { x: 74, y: 47 } };

// ── SCENES ──
const SCENES: Scene[] = [
  {
    id: "idle",
    narr: "the go machine is powered on. same appliance.\n\ntwo rooms. dividing wall. postal slot.\nzainab in MAIN dept. jijo in FMT dept.\n\nthis time the instructions involve separate envelopes — functions.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: false, fmtBox: false,
    envelopes: [], pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: [], displayResult: false, completeBtn: "locked", highlight: [],
  },
  {
    id: "package_in",
    narr: "a programme package slides in.\n\nzainab reads the label:\nPACKAGE NAME: main\n\nsame as always.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "reading label", x: PA.DOOR.x, y: PA.DOOR.y, action: "read" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: false,
    envelopes: [], pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [0],
  },
  {
    id: "check_attach",
    narr: "zainab checks the attachments:\n☑ fmt\n\nshe walks to the shelf and picks up the fmt address label.\n\nsame address label as last time.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "fetching address label", x: PA.SHELF.x, y: PA.SHELF.y, action: "collect" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [], pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [2],
  },
  {
    id: "new_envelopes",
    narr: "but wait — something new on the shelf.\n\ntwo extra envelopes, each with their own labels:\n✉ sumCodes — accepts a stretchy pouch of ints, returns one int\n✉ validateCode — accepts a stretchy pouch of ints, returns an int AND a bool\n\nthese are functions. separate envelopes, each doing one job. zainab will use them when the main envelope's instructions tell her to.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "reading envelopes", x: PA.SHELF.x, y: PA.SHELF.y, action: "read" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [4, 12],
  },
  {
    id: "open_main",
    narr: "zainab opens the main envelope.\n\nfirst instruction:\n\"call sumCodes with 25, 30, 50, 10.\"\n\nshe needs to use the sumCodes envelope.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "opening main", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "open" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [17],
  },
  {
    id: "fill_pouch",
    narr: "zainab grabs the sumCodes envelope from the shelf.\n\nit has a stretchy pouch on the front labelled:\n\"codes ...int\"\n\nthree dots = variadic. the pouch expands to fit any number of ints.\n\nshe drops in 4 stickers: 🔢25, 🔢30, 🔢50, 🔢10.\n\nonce sealed, the pouch becomes a slice — think of it as a numbered stack of same-colour envelopes. each envelope holds one sticker. the stack can grow or shrink.\n\nin go, this is written: []int{25, 30, 50, 10}.\n[] = stack (expandable), int = all red number stickers.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "filling pouch", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "zainab" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: true, pouchItems: ["25", "30", "50", "10"],
    outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [4],
  },
  {
    id: "sum_process",
    narr: "zainab opens the sumCodes envelope and follows its instructions:\n\n1. start with total = 0\n2. walk through the stack — this is range. like a revolving door that spins once for each envelope in the stack. each spin hands zainab one sticker.\n3. spin 1: 🔢25 → total = 25\n   spin 2: 🔢30 → total = 55\n   spin 3: 🔢50 → total = 105\n   spin 4: 🔢10 → total = 115\n4. write 115 on the back of the envelope (the return slot)\n\nin go: for _, c := range codes — the revolving door. _ means \"i don't need the position number, just the sticker.\"\n\nthe envelope does one job: sum. no printing.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "processing...", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes → 115", color: T.green, visible: true, position: "zainab" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: true, pouchItems: ["25", "30", "50", "10"],
    outboxSlots: [{ label: "int", value: "115", color: T.green }],
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [5, 6, 7, 8, 9, 10],
  },
  {
    id: "sum_post",
    narr: "zainab takes the result (115) and posts it to fmt:\n\"Sum: 115\"\n\njijo prints it to the display.\n\none function call done. the envelope goes back to the shelf for reuse.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: \"Sum:\", 115", display: ["$ go run main.go", "Sum: 115"], displayResult: false, completeBtn: "locked", highlight: [18],
  },
  {
    id: "validate_call",
    narr: "next instruction in main:\n\"call validateCode with 25, 30, 50, 10.\"\n\nzainab grabs the validateCode envelope. same stretchy pouch on the front.\n\nbut the BACK has two outbox slots:\nslot 1: int\nslot 2: bool\n\nthis function returns two values.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "filling pouch", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "zainab" },
    ],
    pouchVisible: true, pouchItems: ["25", "30", "50", "10"],
    outboxSlots: [
      { label: "int", value: "?", color: T.blue },
      { label: "bool", value: "?", color: T.amber },
    ],
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "Sum: 115"], displayResult: false, completeBtn: "locked", highlight: [12, 19],
  },
  {
    id: "validate_compose",
    narr: "zainab opens the validateCode envelope. first instruction:\n\"take the sumCodes envelope INSIDE this one and pour the stickers into its pouch.\"\n\nthis is composition — one envelope using another inside itself.\n\nthe sumCodes envelope is pulled into validateCode's workspace. zainab tips the pouch contents (codes...) into sumCodes' pouch. the three dots spread the slice back into individual arguments.\n\nsumCodes runs inside validateCode and returns 115.\n\nzainab writes 115 in the int outbox slot.\nthen checks: 115 > 100? → true\nwrites true in the bool outbox slot.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "composing...", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes → 115", color: T.green, visible: true, position: "zainab" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "zainab" },
    ],
    pouchVisible: true, pouchItems: ["25", "30", "50", "10"],
    outboxSlots: [
      { label: "int", value: "115", color: T.blue },
      { label: "bool", value: "true", color: T.green },
    ],
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "Sum: 115"], displayResult: false, completeBtn: "locked", highlight: [13, 14],
    composing: true,
  },
  {
    id: "validate_post",
    narr: "zainab takes both values from the outbox:\ns = 115, v = true\n\nshe posts them to fmt:\n\"Result: 115, Valid: true\"\n\njijo prints it. both return values received.\n\nenvelopes back to shelf. zainab presses the button. ✅",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: "to_fmt", postalLabel: "TO: fmt.Printf | REQ: 115, true", display: ["$ go run main.go", "Sum: 115", "Result: 115, Valid: true"], displayResult: false, completeBtn: "locked", highlight: [19, 20],
  },
  {
    id: "complete",
    narr: "programme complete.\n\nall codes computed. all results validated.\n\nfive concepts:\n📚 slice ([]int) = a numbered stack of same-colour envelopes. expandable.\n🚪 range = a revolving door. spins once per item in the stack.\n✉ functions = separate envelopes, each doing one job\n🎒 variadic (...) = stretchy pouch, becomes a slice inside\n📤 multiple returns = two outbox slots on the back\n\nand composition: hand stickers from one envelope to another.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "✅ complete!", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "done" }, { id: "jijo", emoji: "👨🏿‍💻", label: "done ✓", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "done" }],
    pkg: true, fmtBox: true,
    envelopes: [
      { id: "sumCodes", label: "sumCodes", color: T.green, visible: true, position: "shelf" },
      { id: "validateCode", label: "validateCode", color: T.pink, visible: true, position: "shelf" },
    ],
    pouchVisible: false, pouchItems: [], outboxSlots: [],
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "Sum: 115", "Result: 115, Valid: true", "Result: 60, Valid: false"], displayResult: true, completeBtn: "pressed", highlight: [],
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

// ── Office Room (same structure, extended with function envelopes) ──
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

      {/* fmt address label badge */}
      {sc.fmtBox && <div style={{ position: "absolute", top: "10%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}66`, padding: "2px 8px", fontSize: 9, color: T.blue, fontWeight: 700, fontFamily: "var(--font-mono)", animation: "sf-fadeIn 0.4s", display: "flex", alignItems: "center", gap: 4 }}>📋 fmt <span style={{ fontSize: 7, color: T.blue + "88" }}>addr</span></div>}

      {/* ── Function Envelopes on shelf ── */}
      {sc.envelopes.filter((e) => e.visible && e.position === "shelf").map((env, i) => (
        <div key={env.id} style={{ position: "absolute", top: `${17 + i * 10}%`, left: "7%", width: "18%", animation: "sf-fadeIn 0.4s" }}>
          <div style={{ background: env.color + "18", border: `1px solid ${env.color}55`, padding: "3px 5px", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9 }}>✉</span>
            <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: env.color, fontWeight: 700 }}>{env.label}</span>
          </div>
        </div>
      ))}

      {/* ── Envelopes at zainab's worktable ── */}
      {sc.composing ? (
        /* Composition: sumCodes is INSIDE validateCode */
        <div style={{ position: "absolute", top: "18%", left: "28%", width: "22%", animation: "sf-fadeIn 0.4s", zIndex: 6 }}>
          {/* Outer: validateCode envelope */}
          {sc.envelopes.filter((e) => e.visible && e.position === "zainab" && e.id === "validateCode").map((env) => (
            <div key={env.id} style={{ background: env.color + "18", border: `1.5px solid ${env.color}77`, padding: "4px 5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
                <span style={{ fontSize: 9 }}>✉</span>
                <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: env.color, fontWeight: 700 }}>{env.label}</span>
              </div>
              {/* Inner: sumCodes envelope nested inside */}
              {sc.envelopes.filter((e2) => e2.visible && e2.position === "zainab" && e2.id === "sumCodes").map((inner) => (
                <div key={inner.id} style={{ background: inner.color + "22", border: `1.5px dashed ${inner.color}88`, padding: "3px 5px", display: "flex", alignItems: "center", gap: 3, animation: "sf-pulse 1.5s ease-in-out infinite" }}>
                  <span style={{ fontSize: 8 }}>↳ ✉</span>
                  <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: inner.color, fontWeight: 700 }}>{inner.label}</span>
                  <span style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: T.inkFade, marginLeft: "auto" }}>codes...</span>
                </div>
              ))}
              <div style={{ fontSize: 7, fontFamily: "var(--font-mono)", color: T.inkFade, marginTop: 3, textAlign: "center" }}>composition: reusing sumCodes inside</div>
            </div>
          ))}
        </div>
      ) : (
        /* Normal: envelopes shown separately near zainab */
        sc.envelopes.filter((e) => e.visible && e.position === "zainab").map((env, i) => (
          <div key={env.id} style={{ position: "absolute", top: `${18 + i * 10}%`, left: "28%", width: "20%", animation: "sf-fadeIn 0.4s", zIndex: 6 }}>
            <div style={{ background: env.color + "18", border: `1.5px solid ${env.color}77`, padding: "3px 5px", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9 }}>✉</span>
              <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: env.color, fontWeight: 700 }}>{env.label}</span>
            </div>
          </div>
        ))
      )}

      {/* MAIN worktable */}
      <div style={{ position: "absolute", left: "14%", width: `${wallX - 22}%`, top: "58%", height: 3, background: T.steelLt }} />
      <div style={{ position: "absolute", left: "18%", width: `${wallX - 26}%`, top: "44%", height: "14%", background: "linear-gradient(180deg,#121c2e,#0e1522)", border: `1px solid ${T.steelLt}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>worktable</span>
      </div>

      {/* ── Stretchy Pouch overlay on worktable ── */}
      {sc.pouchVisible && (
        <div style={{ position: "absolute", left: "20%", top: "34%", width: "14%", animation: "sf-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: T.purple + "22", border: `1.5px solid ${T.purple}66`, padding: "3px 5px" }}>
            <div style={{ fontSize: 7, color: T.purple, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}>
              🎒 POUCH <span style={{ fontSize: 6, color: T.purple + "88" }}>...int</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {sc.pouchItems.map((item, i) => (
                <div key={i} style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: T.blue, fontWeight: 700, background: T.blue + "22", border: `1px solid ${T.blue}44`, padding: "0 3px" }}>
                  🔢{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Outbox Slots overlay (multiple returns) ── */}
      {sc.outboxSlots.length > 0 && (
        <div style={{ position: "absolute", left: "36%", top: "34%", width: "14%", animation: "sf-fadeIn 0.4s", zIndex: 5 }}>
          <div style={{ background: "#0a0e18cc", border: `1px solid ${T.amber}44`, padding: "3px 5px" }}>
            <div style={{ fontSize: 7, color: T.amber, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 2 }}>📤 OUTBOX</div>
            {sc.outboxSlots.map((slot, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
                <span style={{ fontSize: 7, color: T.inkFade, fontFamily: "var(--font-mono)" }}>{slot.label}:</span>
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: slot.color, fontWeight: 700 }}>{slot.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete button */}
      <div style={{
        position: "absolute", left: "12%", top: "67%", width: 36, height: 36, borderRadius: "50%",
        background: sc.completeBtn === "pressed" ? `radial-gradient(circle,${T.green},#008866)` : `radial-gradient(circle,#7f1d1d,#3a0808)`,
        border: `2px solid ${sc.completeBtn === "pressed" ? T.green : "#991b1b"}`,
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12,
        animation: sc.completeBtn === "pressed" ? "sf-popIn2 0.4s ease-out" : "sf-blinkRed 1s step-end infinite",
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
            <div style={{ position: "absolute", width: "70%", height: 10, background: T.paper, border: `1px solid ${T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center", animation: toFmt ? "sf-slideR 0.6s ease-in-out infinite" : "sf-slideL 0.6s ease-in-out infinite" }}>
              <span style={{ fontSize: 7, color: T.inkMid }}>✉</span>
            </div>
          )}
          {!postalActive && <span style={{ fontSize: 10, color: "#1a2d40" }}>📪</span>}
        </div>
        {postalActive && <div style={{ position: "absolute", top: `${slotY + slotH + 2}%`, left: 0, right: 0, textAlign: "center", fontSize: 14, color: T.green, animation: "sf-fadeIn 0.2s" }}>{toFmt ? "→" : "←"}</div>}
        {postalActive && sc.postalLabel && (
          <div style={{ position: "absolute", top: `${slotY - 18}%`, left: "-200%", width: 260, background: "#0d2a18", border: `1px solid ${T.green}55`, padding: "4px 8px", fontSize: 9, color: T.green, fontFamily: "var(--font-mono)", animation: "sf-fadeIn 0.3s", whiteSpace: "nowrap", zIndex: 20 }}>{sc.postalLabel}</div>
        )}
      </div>

      {/* FMT dept */}
      <div style={{ position: "absolute", top: "3%", left: `${wallX + wallW + 2}%`, fontSize: 10, color: "#1a2d40", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>FMT dept.</div>
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
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: isCmd ? 9 : 10, color: isCmd ? "#1a5c2a" : "#00ff88", fontWeight: isCmd ? 400 : 600, textShadow: !isCmd && sc.displayResult ? "0 0 8px #00ff8844" : "none", animation: i === sc.display.length - 1 ? "sf-fadeIn 0.4s" : "none", whiteSpace: "nowrap" }}>{l}</span>
            );
          })}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1a3d20", animation: "sf-blink 1s step-end infinite" }}>█</span>
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
  { id: "card", label: "Package", sub: "package main", color: T.red, lines: [0], desc: "the package label. same as every chapter — this is a runnable program." },
  { id: "pname", label: "Package Name", sub: "main", color: T.ink, lines: [0], desc: "main = the machine runs this directly. you know the drill." },
  { id: "attach", label: "Address Label", sub: "import \"fmt\"", color: T.blue, lines: [2], desc: "fetched from the shelf. zainab needs it to post envelopes to the FMT department." },
  { id: "envelope", label: "Main Envelope", sub: "func main()", color: T.pink, lines: [17], desc: "the big envelope. zainab opens it and follows instructions: call sumCodes, call validateCode, post results." },
  { id: "req", label: "Required Info", sub: "()", color: "#34d399", lines: [17], desc: "no required information — main takes no parameters. zainab can open it immediately." },
  { id: "body", label: "Instructions", sub: "{ ... }", color: T.green, lines: [18, 19, 20], desc: "call sumCodes with stickers, receive the result, call validateCode, receive two results, post both to fmt." },
  { id: "sumEnv", label: "Envelope: sumCodes", sub: "func sumCodes(...int) int", color: T.green, lines: [4, 5, 6, 7, 8, 9, 10], desc: "a separate envelope on the shelf. it has a stretchy pouch (variadic) on the front and one outbox slot (int) on the back. does one job: sum the stickers in the pouch." },
  { id: "pouch", label: "Stretchy Pouch", sub: "codes ...int", color: T.purple, lines: [4], desc: "three dots = variadic. the pouch expands to fit any number of int stickers. inside the function, the pouch becomes a slice — a numbered stack of same-colour envelopes. []int means \"expandable stack of ints\". the stack can grow, shrink, and be walked through." },
  { id: "rangeLoop", label: "Range Loop", sub: "for _, c := range codes", color: T.green, lines: [6, 7, 8], desc: "range is a revolving door that spins once for each envelope in the stack. each spin gives zainab two things: the position number and the sticker inside. _ means \"throw away the position\" — she only needs the sticker value (c). one spin per item, every item visited." },
  { id: "returnOne", label: "Outbox Slot", sub: "return total", color: T.amber, lines: [9], desc: "write the result on the back of the envelope. one slot, one value. zainab takes it back to main." },
  { id: "valEnv", label: "Envelope: validateCode", sub: "func validateCode(...int) (int, bool)", color: T.pink, lines: [12, 13, 14, 15], desc: "another envelope. same stretchy pouch, but TWO outbox slots on the back: an int and a bool. returns the sum and whether it passes." },
  { id: "twoSlots", label: "Two Outbox Slots", sub: "(int, bool)", color: T.amber, lines: [12], desc: "parentheses around two types = two outbox slots. the worker fills both before sending the envelope back." },
  { id: "compose", label: "Composition", sub: "sumCodes(codes...)", color: T.green, lines: [13], desc: "zainab hands the pouch contents to another envelope. codes... tips the slice back into individual stickers. reuse what you already built." },
  { id: "directBool", label: "Direct Bool", sub: "total > 100", color: T.amber, lines: [14], desc: "the comparison IS a boolean. no need for if/else — write the expression directly into the outbox slot. clean go." },
  { id: "receive", label: "Receive Both", sub: "s, v :=", color: T.blue, lines: [19], desc: "when zainab gets the envelope back, she reads both outbox slots: s gets the int, v gets the bool. two values, two variables." },
  { id: "exp", label: "Expected Info", sub: "no return", color: "#fb923c", lines: [17], desc: "main doesn't return anything. other envelopes (sumCodes, validateCode) do." },
];

// ── Analog Card ──
function AnalogCard({ active, onPartClick }: { active: string | null; onPartClick: (id: string) => void }) {
  const [flipped, setFlipped] = useState(false);
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
              <span style={{ color: "#ffaaaa", fontSize: 9, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>rev 3.0</span>
            </div>
            <div style={{ padding: "0 14px" }}>
              {/* Package name */}
              <div onClick={(e) => tog("pname", e)} style={{ marginBottom: 12, cursor: "pointer", boxShadow: ring("pname"), padding: "3px 6px", transition: "box-shadow 0.2s" }}>
                <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Package Name:</div>
                <div style={{ borderBottom: `1px solid ${T.line}`, paddingBottom: 2, marginTop: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: T.ink, fontWeight: 700 }}>main</span>
                </div>
              </div>

              {/* Attachments */}
              <div onClick={(e) => tog("attach", e)} style={{ marginBottom: 14, cursor: "pointer", background: isA("attach") ? T.blue + "11" : "transparent", boxShadow: ring("attach"), padding: "6px 8px", border: `1px dashed ${isA("attach") ? T.blue : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Required Attachments:</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
                  <span style={{ color: T.green, fontSize: 13 }}>☑</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: T.ink }}>fmt <span style={{ fontSize: 11, color: T.inkLight }}>(printer toolkit)</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
                  <span style={{ color: T.inkFade, fontSize: 13 }}>☐</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: T.inkFade, fontStyle: "italic" }}>add more...</span>
                </div>
              </div>

              {/* Extra Envelopes (NEW in ch03) */}
              <div onClick={(e) => tog("sumEnv", e)} style={{ marginBottom: 8, cursor: "pointer", background: isA("sumEnv") ? T.green + "11" : "transparent", boxShadow: ring("sumEnv"), padding: "6px 8px", border: `1px solid ${isA("sumEnv") ? T.green : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.green, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)", marginBottom: 4 }}>✉ ENVELOPE: sumCodes</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div onClick={(e) => tog("pouch", e)} style={{ flex: "1 1 100px", padding: "4px 6px", background: isA("pouch") ? T.purple + "11" : T.paperAlt, border: `1px solid ${isA("pouch") ? T.purple : T.line}`, boxShadow: ring("pouch"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 8, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>FRONT: STRETCHY POUCH</div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: T.purple, fontWeight: 700 }}>🎒 codes ...int</div>
                  </div>
                  <div onClick={(e) => tog("returnOne", e)} style={{ flex: "1 1 80px", padding: "4px 6px", background: isA("returnOne") ? T.amber + "11" : T.paperAlt, border: `1px solid ${isA("returnOne") ? T.amber : T.line}`, boxShadow: ring("returnOne"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 8, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>BACK: OUTBOX</div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: T.amber, fontWeight: 700 }}>📤 int</div>
                  </div>
                </div>
              </div>

              <div onClick={(e) => tog("valEnv", e)} style={{ marginBottom: 14, cursor: "pointer", background: isA("valEnv") ? T.pink + "11" : "transparent", boxShadow: ring("valEnv"), padding: "6px 8px", border: `1px solid ${isA("valEnv") ? T.pink : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.pink, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)", marginBottom: 4 }}>✉ ENVELOPE: validateCode</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 100px", padding: "4px 6px", background: T.paperAlt, border: `1px solid ${T.line}` }}>
                    <div style={{ fontSize: 8, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>FRONT: STRETCHY POUCH</div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: T.purple, fontWeight: 700 }}>🎒 codes ...int</div>
                  </div>
                  <div onClick={(e) => tog("twoSlots", e)} style={{ flex: "1 1 80px", padding: "4px 6px", background: isA("twoSlots") ? T.amber + "11" : T.paperAlt, border: `1px solid ${isA("twoSlots") ? T.amber : T.line}`, boxShadow: ring("twoSlots"), cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 8, color: T.inkFade, fontWeight: 700, letterSpacing: 1, fontFamily: "var(--font-mono)" }}>BACK: TWO OUTBOX SLOTS</div>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: T.amber, fontWeight: 700 }}>📤 int, bool</div>
                  </div>
                </div>
              </div>

              {/* Main Envelope */}
              <div onClick={(e) => tog("envelope", e)} style={{ background: T.paperAlt, border: `1.5px solid ${isA("envelope") ? T.pink : T.line}`, boxShadow: ring("envelope"), overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ width: "100%", height: 32, background: T.steelMid, borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: T.pink, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>ENVELOPE: main</span>
                </div>
                {/* Front / Back toggle */}
                <div style={{ display: "flex", borderBottom: `1px solid ${T.line}` }}>
                  {["FRONT", "BACK"].map((side, si) => (
                    <button key={side} onClick={(e) => { e.stopPropagation(); setFlipped(si === 1); }} style={{ flex: 1, padding: "4px 0", border: "none", cursor: "pointer", background: ((si === 0 && !flipped) || (si === 1 && flipped)) ? T.steelMid : T.steel, fontSize: 10, fontWeight: 700, color: ((si === 0 && !flipped) || (si === 1 && flipped)) ? T.ink : T.inkFade, letterSpacing: 1, fontFamily: "var(--font-mono)", borderRight: si === 0 ? `1px solid ${T.line}` : "none" }}>{side}</button>
                  ))}
                </div>
                {!flipped ? (
                  <div style={{ padding: "10px 12px" }}>
                    <div onClick={(e) => tog("req", e)} style={{ marginBottom: 10, cursor: "pointer", background: isA("req") ? "#34d39911" : "transparent", boxShadow: ring("req"), padding: "4px 6px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Required Information:</div>
                      <div style={{ borderBottom: `1px solid ${T.line}`, minHeight: 22, paddingBottom: 2, marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: T.inkFade, fontStyle: "italic" }}>- none -</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#34d399", marginLeft: 8 }}>()</span>
                      </div>
                    </div>
                    <div onClick={(e) => tog("body", e)} style={{ cursor: "pointer", background: isA("body") ? T.green + "11" : "transparent", boxShadow: ring("body"), padding: "4px 6px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Instructions:</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: T.ink, lineHeight: 2 }}>
                        <span onClick={(e) => tog("sumEnv", e)} style={{ cursor: "pointer", boxShadow: ring("sumEnv"), padding: "1px 4px", background: isA("sumEnv") ? T.green + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          ✉ Hand stickers to <b>sumCodes</b> envelope
                        </span>
                        <span style={{ display: "block", padding: "0 4px 0 16px", fontSize: 11, color: T.inkFade }}>fill pouch with 25, 30, 50, 10</span>
                        <span style={{ display: "block", padding: "1px 4px" }}>
                          📮 Post result to fmt.Println
                        </span>
                        <span onClick={(e) => tog("valEnv", e)} style={{ cursor: "pointer", boxShadow: ring("valEnv"), padding: "1px 4px", background: isA("valEnv") ? T.pink + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          ✉ Hand stickers to <b>validateCode</b> envelope
                        </span>
                        <span onClick={(e) => tog("receive", e)} style={{ cursor: "pointer", boxShadow: ring("receive"), padding: "0 4px 0 16px", background: isA("receive") ? T.blue + "22" : "transparent", transition: "all 0.2s", display: "block", fontSize: 12 }}>
                          📤 Read both outbox slots: s, v
                        </span>
                        <span style={{ display: "block", padding: "1px 4px" }}>
                          📮 Post s and v to fmt.Printf
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "10px 12px" }}>
                    <div onClick={(e) => tog("exp", e)} style={{ cursor: "pointer", background: isA("exp") ? "#fb923c11" : "transparent", boxShadow: ring("exp"), padding: "4px 6px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Expected Information:</div>
                      <div style={{ borderBottom: `1px solid ${T.line}`, minHeight: 22, paddingBottom: 2, marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: T.inkFade, fontStyle: "italic" }}>- none -</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#fb923c", marginLeft: 8 }}>no return</span>
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.inkFade, fontStyle: "italic", marginTop: 4 }}>main doesn&apos;t return. sumCodes and validateCode do.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: T.inkFade, textAlign: "center", marginTop: 6, fontFamily: "var(--font-mono)" }}>tap any section · flip envelope front/back</div>
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
            <span style={{ color: T.inkFade }}> → </span>
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
          <span style={{ fontSize: 13, color: T.green }}>→</span>
        </button>
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", animation: "sf-fadeIn .2s ease forwards" }}>
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
interface ShaftFunctionsProps {
  onHotspotClick?: (id: string) => void;
  clickedIds?: Set<string>;
  view?: "animation" | "card";
}

export function ShaftFunctions({ onHotspotClick, clickedIds = new Set(), view = "animation" }: ShaftFunctionsProps) {
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
      {view === "animation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, minHeight: 0 }}>
          {/* Illustration area */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            <OfficeRoom sc={sc} />

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
              {[{ dot: T.green, l: "sumCodes env" }, { dot: T.pink, l: "validateCode env" }, { dot: T.purple, l: "Pouch (variadic)" }, { dot: T.amber, l: "Outbox (return)" }, { dot: T.blue, l: "Addr label" }, { dot: "#00ff88", l: "Display" }].map((item, i) => (
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
              <button onClick={() => setScene(Math.max(0, scene - 1))} disabled={scene === 0} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: scene === 0 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)", opacity: scene === 0 ? 0.3 : 1 }}>← BACK</button>
              <button onClick={() => { setScene(0); setPlaying(true); }} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.green}44`, color: T.green, fontSize: 12, fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
              {playing && <button onClick={() => setPlaying(false)} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: T.ink, fontSize: 12, fontFamily: "var(--font-mono)" }}>⏸</button>}
              <button onClick={() => setScene(Math.min(SCENES.length - 1, scene + 1))} disabled={scene === SCENES.length - 1} className="bg-transparent cursor-pointer" style={{ padding: "6px 16px", border: `1px solid ${T.line}`, color: scene === SCENES.length - 1 ? T.inkFade : T.ink, fontSize: 12, fontFamily: "var(--font-mono)", opacity: scene === SCENES.length - 1 ? 0.3 : 1 }}>NEXT →</button>
            </div>
          </div>
        </div>
      )}

      {/* Card view */}
      {view === "card" && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div style={{ border: "1px solid rgba(110,255,160,.08)", padding: 18 }}>
            <div style={{ fontSize: 12, color: T.inkFade, marginBottom: 14, fontFamily: "var(--font-mono)" }}>tap any section of the card or the code pills to see how each part maps to Go syntax.</div>
            <AnalogCard active={cardActive} onPartClick={handleCardPartClick} />
          </div>

          {/* Analogy map button + modal */}
          <AnalogyMapModal items={[
            { a: "Package card", c: "package main", col: T.red },
            { a: "Address label", c: "import", col: T.blue },
            { a: "Envelope", c: "func", col: T.pink },
            { a: "Sealed envelope", c: "const", col: T.amber },
            { a: "Open envelope", c: "variable", col: T.blue },
            { a: "🔤 Sticker", c: "value/data", col: "#86efac" },
            { a: "Postal slot", c: "func call", col: T.green },
            { a: "✉ Extra envelope", c: "function", col: T.green },
            { a: "🚪 Revolving door", c: "for range (loop)", col: T.green },
            { a: "🎒 Stretchy pouch", c: "...int (variadic)", col: T.purple },
            { a: "📚 Numbered stack", c: "[]int (slice)", col: T.blue },
            { a: "📤 Outbox slot", c: "return value", col: T.amber },
            { a: "Two outbox slots", c: "(int, bool)", col: T.amber },
            { a: "Tip pouch into", c: "codes... (spread)", col: T.purple },
            { a: "Reuse envelope", c: "composition", col: T.green },
            { a: "Direct expression", c: "total > 100", col: T.amber },
          ]} />
        </div>
      )}
    </div>
  );
}
