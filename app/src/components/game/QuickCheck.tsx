"use client";

import { useState } from "react";
import type { QuickCheck as QuickCheckData } from "@/types/game";

interface QuickCheckProps {
  check: QuickCheckData;
  compact?: boolean;
}

/** A no-penalty retrieval prompt: it reinforces syntax without interrupting play. */
export function QuickCheck({ check, compact = false }: QuickCheckProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === check.correctIndex;

  return (
    <div className={compact ? "relative shrink-0" : "relative shrink-0 self-center"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="bg-transparent cursor-pointer px-2 py-1 text-[8px] tracking-[1.5px]"
        style={{
          color: answered && correct ? "var(--color-signal)" : "var(--color-info)",
          border: `1px solid ${answered && correct ? "color-mix(in srgb, var(--color-signal) 50%, transparent)" : "color-mix(in srgb, var(--color-info) 45%, transparent)"}`,
          background: open ? "color-mix(in srgb, var(--color-info) 8%, transparent)" : "transparent",
        }}
        aria-expanded={open}
      >
        {answered && correct ? "✓ CHECK" : "? QUICK CHECK"}
      </button>

      {open ? (
        <section
          className="absolute right-0 z-30 mt-2"
          style={{
            width: "min(320px, calc(100vw - 24px))",
            border: "1px solid color-mix(in srgb, var(--color-info) 45%, transparent)",
            background: "var(--color-panel)",
          }}
          aria-label="Quick knowledge check"
        >
          <div className="px-3 py-2 text-[8px] tracking-[2px]" style={{ color: "var(--color-info)", borderBottom: "1px solid color-mix(in srgb, var(--color-info) 22%, transparent)" }}>
            QUICK CHECK · NO PENALTY
          </div>
          <div className="p-3">
            <p className="text-[12px] leading-[1.55]" style={{ color: "var(--color-foreground)" }}>{check.question}</p>
            <div className="mt-3 grid gap-1.5">
              {check.options.map((option, index) => {
                const isSelected = selected === index;
                const showCorrect = answered && index === check.correctIndex;
                const showWrong = answered && isSelected && !correct;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelected(index)}
                    className="bg-transparent cursor-pointer px-2.5 py-2 text-left text-[11px] leading-[1.4]"
                    style={{
                      border: `1px solid ${showCorrect ? "var(--color-signal)" : showWrong ? "var(--color-danger)" : "color-mix(in srgb, var(--color-foreground) 25%, transparent)"}`,
                      color: showCorrect ? "var(--color-signal)" : showWrong ? "var(--color-danger)" : "var(--color-foreground)",
                      background: showCorrect ? "color-mix(in srgb, var(--color-signal) 6%, transparent)" : showWrong ? "color-mix(in srgb, var(--color-danger) 5%, transparent)" : "transparent",
                    }}
                  >
                    {String.fromCharCode(65 + index)} · {option}
                  </button>
                );
              })}
            </div>
            {answered ? (
              <p className="mt-3 text-[11px] leading-[1.55]" style={{ color: correct ? "var(--color-signal)" : "var(--color-info)" }}>
                {correct ? "right. " : "not quite. "}{check.explanation}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
