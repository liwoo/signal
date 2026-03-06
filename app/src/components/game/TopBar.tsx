"use client";

import type { ReactNode } from "react";

interface TopBarProps {
  xp: number;
  xpMax: number;
  level: number;
  inRush: boolean;
  busy: boolean;
  timerSlot?: ReactNode;
  hearts?: number;
}

export function TopBar({ xp, xpMax, level, inRush, busy, timerSlot, hearts }: TopBarProps) {
  const pct = Math.min((xp / xpMax) * 100, 100);

  return (
    <div
      className="h-10 px-3.5 flex items-center gap-3.5 shrink-0 transition-colors duration-500"
      style={{
        background: "var(--color-panel)",
        borderBottom: `1px solid ${inRush ? "#3a1a0a" : "var(--color-border)"}`,
      }}
    >
      {/* Logo */}
      <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-[11px] tracking-[4px] shrink-0 glow-pulse">
        SIGNAL
      </div>

      {/* XP Bar */}
      <div className="flex items-center gap-2 flex-1">
        <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-[9px] tracking-[2px] shrink-0">
          LV{level}
        </div>
        <div className="flex-1 h-1 border border-[#0a2a1a] overflow-hidden relative" style={{ background: "#061810" }}>
          <div
            className="h-full transition-[width] duration-900"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #2a8a4a, var(--color-signal))",
              boxShadow: "0 0 8px rgba(110,255,160,.5)",
              transitionTimingFunction: "cubic-bezier(.17,.67,.35,1.2)",
            }}
          />
        </div>
        <div className="text-[var(--color-dim)] text-[8px] shrink-0">
          {xp} XP
        </div>
      </div>

      {/* Hearts */}
      {hearts !== undefined && (
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: hearts }).map((_, i) => (
            <span
              key={i}
              className="text-[10px]"
              style={{
                color: "var(--color-danger)",
                textShadow: "0 0 4px rgba(255,64,64,.3)",
              }}
            >
              ♥
            </span>
          ))}
        </div>
      )}

      {/* Level Timer */}
      {timerSlot}

      {/* Status */}
      <span
        className="text-[8px]"
        style={{
          color: inRush ? "var(--color-danger)" : busy ? "var(--color-alert)" : "#2a9a5a",
          animation: inRush ? "blink .5s step-end infinite" : "none",
        }}
      >
        ● {inRush ? "RUSH" : busy ? "TX" : "LIVE"}
      </span>
    </div>
  );
}
