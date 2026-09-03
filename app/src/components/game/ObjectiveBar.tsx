"use client";

import type { Challenge, ChallengeStep, JeopardyEvent } from "@/types/game";
import type { HintState } from "@/lib/game/hints";
import { nextHint, hintCostXP } from "@/lib/game/hints";

interface ObjectiveBarProps {
  challenge: Challenge;
  currentStep: ChallengeStep;
  currentStepIndex: number;
  hints: HintState;
  /** The player looks stuck — the hint affordance lights up. */
  stuck: boolean;
  jeopardy: JeopardyEvent[];
  onRevealHint: () => void;
  onOpenMission: () => void;
  compact?: boolean;
}

/**
 * The one line that always answers "what am I supposed to do right now?".
 * Sits above the code. Amber = mission voice (instructions), distinct from
 * Maya's green narration in the chat. Holds the step pips, the current
 * objective, hazards, and the progressive hint button.
 */
export function ObjectiveBar({
  challenge,
  currentStep,
  currentStepIndex,
  hints,
  stuck,
  jeopardy,
  onRevealHint,
  onOpenMission,
  compact = false,
}: ObjectiveBarProps) {
  const upcoming = nextHint(currentStep.hints, hints);
  const used = hints.revealed;
  const total = currentStep.hints.length;

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
        <div
          className={`truncate ${compact ? "text-[12px]" : "text-[13px]"}`}
          style={{ color: "var(--color-foreground)" }}
        >
          {currentStep.brief}
        </div>
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

      {/* Progressive hint */}
      <div className="flex items-center shrink-0">
        {upcoming ? (
          <button
            type="button"
            onClick={onRevealHint}
            className={`btn-secondary bg-transparent cursor-pointer flex items-center gap-1.5 tracking-[1px] transition-colors whitespace-nowrap ${compact ? "min-h-11 px-2.5 text-[9px]" : "px-3 py-1.5 text-[9px] tracking-[2px]"} ${stuck ? "hint-pulse" : ""}`}
            style={{
              color: stuck ? "var(--color-info)" : "var(--color-foreground)",
              border: `1px solid ${stuck ? "var(--color-info)" : "rgba(184,212,160,.35)"}`,
              background: stuck ? "rgba(0,212,255,.08)" : "transparent",
            }}
            title={`Reveal hint ${used + 1} of ${total} for ${hintCostXP(upcoming)} XP`}
          >
            <span>{stuck ? "STUCK? HINT" : "HINT"}</span>
            <span style={{ opacity: 0.7 }}>{used}/{total}</span>
            <span className={compact ? "hidden" : ""} style={{ color: "var(--color-alert)" }}>−{hintCostXP(upcoming)} XP</span>
          </button>
        ) : total > 0 ? (
          <span className="text-[8px] tracking-[2px]" style={{ color: "var(--color-dim)" }}>
            ALL HINTS USED
          </span>
        ) : null}
      </div>
    </div>
  );
}
