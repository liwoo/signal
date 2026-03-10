"use client";

import { useEffect, useState } from "react";

const MAX_HEARTS = 5;

interface BossHUDProps {
  bossName: string;
  bossHP: number;
  maxHP: number;
  hearts: number;
  xp: number;
  level: number;
  turnIndex: number;
  turnTotal: number;
}

export function BossHUD({
  bossName,
  bossHP,
  maxHP,
  hearts,
  xp,
  level,
  turnIndex,
  turnTotal,
}: BossHUDProps) {
  // Animate HP bar
  const [displayHP, setDisplayHP] = useState(bossHP);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayHP(bossHP), 50);
    return () => clearTimeout(timer);
  }, [bossHP]);

  const hpPercent = Math.max(0, (displayHP / maxHP) * 100);
  const hpColor = hpPercent > 60 ? "var(--color-boss-accent, #ff4040)" : hpPercent > 30 ? "var(--color-alert)" : "var(--color-danger)";

  return (
    <div
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{
        background: "rgba(10,4,8,0.75)",
        borderBottom: "1px solid rgba(32,16,16,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Left: Maya status */}
      <div className="flex items-center gap-3">
        <span
          className="text-[9px] tracking-[3px] font-[family-name:var(--font-display)]"
          style={{ color: "var(--color-signal)" }}
        >
          MAYA
        </span>

        {/* Maya HP bar */}
        <div className="flex items-center gap-2">
          <div
            className="relative overflow-hidden"
            style={{
              width: 80,
              height: 8,
              background: "#081a08",
              border: `1px solid ${hearts <= 1 ? "#ff4040" : "#183018"}`,
              transition: "border-color 300ms",
            }}
          >
            <div
              style={{
                width: `${(hearts / MAX_HEARTS) * 100}%`,
                height: "100%",
                background: hearts <= 1 ? "var(--color-danger)" : hearts <= 2 ? "var(--color-alert)" : "var(--color-signal)",
                transition: "width 400ms ease-out, background 400ms",
                boxShadow: hearts <= 1 ? "0 0 6px rgba(255,64,64,.5)" : "0 0 4px rgba(110,255,160,.3)",
              }}
            />
            {/* Segments */}
            {Array.from({ length: MAX_HEARTS - 1 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{
                  left: `${((i + 1) / MAX_HEARTS) * 100}%`,
                  width: 1,
                  background: "rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </div>
          <span
            className="text-[7px] tracking-[1px]"
            style={{ color: hearts <= 1 ? "var(--color-danger)" : hearts <= 2 ? "var(--color-alert)" : "var(--color-signal)" }}
          >
            {hearts}/{MAX_HEARTS}
          </span>
        </div>

        {/* XP / Level */}
        <span className="text-[8px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
          L{level} · {xp.toLocaleString()} XP
        </span>
      </div>

      {/* Right: Boss info */}
      <div className="flex items-center gap-3">
        {/* Boss name */}
        <span
          className="text-[9px] tracking-[3px] font-[family-name:var(--font-display)]"
          style={{ color: "#ff6e6e" }}
        >
          {bossName}
        </span>

        {/* HP bar */}
        <div className="flex items-center gap-2">
          <div
            className="relative overflow-hidden"
            style={{
              width: 120,
              height: 8,
              background: "#1a0808",
              border: "1px solid #301818",
            }}
          >
            <div
              style={{
                width: `${hpPercent}%`,
                height: "100%",
                background: hpColor,
                transition: "width 500ms ease-out",
              }}
            />
            {/* HP segments */}
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{
                  left: `${(i + 1) * 10}%`,
                  width: 1,
                  background: "rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </div>
          <span className="text-[7px] tracking-[1px]" style={{ color: "#ff6e6e" }}>
            {Math.round(hpPercent)}%
          </span>
        </div>

        {/* Turn counter */}
        <span className="text-[7px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
          TURN {Math.min(turnIndex + 1, turnTotal)}/{turnTotal}
        </span>
      </div>
    </div>
  );
}
