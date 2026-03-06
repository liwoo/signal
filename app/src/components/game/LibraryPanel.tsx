"use client";

import type { LibraryState } from "@/lib/game/library";
import { getLibraryStats } from "@/lib/game/library";

interface LibraryPanelProps {
  library: LibraryState;
}

export function LibraryPanel({ library }: LibraryPanelProps) {
  const stats = getLibraryStats(library);

  if (library.entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-[var(--color-dim)] text-[9px] tracking-[3px] mb-2">
            ▸ ZEN LIBRARY
          </div>
          <div className="text-[#0a3a4a] text-[11px] leading-[1.7]">
            complete steps to collect go idioms
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Stats bar */}
      <div
        className="flex gap-2 mb-3 px-2 py-1.5"
        style={{
          border: "1px solid var(--color-border)",
          background: "rgba(110,255,160,.02)",
        }}
      >
        <Stat label="LEARNED" value={stats.learned} color="var(--color-signal)" />
        <Stat label="MISSED" value={stats.missed} color="var(--color-alert)" />
        <Stat label="ZEN XP" value={`+${stats.earnedXP}`} color="var(--color-win)" />
        {stats.missedXP > 0 && (
          <Stat label="AVAILABLE" value={`+${stats.missedXP}`} color="var(--color-dim)" />
        )}
      </div>

      {/* Entries */}
      <div className="flex flex-col gap-1.5">
        {library.entries.map((entry) => (
          <div
            key={`${entry.stepId}-${entry.id}`}
            className="px-2.5 py-2"
            style={{
              border: `1px solid ${entry.learned ? "rgba(110,255,160,.12)" : "rgba(255,159,28,.12)"}`,
              background: entry.learned ? "rgba(110,255,160,.02)" : "rgba(255,159,28,.02)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[7px] tracking-[1px] px-1 py-0.5"
                style={{
                  color: entry.learned ? "var(--color-signal)" : "var(--color-alert)",
                  border: `1px solid ${entry.learned ? "rgba(110,255,160,.2)" : "rgba(255,159,28,.2)"}`,
                }}
              >
                {entry.learned ? "✓ LEARNED" : "○ MISSED"}
              </span>
              <span className="text-[7px] text-[var(--color-dim)] tracking-[1px]">
                +{entry.bonusXP} XP
              </span>
            </div>
            <div
              className="text-[11px] font-semibold mb-0.5"
              style={{ color: entry.learned ? "var(--color-signal)" : "var(--color-alert)" }}
            >
              {entry.principle}
            </div>
            <div className="text-[10px] leading-[1.6] text-[var(--color-foreground)] opacity-70">
              {entry.learned ? entry.jolt.split("\n")[0] : entry.suggestion}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[7px] tracking-[2px] text-[var(--color-dim)]">{label}</div>
      <div
        className="font-[family-name:var(--font-display)] text-sm font-bold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
