"use client";

import { useState, useEffect, useCallback } from "react";

// ── Design tokens (SIGNAL-adapted) ──
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};

const KEYFRAMES = `
  @keyframes ga-fadeIn    {from{opacity:0}to{opacity:1}}
  @keyframes ga-popIn     {from{transform:translate(-50%,-50%) scale(0.2);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @keyframes ga-popIn2    {from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes ga-slideR    {0%{left:-20%}100%{left:110%}}
  @keyframes ga-slideL    {0%{left:110%}100%{left:-20%}}
  @keyframes ga-blink     {0%,100%{opacity:1}50%{opacity:0}}
  @keyframes ga-blinkRed  {0%,49%{opacity:1;box-shadow:0 0 10px #ef444466}50%,100%{opacity:0.25;box-shadow:none}}
`;

// ── Syntax highlight ──
function SHLine({ line }: { line: string }) {
  const tokens = line.split(/((?:package|import|func|var|const|return)\b|"[^"]*"|\bfmt\b|\bPrintln\b|:=|[{}()])/g);
  const kw = ["package", "import", "func", "var", "const", "return"];
  return (
    <span>
      {tokens.map((t, i) => {
        if (kw.includes(t)) return <span key={i} style={{ color: T.purple }}>{t}</span>;
        if (t.startsWith('"')) return <span key={i} style={{ color: "#86efac" }}>{t}</span>;
        if (t === "fmt") return <span key={i} style={{ color: "#60a5fa" }}>{t}</span>;
        if (t === "Println") return <span key={i} style={{ color: "#fbbf24" }}>{t}</span>;
        if (t === ":=") return <span key={i} style={{ color: T.pink }}>{t}</span>;
        return <span key={i} style={{ color: T.ink }}>{t}</span>;
      })}
    </span>
  );
}

// ── Code Panel ──
const CARD_CODE = `package main\n\nimport "fmt"\n\nfunc main() {\n    const favLang = "Go"\n    name := "maya"\n    fmt.Println(favLang)\n    fmt.Println(name)\n}`;

interface Annotation { label: string; color: string }

function CodePanel({ highlightLines = [], annotate = {} }: { highlightLines?: number[]; annotate?: Record<number, Annotation> }) {
  return (
    <div style={{ background: "var(--color-code-bg, #0a0e18)", padding: 16, border: "1px solid rgba(110,255,160,.08)", fontFamily: "var(--font-mono)", fontSize: 14, overflowX: "auto" }}>
      {CARD_CODE.split("\n").map((line, i) => {
        const hl = highlightLines.includes(i);
        const note = annotate[i];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, background: hl ? "#00d4aa11" : "transparent", borderLeft: hl ? "3px solid #00d4aa" : "3px solid transparent", padding: "2px 10px" }}>
              <span style={{ color: "#2a3040", minWidth: 18, fontSize: 11, userSelect: "none" }}>{i + 1}</span>
              <SHLine line={line} />
            </div>
            {note && (
              <span style={{ fontSize: 11, color: note.color, background: note.color + "18", border: `1px solid ${note.color}33`, padding: "2px 10px", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                {note.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Card Parts ──
interface CardPart {
  id: string; label: string; sub: string; color: string;
  lines: number[]; desc: string;
}

const CARD_PARTS: CardPart[] = [
  { id: "card", label: "The Package", sub: "package", color: T.amber, lines: [0], desc: "the whole card is the package — a named container that holds everything. every .go file starts by declaring which package it belongs to." },
  { id: "pname", label: "Package Name", sub: "package main", color: T.purple, lines: [0], desc: "the label on the card. 'main' is the special name go looks for to know where to start your programme." },
  { id: "attach", label: "Address Label", sub: 'import "fmt"', color: T.blue, lines: [2], desc: "an address label for a department. import tells the machine to fetch the label from the shelf so zainab knows where to send envelopes later. 'fmt' is the address of go's printer department." },
  { id: "envelope", label: "The Envelope", sub: "func main() { }", color: T.pink, lines: [4, 5, 6, 7, 8, 9], desc: "inside the package sits an envelope — a function. go opens 'main' first. the word 'func' declares an envelope." },
  { id: "req", label: "Required Info (front)", sub: "(params)", color: "#34d399", lines: [4], desc: "what must be provided before the envelope can be opened. main() needs nothing — brackets stay empty: ()." },
  { id: "exp", label: "Expected Info (back)", sub: "return type", color: "#fb923c", lines: [4], desc: "what will be sent back once the work is done. main() returns nothing. other envelopes can return data here." },
  { id: "body", label: "Instructions", sub: "{ ... }", color: T.green, lines: [5, 6, 7, 8], desc: "the instructions inside the envelope — wrapped in { }. a worker reads them top to bottom." },
  { id: "sealed", label: "Sealed Envelope", sub: "const", color: T.amber, lines: [5], desc: "a sealed envelope. once a sticker is placed inside, it's locked forever. the sticker is the data — a word sticker (string) like \"Go\". you can read the sticker, but you can never peel it off or replace it." },
  { id: "sticker", label: "Sticker (Data Value)", sub: "value", color: "#86efac", lines: [5, 6], desc: "stickers are the actual data inside envelopes. a word sticker (string) holds text like \"Go\" or \"maya\". stickers are colour-coded: blue for words (strings), red for numbers (ints). they can be read, copied, and sent between departments via the postal system." },
  { id: "open", label: "Open Envelope", sub: ":= variable", color: T.blue, lines: [6], desc: "an open envelope. holds a sticker that can be peeled off and replaced with a new one. := means 'create this envelope and stick something inside'. later, = alone means 'peel the old sticker off and put a new one in'." },
  { id: "print", label: "Display Post", sub: "fmt.Println", color: T.green, lines: [7, 8], desc: "posts an envelope to the fmt department through the postal slot. jijo opens it, reads the sticker, and sends what it says to the display panel. Println = Print Line." },
];

// ── Scenes ──
interface WorkerData { id: string; emoji: string; label: string; x: number; y: number; action: string }
interface EnvData { id: string; x: number; y: number; type: string; label: string; open?: boolean; value?: string; isNew?: boolean; sealed?: boolean }
interface Scene {
  id: string; narr: string;
  workers: WorkerData[]; pkg: boolean; fmtBox: boolean; envs: EnvData[];
  postalDir: null | "to_fmt" | "to_main"; postalLabel: string;
  display: string[]; displayResult: boolean;
  completeBtn: "locked" | "pressed"; highlight: number[];
}

const PA = { DOOR: { x: 11, y: 28 }, SHELF: { x: 17, y: 22 }, MAIN_DESK: { x: 26, y: 52 }, WALL_SLOT: { x: 48, y: 47 }, FMT_SLOT: { x: 62, y: 47 }, FMT_DESK: { x: 74, y: 47 } };

const SCENES: Scene[] = [
  { id: "idle", narr: "the go machine is powered on.\n\ntwo rooms inside, divided by a wall.\nleft: MAIN dept (zainab).\nright: FMT dept (jijo).\n\na postal slot connects them. at the bottom: the display panel.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: false, fmtBox: false, envs: [], postalDir: null, postalLabel: "", display: [], displayResult: false, completeBtn: "locked", highlight: [] },
  { id: "package_in", narr: "a programme package slides in through the left wall.\n\nzainab picks it up and reads the label:\nPACKAGE NAME: main\n\nthis is the entry package. time to start.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "reading label", x: PA.DOOR.x, y: PA.DOOR.y, action: "read" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: true, fmtBox: false, envs: [], postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [0] },
  { id: "check_attach", narr: "zainab unfolds the attachments checklist.\n\nshe sees: ☑ fmt\n\nshe walks to the shelf and picks up the fmt address label. she'll need it later to address envelopes to the FMT department.\n\nimport = \"go fetch this address label so i know where to send things.\"", workers: [{ id: "zainab", emoji: "🧕🏿", label: "fetching address label", x: PA.SHELF.x, y: PA.SHELF.y, action: "collect" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: true, fmtBox: true, envs: [], postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [2] },
  { id: "open_main", narr: "zainab opens the main envelope at her worktable.\n\nrequired information: none.\nshe can open it immediately.\n\nshe reads the first instruction.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "opening envelope", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "open" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }], postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [4] },
  { id: "create_const", narr: "instruction 1:\n\n\"create a sealed envelope. name: favLang.\ntype: string (word sticker).\nstick the word sticker 'Go' inside.\nseal it shut — it can never be changed.\"\n\nzainab grabs an envelope, sticks 🔤\"Go\" inside, and locks it. 🔒\n\nthe sticker is the data. the envelope is just the container.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "sealing sticker", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }, { id: "favLang", x: 40, y: 62, type: "string", label: "favLang", open: false, value: '"Go"', isNew: true, sealed: true }], postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [5] },
  { id: "create_name", narr: "instruction 2:\n\n\"create an open envelope. name: name.\ntype: string (word sticker).\nstick the word sticker 'maya' inside.\nleave it open — the sticker can be peeled off and replaced later.\"\n\nzainab writes the label and drops 🔤\"maya\" in.\n\nopen envelope = variable. you can always swap the sticker.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "sticking value", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "create" }, { id: "jijo", emoji: "👨🏿‍💻", label: "", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }, { id: "favLang", x: 38, y: 62, type: "string", label: "favLang", sealed: true }, { id: "name", x: 46, y: 62, type: "string", label: "name", open: false, value: '"maya"', isNew: true }], postalDir: null, postalLabel: "", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [6] },
  { id: "post_println1", narr: "instruction 3:\n\n\"post favLang to fmt.Println.\"\n\nzainab uses the fmt address label she collected earlier to address the envelope. she takes the sealed favLang envelope to the postal slot and drops it through the wall.\n\nwithout the address label (import), she wouldn't know where to send it.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "incoming...", x: PA.FMT_SLOT.x, y: PA.FMT_SLOT.y, action: "wait" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }, { id: "name", x: 44, y: 62, type: "string", label: "name" }], postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: favLang", display: ["$ go run main.go"], displayResult: false, completeBtn: "locked", highlight: [7] },
  { id: "fmt_prints1", narr: "jijo receives the envelope in the FMT dept.\n\nhe opens favLang — it's sealed, but he can still read the sticker: 🔤\"Go\"\n\nhe copies what the sticker says and sends it to the display panel.\nposts DONE reply back through the slot.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "⏳ waiting", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "wait" }, { id: "jijo", emoji: "👨🏿‍💻", label: "reading sticker", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }, { id: "favLang", x: 76, y: 55, type: "string", label: "favLang", open: true, value: '"Go"', sealed: true }, { id: "name", x: 44, y: 62, type: "string", label: "name" }], postalDir: "to_main", postalLabel: "REPLY: done ✓", display: ["$ go run main.go", "Go"], displayResult: false, completeBtn: "locked", highlight: [7] },
  { id: "post_println2", narr: "reply received. zainab reads instruction 4:\n\n\"post name to fmt.Println.\"\n\nshe uses the fmt address label again to address this one. drops the name envelope through the postal slot.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "posting →", x: PA.WALL_SLOT.x, y: PA.WALL_SLOT.y, action: "post" }, { id: "jijo", emoji: "👨🏿‍💻", label: "incoming...", x: PA.FMT_SLOT.x, y: PA.FMT_SLOT.y, action: "wait" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }], postalDir: "to_fmt", postalLabel: "TO: fmt.Println | REQ: name", display: ["$ go run main.go", "Go"], displayResult: false, completeBtn: "locked", highlight: [8] },
  { id: "fmt_prints2", narr: "jijo opens the name envelope.\n\nthis one's open — the sticker 🔤\"maya\" is right there.\n\nhe reads it and sends \"maya\" to the display panel.\nposts DONE reply.", workers: [{ id: "zainab", emoji: "🧕🏿", label: "⏳ waiting", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "wait" }, { id: "jijo", emoji: "👨🏿‍💻", label: "reading sticker", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "read" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }, { id: "name", x: 76, y: 55, type: "string", label: "name", open: true, value: '"maya"' }], postalDir: "to_main", postalLabel: "REPLY: done ✓", display: ["$ go run main.go", "Go", "maya"], displayResult: true, completeBtn: "locked", highlight: [8] },
  { id: "complete", narr: "all instructions processed.\nall replies received.\n\nzainab presses the button. ✅\n\nprogramme complete.\noutput: Go, maya", workers: [{ id: "zainab", emoji: "🧕🏿", label: "✅ complete!", x: PA.MAIN_DESK.x, y: PA.MAIN_DESK.y, action: "done" }, { id: "jijo", emoji: "👨🏿‍💻", label: "done ✓", x: PA.FMT_DESK.x, y: PA.FMT_DESK.y, action: "done" }], pkg: true, fmtBox: true, envs: [{ id: "main", x: 32, y: 46, type: "func", label: "main", open: true }], postalDir: null, postalLabel: "", display: ["$ go run main.go", "Go", "maya"], displayResult: true, completeBtn: "pressed", highlight: [] },
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

// ── Sticker Chip (data value visualization) ──
function StickerChip({ value, typeColor, size = "sm" }: { value: string; typeColor: string; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#0d2a18", border: `1.5px solid ${typeColor}`, padding: isSm ? "2px 5px" : "3px 7px", position: "relative" }}>
      <span style={{ fontSize: isSm ? 9 : 11 }}>🔤</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: isSm ? 10 : 12, color: typeColor, fontWeight: 700 }}>{value}</span>
      <div style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, background: typeColor, opacity: 0.5 }} />
    </div>
  );
}

// ── Envelope Chip ──
function EnvChip({ env }: { env: EnvData }) {
  const cols: Record<string, string> = { func: T.pink, string: T.blue };
  const c = cols[env.type] || "#888";
  const isFunc = env.type === "func";
  const w = isFunc ? 90 : 68;
  return (
    <div style={{ position: "absolute", left: `${env.x}%`, top: `${env.y}%`, transform: "translate(-50%,-50%)", transition: "left 0.6s ease, top 0.6s ease", animation: env.isNew ? "ga-popIn 0.4s cubic-bezier(.34,1.56,.64,1) both" : "ga-fadeIn 0.3s ease-out both", zIndex: isFunc ? 9 : 8 }}>
      <div style={{ width: w, background: "#080c14", border: `${isFunc ? 2 : 1.5}px solid ${c}`, overflow: "hidden" }}>
        {/* Flap */}
        <div style={{ height: isFunc ? 22 : 16, background: env.open ? c + "44" : c + "22", borderBottom: `1px solid ${c}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {env.sealed && <span style={{ fontSize: 10 }}>🔒</span>}
          {env.open && !env.sealed && <span style={{ fontSize: isFunc ? 9 : 8, color: c, fontWeight: 700 }}>OPEN</span>}
        </div>
        {/* Type badge */}
        <div style={{ background: c, padding: isFunc ? "2px 6px" : "1px 4px", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: isFunc ? 10 : 8, color: "#fff", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{env.type}</span>
          {!isFunc && <span style={{ fontSize: 7, color: "#ffffff88", fontFamily: "var(--font-mono)" }}>sticker</span>}
        </div>
        {/* Body */}
        <div style={{ padding: isFunc ? "4px 6px 6px" : "3px 4px 5px", background: "#080c14" }}>
          <div style={{ fontSize: isFunc ? 9 : 8, color: c + "99", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.3 }}>name:</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: isFunc ? 14 : 11, color: T.ink, fontWeight: 700, lineHeight: 1 }}>{env.label}</div>
          {env.value && (
            <div style={{ marginTop: 4 }}>
              <StickerChip value={env.value} typeColor={c} />
            </div>
          )}
          {!env.value && !isFunc && (
            <div style={{ marginTop: 3, fontSize: 8, color: c + "55", fontFamily: "var(--font-mono)", fontStyle: "italic" }}>no sticker</div>
          )}
        </div>
      </div>
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
      {/* fmt address label badge */}
      {sc.fmtBox && <div style={{ position: "absolute", top: "10%", left: "7%", background: "#0f1e33", border: `1px solid ${T.blue}66`, padding: "2px 8px", fontSize: 9, color: T.blue, fontWeight: 700, fontFamily: "var(--font-mono)", animation: "ga-fadeIn 0.4s", display: "flex", alignItems: "center", gap: 4 }}>📋 fmt <span style={{ fontSize: 7, color: T.blue + "88" }}>addr</span></div>}

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
        animation: sc.completeBtn === "pressed" ? "ga-popIn2 0.4s ease-out" : "ga-blinkRed 1s step-end infinite",
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
            <div style={{ position: "absolute", width: "70%", height: 10, background: T.paper, border: `1px solid ${T.steelLt}`, display: "flex", alignItems: "center", justifyContent: "center", animation: toFmt ? "ga-slideR 0.6s ease-in-out infinite" : "ga-slideL 0.6s ease-in-out infinite" }}>
              <span style={{ fontSize: 7, color: T.inkMid }}>✉</span>
            </div>
          )}
          {!postalActive && <span style={{ fontSize: 10, color: "#1a2d40" }}>📪</span>}
        </div>
        {postalActive && <div style={{ position: "absolute", top: `${slotY + slotH + 2}%`, left: 0, right: 0, textAlign: "center", fontSize: 14, color: T.green, animation: "ga-fadeIn 0.2s" }}>{toFmt ? "→" : "←"}</div>}
        {postalActive && sc.postalLabel && (
          <div style={{ position: "absolute", top: `${slotY - 18}%`, left: "-200%", width: 240, background: "#0d2a18", border: `1px solid ${T.green}55`, padding: "4px 8px", fontSize: 9, color: T.green, fontFamily: "var(--font-mono)", animation: "ga-fadeIn 0.3s", whiteSpace: "nowrap", zIndex: 20 }}>{sc.postalLabel}</div>
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
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
          {sc.display.map((l, i) => {
            const isResult = sc.displayResult && (l === "Go" || l === "maya");
            return (
              <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: isResult ? 16 : 10, color: isResult ? "#00ff88" : "#1a5c2a", fontWeight: isResult ? 700 : 400, textShadow: isResult ? "0 0 12px #00ff88" : "none", animation: i === sc.display.length - 1 ? "ga-fadeIn 0.4s" : "none", whiteSpace: "nowrap" }}>{l}</span>
            );
          })}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1a3d20", animation: "ga-blink 1s step-end infinite" }}>█</span>
        </div>
      </div>

      {/* Envelopes */}
      {sc.envs.map((e) => <EnvChip key={e.id} env={e} />)}
      {/* Workers */}
      {sc.workers.map((w) => <WorkerChip key={w.id} w={w} />)}
    </div>
  );
}

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
              <span style={{ color: "#ffaaaa", fontSize: 9, marginLeft: "auto", fontFamily: "var(--font-mono)" }}>rev 1.0</span>
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
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: T.ink, lineHeight: 2 }}>
                        <span onClick={(e) => tog("sealed", e)} style={{ cursor: "pointer", boxShadow: ring("sealed"), padding: "1px 4px", background: isA("sealed") ? T.amber + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          🔒 Seal envelope: <b>favLang</b> ← stick <span style={{ color: "#86efac", background: "#86efac18", padding: "0 3px", border: "1px solid #86efac33" }}>🔤&quot;Go&quot;</span>
                        </span>
                        <span onClick={(e) => tog("open", e)} style={{ cursor: "pointer", boxShadow: ring("open"), padding: "1px 4px", background: isA("open") ? T.blue + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          📨 Fill envelope: <b>name</b> ← stick <span style={{ color: "#86efac", background: "#86efac18", padding: "0 3px", border: "1px solid #86efac33" }}>🔤&quot;maya&quot;</span>
                        </span>
                        <span onClick={(e) => tog("print", e)} style={{ cursor: "pointer", boxShadow: ring("print"), padding: "1px 4px", background: isA("print") ? T.green + "22" : "transparent", transition: "all 0.2s", display: "block" }}>
                          📮 Post to fmt.Println(favLang)
                        </span>
                        <span style={{ display: "block", padding: "1px 4px" }}>
                          📮 Post to fmt.Println(name)
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
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", animation: "intro-in .2s ease forwards" }}>
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
interface GoApplianceProps {
  onHotspotClick?: (id: string) => void;
  clickedIds?: Set<string>;
  view?: "animation" | "card";
}

export function GoAppliance({ onHotspotClick, clickedIds = new Set(), view = "animation" }: GoApplianceProps) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cardActive, setCardActive] = useState<string | null>(null);
  const sc = SCENES[scene];

  // Auto-play
  useEffect(() => {
    if (!playing) return;
    if (scene >= SCENES.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setScene((s) => s + 1), 3500);
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
              {[{ dot: T.amber, l: "Pkg slot" }, { dot: T.green, l: "Postal" }, { dot: T.blue, l: "Addr label" }, { dot: "#00ff88", l: "Display" }, { dot: "#86efac", l: "Sticker" }].map((item) => (
                <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.dot }} />
                  <span style={{ fontSize: 10, color: T.inkFade, fontFamily: "var(--font-mono)" }}>{item.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Narration + code (fixed height, flush with controls) */}
          <div style={{ flexShrink: 0, display: "flex", gap: 12, alignItems: "stretch", height: 300 }}>
            <div style={{ flex: "1 1 300px", border: `1px solid ${T.line}`, overflow: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "6px 12px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
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
            { a: "Package card", c: "package main", col: T.purple },
            { a: "Address label", c: "import", col: T.blue },
            { a: "Envelope", c: "func", col: T.pink },
            { a: "Sealed env.", c: "const", col: T.amber },
            { a: "Open env.", c: "variable", col: T.blue },
            { a: "🔤 Sticker", c: "value/data", col: "#86efac" },
            { a: "Peel & stick", c: ":= / =", col: T.pink },
            { a: "Postal slot", c: "func call", col: T.green },
            { a: "Display", c: "terminal", col: "#00ff88" },
          ]} />
        </div>
      )}
    </div>
  );
}
