"use client";

import { useState, useEffect, useRef } from "react";

interface RushBarProps {
  seconds: number;
  label: string;
  onExpire: () => void;
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

export function RushBar({ seconds, label, onExpire }: RushBarProps) {
  const [left, setLeft] = useState(seconds);
  const total = useRef(seconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setLeft((p) => {
        if (p <= 1) {
          clearInterval(iv);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Fire onExpire outside the state updater to avoid setState-in-render
  useEffect(() => {
    if (left <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      onExpire();
    }
  }, [left, onExpire]);

  const pct = (left / total.current) * 100;
  const crit = left <= 10;
  const fillColor = crit
    ? "var(--color-danger)"
    : left <= 20
      ? "#ff6a20"
      : "var(--color-alert)";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[800] px-4 py-2.5"
      style={{
        background: crit ? "#3a0a0a" : "#1a0a00",
        borderTop: `1px solid color-mix(in srgb, ${fillColor} 25%, transparent)`,
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <span
          className="text-[8px] tracking-[3px]"
          style={{
            color: fillColor,
            animation: crit ? "blink .4s step-end infinite" : "none",
          }}
        >
          ⚠ {label}
        </span>
        <div
          className="font-[family-name:var(--font-display)] text-xl font-black min-w-[52px] text-right"
          style={{ color: fillColor }}
        >
          {pad(left / 60)}:{pad(left % 60)}
        </div>
      </div>
      <div className="h-1 bg-[#0a0a0a] relative overflow-hidden">
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,0,0,.4) 19px,rgba(0,0,0,.4) 20px)",
          }}
        />
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: fillColor,
            boxShadow: `0 0 10px ${fillColor}`,
          }}
        />
      </div>
    </div>
  );
}
