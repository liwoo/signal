"use client";

import { useState } from "react";
import type { LibraryState } from "@/lib/game/library";
import { getLibraryStats } from "@/lib/game/library";
import { LibraryPanel } from "@/components/game/LibraryPanel";

type WinTab = "library" | "missions" | "map" | "store";

interface WinModalProps {
  xp: number;
  level: number;
  library: LibraryState;
  onRetry: () => void;
  onContinue: () => void;
}

const TABS: Array<[WinTab, string]> = [
  ["library", "LIBRARY"],
  ["missions", "MISSIONS"],
  ["map", "GAME MAP"],
  ["store", "STORE"],
];

export function WinModal({ xp, level, library, onRetry, onContinue }: WinModalProps) {
  const [tab, setTab] = useState<WinTab>("library");
  const stats = getLibraryStats(library);

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "var(--color-background)" }}
    >
      {/* Header */}
      <div className="shrink-0 text-center pt-8 pb-4">
        <div
          className="font-[family-name:var(--font-display)] font-black text-[var(--color-signal)] tracking-[6px] mb-1.5 glow-pulse"
          style={{ fontSize: "clamp(24px, 5vw, 40px)" }}
        >
          CHAPTER 1 COMPLETE
        </div>
        <div className="text-[#1a8a4a] text-[9px] tracking-[5px] mb-4">
          HANDSHAKE ESTABLISHED
        </div>

        {/* XP Summary */}
        <div className="flex justify-center gap-3 mb-2">
          <div
            className="border px-5 py-2.5 text-center"
            style={{
              borderColor: "rgba(110,255,160,.2)",
              background: "rgba(110,255,160,.02)",
            }}
          >
            <div className="text-[7px] tracking-[3px] text-[var(--color-dim)]">TOTAL XP</div>
            <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-2xl font-black">
              {xp}
            </div>
          </div>
          <div
            className="border px-5 py-2.5 text-center"
            style={{
              borderColor: "rgba(110,255,160,.2)",
              background: "rgba(110,255,160,.02)",
            }}
          >
            <div className="text-[7px] tracking-[3px] text-[var(--color-dim)]">LEVEL</div>
            <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-2xl font-black">
              {level}
            </div>
          </div>
          <div
            className="border px-5 py-2.5 text-center"
            style={{
              borderColor: stats.missed > 0 ? "rgba(255,159,28,.2)" : "rgba(110,255,160,.2)",
              background: stats.missed > 0 ? "rgba(255,159,28,.02)" : "rgba(110,255,160,.02)",
            }}
          >
            <div className="text-[7px] tracking-[3px] text-[var(--color-dim)]">ZEN</div>
            <div
              className="font-[family-name:var(--font-display)] text-2xl font-black"
              style={{ color: stats.missed > 0 ? "var(--color-alert)" : "var(--color-signal)" }}
            >
              {stats.learned}/{stats.total}
            </div>
          </div>
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
            onClick={() => setTab(t)}
            className="bg-transparent text-[8px] tracking-[2px] px-4 py-2 cursor-pointer transition-colors"
            style={{
              color: tab === t ? "var(--color-signal)" : "var(--color-dim)",
              borderBottom: tab === t ? "2px solid var(--color-signal)" : "2px solid transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "library" && <LibraryPanel library={library} />}
        {tab === "missions" && <PlaceholderTab label="MISSIONS" description="challenge log coming soon" />}
        {tab === "map" && <PlaceholderTab label="GAME MAP" description="act progression coming soon" />}
        {tab === "store" && <PlaceholderTab label="STORE" description="hearts, skins, and upgrades coming soon" />}
      </div>

      {/* Action buttons */}
      <div
        className="shrink-0 flex gap-2 p-4 justify-center"
        style={{
          borderTop: "1px solid var(--color-border)",
          background: "#04090f",
        }}
      >
        <button
          onClick={onRetry}
          className="bg-transparent text-[9px] tracking-[2px] px-5 py-2.5 cursor-pointer transition-colors"
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
          className="bg-transparent text-[9px] tracking-[2px] px-5 py-2.5 cursor-pointer transition-colors font-[family-name:var(--font-display)]"
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

      {/* Story teaser */}
      <div className="shrink-0 text-center pb-6 px-6">
        <div className="text-[var(--color-win)] text-[10px] leading-[1.8] max-w-[380px] mx-auto">
          guards were talking about an encryption thesis.
          <br />
          <span className="text-[#4a8a6a] text-[9px]">
            maya wasn&apos;t taken at random — they want her research.
          </span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-[var(--color-dim)] text-[9px] tracking-[3px] mb-2">
          ▸ {label}
        </div>
        <div className="text-[#0a3a4a] text-[11px]">{description}</div>
      </div>
    </div>
  );
}
