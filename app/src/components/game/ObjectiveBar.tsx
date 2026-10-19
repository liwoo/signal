"use client";

import type { Challenge, ChallengeStep, JeopardyEvent } from "@/types/game";

interface ObjectiveBarProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  jeopardy: JeopardyEvent[];
  onOpenMission: () => void;
  compact?: boolean;
}

/**
 * One distinct, succinct line that always answers "what do I do right now?".
 * Sits above the code. The ASK is the single short imperative (step.ask, or the
 * brief as a fallback); everything verbose — the why, the step path, the reward,
 * the hint pointer — lives one tap away behind SEE LEVEL OBJECTIVES. Amber =
 * mission voice, distinct from Maya's green narration in the chat.
 */
export function ObjectiveBar({
  challenge,
  currentStep,
  currentStepIndex,
  jeopardy,
  onOpenMission,
  compact = false,
}: ObjectiveBarProps) {
  const ask = currentStep.ask ?? currentStep.brief;
  const multiStep = challenge.steps.length > 1;

  return (
    <div
      data-tour="objective-bar"
      className={`shrink-0 flex items-center ${compact ? "gap-2 px-2.5 py-2" : "gap-3 px-3 py-2.5"}`}
      style={{
        background: "rgba(255,159,28,.05)",
        borderBottom: "1px solid rgba(255,159,28,.18)",
        borderLeft: "3px solid var(--color-alert)",
      }}
    >
      {/* Step pips */}
      {multiStep && (
        <div className="flex items-center gap-1 shrink-0" aria-label={`Step ${currentStepIndex + 1} of ${challenge.steps.length}`}>
          {challenge.steps.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <span
                key={step.id}
                title={step.title}
                className="block transition-colors"
                style={{
                  width: active ? 18 : 8,
                  height: 8,
                  background: done ? "var(--color-signal)" : active ? "var(--color-alert)" : "transparent",
                  border: `1px solid ${done ? "var(--color-signal)" : active ? "var(--color-alert)" : "rgba(184,212,160,.3)"}`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* The ask — the single, distinct, succinct instruction */}
      <div className="min-w-0 flex-1 flex items-center gap-2.5">
        <span
          className="shrink-0 font-[family-name:var(--font-display)] font-bold text-[8px] tracking-[2px] px-1.5 py-1 leading-none"
          style={{ color: "var(--color-background)", background: "var(--color-alert)" }}
        >
          {multiStep ? `TASK ${currentStepIndex + 1}/${challenge.steps.length}` : "TASK"}
        </span>
        <span
          className={`min-w-0 truncate font-bold ${compact ? "text-[13px]" : "text-[15px]"}`}
          style={{ color: "var(--color-foreground)" }}
          title={ask}
        >
          {ask}
        </span>
      </div>

      {/* Hazards — rare, real-time warnings */}
      {jeopardy.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {jeopardy.map((effect, i) => (
            <span
              key={`${effect}-${i}`}
              className="text-[7px] tracking-[1px] px-1.5 py-0.5"
              style={{
                color: "var(--color-danger)",
                border: "1px solid rgba(255,64,64,.3)",
                background: "rgba(255,64,64,.06)",
              }}
            >
              ⚠ {effect.replace("_", " ").toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* The full brief, one tap away */}
      <button
        type="button"
        onClick={onOpenMission}
        className="shrink-0 bg-transparent cursor-pointer font-[family-name:var(--font-display)] text-[8px] tracking-[2px] px-2.5 py-1.5 transition-colors"
        style={{ color: "var(--color-alert)", border: "1px solid rgba(255,159,28,.4)" }}
        title="See the full level objectives"
      >
        {compact ? "OBJECTIVES ›" : "SEE LEVEL OBJECTIVES ›"}
      </button>
    </div>
  );
}
