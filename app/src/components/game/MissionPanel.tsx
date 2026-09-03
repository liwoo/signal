"use client";

import type { Challenge, ChallengeStep } from "@/types/game";
import type { HintState } from "@/lib/game/hints";
import { hintCostXP } from "@/lib/game/hints";

interface MissionPanelProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  totalSteps: number;
  hints: HintState;
  onRevealHint: () => void;
}

/**
 * The full mission brief. One amber block of instructions, the step path,
 * the reward, and progressive hints — unrevealed hints stay locked so the
 * answer isn't sitting on screen before the player has tried.
 */
export function MissionPanel({ challenge, currentStep, currentStepIndex, totalSteps, hints, onRevealHint }: MissionPanelProps) {
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

      {/* Progressive hints */}
      {currentStep.hints.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-[9px] tracking-[3px]" style={{ color: "var(--color-info)" }}>
              HINTS · {hints.revealed}/{currentStep.hints.length} REVEALED
            </div>
            <div className="text-[8px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
              each hint costs XP · reveal in order
            </div>
          </div>
          <ol className="flex flex-col gap-1.5">
            {currentStep.hints.map((hint, i) => {
              const revealed = i < hints.revealed;
              const isNext = i === hints.revealed;
              return (
                <li
                  key={hint.level}
                  className="p-3"
                  style={{
                    border: `1px solid ${revealed ? "rgba(0,212,255,.3)" : "rgba(184,212,160,.15)"}`,
                    borderLeft: `3px solid ${revealed ? "var(--color-info)" : "rgba(184,212,160,.2)"}`,
                    background: revealed ? "rgba(0,212,255,.04)" : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] tracking-[2px]" style={{ color: revealed ? "var(--color-info)" : "var(--color-dim)" }}>
                      HINT {hint.level}{revealed ? "" : " · LOCKED"}
                    </span>
                    {isNext ? (
                      <button
                        type="button"
                        onClick={onRevealHint}
                        className="btn-secondary bg-transparent cursor-pointer text-[9px] tracking-[2px] px-3 py-1"
                        style={{ color: "var(--color-foreground)", border: "1px solid rgba(184,212,160,.35)" }}
                      >
                        REVEAL · −{hintCostXP(hint)} XP
                      </button>
                    ) : (
                      <span className="text-[8px]" style={{ color: revealed ? "var(--color-dim)" : "rgba(184,212,160,.35)" }}>
                        −{hintCostXP(hint)} XP
                      </span>
                    )}
                  </div>
                  {revealed && (
                    <code className="block mt-2 text-[12px] leading-[1.7] whitespace-pre-wrap" style={{ color: "var(--color-foreground)" }}>
                      {hint.text}
                    </code>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
