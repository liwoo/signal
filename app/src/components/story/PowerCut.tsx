"use client";

import { useState, useEffect } from "react";

interface PowerCutProps {
  onDone: () => void;
}

export function PowerCut({ onDone }: PowerCutProps) {
  const [phase, setPhase] = useState<"flicker" | "dark" | "restore">("flicker");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dark"), 1200);
    const t2 = setTimeout(() => setPhase("restore"), 3200);
    const t3 = setTimeout(() => onDone(), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  if (phase === "flicker") {
    return (
      <div className="fixed inset-0 z-[9990] bg-[var(--color-background)] screen-flicker pointer-events-none" />
    );
  }

  if (phase === "dark") {
    return (
      <div className="fixed inset-0 z-[9990] flex items-center justify-center flex-col gap-3"
        style={{ background: "#010204" }}
      >
        <div className="font-[family-name:var(--font-display)] text-[11px] tracking-[6px]"
          style={{ color: "#1a0a0a" }}
        >
          POWER FAILURE
        </div>
        <div className="text-[9px] tracking-[3px]" style={{ color: "#2a0808" }}>
          SWITCHING TO BACKUP
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9990] pointer-events-none"
      style={{
        animation: "red-flood 1s ease forwards",
        background: "rgba(255,30,10,.06)",
      }}
    />
  );
}
