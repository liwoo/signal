"use client";

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
                  border: `1px solid ${done ? "rgba(110,255,160,.3)" : active ? "var(--color-alert)" : "rgba(184,212,160,.15)"}`,
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

      {/* The instructions */}
      <div
        className="mb-5 p-4"
        style={{ borderLeft: "3px solid var(--color-alert)", background: "rgba(255,159,28,.05)" }}
      >
        <div className="text-[9px] font-[family-name:var(--font-display)] font-bold tracking-[2px] mb-2" style={{ color: "var(--color-alert)" }}>
          ▸ OBJECTIVE · {currentStep.title}
        </div>
        <p className="text-[14px] leading-[1.8] whitespace-pre-line" style={{ color: "var(--color-foreground)" }}>
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
