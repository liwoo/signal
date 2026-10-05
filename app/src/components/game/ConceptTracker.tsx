"use client";

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
        <div className="flex flex-col gap-4">
          {summary.acts.map((act) => {
            // Flatten the act's chapters into concept chips, each keeping its
            // own coverage status. Bosses carry no concepts, so they drop out.
            const items = act.chapters
              .filter((chapter) => !chapter.isBoss && chapter.concepts.length > 0)
              .flatMap((chapter) => chapter.concepts.map((concept) => ({ concept, status: chapter.status })));
            if (items.length === 0) return null;

            return (
              <div key={act.act}>
                <div className="mb-2">
                  <span
                    className="font-[family-name:var(--font-display)] text-[9px] tracking-[2px]"
                    style={{ color: act.covered ? "var(--color-signal)" : "var(--color-foreground)" }}
                  >
                    ACT {act.act}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(({ concept, status }) => {
                    const color = STATUS_COLOR[status];
                    const faded = status === "upcoming" || status === "planned";
                    return (
                      <span
                        key={concept}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] leading-none"
                        style={{
                          color,
                          border: `1px solid color-mix(in srgb, ${color} ${faded ? "20%" : "45%"}, transparent)`,
                          background: faded ? "transparent" : `color-mix(in srgb, ${color} 8%, transparent)`,
                          opacity: status === "planned" ? 0.6 : 1,
                        }}
                      >
                        <span style={{ fontSize: "9px" }}>{STATUS_MARK[status]}</span>
                        {concept}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
