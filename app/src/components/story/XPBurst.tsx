"use client";

import { useEffect } from "react";

interface XPBurstProps {
  amount: number;
  onDone: () => void;
}

export function XPBurst({ amount, onDone }: XPBurstProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed left-1/2 top-[45%] pointer-events-none z-[9999]
                 font-[family-name:var(--font-display)] text-[32px] font-black
                 text-[var(--color-signal)] xp-burst -translate-x-1/2"
      style={{
        textShadow: "0 0 20px #6effa0, 0 0 60px rgba(110,255,160,.5)",
      }}
    >
      +{amount} XP
    </div>
  );
}
