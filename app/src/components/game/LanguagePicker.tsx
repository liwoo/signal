"use client";

// The language picker on every chapter intro: asked once (defaults to Go),
// switchable any time. Each language is a card with its mascot; the chosen one hops.

import type { LanguageId } from "@/types/game";
import { LANGUAGE_OPTIONS } from "@/lib/lang/registry";
import { LanguageMascot } from "@/components/ui/LanguageMascot";

export function LanguagePicker({ language, highlight, onChange }: {
  language: LanguageId;
  highlight: boolean;
  onChange: (language: LanguageId) => void;
}) {
  const active = LANGUAGE_OPTIONS.find((o) => o.id === language) ?? LANGUAGE_OPTIONS[0];
  return (
    <div
      className="mb-3.5 opacity-0"
      style={{ animation: "intro-in .6s ease .18s forwards" }}
      role="radiogroup"
      aria-label="Language to learn in"
    >
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] tracking-[3px]" style={{ color: highlight ? "var(--color-signal)" : "var(--color-dim)" }}>
          {highlight ? "▸ CHOOSE YOUR LANGUAGE" : "▸ LEARNING IN"}
        </span>
        <span className="text-[10px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
          progress is kept per language
        </span>
      </div>
      <div className="flex gap-1.5">
        {LANGUAGE_OPTIONS.map((opt) => {
          const selected = opt.id === language;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.id)}
              className="flex-1 flex flex-col items-center gap-1.5 pt-2.5 pb-2 text-[10px] tracking-[2px] cursor-pointer transition-colors font-[family-name:var(--font-display)]"
              style={{
                color: selected ? "var(--color-background)" : opt.accent,
                background: selected ? opt.accent : `rgba(${opt.accentRgb}, .04)`,
                border: `1px solid ${selected ? opt.accent : `rgba(${opt.accentRgb}, ${highlight ? ".45" : ".2"})`}`,
              }}
            >
              <span
                className="flex items-end justify-center h-10 w-12"
                style={{ background: selected ? "var(--color-background)" : "transparent", opacity: selected ? 1 : 0.85 }}
              >
                <LanguageMascot language={opt.id} size={34} bob={selected} />
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] leading-[1.6]" style={{ color: "var(--color-dim)" }}>
        {active.blurb}
      </div>
    </div>
  );
}
