"use client";

import { useState, useEffect } from "react";

interface TwistRevealProps {
  headline: string;
  lines: string[];
  onDone: () => void;
}

export function TwistReveal({ headline, lines, onDone }: TwistRevealProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx < lines.length) {
      const t = setTimeout(() => setLineIdx((i) => i + 1), 900);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
  }, [lineIdx, lines.length]);

  // Allow Enter key to continue once done
  useEffect(() => {
    if (!done) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, onDone]);

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col items-center justify-center animate-twist-in"
      style={{ background: "rgba(4,8,16,.97)" }}
    >
      <div className="max-w-[420px] w-full px-6">
        <div className="text-[var(--color-danger)] text-[10px] tracking-[6px] mb-6 text-center">
          ▸ PLOT DEVELOPMENT
        </div>
        <div
          className="font-[family-name:var(--font-display)] font-black text-[var(--color-alert)] tracking-[4px] mb-8 text-center"
          style={{
            fontSize: "clamp(18px,4vw,32px)",
            textShadow: "0 0 20px rgba(255,159,28,.37)",
          }}
        >
          {headline}
        </div>
        <div className="flex flex-col gap-2.5">
          {/* Every line is laid out from the start (hidden until revealed) so
              the block doesn't grow and push CONTINUE around as lines land. */}
          {lines.map((line, i) => (
            <div
              key={i}
              className={`text-sm leading-[1.7] text-center ${i < lineIdx ? "msg-enter" : "invisible"}`}
              aria-hidden={i < lineIdx ? undefined : true}
              style={{
                color: line.startsWith('"')
                  ? "var(--color-win)"
                  : "var(--color-dim)",
              }}
            >
              {line}
            </div>
          ))}
        </div>
        <div className={`text-center mt-9 ${done ? "" : "invisible"}`}>
            <button
              onClick={onDone}
              disabled={!done}
              className="bg-transparent border border-[var(--color-dim)] text-[var(--color-dim)]
                         px-7 py-2.5 text-[10px] tracking-[4px] font-[family-name:var(--font-display)]
                         hover:border-[var(--color-signal)] hover:text-[var(--color-signal)]
                         transition-colors cursor-pointer"
            >
              CONTINUE ▸ <span style={{ opacity: 0.7, fontSize: "10px" }}>⏎</span>
            </button>
        </div>
      </div>
    </div>
  );
}
