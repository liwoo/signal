"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { QuickCheck as QuickCheckData } from "@/types/game";

interface QuickCheckProps {
  check: QuickCheckData;
  compact?: boolean;
}

const DEFAULT_PROMPT = "stuck? tap the question that's in your head.";

/**
 * The shared body of the "stuck?" helper: a list of the questions a player is
 * likely stuck WITH on this step. Tapping one reveals Maya's answer as a hint.
 * There is no right or wrong option — this is help, not a quiz.
 */
function StuckList({ check, large = false }: { check: QuickCheckData; large?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (index: number) =>
    setOpen((current) => (current === index ? null : index));

  return (
    <div>
      <p
        className={large ? "text-[13px] leading-[1.5]" : "text-[10px] leading-[1.5]"}
        style={{ color: "var(--color-dim)" }}
      >
        {check.prompt ?? DEFAULT_PROMPT}
      </p>
      <div className={large ? "mt-4 grid gap-2.5" : "mt-3 grid gap-1.5"}>
        {check.items.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.question}>
              <button
                type="button"
                onClick={() => toggle(index)}
                className={`flex w-full items-start gap-2 bg-transparent cursor-pointer text-left ${large ? "px-3.5 py-3 text-[15px] leading-[1.45]" : "px-2.5 py-2 text-[11px] leading-[1.4]"}`}
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
                  className={large ? "px-3.5 py-3 text-[15px] leading-[1.6]" : "px-2.5 py-2 text-[11px] leading-[1.55]"}
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

/**
 * The "stuck?" helper as a focused popout. It floats over a blurred backdrop so
 * the hint is the only thing to look at while it's open, and reads larger than
 * the inline chat. Opened from the HINT button; closed by tapping the backdrop,
 * the ✕, Escape — or whenever Maya moves the story on (the caller unmounts it).
 */
export function HintOverlay({ check, onClose }: { check: QuickCheckData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portal to <body> so the overlay escapes the chat column's stacking context —
  // otherwise the code editor's autocomplete popup (and other z-indexed panels)
  // bleed through on top of the hint. z-[900] clears everything else on screen.
  // The overlay only ever renders client-side (it opens from user interaction),
  // but guard document for SSR safety.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="hint-backdrop fixed inset-0 z-[900] flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,10,.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <section
        className="hint-pop flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden"
        style={{
          border: "1px solid color-mix(in srgb, var(--color-info) 60%, transparent)",
          background: "var(--color-panel)",
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Stuck? helper"
      >
        <header
          className="flex shrink-0 items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-info) 24%, transparent)" }}
        >
          <span className="text-[10px] tracking-[3px]" style={{ color: "var(--color-info)" }}>
            MAYA · STUCK? <span style={{ color: "var(--color-dim)" }}>· NO PENALTY</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent cursor-pointer px-2 py-1 text-[12px] leading-none"
            style={{ color: "var(--color-dim)" }}
            aria-label="Close hints"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto p-5">
          <StuckList check={check} large />
        </div>
      </section>
    </div>,
    document.body
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
