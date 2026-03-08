"use client";

import { useState, useEffect, useRef } from "react";

interface LevelTimerProps {
  startTimeMs: number;
  timeLimitSeconds: number;
  bonusSeconds: number;
  gameOverOnExpiry: boolean;
  onExpire: () => void;
  stopped: boolean;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

export function LevelTimer({
  startTimeMs,
  timeLimitSeconds,
  bonusSeconds,
  gameOverOnExpiry,
  onExpire,
  stopped,
}: LevelTimerProps) {
  const [remaining, setRemaining] = useState(timeLimitSeconds + bonusSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (stopped) return;

    const iv = setInterval(() => {
      const elapsed = (Date.now() - startTimeMs) / 1000;
      const left = Math.max(0, timeLimitSeconds + bonusSeconds - elapsed);
      setRemaining(left);

      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(iv);
        onExpire();
      }
    }, 250);

    return () => clearInterval(iv);
  }, [startTimeMs, timeLimitSeconds, bonusSeconds, stopped, onExpire]);

  const pct = remaining / (timeLimitSeconds + bonusSeconds);
  const crit = remaining <= 15;
  const warn = remaining <= 30;

  const color = crit
    ? "var(--color-danger)"
    : warn
      ? "var(--color-alert)"
      : "var(--color-signal)";

  const glow = crit
    ? "0 0 12px rgba(255,64,64,.7), 0 0 30px rgba(255,64,64,.3)"
    : warn
      ? "0 0 10px rgba(255,159,28,.5), 0 0 24px rgba(255,159,28,.2)"
      : "0 0 8px rgba(110,255,160,.4), 0 0 20px rgba(110,255,160,.15)";

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <div className="flex items-center gap-1.5">
      {gameOverOnExpiry && (
        <span
          className="text-[7px] tracking-[1px]"
          style={{
            color: crit ? "var(--color-danger)" : "#0a3040",
            animation: crit ? "blink .5s step-end infinite" : "none",
          }}
        >
          {crit ? "CRITICAL" : "LIVE"}
        </span>
      )}
      <span
        className="font-[family-name:var(--font-display)] text-[13px] font-black tabular-nums min-w-[42px] text-right"
        style={{
          color,
          textShadow: glow,
          animation: crit ? "blink .5s step-end infinite" : "none",
        }}
      >
        {pad(mins)}:{pad(secs)}
      </span>
      {/* Tiny bar */}
      <div
        className="w-14 h-[4px] relative overflow-hidden"
        style={{ background: "rgba(255,255,255,.05)" }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-250 ease-linear"
          style={{
            width: `${pct * 100}%`,
            background: color,
            boxShadow: glow,
          }}
        />
      </div>
    </div>
  );
}
