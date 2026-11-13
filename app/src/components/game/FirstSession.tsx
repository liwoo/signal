"use client";

// The first session, one idea per screen:
//   1. the hook + how the game works (the loop)   — LoopStrip on the intro
//   2. start with what you know (the syntax bridge) — KnowStep
//   3. choose your pace (study / thriller)          — PaceStep
// Each screen asks for one thing and moves on.

import { useState } from "react";
import type { LanguageId, Pace, PriorLanguage } from "@/types/game";
import { bridgeFor, PRIOR_OPTIONS } from "@/data/bridges";
import { LanguagePicker } from "./LanguagePicker";

/** How a mission plays, in three beats. Replaces the stats row on a first visit. */
export function LoopStrip() {
  const beats = ["EXPLORE", "WRITE CODE", "SEE IT WORK"];
  return (
    <div className="mb-4 opacity-0" style={{ animation: "intro-in .6s ease .1s forwards" }}>
      <ol className="flex items-stretch gap-1.5" aria-label="How a mission works">
        {beats.map((beat, i) => (
          <li
            key={beat}
            className="flex-1 flex flex-col items-center justify-center py-2.5 text-center"
            style={{ border: "1px solid var(--color-border)", background: "rgba(var(--signal-rgb),.02)" }}
          >
            <span className="font-[family-name:var(--font-display)] text-[10px]" style={{ color: "var(--color-dim)" }}>
              0{i + 1}
            </span>
            <span className="text-[10px] tracking-[2px] mt-0.5" style={{ color: "var(--color-signal)" }}>
              {beat}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-[11px] leading-[1.6]" style={{ color: "var(--color-dim)" }}>
        steer maya to a terminal, write the code she needs, watch it open the way.
      </p>
    </div>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={onBack}
        className="bg-transparent p-0 mb-3 text-[10px] tracking-[2px] cursor-pointer"
        style={{ color: "var(--color-dim)", border: "none" }}
      >
        ‹ BACK
      </button>
      <h1
        className="font-[family-name:var(--font-display)] font-black tracking-[3px] leading-tight"
        style={{ color: "var(--color-signal)", fontSize: "clamp(20px, 5vw, 28px)" }}
      >
        {title}
      </h1>
    </div>
  );
}

/** Screen 2: the language to learn + what the player already codes in → one bridge line. */
export function KnowStep({
  language,
  prior,
  onChangeLanguage,
  onChangePrior,
  onNext,
  onBack,
}: {
  language: LanguageId;
  prior: PriorLanguage | undefined;
  onChangeLanguage: (language: LanguageId) => void;
  onChangePrior: (prior: PriorLanguage) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const bridge = prior ? bridgeFor(prior, language) : null;
  return (
    <div>
      <StepHeader title="START WITH WHAT YOU KNOW" onBack={onBack} />

      <LanguagePicker language={language} highlight={false} onChange={onChangeLanguage} />

      <div className="mb-3.5" role="radiogroup" aria-label="What you already code in">
        <div className="text-[10px] tracking-[3px] mb-1.5" style={{ color: prior ? "var(--color-dim)" : "var(--color-signal)" }}>
          ▸ I ALREADY CODE IN
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PRIOR_OPTIONS.map((opt) => {
            const selected = opt.id === prior;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChangePrior(opt.id)}
                className="py-2 text-[10px] tracking-[1px] cursor-pointer transition-colors"
                style={{
                  color: selected ? "var(--color-background)" : "var(--color-foreground)",
                  background: selected ? "var(--color-signal)" : "transparent",
                  border: `1px solid ${selected ? "var(--color-signal)" : "var(--color-border)"}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* The bridge — the payoff of answering */}
      <div
        className="mb-4 px-3.5 py-3 min-h-[76px]"
        style={{
          borderLeft: `3px solid ${bridge ? "var(--color-info)" : "var(--color-border)"}`,
          background: bridge ? "color-mix(in srgb, var(--color-info) 6%, transparent)" : "transparent",
        }}
        aria-live="polite"
      >
        {bridge ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px]">
              {bridge.from ? (
                <>
                  <code style={{ color: "var(--color-foreground)" }}>{bridge.from}</code>
                  <span style={{ color: "var(--color-info)" }}>→</span>
                </>
              ) : null}
              <code style={{ color: "var(--color-signal)" }}>{bridge.to}</code>
            </div>
            <p className="mt-1.5 text-[11px] leading-[1.6]" style={{ color: "var(--color-info)" }}>
              {bridge.note}
            </p>
          </>
        ) : (
          <p className="text-[11px] leading-[1.6]" style={{ color: "var(--color-dim)" }}>
            pick one and we&apos;ll bridge it to what you&apos;re learning.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!prior}
        className="w-full py-3.5 bg-transparent border-2 border-[var(--color-signal)] text-[var(--color-signal)]
                   font-[family-name:var(--font-display)] text-xs tracking-[6px] cursor-pointer transition-colors
                   hover:bg-[var(--color-signal)] hover:text-[var(--color-background)]
                   disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--color-signal)]"
      >
        NEXT ▸
      </button>
    </div>
  );
}

const PACES: { id: Pace; title: string; lines: [string, string] }[] = [
  { id: "study", title: "STUDY", lines: ["same story. no countdown.", "experiment and retry freely."] },
  { id: "thriller", title: "THRILLER", lines: ["the timed escape. rush moments.", "beat the clock — or pay for it."] },
];

/** Screen 3: how much pressure. One tap picks it and the story begins. */
export function PaceStep({
  pace,
  onPick,
  onBack,
}: {
  pace: Pace | undefined;
  onPick: (pace: Pace) => void;
  onBack: () => void;
}) {
  const [picked, setPicked] = useState<Pace | null>(null);
  return (
    <div>
      <StepHeader title="CHOOSE YOUR PACE" onBack={onBack} />
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pace">
        {PACES.map((p) => {
          const current = (picked ?? pace) === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={current}
              disabled={picked !== null}
              onClick={() => {
                setPicked(p.id);
                onPick(p.id);
              }}
              className="w-full text-left px-4 py-3.5 cursor-pointer transition-colors bg-transparent"
              style={{
                border: `1px solid ${current ? "var(--color-signal)" : "var(--color-border)"}`,
                background: current ? "rgba(var(--signal-rgb),.06)" : "transparent",
              }}
            >
              <div className="font-[family-name:var(--font-display)] text-[13px] tracking-[3px]" style={{ color: "var(--color-signal)" }}>
                {p.title} ▸
              </div>
              <div className="mt-1 text-[12px] leading-[1.6]" style={{ color: "var(--color-foreground)" }}>
                {p.lines[0]}
                <br />
                {p.lines[1]}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
        you can switch before any chapter.
      </p>
    </div>
  );
}
