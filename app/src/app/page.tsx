"use client";

import { useState } from "react";

export default function Home() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <IntroScreen onStart={() => setStarted(true)} />;
  }

  return (
    <div className="h-dvh w-full bg-[var(--color-background)] text-[var(--color-foreground)] font-[family-name:var(--font-mono)] flex items-center justify-center">
      <p className="text-[var(--color-signal)] text-sm">SIGNAL ACTIVE — AWAITING INSTRUCTIONS</p>
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-dvh w-full bg-[var(--color-background)] flex flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-4xl md:text-6xl tracking-[0.3em] font-bold">
          SIGNAL
        </h1>
        <p className="text-[var(--color-dim)] text-xs md:text-sm tracking-widest uppercase">
          Learn Go by keeping someone alive
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        <button
          onClick={onStart}
          className="border border-[var(--color-signal)] text-[var(--color-signal)] px-8 py-3 text-sm tracking-widest uppercase
                     hover:bg-[var(--color-signal)] hover:text-[var(--color-background)] transition-colors duration-200
                     font-[family-name:var(--font-display)] cursor-pointer"
        >
          Initialize Connection
        </button>
        <p className="text-[var(--color-border)] text-[10px] tracking-wider">
          v1.0 · ENCRYPTED CHANNEL
        </p>
      </div>
    </div>
  );
}
