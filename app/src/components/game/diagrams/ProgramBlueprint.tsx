"use client";

import { useState } from "react";

// ── Ch01 Program Blueprint ──
// Interactive schematic of a Go program in SIGNAL's terminal aesthetic.
// Tappable zones reveal explanations. Earns +5 XP per new tap.

interface BlueprintZone {
  id: string;
  label: string;
  code: string;
  tip: string;
  row: number;      // visual row in the blueprint (0-based)
  accent: string;   // CSS var for zone color
}

const ZONES: BlueprintZone[] = [
  {
    id: "package",
    label: "PACKAGE LABEL",
    code: "package main",
    tip: "the label on the outside of the package. it tells go \"this is a runnable program.\" every .go file starts with this.",
    row: 0,
    accent: "var(--color-syn-keyword)",
  },
  {
    id: "import",
    label: "TOOLKIT",
    code: 'import "fmt"',
    tip: "an attachment checklist. before running, the machine grabs tools from the shelf. fmt is the printing toolkit — it lets you show text on screen.",
    row: 1,
    accent: "var(--color-syn-string)",
  },
  {
    id: "func",
    label: "MAIN ENVELOPE",
    code: "func main() {",
    tip: "the big envelope inside the package. the machine opens it and follows every instruction inside, from top to bottom. this is where your code lives.",
    row: 2,
    accent: "var(--color-syn-func)",
  },
  {
    id: "const",
    label: "SEALED ENVELOPE",
    code: 'const favLang = "Go"',
    tip: "a sealed envelope named favLang. once you put \"Go\" inside, it's locked forever. the program won't let you change it.",
    row: 3,
    accent: "var(--color-alert)",
  },
  {
    id: "variable",
    label: "OPEN ENVELOPE",
    code: 'name := "maya"',
    tip: "an open envelope named name. it holds \"maya\" right now, but you could resticker it later with a different value.",
    row: 4,
    accent: "var(--color-info)",
  },
  {
    id: "print1",
    label: "DISPLAY POST",
    code: "fmt.Println(favLang)",
    tip: "drops favLang into the display slot. fmt opens the sealed envelope, reads \"Go\", and shows it on screen.",
    row: 5,
    accent: "var(--color-signal)",
  },
  {
    id: "print2",
    label: "DISPLAY POST",
    code: "fmt.Println(name)",
    tip: "drops name into the display slot. fmt opens the envelope, reads \"maya\", and shows it on screen.",
    row: 6,
    accent: "var(--color-signal)",
  },
  {
    id: "close",
    label: "END",
    code: "}",
    tip: "the closing brace. the machine has finished all instructions in the main envelope. program complete.",
    row: 7,
    accent: "var(--color-dim)",
  },
];

const OUTPUT_LINES = ["Go", "maya"];

interface ProgramBlueprintProps {
  onHotspotClick?: (id: string) => void;
  clickedIds?: Set<string>;
}

export function ProgramBlueprint({ onHotspotClick, clickedIds = new Set() }: ProgramBlueprintProps) {
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const active = ZONES.find((z) => z.id === activeZone);

  const handleClick = (zone: BlueprintZone) => {
    if (activeZone === zone.id) {
      setActiveZone(null);
      return;
    }
    setActiveZone(zone.id);
    if (!clickedIds.has(zone.id) && onHotspotClick) {
      onHotspotClick(zone.id);
    }
  };

  return (
    <div>
      {/* Blueprint container */}
      <div
        style={{
          border: "1px solid rgba(110,255,160,.15)",
          background: "rgba(4,8,16,.6)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(110,255,160,.08)" }}
        >
          <span
            className="text-[7px] tracking-[3px] font-[family-name:var(--font-display)]"
            style={{ color: "var(--color-dim)" }}
          >
            PROGRAM BLUEPRINT
          </span>
          <span
            className="text-[7px] tracking-[2px]"
            style={{ color: "var(--color-dim)" }}
          >
            tap to explore
          </span>
        </div>

        {/* Schematic rows */}
        <div className="px-3 py-2">
          {ZONES.map((zone) => {
            const isActive = activeZone === zone.id;
            const isClicked = clickedIds.has(zone.id);
            const indent = zone.row >= 3 && zone.row <= 6 ? 24 : 0;

            return (
              <button
                key={zone.id}
                onClick={() => handleClick(zone)}
                className="w-full flex items-center gap-3 py-1.5 px-2 cursor-pointer bg-transparent transition-colors"
                style={{
                  marginLeft: indent,
                  width: `calc(100% - ${indent}px)`,
                  border: "none",
                  borderLeft: isActive
                    ? `2px solid ${zone.accent}`
                    : "2px solid transparent",
                  background: isActive
                    ? "rgba(110,255,160,.04)"
                    : "transparent",
                  opacity: isClicked && !isActive ? 0.6 : 1,
                }}
              >
                {/* Line number */}
                <span
                  className="text-[9px] shrink-0 w-4 text-right"
                  style={{
                    color: "var(--color-dim)",
                    fontFamily: "var(--font-mono)",
                    opacity: 0.4,
                  }}
                >
                  {zone.row + 1}
                </span>

                {/* Code */}
                <span
                  className="text-[11px] flex-1 text-left"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: isActive ? zone.accent : "var(--color-foreground)",
                    transition: "color .15s",
                  }}
                >
                  {zone.code}
                </span>

                {/* Label pill */}
                <span
                  className="text-[7px] tracking-[1px] px-1.5 py-px shrink-0 font-[family-name:var(--font-display)]"
                  style={{
                    color: zone.accent,
                    border: `1px solid color-mix(in srgb, ${zone.accent} 30%, transparent)`,
                    background: `color-mix(in srgb, ${zone.accent} 6%, transparent)`,
                    opacity: isActive ? 1 : 0.5,
                    transition: "opacity .15s",
                  }}
                >
                  {zone.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Output preview */}
        <div
          className="mx-3 mb-3 px-3 py-2 flex items-center gap-2"
          style={{
            borderTop: "1px solid rgba(110,255,160,.06)",
            background: "rgba(0,20,8,.4)",
          }}
        >
          <span
            className="text-[7px] tracking-[2px] shrink-0"
            style={{ color: "var(--color-dim)" }}
          >
            OUTPUT
          </span>
          <span className="text-[7px]" style={{ color: "var(--color-dim)", opacity: 0.3 }}>
            |
          </span>
          {OUTPUT_LINES.map((line, i) => (
            <span
              key={i}
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-signal)",
                textShadow: "0 0 8px rgba(110,255,160,.3)",
              }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>

      {/* Explanation panel (shown when a zone is active) */}
      {active && (
        <div
          className="mt-2 px-4 py-3"
          style={{
            border: `1px solid color-mix(in srgb, ${active.accent} 30%, transparent)`,
            borderLeft: `3px solid ${active.accent}`,
            background: `color-mix(in srgb, ${active.accent} 3%, transparent)`,
            animation: "intro-in .2s ease forwards",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[7px] tracking-[3px] font-[family-name:var(--font-display)]"
              style={{ color: active.accent }}
            >
              {active.label}
            </span>
            <span
              className="text-[9px]"
              style={{
                fontFamily: "var(--font-mono)",
                color: active.accent,
                opacity: 0.6,
              }}
            >
              {active.code}
            </span>
          </div>
          <p
            className="text-[12px] leading-[1.8]"
            style={{ color: "var(--color-foreground)" }}
          >
            {active.tip}
          </p>
        </div>
      )}
    </div>
  );
}
