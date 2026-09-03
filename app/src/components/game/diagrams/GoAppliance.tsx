"use client";

import { useState, useCallback } from "react";
import { MailroomVideo } from "./MailroomVideo";

// ── Design tokens (SIGNAL-adapted) ──
const T = {
  paper: "#1a1e28", paperAlt: "#141822", line: "#2a3040",
  ink: "#e2e8f0", inkMid: "#94a3b8", inkLight: "#64748b", inkFade: "#475569",
  red: "#c0392b", steel: "#0f1623", steelMid: "#1a2236", steelLt: "#2d3f5c",
  green: "#00d4aa", amber: "#f59e0b", blue: "#3b82f6", pink: "#f472b8", purple: "#c084fc",
};


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
  /** Start the walkthrough video immediately on mount. */
  autoPlay?: boolean;
  soundEnabled?: boolean;
}

export function GoAppliance({ onHotspotClick, clickedIds = new Set(), view = "animation", autoPlay = false, soundEnabled = true }: GoApplianceProps) {
  const [cardActive, setCardActive] = useState<string | null>(null);

  const handleCardPartClick = useCallback((id: string) => {
    setCardActive((prev) => (prev === id ? null : id));
    if (!clickedIds.has(id) && onHotspotClick) onHotspotClick(id);
  }, [clickedIds, onHotspotClick]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Animation view — the narrated mailroom video */}
      {view === "animation" && (
        <MailroomVideo autoPlay={autoPlay} soundEnabled={soundEnabled} />
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
