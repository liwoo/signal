"use client";

/**
 * Two small charts for the class view, built per the dataviz method:
 * one blue ramp (cleared = strong step, in progress = light step), 2px gaps
 * between segments, rounded data-ends, a legend, and hover tooltips.
 */

import { useState } from "react";
import { titleCase } from "@/lib/classroom/summary";
import type { ChapterFunnelEntry } from "@/types/classroom";

export function ChapterProgressChart({ funnel, studentCount }: { funnel: ChapterFunnelEntry[]; studentCount: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, studentCount);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 text-xs text-tc-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-tc-chart-1" /> Cleared</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-tc-chart-2" /> In progress</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {funnel.map((c, i) => {
          const notReached = Math.max(0, studentCount - c.completed - c.inProgress);
          const active = hover === c.chapterId;
          return (
            <li
              key={c.chapterId}
              className="relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr_auto]"
              onMouseEnter={() => setHover(c.chapterId)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="truncate text-sm">
                <span className="mr-2 tabular-nums text-tc-muted-foreground">{i + 1}</span>
                {titleCase(c.title)}
                {c.isBoss && <span className="ml-1.5 text-xs text-tc-muted-foreground">Boss</span>}
              </span>
              <div
                className="flex h-5 gap-[2px] rounded-[4px] bg-tc-muted"
                role="img"
                aria-label={`${titleCase(c.title)}: ${c.completed} cleared, ${c.inProgress} in progress, ${notReached} not reached`}
              >
                {c.completed > 0 && <div className="h-full rounded-[4px] bg-tc-chart-1" style={{ width: `${(c.completed / max) * 100}%` }} />}
                {c.inProgress > 0 && <div className="h-full rounded-[4px] bg-tc-chart-2" style={{ width: `${(c.inProgress / max) * 100}%` }} />}
              </div>
              <span className="w-16 text-right text-sm tabular-nums text-tc-muted-foreground">
                {c.completed}/{studentCount}
              </span>
              {active && (
                <div className="pointer-events-none absolute left-[calc(min(12rem,40%)+0.75rem)] top-full z-10 mt-1 min-w-[11rem] rounded-md border bg-tc-popover px-3 py-2 text-xs shadow-md">
                  <div className="mb-1 font-medium">{titleCase(c.title)}</div>
                  <Row swatch="bg-tc-chart-1" label="Cleared" value={c.completed} />
                  <Row swatch="bg-tc-chart-2" label="In progress" value={c.inProgress} />
                  <Row swatch="bg-tc-muted" label="Not reached" value={notReached} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-tc-muted-foreground">
        <span className={`size-2 rounded-[2px] ${swatch}`} />
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/** Actions per day, oldest → today. Each bar carries its own tooltip. */
export function ActivityBars({ values, height = 20, barWidth = 4 }: { values: number[]; height?: number; barWidth?: number }) {
  const max = Math.max(1, ...values);
  const gap = 2;
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <svg width={values.length * (barWidth + gap) - gap} height={height} role="img" aria-label={`${total} actions in the last ${values.length} days`}>
      {values.map((v, i) => {
        const daysAgo = values.length - 1 - i;
        const h = v === 0 ? 2 : Math.max(4, (v / max) * height);
        return (
          <rect key={i} x={i * (barWidth + gap)} y={height - h} width={barWidth} height={h} rx={1.5} className={v === 0 ? "fill-tc-muted" : "fill-tc-chart-1"}>
            <title>{`${daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`}: ${v} ${v === 1 ? "action" : "actions"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
