"use client";

import { useState } from "react";
import type { QuickCheck as QuickCheckData } from "@/types/game";

interface QuickCheckProps {
  check: QuickCheckData;
  compact?: boolean;
}

interface ChatQuickCheckProps {
  check: QuickCheckData;
}

const DEFAULT_PROMPT = "stuck? tap the question that's in your head.";

/**
 * The shared body of the "stuck?" helper: a list of the questions a player is
 * likely stuck WITH on this step. Tapping one reveals Maya's answer as a hint.
 * There is no right or wrong option — this is help, not a quiz.
 */
function StuckList({ check }: { check: QuickCheckData }) {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (index: number) =>
    setOpen((current) => (current === index ? null : index));

  return (
    <div>
      <p className="text-[10px] leading-[1.5]" style={{ color: "var(--color-dim)" }}>
        {check.prompt ?? DEFAULT_PROMPT}
      </p>
      <div className="mt-3 grid gap-1.5">
        {check.items.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.question}>
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-start gap-2 bg-transparent cursor-pointer px-2.5 py-2 text-left text-[11px] leading-[1.4]"
                style={{
                  border: `1px solid ${isOpen ? "color-mix(in srgb, var(--color-info) 55%, transparent)" : "color-mix(in srgb, var(--color-foreground) 25%, transparent)"}`,
                  color: isOpen ? "var(--color-info)" : "var(--color-foreground)",
                  background: isOpen ? "color-mix(in srgb, var(--color-info) 8%, transparent)" : "transparent",
                }}
                aria-expanded={isOpen}
              >
                <span className="shrink-0" style={{ color: "var(--color-info)" }}>{isOpen ? "−" : "?"}</span>
                <span>{item.question}</span>
              </button>
              {isOpen ? (
                <p
                  className="px-2.5 py-2 text-[11px] leading-[1.55]"
                  style={{
                    color: "var(--color-foreground)",
                    borderLeft: "1px solid color-mix(in srgb, var(--color-info) 40%, transparent)",
                    background: "color-mix(in srgb, var(--color-info) 4%, transparent)",
                  }}
                >
                  {item.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A no-penalty "stuck?" helper: it answers the questions a player is stuck WITH. */
export function QuickCheck({ check, compact = false }: QuickCheckProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={compact ? "relative shrink-0" : "relative shrink-0 self-center"}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="bg-transparent cursor-pointer px-2 py-1 text-[8px] tracking-[1.5px]"
        style={{
          color: "var(--color-info)",
          border: "1px solid color-mix(in srgb, var(--color-info) 45%, transparent)",
          background: open ? "color-mix(in srgb, var(--color-info) 8%, transparent)" : "transparent",
        }}
        aria-expanded={open}
      >
        STUCK?
      </button>

      {open ? (
        <section
          className="absolute right-0 z-30 mt-2"
          style={{
            width: "min(320px, calc(100vw - 24px))",
            border: "1px solid color-mix(in srgb, var(--color-info) 45%, transparent)",
            background: "var(--color-panel)",
          }}
          aria-label="Stuck? helper"
        >
          <div className="px-3 py-2 text-[8px] tracking-[2px]" style={{ color: "var(--color-info)", borderBottom: "1px solid color-mix(in srgb, var(--color-info) 22%, transparent)" }}>
            MAYA · STUCK? · NO PENALTY
          </div>
          <div className="p-3">
            <StuckList check={check} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * The "stuck?" helper as it lives in Maya's chat. It appears after a short pause
 * in the editor, offering the questions the player might be stuck on so the next
 * useful action is always tapping a question rather than dismissing a modal.
 */
export function ChatQuickCheck({ check }: ChatQuickCheckProps) {
  return (
    <section
      className="msg-enter mt-1 border-l-[3px]"
      style={{ borderColor: "var(--color-info)", background: "color-mix(in srgb, var(--color-info) 6%, transparent)" }}
      aria-label="Stuck? helper"
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-info) 24%, transparent)" }}>
        <span className="text-[8px] tracking-[2.5px]" style={{ color: "var(--color-info)" }}>MAYA · STUCK?</span>
        <span className="text-[7px] tracking-[1.5px]" style={{ color: "var(--color-dim)" }}>NO PENALTY</span>
      </header>
      <div className="p-3">
        <StuckList check={check} />
      </div>
    </section>
  );
}
