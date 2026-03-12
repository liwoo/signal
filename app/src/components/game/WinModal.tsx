"use client";

import { useState } from "react";
import type { LibraryState } from "@/lib/game/library";
import { getLibraryStats } from "@/lib/game/library";
import { LibraryPanel } from "@/components/game/LibraryPanel";
import { GameMap } from "@/components/game/GameMap";
import { trackWinModalTab } from "@/lib/analytics";

type WinTab = "library" | "missions" | "map" | "store";

interface WinModalProps {
  xp: number;
  level: number;
  library: LibraryState;
  /** ID of the chapter just completed (e.g. "chapter-01") */
  completedChapter?: string;
  /** e.g. "CHAPTER 2 COMPLETE" */
  title: string;
  /** e.g. "KEYPAD CRACKED" */
  subtitle: string;
  onRetry: () => void;
  onContinue: () => void;
}

const TABS: Array<[WinTab, string]> = [
  ["library", "LIBRARY"],
  ["missions", "MISSIONS"],
  ["map", "GAME MAP"],
  ["store", "STORE"],
];

export function WinModal({ xp, level, library, completedChapter, title, subtitle, onRetry, onContinue }: WinModalProps) {
  const [tab, setTab] = useState<WinTab>("library");
  const stats = getLibraryStats(library);

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center"
      style={{ background: "rgba(2,4,6,.92)" }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,80,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,80,.02) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Modal card */}
      <div
        className="relative flex flex-col"
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "min(620px, 88vh)",
          border: "1px solid rgba(110,255,160,.12)",
          background: "var(--color-background)",
        }}
      >
        {/* Header */}
        <div className="shrink-0 text-center pt-5 pb-3 px-4">
          <div
            className="font-[family-name:var(--font-display)] font-black text-[var(--color-signal)] tracking-[6px] mb-1 glow-pulse"
            style={{ fontSize: "clamp(18px, 4vw, 28px)" }}
          >
            {title}
          </div>
          <div className="text-[#1a8a4a] text-[8px] tracking-[4px] mb-3">
            {subtitle}
          </div>

          {/* XP Summary — compact row */}
          <div className="flex justify-center gap-2">
            <StatBox label="TOTAL XP" value={xp} />
            <StatBox label="LEVEL" value={level} />
            <StatBox
              label="ZEN"
              value={`${stats.learned}/${stats.total}`}
              warn={stats.missed > 0}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          className="shrink-0 flex"
          style={{
            borderBottom: "1px solid #0a1820",
            background: "#04090f",
          }}
        >
          {TABS.map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); trackWinModalTab(t); }}
              className="bg-transparent text-[7px] tracking-[2px] px-3 py-1.5 cursor-pointer transition-colors"
              style={{
                color: tab === t ? "var(--color-signal)" : "var(--color-dim)",
                borderBottom: tab === t ? "2px solid var(--color-signal)" : "2px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "library" && <LibraryPanel library={library} />}
          {tab === "missions" && <PlaceholderTab label="MISSIONS" description="challenge log coming soon" />}
          {tab === "map" && <GameMap completedUpTo={completedChapter ?? "chapter-01"} />}
          {tab === "store" && <PlaceholderTab label="STORE" description="hearts, skins, and upgrades coming soon" />}
        </div>

        {/* Story teaser */}
        <div
          className="shrink-0 px-4 py-2 text-center"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="text-[var(--color-win)] text-[9px] leading-[1.7]">
            guards were talking about an encryption thesis.
          </div>
          <div className="text-[#4a8a6a] text-[8px]">
            maya wasn&apos;t taken at random — they want her research.
          </div>
        </div>

        {/* Action buttons — always visible */}
        <div
          className="shrink-0 flex gap-2 px-4 py-3 justify-center"
          style={{
            borderTop: "1px solid var(--color-border)",
            background: "#04090f",
          }}
        >
          <button
            onClick={onRetry}
            className="bg-transparent text-[8px] tracking-[2px] px-4 py-2 cursor-pointer transition-colors"
            style={{
              border: "1px solid rgba(122,184,216,.2)",
              color: "var(--color-player)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-player)";
              e.currentTarget.style.background = "rgba(122,184,216,.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(122,184,216,.2)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            RETRY CHAPTER
          </button>
          <button
            onClick={onContinue}
            className="bg-transparent text-[8px] tracking-[2px] px-4 py-2 cursor-pointer transition-colors font-[family-name:var(--font-display)]"
            style={{
              border: "2px solid var(--color-signal)",
              color: "var(--color-signal)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-signal)";
              e.currentTarget.style.color = "var(--color-background)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-signal)";
            }}
          >
            NEXT CHAPTER ▸
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div
      className="border px-3 py-1.5 text-center"
      style={{
        borderColor: warn ? "rgba(255,159,28,.2)" : "rgba(110,255,160,.15)",
        background: warn ? "rgba(255,159,28,.02)" : "rgba(110,255,160,.02)",
      }}
    >
      <div className="text-[6px] tracking-[2px] text-[var(--color-dim)]">{label}</div>
      <div
        className="font-[family-name:var(--font-display)] text-lg font-black"
        style={{ color: warn ? "var(--color-alert)" : "var(--color-signal)" }}
      >
        {value}
      </div>
    </div>
  );
}

function PlaceholderTab({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-[var(--color-dim)] text-[8px] tracking-[3px] mb-1.5">
          ▸ {label}
        </div>
        <div className="text-[#0a3a4a] text-[10px]">{description}</div>
      </div>
    </div>
  );
}
