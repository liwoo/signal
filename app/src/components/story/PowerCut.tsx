"use client";

import { useState, useEffect, useRef } from "react";

interface PowerCutProps {
  onDone: () => void;
}

// Escalating flicker stages — gets more aggressive over time
const STAGES = [
  { after: 0, animation: "backup-flicker-1", bg: "rgba(255,15,5,.03)" },
  { after: 30, animation: "backup-flicker-2", bg: "rgba(255,15,5,.05)" },
  { after: 60, animation: "backup-flicker-3", bg: "rgba(255,20,5,.07)" },
  { after: 90, animation: "backup-flicker-4", bg: "rgba(255,25,5,.09)" },
] as const;

export function PowerCut({ onDone }: PowerCutProps) {
  const [phase, setPhase] = useState<"flicker" | "backup">("flicker");
  const [stage, setStage] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("backup");
      startRef.current = Date.now();
      onDone();
    }, 1400);
    return () => clearTimeout(t1);
  }, [onDone]);

  // Escalate stage over time
  useEffect(() => {
    if (phase !== "backup") return;
    const iv = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      let next = 0;
      for (let i = STAGES.length - 1; i >= 0; i--) {
        if (elapsed >= STAGES[i].after) { next = i; break; }
      }
      setStage((prev) => (prev !== next ? next : prev));
    }, 2000);
    return () => clearInterval(iv);
  }, [phase]);

  if (phase === "flicker") {
    return (
      <div className="fixed inset-0 z-[9990] bg-[var(--color-background)] screen-flicker pointer-events-none" />
    );
  }

  const s = STAGES[stage];
  return (
    <div
      className="fixed inset-0 z-[9990] pointer-events-none"
      style={{
        background: s.bg,
        animation: `${s.animation} ${3 - stage * 0.4}s ease-in-out infinite`,
      }}
    />
  );
}
