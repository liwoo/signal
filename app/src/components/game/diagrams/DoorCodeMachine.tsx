"use client";

import { useState, useEffect, useCallback } from "react";

// ── Design tokens (same as GoAppliance — shared mental model) ──
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};

const KEYFRAMES = `
  @keyframes dc-fadeIn    {from{opacity:0}to{opacity:1}}
  @keyframes dc-popIn     {from{transform:translate(-50%,-50%) scale(0.2);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @keyframes dc-popIn2    {from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes dc-slideR    {0%{left:-20%}100%{left:110%}}
  @keyframes dc-slideL    {0%{left:110%}100%{left:-20%}}
  @keyframes dc-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes dc-blinkRed  {0%,49%{opacity:1;box-shadow:0 0 10px #ef444466}50%,100%{opacity:0.25;box-shadow:none}}
  @keyframes dc-spin      {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes dc-slideDown {from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
`;

// ── Syntax highlight ──
function SHLine({ line }: { line: string }) {
  const tokens = line.split(/((?:package|import|func|var|const|return|for|switch|case|default|if|else)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|\+\+|<=|[{}();])/g);
  const kw = ["package", "import", "func", "var", "const", "return", "for", "switch", "case", "default", "if", "else"];
  return (
    <span>
      {tokens.map((t, i) => {
        if (kw.includes(t)) return <span key={i} style={{ color: T.purple }}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{ color: "#86efac" }}>{t}</span>;
        if (t === "fmt") return <span key={i} style={{ color: "#60a5fa" }}>{t}</span>;
        if (t === "Println") return <span key={i} style={{ color: "#fbbf24" }}>{t}</span>;
        if (t === ":=" || t === "++" || t === "<=") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        return <span key={i} style={{ color: T.ink }}>{t}</span>;
      })}
    </span>
  );
}

// ── Code Panel ──
const ANIM_CODE = `package main

import "fmt"

const (
    deny     = "DENY"
    warn     = "WARN"
    grant    = "GRANT"
    override = "OVERRIDE"
)

func main() {
    for i := 1; i <= 10; i++ {
        switch {
        case i <= 3:
            fmt.Println(i, deny)
        case i <= 6:
            fmt.Println(i, warn)
        case i <= 9:
            fmt.Println(i, grant)
        default:
            fmt.Println(i, override)
        }
    }
}`;

interface Annotation { label: string; color: string }

function CodePanel({ highlightLines = [], annotate = {} }: { highlightLines?: number[]; annotate?: Record<number, Annotation> }) {
  return (
    <div style={{ background: "var(--color-code-bg, #0a0e18)", padding: 16, border: "1px solid rgba(110,255,160,.08)", fontFamily: "var(--font-mono)", fontSize: 13, overflowX: "auto" }}>
      {ANIM_CODE.split("\n").map((line, i) => {
        const hl = highlightLines.includes(i);
        const note = annotate[i];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, background: hl ? "#00d4aa11" : "transparent", borderLeft: hl ? "3px solid #00d4aa" : "3px solid transparent", padding: "2px 10px" }}>
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

// ── Scene types (extends ch01 office model with loop + switch overlay) ──
interface WorkerData { id: string; emoji: string; label: string; x: number; y: number; action: string }

interface Scene {
  id: string; narr: string;
  workers: WorkerData[];
  pkg: boolean; fmtBox: boolean;
  // Office overlays
  constFolder: boolean;               // sealed folder visible on shelf
  constTags: string[];                 // which tags are highlighted (empty = all dim)
  loopActive: boolean;                 // revolving door visible in main dept
  loopI: number | null;               // current counter value
  loopCondTrue: boolean;              // condition sign state
  activeLane: string | null;          // which sorting lane is lit (deny/warn/grant/override)
  // Postal system (same as ch01)
  postalDir: null | "to_fmt" | "to_main"; postalLabel: string;
  display: string[]; displayResult: boolean;
  completeBtn: "locked" | "pressed";
  highlight: number[];
}

const PA = { DOOR: { x: 11, y: 28 }, SHELF: { x: 17, y: 22 }, MAIN_DESK: { x: 26, y: 52 }, WALL_SLOT: { x: 48, y: 47 }, FMT_SLOT: { x: 62, y: 47 }, FMT_DESK: { x: 74, y: 47 } };

const LANE_COLORS: Record<string, string> = { deny: T.red, warn: T.amber, grant: T.green, override: "#ff6b6b" };

// ── SCENES ──
// Same appliance, same flow: package → import → open main → read instructions
// New objects appear as zainab encounters them: sealed folder, revolving door, sorting station

const SCENES: Scene[] = [
  {
    id: "idle",
    narr: "the go machine is powered on. same appliance as before.\n\ntwo rooms. dividing wall. postal slot.\nzainab in MAIN dept. jijo in FMT dept.\n\nthis time the instructions are more complex.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: false, fmtBox: false,
    constFolder: false, constTags: [], loopActive: false, loopI: null, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: [], displayResult: false, completeBtn: "locked", highlight: [],
  },
  {
    id: "package_in",
    narr: "a programme package slides in through the left wall.\n\nzainab picks it up and reads the label:\nPACKAGE NAME: main\n\nsame as last time. she knows the drill.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "reading label", x: PA.DOOR.x, y: PA.DOOR.y, action: "read" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: false,
    constFolder: false, constTags: [], loopActive: false, loopI: null, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [0],
  },
  {
    id: "check_attach",
    narr: "zainab unfolds the attachments checklist.\n\nshe sees: ☑ fmt\n\nshe walks to the shelf and picks up the fmt address label. same address label as last time — she'll need it later to post envelopes to the FMT department.\n\nimport = \"go fetch this address label.\"",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "fetching address label", x: PA.SHELF.x, y: PA.SHELF.y, action: "collect" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    constFolder: false, constTags: [], loopActive: false, loopI: null, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [2],
  },
  {
    id: "const_folder",
    narr: "but wait — something new on the shelf.\n\na sealed folder labelled ACCESS LABELS.\n\ninside: four name tags.\n🏷 deny = \"DENY\"\n🏷 warn = \"WARN\"\n🏷 grant = \"GRANT\"\n🏷 override = \"OVERRIDE\"\n\nthese are constants. sealed name tags — locked forever. zainab will use them to stamp outputs later.\n\nconst ( ) = a sealed folder of name tags.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "reading folder", x: PA.SHELF.x, y: PA.SHELF.y, action: "read" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["deny", "warn", "grant", "override"], loopActive: false, loopI: null, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [4, 5, 6, 7, 8, 9],
  },
  {
    id: "open_main",
    narr: "zainab opens the main envelope at her worktable.\n\nrequired information: none.\nshe can open it immediately.\n\nthe first instruction is different this time. it says:\n\"enter the revolving door.\"",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "opening envelope", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "open" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: [], loopActive: false, loopI: null, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [11],
  },
  {
    id: "enter_loop",
    narr: "a revolving door appears at the worktable.\n\nzainab steps in.\ncounter sign: i = 1\ncondition sign: \"i <= 10\" → ✅ TRUE\n\nthe door starts spinning. each spin is one iteration.\ninside: a sorting station with four lanes.\n\nfor loop = revolving door.\neach spin, the worker goes through, then the counter ticks up.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "entering loop", x: 34, y: 44, action: "open" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: [], loopActive: true, loopI: 1, loopCondTrue: true, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [12],
  },
  {
    id: "sort_deny",
    narr: "spin 1. i = 1.\n\nzainab enters the sorting station.\n\ncheck: i <= 3? → ✅ YES\nrouted to the DENY lane.\n\nshe grabs the 'deny' name tag from the sealed folder, reads the sticker: 🏷\"DENY\"\n\nposts \"1 DENY\" to fmt using the address label.\njijo reads it and sends it to the display.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["deny"], loopActive: true, loopI: 1, loopCondTrue: true, activeLane: "deny",
    postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: 1, deny", display: ["$ go run main.go", "1 DENY"], displayResult: false, completeBtn: "locked", highlight: [14, 15],
  },
  {
    id: "spin_deny",
    narr: "spins 2 and 3. same lane.\n\ni = 2 → i <= 3? YES → DENY\ni = 3 → i <= 3? YES → DENY\n\neach spin: zainab checks the sorting station, grabs the deny tag, posts to fmt. jijo prints it.\n\n📮 \"2 DENY\", \"3 DENY\" → display",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "looping...", x: 34, y: 44, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["deny"], loopActive: true, loopI: 3, loopCondTrue: true, activeLane: "deny",
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "1 DENY", "2 DENY", "3 DENY"], displayResult: false, completeBtn: "locked", highlight: [14, 15],
  },
  {
    id: "sort_warn",
    narr: "spin 4. i = 4.\n\ncheck: i <= 3? → ❌ NO\ncheck: i <= 6? → ✅ YES\nrouted to the WARN lane.\n\nthe sorting station checks conditions top to bottom. first true condition wins.\n\nzainab grabs the 'warn' tag. posts \"4 WARN\" to fmt.\n\nspins 5, 6 follow the same lane.\n📮 \"4 WARN\", \"5 WARN\", \"6 WARN\" → display",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["warn"], loopActive: true, loopI: 6, loopCondTrue: true, activeLane: "warn",
    postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: i, warn", display: ["$ go run main.go", "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN"], displayResult: false, completeBtn: "locked", highlight: [16, 17],
  },
  {
    id: "sort_grant",
    narr: "spin 7. i = 7.\n\ncheck: i <= 3? ❌\ncheck: i <= 6? ❌\ncheck: i <= 9? → ✅ YES\nrouted to the GRANT lane.\n\nzainab grabs the 'grant' tag.\nspins 8, 9 follow.\n📮 \"7 GRANT\", \"8 GRANT\", \"9 GRANT\" → display\n\nno break needed — go exits each lane automatically. that's a safety feature.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "looping...", x: 34, y: 44, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["grant"], loopActive: true, loopI: 9, loopCondTrue: true, activeLane: "grant",
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT"], displayResult: false, completeBtn: "locked", highlight: [18, 19],
  },
  {
    id: "sort_override",
    narr: "spin 10. i = 10.\n\ncheck: i <= 3? ❌\ncheck: i <= 6? ❌\ncheck: i <= 9? ❌\nno condition matched → DEFAULT lane.\n\ndefault = the catch-all. like else in an if/else chain.\n\nzainab grabs the 'override' tag.\n📮 \"10 OVERRIDE\" → display",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "printing...", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: ["override"], loopActive: true, loopI: 10, loopCondTrue: true, activeLane: "override",
    postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: 10, override", display: ["$ go run main.go", "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"], displayResult: false, completeBtn: "locked", highlight: [20, 21],
  },
  {
    id: "exit_loop",
    narr: "counter ticks: i = 11.\n\ncondition sign: \"i <= 10\" → ❌ FALSE\n\nthe revolving door stops spinning. zainab steps out.\n\nall 10 codes classified. all replies received from fmt.\nzainab presses the button. ✅\n\nprogramme complete.",
    workers: [{ id: "zainab", emoji: "🧕🏿", label: "✅ complete!", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "done" }, { id: "jijo", emoji: "👨🏿‍💻", label: "done ✓", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "done" }],
    pkg: true, fmtBox: true,
    constFolder: true, constTags: [], loopActive: true, loopI: 11, loopCondTrue: false, activeLane: null,
    postalDir: null, postalLabel: "", display: ["$ go run main.go", "1 DENY", "2 DENY", "3 DENY", "4 WARN", "5 WARN", "6 WARN", "7 GRANT", "8 GRANT", "9 GRANT", "10 OVERRIDE"], displayResult: true, completeBtn: "pressed", highlight: [],
  },
];

// ── Worker Chip (same as GoAppliance) ──
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

// ── Office Room (same structure as ch01, extended with new objects) ──
function OfficeRoom({ sc }: { sc: Scene }) {
  const wallX = 54, wallW = 5, slotY = 38, slotH = 14;
  const postalActive = sc.postalDir !== null;
  const toFmt = sc.postalDir === "to_fmt";
  const laneColor = sc.activeLane ? LANE_COLORS[sc.activeLane] || T.ink : null;

  return (
    <div style={{ position: "relative", width: "100%", flex: 1, minHeight: 0, background: "linear-gradient(180deg,#0b1220 0%,#090e1a 100%)", border: `1px solid ${T.steelLt}`, overflow: "hidden" }}>
      {/* Ceiling lights */}
      <div style={{ position: "absolute", top: 0, left: "5%", width: `${wallX - 6}%`, height: 3, background: `linear-gradient(90deg,transparent,${T.amber}33,transparent)` }} />
      <div style={{ position: "absolute", top: 0, left: `${wallX + wallW + 1}%`, right: "1%", height: 3, background: `linear-gradient(90deg,transparent,${T.blue}33,transparent)` }} />

      {/* Left wall (package slot) — SAME AS CH01 */}
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

      {/* fmt address label badge — SAME AS CH01 */}
      {sc.fmtBox && <div style={{ position: "absolute", top: "10%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}66`, padding: "2px 8px", fontSize: 9, color: T.blue, fontWeight: 700, fontFamily: "var(--font-mono)", animation: "dc-fadeIn 0.4s", display: "flex", alignItems: "center", gap: 4 }}>📋 fmt <span style={{ fontSize: 7, color: T.blue + "88" }}>addr</span></div>}

      {/* ── NEW: Sealed Const Folder on shelf ── */}
      {sc.constFolder && (
        <div style={{ position: "absolute", top: "17%", left: "7%", width: "18%", animation: "dc-fadeIn 0.4s" }}>
          <div style={{ background: T.amber + "18", border: `1px solid ${T.amber}55`, padding: "3px 5px" }}>
            <div style={{ fontSize: 7, color: T.amber, fontFamily: "var(--font-mono)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              📂 CONST <span style={{ fontSize: 6 }}>🔒</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
              {(["deny", "warn", "grant", "override"] as const).map((tag) => {
                const col = LANE_COLORS[tag];
                const lit = sc.constTags.includes(tag);
                return (
                  <div key={tag} style={{
                    fontSize: 7, fontFamily: "var(--font-mono)", color: lit ? col : col + "55",
                    background: lit ? col + "22" : "transparent",
                    border: `1px solid ${lit ? col : "transparent"}`,
                    padding: "0 3px", fontWeight: 700, transition: "all 0.3s",
                  }}>
                    🏷{tag}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MAIN worktable — SAME AS CH01 */}
      <div style={{ position: "absolute", left: "14%", width: `${wallX - 22}%`, top: "58%", height: 3, background: T.steelLt }} />
      <div style={{ position: "absolute", left: "18%", width: `${wallX - 26}%`, top: "44%", height: "14%", background: "linear-gradient(180deg,#121c2e,#0e1522)", border: `1px solid ${T.steelLt}44`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>worktable</span>
      </div>

      {/* ── NEW: Revolving Door + Sorting Station overlay on worktable ── */}
      {sc.loopActive && (
        <div style={{ position: "absolute", left: "18%", width: `${wallX - 26}%`, top: "32%", height: "34%", border: `1.5px solid ${sc.loopCondTrue ? T.green + "66" : T.red + "66"}`, background: "#080d1488", animation: "dc-fadeIn 0.4s", overflow: "hidden", zIndex: 5, transition: "border-color 0.5s" }}>
          {/* Loop header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 6px", borderBottom: `1px solid ${T.steelLt}44`, background: "#0a0e1888" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, color: T.green, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase" }}>for</span>
              {sc.loopCondTrue && <span style={{ fontSize: 10, display: "inline-block", animation: "dc-spin 2s linear infinite" }}>🔄</span>}
              {!sc.loopCondTrue && <span style={{ fontSize: 8, color: T.red }}>⛔ STOP</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {sc.loopI !== null && <span style={{ fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: "var(--font-mono)" }}>i={sc.loopI}</span>}
              {sc.loopI !== null && <span style={{ fontSize: 9, color: sc.loopCondTrue ? T.green : T.red, fontFamily: "var(--font-mono)" }}>{sc.loopCondTrue ? "✅" : "❌"}</span>}
            </div>
          </div>
          {/* Sorting lanes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "2px 4px" }}>
            {([
              { lane: "deny", label: "≤3 DENY" },
              { lane: "warn", label: "≤6 WARN" },
              { lane: "grant", label: "≤9 GRANT" },
              { lane: "override", label: "⁕ OVERRIDE" },
            ] as const).map((l) => {
              const col = LANE_COLORS[l.lane];
              const active = sc.activeLane === l.lane;
              return (
                <div key={l.lane} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "1px 4px",
                  background: active ? col + "33" : "transparent",
                  borderLeft: `3px solid ${active ? col : "transparent"}`,
                  transition: "all 0.3s",
                }}>
                  <div style={{ width: 6, height: 6, background: active ? col : col + "22" }} />
                  <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: active ? col : T.inkFade, fontWeight: active ? 700 : 400 }}>{l.label}</span>
                  {active && <span style={{ fontSize: 8, marginLeft: "auto", color: col }}>◄</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Complete button — SAME AS CH01 */}
      <div style={{
        position: "absolute", left: "12%", top: "67%", width: 36, height: 36, borderRadius: "50%",
        background: sc.completeBtn === "pressed" ? `radial-gradient(circle,${T.green},#008866)` : `radial-gradient(circle,#7f1d1d,#3a0808)`,
        border: `2px solid ${sc.completeBtn === "pressed" ? T.green : "#991b1b"}`,
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 12,
        animation: sc.completeBtn === "pressed" ? "dc-popIn2 0.4s ease-out" : "dc-blinkRed 1s step-end infinite",
      }}>
        <span style={{ fontSize: sc.completeBtn === "pressed" ? 16 : 14 }}>{sc.completeBtn === "pressed" ? "✅" : "🔴"}</span>
      </div>
      <div style={{ position: "absolute", left: "6%", top: "82%", fontSize: 8, color: sc.completeBtn === "pressed" ? T.green : "#7f1d1d", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", textAlign: "center", width: "20%", lineHeight: 1.3, transition: "color 0.5s" }}>
        {sc.completeBtn === "pressed" ? "done!" : "locked"}
      </div>

      {/* Dividing wall — SAME AS CH01 */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wallX}%`, width: `${wallW}%`, background: "linear-gradient(180deg,#0c1520,#0a1018)", borderLeft: `1px solid ${T.steelLt}`, borderRight: `1px solid ${T.steelLt}` }}>
        <div style={{ position: "absolute", top: "4%", left: 0, right: 0, textAlign: "center", fontSize: 7, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", lineHeight: 1.4 }}>DIV<br />WALL</div>
        {/* Postal slot */}
        <div style={{ position: "absolute", top: `${slotY}%`, left: "10%", right: "10%", height: `${slotH}%`, background: postalActive ? "#0d2a18" : "#080d14", border: `1px solid ${postalActive ? T.green + "99" : T.steelLt}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
          {postalActive && (
            <div style={{ position: "absolute", width: "70%", height: 10, background: T.paper, border: `1px solid ${T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center", animation: toFmt ? "dc-slideR 0.6s ease-in-out infinite" : "dc-slideL 0.6s ease-in-out infinite" }}>
              <span style={{ fontSize: 7, color: T.inkMid }}>✉</span>
            </div>
          )}
          {!postalActive && <span style={{ fontSize: 10, color: "#1a2d40" }}>📪</span>}
        </div>
        {postalActive && <div style={{ position: "absolute", top: `${slotY + slotH + 2}%`, left: 0, right: 0, textAlign: "center", fontSize: 14, color: T.green, animation: "dc-fadeIn 0.2s" }}>{toFmt ? "→" : "←"}</div>}
        {postalActive && sc.postalLabel && (
          <div style={{ position: "absolute", top: `${slotY - 18}%`, left: "-200%", width: 260, background: "#0d2a18", border: `1px solid ${T.green}55`, padding: "4px 8px", fontSize: 9, color: T.green, fontFamily: "var(--font-mono)", animation: "dc-fadeIn 0.3s", whiteSpace: "nowrap", zIndex: 20 }}>{sc.postalLabel}</div>
        )}
      </div>

      {/* FMT dept — SAME AS CH01 */}
      <div style={{ position: "absolute", top: "3%", left: `${wallX + wallW + 2}%`, fontSize: 10, color: "#1a2d40", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>FMT dept.</div>
      <div style={{ position: "absolute", left: `${wallX + wallW + 4}%`, right: "4%", top: "58%", height: 3, background: T.steelLt }} />
      <div style={{ position: "absolute", left: `${wallX + wallW + 8}%`, right: "8%", top: "44%", height: "14%", background: "linear-gradient(180deg,#0e1c2e,#0a1320)", border: `1px solid ${T.blue}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#1a2d40", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>fmt table</span>
      </div>

      {/* Display panel — SAME AS CH01, but with colored lane outputs */}
      <div style={{ position: "absolute", bottom: 0, left: "5%", right: 0, height: "14%", background: "#020d04", borderTop: `1px solid ${sc.displayResult ? "#1a5c2a" : "#0d1a10"}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 8 }}>
        <span style={{ fontSize: 8, color: "#1a3d20", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8, flexShrink: 0, borderRight: "1px solid #0d2a10", paddingRight: 8 }}>display</span>
        <div style={{ flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1px 6px", overflow: "hidden" }}>
          {sc.display.map((l, i) => {
            const isCmd = l.startsWith("$");
            const parts = l.split(" ");
            const label = parts[1];
            const col = !isCmd && label ? (LANE_COLORS[label.toLowerCase()] || "#00ff88") : "#1a5c2a";
            return (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: isCmd ? 9 : 10, color: isCmd ? "#1a5c2a" : col, fontWeight: isCmd ? 400 : 600, textShadow: !isCmd && sc.displayResult ? `0 0 8px ${col}` : "none", animation: i === sc.display.length - 1 ? "dc-fadeIn 0.4s" : "none", whiteSpace: "nowrap" }}>{l}</span>
            );
          })}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1a3d20", animation: "dc-blink 1s step-end infinite" }}>█</span>
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
  { id: "card", label: "Package", sub: "package main", color: T.red, lines: [0], desc: "the label on the outside of the package. tells go \"this is a runnable program.\" same as chapter 1 — every .go file starts here." },
  { id: "pname", label: "Package Name", sub: "main", color: T.ink, lines: [0], desc: "the name on the label. main = the machine can run this directly. other names make it a toolkit (library) instead." },
  { id: "attach", label: "Address Label", sub: "import \"fmt\"", color: T.blue, lines: [2], desc: "the attachment checklist. zainab walks to the shelf and picks up the fmt address label so she knows where to send envelopes later. same address label as chapter 1." },
  { id: "folder", label: "Sealed Folder", sub: "const ( ... )", color: T.amber, lines: [4, 5, 6, 7, 8, 9], desc: "a sealed folder with name tags inside. each tag is a constant — locked forever once the folder is sealed. zainab can read the tags but never resticker them." },
  { id: "nametag", label: "Name Tag", sub: "deny = \"DENY\"", color: "#86efac", lines: [5, 6, 7, 8], desc: "each name tag maps a short name to a fixed sticker value. use the name in your code instead of the raw string. if the value ever changes, you change it in one place." },
  { id: "envelope", label: "Main Envelope", sub: "func main()", color: T.pink, lines: [11], desc: "the big envelope inside the package. zainab opens it and follows every instruction inside, top to bottom. this is where the real work happens." },
  { id: "req", label: "Required Info", sub: "()", color: "#34d399", lines: [11], desc: "the front of the envelope. no required information needed — zainab can open it immediately. other envelopes (functions) might need data slipped in first." },
  { id: "body", label: "Instructions", sub: "{ ... }", color: T.green, lines: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], desc: "everything inside the envelope. this time: enter the revolving door, visit the sorting room each spin, grab the right name tag, and post to fmt." },
  { id: "forloop", label: "Revolving Door", sub: "for i := 1; i <= 10; i++", color: T.green, lines: [12], desc: "the revolving door. three parts: counter starts at 1 (init), door keeps spinning while i ≤ 10 (condition), counter ticks up after each spin (post). the worker passes through once per spin." },
  { id: "init", label: "Counter Start", sub: "i := 1", color: T.blue, lines: [12], desc: "the counter sign at the door entrance. sets i to 1 before the first spin. runs exactly once." },
  { id: "cond", label: "Condition Sign", sub: "i <= 10", color: T.pink, lines: [12], desc: "the condition sign on the wall. checked before every spin. when it reads FALSE, the door locks and the worker exits back to the main corridor." },
  { id: "post", label: "Counter Tick", sub: "i++", color: T.pink, lines: [12], desc: "after each spin, the counter ticks up by 1. go only has i++ — no ++i, no i+=1 needed. one way to count." },
  { id: "switch", label: "Sorting Room", sub: "switch { ... }", color: T.purple, lines: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22], desc: "the postal sorting room inside the revolving door. zainab feeds her sticker into the reader. the machine reads it once and illuminates the right bay. she walks there, follows the instructions, then exits. no checking conditions one by one — instant routing." },
  { id: "case1", label: "Bay: DENY", sub: "case i <= 3", color: T.red, lines: [14, 15], desc: "first labelled bay on the wall. if i is 1, 2, or 3, the machine illuminates this bay. zainab walks in, grabs the deny name tag, and posts to fmt." },
  { id: "case2", label: "Bay: WARN", sub: "case i <= 6", color: T.amber, lines: [16, 17], desc: "second bay. only illuminated if i > 3. catches 4, 5, 6 → zainab grabs the warn tag." },
  { id: "case3", label: "Bay: GRANT", sub: "case i <= 9", color: T.green, lines: [18, 19], desc: "third bay. only illuminated if i > 6. catches 7, 8, 9 → zainab grabs the grant tag." },
  { id: "default", label: "Bay: OVERRIDE", sub: "default", color: "#ff6b6b", lines: [20, 21], desc: "the DEFAULT bay at the far end. if no other bay's label matched, zainab ends up here. code 10 → OVERRIDE. the catch-all." },
  { id: "exp", label: "Expected Info", sub: "no return", color: "#fb923c", lines: [11], desc: "the back of the envelope. no return value — main doesn't send data back. other envelopes (functions) can write results here." },
];

// ── Analog Card (same format as ch01 GoAppliance) ──
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
              <span style={{ color: "#ffaaaa", fontSize: 9, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>rev 2.0</span>
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

              {/* Sealed Folder (NEW in ch02) */}
              <div onClick={(e) => tog("folder", e)} style={{ marginBottom: 14, cursor: "pointer", background: isA("folder") ? T.amber + "11" : "transparent", boxShadow: ring("folder"), padding: "8px 10px", border: `1px solid ${isA("folder") ? T.amber : T.line}`, transition: "all 0.2s" }}>
                <div style={{ fontSize: 10, color: T.amber, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  📂 Sealed Folder: ACCESS LABELS <span style={{ fontSize: 8 }}>🔒</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { name: "deny", val: "DENY", col: T.red },
                    { name: "warn", val: "WARN", col: T.amber },
                    { name: "grant", val: "GRANT", col: T.green },
                    { name: "override", val: "OVERRIDE", col: "#ff6b6b" },
                  ].map((tag) => (
                    <div key={tag.name} onClick={(e) => tog("nametag", e)} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "3px 7px",
                      background: isA("nametag") ? "#86efac11" : T.paperAlt,
                      border: `1px solid ${isA("nametag") ? "#86efac44" : T.line}`,
                      boxShadow: isA("nametag") ? ring("nametag") : "none",
                      cursor: "pointer", transition: "all 0.2s",
                    }}>
                      <span style={{ fontSize: 10 }}>🏷</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: tag.col, fontWeight: 700 }}>{tag.name}</span>
                      <span style={{ fontSize: 10, color: T.inkFade }}>=</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#86efac" }}>&quot;{tag.val}&quot;</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Envelope */}
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
                    {/* Required Info */}
                    <div onClick={(e) => tog("req", e)} style={{ marginBottom: 10, cursor: "pointer", background: isA("req") ? "#34d39911" : "transparent", boxShadow: ring("req"), padding: "4px 6px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>Required Information:</div>
                      <div style={{ borderBottom: `1px solid ${T.line}`, minHeight: 22, paddingBottom: 2, marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: T.inkFade, fontStyle: "italic" }}>- none -</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#34d399", marginLeft: 8 }}>()</span>
                      </div>
                    </div>
                    {/* Instructions */}
                    <div onClick={(e) => tog("body", e)} style={{ cursor: "pointer", background: isA("body") ? T.green + "11" : "transparent", boxShadow: ring("body"), padding: "4px 6px", transition: "all 0.2s" }}>
                      <div style={{ fontSize: 10, color: T.inkFade, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Instructions:</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: T.ink, lineHeight: 2 }}>
                        <span onClick={(e) => tog("forloop", e)} style={{ cursor: "pointer", boxShadow: ring("forloop"), padding: "1px 4px", background: isA("forloop") ? T.green + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          🔄 Enter revolving door: <b>i</b>=1..10
                        </span>
                        <span style={{ display: "block", padding: "0 4px 0 16px", fontSize: 11, color: T.inkFade, lineHeight: 1.6 }}>each spin:</span>
                        <span onClick={(e) => tog("switch", e)} style={{ cursor: "pointer", boxShadow: ring("switch"), padding: "1px 4px 1px 16px", background: isA("switch") ? T.purple + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          📬 Sorting room: feed <b>i</b> into reader
                        </span>
                        {[
                          { id: "case1", label: "≤3 → DENY bay", col: T.red },
                          { id: "case2", label: "≤6 → WARN bay", col: T.amber },
                          { id: "case3", label: "≤9 → GRANT bay", col: T.green },
                          { id: "default", label: "⁕ → OVERRIDE bay", col: "#ff6b6b" },
                        ].map((lane) => (
                          <span key={lane.id} onClick={(e) => tog(lane.id, e)} style={{ cursor: "pointer", boxShadow: ring(lane.id), padding: "0 4px 0 28px", background: isA(lane.id) ? lane.col + "22" : "transparent", transition: "all 0.2s", display: "block", fontSize: 12 }}>
                            <span style={{ color: lane.col }}>■</span> {lane.label}
                          </span>
                        ))}
                        <span style={{ display: "block", padding: "1px 4px 1px 16px", fontSize: 12 }}>
                          🏷 Grab name tag from sealed folder
                        </span>
                        <span style={{ display: "block", padding: "1px 4px 1px 16px", fontSize: 12 }}>
                          📮 Post to fmt.Println(i, tag)
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
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.inkFade, fontStyle: "italic", marginTop: 4 }}>other envelopes can return data here...</div>
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
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", animation: "dc-fadeIn .2s ease forwards" }}>
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
interface DoorCodeMachineProps {
  onHotspotClick?: (id: string) => void;
  clickedIds?: Set<string>;
  view?: "animation" | "card";
}

export function DoorCodeMachine({ onHotspotClick, clickedIds = new Set(), view = "animation" }: DoorCodeMachineProps) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cardActive, setCardActive] = useState<string | null>(null);
  const sc = SCENES[scene];

  // Auto-play
  useEffect(() => {
    if (!playing) return;
    if (scene >= SCENES.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setScene((s) => s + 1), 4000);
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
              {[{ dot: T.amber, l: "Const folder" }, { dot: T.green, l: "Loop door" }, { dot: T.purple, l: "Switch" }, { dot: T.blue, l: "Addr label" }, { dot: "#00ff88", l: "Display" }].map((item, i) => (
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
            { a: "Sealed folder", c: "const ( )", col: T.amber },
            { a: "🏷 Name tag", c: "const value", col: "#86efac" },
            { a: "Envelope", c: "func main()", col: T.pink },
            { a: "Revolving door", c: "for loop", col: T.green },
            { a: "Counter sign", c: "i := 1", col: T.blue },
            { a: "Condition sign", c: "i <= 10", col: T.pink },
            { a: "Counter tick", c: "i++", col: T.pink },
            { a: "📬 Sorting room", c: "switch { }", col: T.purple },
            { a: "Labelled bay", c: "case", col: T.amber },
            { a: "DEFAULT bay", c: "default", col: "#ff6b6b" },
            { a: "🏛 Checkpoint", c: "if / else", col: "#34d399" },
            { a: "Inspector", c: "condition", col: "#34d399" },
            { a: "Green/red gate", c: "branch path", col: "#34d399" },
          ]} />
        </div>
      )}
    </div>
  );
}
