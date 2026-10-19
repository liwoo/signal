"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Challenge, ChallengeStep } from "@/types/game";

interface MissionPanelProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * The full mission brief. One amber block of instructions, the step path, and
 * the reward. Hints live behind the HINT button in Maya's chat, not here.
 */
export function MissionPanel({ challenge, currentStep, currentStepIndex, totalSteps }: MissionPanelProps) {
  const totalXP = challenge.steps.reduce((sum, s) => sum + s.xp.base, 0);

  return (
    <div className="flex-1 overflow-y-auto p-5 max-w-[760px]">
      {/* Title row */}
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[var(--color-alert)] text-[15px] tracking-[3px]">
            {challenge.title}
          </div>
          <div className="text-[9px] tracking-[2px] mt-1" style={{ color: "var(--color-dim)" }}>
            {challenge.location} · {challenge.timer.timeLimitSeconds}s
            {challenge.timer.gameOverOnExpiry ? " · capture on timeout" : ""} · {totalXP} XP total
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-[22px] font-bold leading-none">
            +{currentStep.xp.base}
          </div>
          <div className="text-[8px] tracking-[2px] mt-1" style={{ color: "var(--color-dim)" }}>
            XP · +{currentStep.xp.firstTryBonus} FIRST TRY
          </div>
        </div>
      </div>

      {/* Step path */}
      {totalSteps > 1 && (
        <ol className="flex gap-1.5 mb-4">
          {challenge.steps.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <li
                key={step.id}
                className="flex-1 py-1.5 px-2 text-[8px] tracking-[2px] flex items-center gap-2"
                style={{
                  border: `1px solid ${done ? "rgba(var(--signal-rgb),.3)" : active ? "var(--color-alert)" : "rgba(184,212,160,.15)"}`,
                  background: active ? "rgba(255,159,28,.06)" : "transparent",
                  color: done ? "var(--color-signal)" : active ? "var(--color-alert)" : "var(--color-dim)",
                }}
              >
                <span className="font-[family-name:var(--font-display)]">{done ? "✓" : i + 1}</span>
                <span className="truncate">{step.title}</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Why this matters — plain language, no code. The point before the task. */}
      {currentStep.stake ? (
        <div
          className="mb-3 p-4"
          style={{ borderLeft: "3px solid var(--color-signal)", background: "rgba(var(--signal-rgb),.05)" }}
        >
          <div className="text-[9px] font-[family-name:var(--font-display)] font-bold tracking-[2px] mb-2" style={{ color: "var(--color-signal)" }}>
            ▸ WHY
          </div>
          <p className="text-[14px] leading-[1.6]" style={{ color: "var(--color-foreground)" }}>
            {currentStep.stake}
          </p>
        </div>
      ) : null}

      {/* Do this — the concrete action. */}
      <div
        className="mb-5 p-4"
        style={{ borderLeft: "3px solid var(--color-alert)", background: "rgba(255,159,28,.05)" }}
      >
        <div className="text-[9px] font-[family-name:var(--font-display)] font-bold tracking-[2px] mb-2" style={{ color: "var(--color-alert)" }}>
          ▸ {currentStep.stake ? "DO THIS" : "OBJECTIVE"} · {currentStep.title}
        </div>
        <p className="text-[14px] leading-[1.6] whitespace-pre-line" style={{ color: "var(--color-foreground)" }}>
          {currentStep.brief}
        </p>
      </div>

      {currentStep.quickCheck ? (
        <div className="mb-5 flex items-center gap-2 px-4 py-3" style={{ border: "1px solid color-mix(in srgb, var(--color-info) 30%, transparent)", background: "color-mix(in srgb, var(--color-info) 4%, transparent)" }}>
          <span className="text-[10px] leading-[1.5]" style={{ color: "var(--color-info)" }}>
            stuck? tap the <span style={{ color: "var(--color-info)", fontWeight: 700 }}>? HINT</span> button in maya&apos;s chat — she&apos;ll answer the question you&apos;re stuck on, no penalty.
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The full brief as a focused popout over a blurred backdrop — opened from
 * "SEE LEVEL OBJECTIVES" so the editor never gets replaced. Closed by the ✕,
 * Escape, or a backdrop tap. The caller unmounts it on step change so it never
 * lingers. Mirrors the HintOverlay pattern (QuickCheck.tsx).
 */
export function LevelObjectivesOverlay({
  challenge,
  currentStep,
  currentStepIndex,
  totalSteps,
  onClose,
}: MissionPanelProps & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="hint-backdrop fixed inset-0 z-[900] flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,10,.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <section
        className="hint-pop flex max-h-[86vh] w-full max-w-[780px] flex-col overflow-hidden"
        style={{ border: "1px solid rgba(255,159,28,.5)", background: "var(--color-panel)" }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Level objectives"
      >
        <header
          className="flex shrink-0 items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,159,28,.24)" }}
        >
          <span className="font-[family-name:var(--font-display)] text-[11px] tracking-[3px]" style={{ color: "var(--color-alert)" }}>
            LEVEL OBJECTIVES
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent cursor-pointer px-2 py-1 text-[12px] leading-none"
            style={{ color: "var(--color-dim)" }}
            aria-label="Close objectives"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MissionPanel
            challenge={challenge}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
