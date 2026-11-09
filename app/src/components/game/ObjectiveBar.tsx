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
 * Always answers "what do I do right now?". Sits above the code. The ASK is the
 * single short imperative (step.ask, or the brief as a fallback) and gets its
 * own line, wrapping to two rather than truncating: a 390px phone used to show
 * "Print Maya'…". Step pips, the TASK badge and the OBJECTIVES button sit in a
 * small metadata row above it. Everything verbose — the why, the step path, the
 * reward — lives one tap away behind OBJECTIVES. Amber = mission voice,
 * distinct from Maya's green narration in the chat.
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
      className={`shrink-0 flex flex-col ${compact ? "gap-1 px-3 pt-1.5 pb-2" : "gap-1.5 px-3.5 pt-2 pb-2.5"}`}
      style={{
        background: "rgba(255,159,28,.05)",
        borderBottom: "1px solid rgba(255,159,28,.18)",
        borderLeft: "3px solid var(--color-alert)",
      }}
    >
      {/* Metadata: where you are in the level, hazards, the full brief */}
      <div className="flex min-w-0 items-center gap-2.5">
        {multiStep && (
          <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
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
        <span
          className="shrink-0 font-[family-name:var(--font-display)] font-bold text-[11px] tracking-[1.5px] leading-none"
          style={{ color: "var(--color-alert)" }}
        >
          {multiStep ? `TASK ${currentStepIndex + 1} OF ${challenge.steps.length}` : "TASK"}
        </span>

        {/* Hazards — rare, real-time warnings */}
        {jeopardy.length > 0 && (
          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
            {jeopardy.map((effect, i) => (
              <span
                key={`${effect}-${i}`}
                className="shrink-0 text-[10px] tracking-[1px] px-1.5 py-0.5 whitespace-nowrap"
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
          className={`ml-auto shrink-0 bg-transparent cursor-pointer font-[family-name:var(--font-display)] text-[11px] tracking-[1.5px] whitespace-nowrap transition-colors ${compact ? "min-h-8 px-2.5" : "px-2.5 py-1"}`}
          style={{ color: "var(--color-alert)", border: "1px solid rgba(255,159,28,.4)" }}
          title="See the full level objectives"
        >
          {compact ? "OBJECTIVES ›" : "SEE LEVEL OBJECTIVES ›"}
        </button>
      </div>

      {/* The ask — the single, distinct, succinct instruction. Wraps; never truncates. */}
      <p
        className={`m-0 min-w-0 font-bold line-clamp-2 break-words ${compact ? "text-[15px] leading-[1.35]" : "text-[17px] leading-[1.35]"}`}
        style={{ color: "var(--color-foreground)" }}
        title={ask}
      >
        {ask}
      </p>
    </div>
  );
}
