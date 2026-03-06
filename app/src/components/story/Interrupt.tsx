"use client";

import { useEffect } from "react";

interface InterruptProps {
  who: string;
  text: string;
  onDone: () => void;
}

export function Interrupt({ who, text, onDone }: InterruptProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 5500);
    return () => clearTimeout(t);
  }, [onDone]);

  const isSystem = who === "SYSTEM" || who === "SYS";
  const borderColor = isSystem
    ? "var(--color-danger)"
    : "var(--color-signal)";

  return (
    <div
      className="fixed top-[60px] right-4 z-[900] w-[280px] p-3 backdrop-blur-sm animate-interrupt"
      style={{
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        background: isSystem ? "rgba(255,30,10,.12)" : "rgba(6,20,10,.96)",
      }}
    >
      <div
        className="text-[8px] tracking-[3px] mb-1.5"
        style={{ color: borderColor }}
      >
        ▸ INCOMING · {who}
      </div>
      <div
        className="text-[11px] leading-[1.7] whitespace-pre-wrap"
        style={{ color: isSystem ? "#ff9a9a" : "#a0ffb8" }}
      >
        {text}
      </div>
    </div>
  );
}
