"use client";

import { useState } from "react";
import { summarizeCurriculum, type ConceptStatus } from "@/lib/game/curriculum";

interface ConceptTrackerProps {
  completedChapterIds: string[];
  currentChapterId: string | null;
  /** Tighter paddings/type for the desktop side rail. */
  compact?: boolean;
}

const STATUS_COLOR: Record<ConceptStatus, string> = {
  covered: "var(--color-signal)",
  current: "var(--color-alert)",
  upcoming: "var(--color-foreground)",
  planned: "var(--color-dim)",
};

const STATUS_MARK: Record<ConceptStatus, string> = {
  covered: "✓",
  current: "▸",
  upcoming: "·",
  planned: "·",
};

/**
 * The whole-game concept map — every Go concept across all nine acts, built and
 * planned. Covered concepts glow green, the active chapter is amber, reachable
 * ones sit neutral, and not-yet-built chapters are dim with a "SOON" tag so the
 * player always sees the road ahead. Desktop rail + mobile (behind a %).
 */
export function ConceptTracker({ completedChapterIds, currentChapterId, compact = false }: ConceptTrackerProps) {
  const summary = summarizeCurriculum(completedChapterIds, currentChapterId);

  // Only the act you're inside is exploded into chips; every other act stays a
  // quiet one-line header so the road ahead is still visible without the wall of
  // ~40 chips. The current act auto-opens (and re-opens when it changes); the
  // player can expand any other act to peek ahead or review what they've done.
  const currentAct = summary.acts.find((a) => a.chapters.some((c) => c.status === "current"))?.act ?? null;
  const [openActs, setOpenActs] = useState<Set<string>>(new Set(currentAct ? [currentAct] : []));
  const [lastCurrentAct, setLastCurrentAct] = useState<string | null>(currentAct);
  if (currentAct !== lastCurrentAct) {
    setLastCurrentAct(currentAct);
    if (currentAct) setOpenActs((prev) => new Set(prev).add(currentAct));
  }
  const toggleAct = (act: string) =>
    setOpenActs((prev) => {
      const next = new Set(prev);
      if (next.has(act)) next.delete(act);
      else next.add(act);
      return next;
    });

  return (
    <div className="flex h-full flex-col" style={{ background: "rgba(4,9,15,.6)" }}>
      {/* Header: overall coverage of playable content + the road ahead */}
      <div
        className={`shrink-0 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
        style={{ borderBottom: "1px solid #0a1820" }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="font-[family-name:var(--font-display)] text-[9px] tracking-[3px]"
            style={{ color: "var(--color-signal)" }}
          >
            CONCEPTS
          </span>
          <span
            className="font-[family-name:var(--font-display)] font-bold leading-none"
            style={{ color: "var(--color-signal)", fontSize: compact ? "15px" : "18px" }}
          >
            {summary.pct}%
          </span>
        </div>
        <div className="mt-1 text-[8px] tracking-[1.5px]" style={{ color: "var(--color-dim)" }}>
          {summary.covered} / {summary.playable} LEARNED
          {summary.planned > 0 ? ` · +${summary.planned} AHEAD` : ""}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 w-full" style={{ background: "rgba(110,255,160,.12)" }}>
          <div
            className="h-full transition-[width] duration-500"
            style={{ width: `${summary.pct}%`, background: "var(--color-signal)" }}
          />
        </div>
      </div>

      {/* Concepts grouped only by act number — chapter/boss names are hidden to
          keep the story a mystery; the concepts themselves are the whole point. */}
      <div className={`min-h-0 flex-1 overflow-y-auto ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className="flex flex-col gap-1">
          {summary.acts.map((act) => {
            // Flatten the act's chapters into concept chips, each keeping its
            // own coverage status. Bosses carry no concepts, so they drop out.
            const items = act.chapters
              .filter((chapter) => !chapter.isBoss && chapter.concepts.length > 0)
              .flatMap((chapter) => chapter.concepts.map((concept) => ({ concept, status: chapter.status })));
            if (items.length === 0) return null;

            const hasCurrent = items.some((it) => it.status === "current");
            const isOpen = openActs.has(act.act);
            // Header tone follows the act's own state so the eye lands on the
            // live act first, then completed ones, then the dim road ahead.
            const headColor = hasCurrent
              ? "var(--color-alert)"
              : act.covered
                ? "var(--color-signal)"
                : "var(--color-dim)";

            return (
              <div key={act.act} className="py-1">
                <button
                  type="button"
                  onClick={() => toggleAct(act.act)}
                  className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 text-[8px] transition-transform"
                      style={{ color: "var(--color-dim)", transform: isOpen ? "rotate(90deg)" : "none" }}
                    >
                      ▸
                    </span>
                    <span
                      className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px]"
                      style={{ color: headColor }}
                    >
                      ACT {act.act}
                    </span>
                  </span>
                  <span className="text-[8px] tracking-[1px]" style={{ color: "var(--color-dim)" }}>
                    {act.covered ? "✓" : `${items.length}`}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-3.5">
                    {items.map(({ concept, status }) => {
                      const color = STATUS_COLOR[status];
                      // Hierarchy: done/active chips keep a soft box; reachable
                      // ones get a hairline; planned ones lose the box entirely
                      // and recede so they read as "later, not now".
                      const boxed = status === "covered" || status === "current";
                      const borderless = status === "planned";
                      return (
                        <span
                          key={concept}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] leading-none"
                          style={{
                            color,
                            border: borderless
                              ? "none"
                              : `1px solid color-mix(in srgb, ${color} ${boxed ? "45%" : "15%"}, transparent)`,
                            background: boxed ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent",
                            opacity: status === "planned" ? 0.5 : status === "upcoming" ? 0.8 : 1,
                          }}
                        >
                          <span style={{ fontSize: "9px" }}>{STATUS_MARK[status]}</span>
                          {concept}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
