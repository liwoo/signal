"use client";

import type { Challenge, ChallengeStep } from "@/types/game";

interface MissionPanelProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  totalSteps: number;
}

export function MissionPanel({ challenge, currentStep, currentStepIndex, totalSteps }: MissionPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="font-[family-name:var(--font-display)] text-[var(--color-alert)] text-[13px] tracking-[2px] mb-1">
        {challenge.title}
      </div>
      <div className="text-[var(--color-dim)] text-[8px] tracking-[3px] mb-3.5">
        {challenge.concepts.join(" · ")}
      </div>

      {/* Step indicator */}
      {totalSteps > 1 && (
        <div className="flex gap-1.5 mb-3">
          {challenge.steps.map((step, i) => (
            <div
              key={step.id}
              className="flex-1 py-1.5 text-center text-[7px] tracking-[1px]"
              style={{
                border: `1px solid ${
                  i < currentStepIndex
                    ? "rgba(110,255,160,.2)"
                    : i === currentStepIndex
                      ? "rgba(255,159,28,.3)"
                      : "#0a1820"
                }`,
                background:
                  i < currentStepIndex
                    ? "rgba(110,255,160,.03)"
                    : i === currentStepIndex
                      ? "rgba(255,159,28,.03)"
                      : "transparent",
                color:
                  i < currentStepIndex
                    ? "var(--color-signal)"
                    : i === currentStepIndex
                      ? "var(--color-alert)"
                      : "#0a3040",
              }}
            >
              {i < currentStepIndex ? "✓ " : ""}{step.title}
            </div>
          ))}
        </div>
      )}

      {/* Current step brief */}
      <div className="border-l-[3px] border-l-[#2a6a4a] pl-3.5 mb-4">
        <div className="text-[var(--color-alert)] text-[8px] tracking-[2px] mb-1.5">
          STEP {currentStepIndex + 1} · {currentStep.title}
        </div>
        <p className="text-[#3a7a6a] text-xs leading-[1.9] whitespace-pre-line">
          {currentStep.brief}
        </p>
      </div>

      {/* XP + Events */}
      <div className="flex gap-2">
        <div className="flex-1 border border-[#0a2a1a] p-2.5" style={{ background: "rgba(110,255,160,.015)" }}>
          <div className="text-[#0a4a2a] text-[7px] tracking-[3px] mb-1.5">STEP XP</div>
          <div className="font-[family-name:var(--font-display)] text-[var(--color-signal)] text-[22px] font-bold">
            {currentStep.xp.base}
          </div>
          <div className="text-[#1a6a4a] text-[8px] mt-0.5">base xp</div>
          <div className="text-[var(--color-alert)] text-[8px] mt-1">
            +{currentStep.xp.firstTryBonus} first try
          </div>
          {currentStep.rushMode && (
            <div className="text-[var(--color-danger)] text-[8px] mt-0.5">
              +speed bonus (rush)
            </div>
          )}
        </div>
        <div className="flex-1 border border-[#0a1820] p-2.5">
          <div className="text-[#0a3a4a] text-[7px] tracking-[3px] mb-1.5">LEVEL</div>
          <div className="text-[#2a7a9a] text-[9px] mb-1">
            {challenge.timer.timeLimitSeconds}s total
          </div>
          {challenge.timer.gameOverOnExpiry && (
            <div className="text-[var(--color-danger)] text-[8px]">
              ⚠ GAME OVER ON TIMEOUT
            </div>
          )}
          <div className="text-[#1a4a3a] text-[8px] mt-1">
            {totalSteps} steps · {challenge.steps.reduce((sum, s) => sum + s.xp.base, 0)} total XP
          </div>
        </div>
      </div>

      {/* Hints for current step */}
      <div className="mt-4">
        <div className="text-[#0a3a4a] text-[7px] tracking-[3px] mb-2">HINTS (COST ENERGY)</div>
        {currentStep.hints.map((hint) => (
          <div
            key={hint.level}
            className="border border-[#0a1820] border-l-2 border-l-[#1a6a4a] p-2 mb-1.5"
            style={{ background: "var(--color-code-bg)" }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[#1a6a4a] text-[7px] tracking-[2px]">
                HINT {hint.level}
              </span>
              <span className="text-[var(--color-alert)] text-[7px]">
                −{hint.energyCost} ⚡
              </span>
            </div>
            <code className="text-[var(--color-foreground)] text-[10px]">
              {hint.text}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
