"use client";

import { useState } from "react";
import type { QuickCheck as QuickCheckData } from "@/types/game";

interface QuickCheckProps {
  check: QuickCheckData;
  compact?: boolean;
}

interface QuickCheckModalProps {
  check: QuickCheckData;
  onClose: () => void;
}

interface ChatQuickCheckProps {
  check: QuickCheckData;
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

/**
 * A retrieval prompt that lives in Maya's chat. It is used after a short pause
 * in the editor, so the next useful action is always an answer the player can
 * tap rather than a modal they need to dismiss.
 */
export function ChatQuickCheck({ check }: ChatQuickCheckProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === check.correctIndex;

  const select = (index: number) => {
    if (answered) return;
    setSelected(index);
  };

  return (
    <section
      className="msg-enter mt-1 border-l-[3px]"
      style={{ borderColor: "var(--color-info)", background: "color-mix(in srgb, var(--color-info) 6%, transparent)" }}
      aria-label="Quick knowledge check"
    >
      <header className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-info) 24%, transparent)" }}>
        <span className="text-[8px] tracking-[2.5px]" style={{ color: "var(--color-info)" }}>MAYA · QUICK CHECK</span>
        <span className="text-[7px] tracking-[1.5px]" style={{ color: "var(--color-dim)" }}>NO PENALTY</span>
      </header>
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
                onClick={() => select(index)}
                disabled={answered}
                className="bg-transparent cursor-pointer px-2.5 py-2 text-left text-[11px] leading-[1.4] disabled:cursor-default"
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
  );
}

/**
 * A contextual retrieval check for a player who has stalled on this exact step.
 * It is deliberately separate from Maya's chat and has no gameplay penalty.
 */
export function QuickCheckModal({ check, onClose }: QuickCheckModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const correct = selected === check.correctIndex;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center p-5"
      style={{ background: "rgba(4,8,16,.88)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick knowledge check"
    >
      <section
        className="w-full max-w-[460px]"
        style={{ border: "1px solid color-mix(in srgb, var(--color-info) 52%, transparent)", background: "var(--color-panel)" }}
      >
        <header className="px-5 py-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-info) 24%, transparent)" }}>
          <div className="text-[9px] tracking-[3px]" style={{ color: "var(--color-info)" }}>QUICK CHECK · NO PENALTY</div>
          <p className="mt-1 text-[11px] leading-[1.5]" style={{ color: "var(--color-dim)" }}>A short reset before you return to this step.</p>
        </header>
        <div className="p-5">
          <p className="text-[14px] leading-[1.65]" style={{ color: "var(--color-foreground)" }}>{check.question}</p>
          <div className="mt-4 grid gap-2">
            {check.options.map((option, index) => {
              const isSelected = selected === index;
              const showCorrect = answered && index === check.correctIndex;
              const showWrong = answered && isSelected && !correct;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelected(index)}
                  className="bg-transparent cursor-pointer px-3 py-2.5 text-left text-[12px] leading-[1.45]"
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
            <p className="mt-4 text-[12px] leading-[1.6]" style={{ color: correct ? "var(--color-signal)" : "var(--color-info)" }}>
              {correct ? "right. " : "not quite. "}{check.explanation}
            </p>
          ) : null}
        </div>
        <footer className="flex justify-end px-5 py-3" style={{ borderTop: "1px solid color-mix(in srgb, var(--color-info) 18%, transparent)" }}>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent cursor-pointer px-4 py-2 text-[9px] tracking-[2px]"
            style={{ color: "var(--color-info)", border: "1px solid color-mix(in srgb, var(--color-info) 45%, transparent)" }}
          >
            {answered ? "RETURN TO CODE" : "SKIP FOR NOW"}
          </button>
        </footer>
      </section>
    </div>
  );
}
