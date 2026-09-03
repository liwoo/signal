"use client";

import type { Challenge, ChallengeStep } from "@/types/game";

interface MissionBriefModalProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  totalSteps: number;
  onClose: () => void;
}

/**
 * "This is the mission at hand" — shown when a step's instructions begin, so the
 * player always knows the moment the task (not the story) starts. Amber
 * instruction voice, deliberately distinct from Maya's green narration.
 */
export function MissionBriefModal({
  challenge,
  currentStep,
  currentStepIndex,
  totalSteps,
  onClose,
}: MissionBriefModalProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ background: "rgba(4,8,16,.9)" }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] flex flex-col"
        style={{
          background: "var(--color-panel, #0a0e18)",
          border: "1px solid var(--color-alert)",
          borderLeft: "4px solid var(--color-alert)",
          boxShadow: "0 20px 60px rgba(4,8,16,.8)",
          animation: "intro-in .25s ease forwards",
          maxHeight: "85dvh",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,159,28,.2)", background: "rgba(255,159,28,.06)" }}
        >
          <span
            className="font-[family-name:var(--font-display)] font-bold text-[11px] tracking-[3px]"
            style={{ color: "var(--color-alert)" }}
          >
            ▸ YOUR MISSION
          </span>
          {totalSteps > 1 && (
            <span className="text-[8px] tracking-[2px]" style={{ color: "var(--color-alert)" }}>
              STEP {currentStepIndex + 1} / {totalSteps}
            </span>
          )}
        </div>

        <div className="px-5 py-4 overflow-y-auto min-h-0" style={{ flex: 1 }}>
          <div
            className="font-[family-name:var(--font-display)] text-sm tracking-[1px] mb-3"
            style={{ color: "var(--color-foreground)" }}
          >
            {challenge.title} · {currentStep.title}
          </div>
          <p
            className="text-sm leading-[1.85] whitespace-pre-line"
            style={{ color: "var(--color-foreground)" }}
          >
            {currentStep.brief}
          </p>

          <div
            className="mt-4 text-[10px] leading-[1.6] flex items-center gap-2"
            style={{ color: "var(--color-info)" }}
          >
            <span>❔</span>
            <span>stuck? tap <b>HINT</b> above the code for a nudge, or open <b>NOTES</b> for the concept.</span>
          </div>
        </div>

        <div className="px-5 py-3 flex justify-end" style={{ borderTop: "1px solid rgba(255,159,28,.15)" }}>
          <button
            onClick={onClose}
            autoFocus
            className="bg-transparent text-[10px] tracking-[3px] px-5 py-2.5 cursor-pointer transition-colors font-[family-name:var(--font-display)]"
            style={{ color: "var(--color-alert)", border: "1px solid rgba(255,159,28,.4)" }}
          >
            GOT IT — BEGIN ▸
          </button>
        </div>
      </div>
    </div>
  );
}
