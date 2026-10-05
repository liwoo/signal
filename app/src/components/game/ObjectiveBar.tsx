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
 * The one line that always answers "what am I supposed to do right now?".
 * Sits above the code. Amber = mission voice (instructions), distinct from
 * Maya's green narration in the chat. Holds the step pips, the current
 * objective, and hazards. Hints live behind the HINT button in the chat.
 */
export function ObjectiveBar({
  challenge,
  currentStep,
  currentStepIndex,
  jeopardy,
  onOpenMission,
  compact = false,
}: ObjectiveBarProps) {
  return (
    <div
      data-tour="objective-bar"
      className={`shrink-0 flex items-stretch ${compact ? "gap-2 px-2 py-1.5" : "gap-3 px-3 py-2"}`}
      style={{
        background: "rgba(255,159,28,.04)",
        borderBottom: "1px solid rgba(255,159,28,.18)",
        borderLeft: "3px solid var(--color-alert)",
      }}
    >
      {/* Step pips */}
      {challenge.steps.length > 1 && (
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

      {/* Objective */}
      <button
        type="button"
        onClick={onOpenMission}
        className="min-w-0 flex-1 bg-transparent border-0 p-0 text-left cursor-pointer"
        title="Open the full mission brief"
      >
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="shrink-0 font-[family-name:var(--font-display)] font-bold text-[9px] tracking-[2px]"
            style={{ color: "var(--color-alert)" }}
          >
            OBJECTIVE
          </span>
          <span className="min-w-0 truncate text-[8px] tracking-[2px]" style={{ color: "rgba(255,159,28,.7)" }}>
            {challenge.steps.length > 1 ? `STEP ${currentStepIndex + 1}/${challenge.steps.length} · ` : ""}
            {currentStep.title}
          </span>
        </div>
        {currentStep.stake ? (
          <>
            <div
              className={`truncate ${compact ? "text-[12px]" : "text-[13px]"}`}
              style={{ color: "var(--color-foreground)" }}
            >
              {currentStep.stake}
            </div>
            <div
              className={`truncate ${compact ? "text-[10px]" : "text-[11px]"}`}
              style={{ color: "rgba(255,159,28,.75)" }}
            >
              ▸ DO · {currentStep.brief}
            </div>
          </>
        ) : (
          <div
            className={`truncate ${compact ? "text-[12px]" : "text-[13px]"}`}
            style={{ color: "var(--color-foreground)" }}
          >
            {currentStep.brief}
          </div>
        )}
      </button>

      {/* Hazards */}
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
    </div>
  );
}
