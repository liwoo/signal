"use client";

import { useEffect } from "react";

interface StreakLabelProps {
  text: string;
  onDone: () => void;
}

const STREAK_COLORS: Record<string, string> = {
  "FIRST TRY!": "var(--color-win)",
  "SPEED RUN!": "var(--color-info)",
  "LEVEL UP!": "var(--color-alert)",
  "CHAPTER CLEAR!": "var(--color-signal)",
};

export function StreakLabel({ text, onDone }: StreakLabelProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1100);
    return () => clearTimeout(t);
  }, [onDone]);

  const color = STREAK_COLORS[text] ?? "var(--color-signal)";

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9998]">
      <div
        className="font-[family-name:var(--font-display)] font-black tracking-[8px] animate-streak"
        style={{
          fontSize: "clamp(22px,4.5vw,44px)",
          color,
          textShadow: `0 0 30px ${color}, 0 0 70px color-mix(in srgb, ${color} 37%, transparent)`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
