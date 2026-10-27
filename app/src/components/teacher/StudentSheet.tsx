"use client";

import { Check, Circle, CircleDot, UserMinus } from "lucide-react";
import { classroomChaptersFor } from "@/data/classroom";
import { chapterById, formatAgo, formatLocation, titleCase } from "@/lib/classroom/summary";
import { getLanguageService } from "@/lib/lang/registry";
import type { ProgressEvent, RosterRow, StudentSummary } from "@/types/classroom";
import { Button } from "@/components/teacher-ui/button";
import { cn } from "@/components/teacher-ui/cn";
import { Avatar, Progress, Separator } from "@/components/teacher-ui/misc";
import { Sheet } from "@/components/teacher-ui/overlay";
import { ActivityBars } from "./charts";
import { StatusBadge } from "./status";

const TIMELINE_LIMIT = 25;

function stepLabel(e: ProgressEvent): string {
  const chapter = chapterById(e.chapterId);
  const title = chapter ? titleCase(chapter.title) : e.chapterId;
  const idx = chapter && e.stepId ? chapter.steps.findIndex((s) => s.id === e.stepId) : -1;
  return idx >= 0 ? `${title}, step ${idx + 1}` : title;
}

function describeEvent(e: ProgressEvent): { text: string; dot: string } {
  switch (e.kind) {
    case "chapter_start":
      return { text: `Started ${stepLabel(e)}`, dot: "bg-tc-muted-foreground" };
    case "submit":
      return e.data.success
        ? { text: `Passed ${stepLabel(e)} on try ${e.data.attempt ?? "?"}`, dot: "bg-tc-good" }
        : { text: `Tried ${stepLabel(e)} — not yet (try ${e.data.attempt ?? "?"})`, dot: "bg-tc-border" };
    case "step_complete":
      return { text: `Cleared ${stepLabel(e)}${e.data.xp ? ` · +${e.data.xp} XP` : ""}`, dot: "bg-tc-good" };
    case "chapter_complete":
      return { text: `Finished ${stepLabel(e).split(",")[0]}`, dot: "bg-tc-chart-1" };
    case "hint":
      return { text: `Opened a hint on ${stepLabel(e)}`, dot: "bg-tc-warning" };
    case "game_over":
      return { text: `Game over on ${stepLabel(e)}${e.data.cause === "timer_expired" ? " (ran out of time)" : ""}`, dot: "bg-tc-critical" };
  }
}

export function StudentSheet({ row, student, now, onClose, onRemove }: {
  row: RosterRow;
  student: StudentSummary;
  now: number;
  onClose: () => void;
  onRemove: () => void;
}) {
  const chapters = classroomChaptersFor(student.language);
  const done = new Set(student.progress.completedChapterIds);
  const currentChapterId = student.nowOn?.language === student.language && !student.nowOn.cleared ? student.nowOn.chapterId : null;
  const passRate = student.submissions ? `${Math.round((student.successfulSubmissions / student.submissions) * 100)}%` : "—";

  return (
    <Sheet open onClose={onClose} label={`${student.name}'s progress`} className="sm:max-w-lg">
      <div className="flex flex-col gap-4 p-6 pb-4">
        <div className="flex items-center gap-3 pr-6">
          <Avatar name={student.name} src={student.avatarUrl} className="size-12 text-base" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{student.name}</h2>
            {student.email && <p className="truncate text-sm text-tc-muted-foreground">{student.email}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-tc-muted-foreground">
          <StatusBadge status={student.status} />
          <span>Joined {new Date(student.joinedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
        </div>
      </div>
      <Separator />

      <div className="flex flex-col gap-6 p-6">
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Current activity</h3>
          <p className="text-sm">{formatLocation(student.nowOn) ?? "Hasn't played yet"}</p>
          <p className="text-sm text-tc-muted-foreground">Last active {formatAgo(student.lastActiveAt, now)}</p>
          {student.failsOnCurrentStep > 0 && (
            <p className={cn("text-sm", student.status === "stuck" ? "text-tc-critical" : "text-tc-muted-foreground")}>
              {student.failsOnCurrentStep} failed {student.failsOnCurrentStep === 1 ? "try" : "tries"} on this step so far
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium">Chapters</h3>
            <span className="text-sm text-tc-muted-foreground">
              {getLanguageService(student.language).label} · {student.progress.completedChapterIds.length} of {chapters.length}
            </span>
          </div>
          <Progress value={student.progress.completedChapterIds.length} max={chapters.length} />
          <ul className="flex flex-col gap-1">
            {chapters.map((c, i) => {
              const cleared = done.has(c.id);
              const current = !cleared && c.id === currentChapterId;
              return (
                <li key={c.id} className={cn("flex items-center gap-3 rounded-md px-2 py-1.5 text-sm", current && "bg-tc-muted")}>
                  {cleared ? (
                    <Check className="size-4 text-tc-good" aria-label="Cleared" />
                  ) : current ? (
                    <CircleDot className="size-4 text-tc-chart-1" aria-label="In progress" />
                  ) : (
                    <Circle className="size-4 text-tc-border" aria-label="Not reached" />
                  )}
                  <span className="w-4 tabular-nums text-tc-muted-foreground">{i + 1}</span>
                  <span className={cn(!cleared && !current && "text-tc-muted-foreground")}>{titleCase(c.title)}</span>
                  {c.isBoss && <span className="text-xs text-tc-muted-foreground">Boss</span>}
                  {current && <span className="ml-auto text-xs text-tc-muted-foreground">In progress</span>}
                </li>
              );
            })}
          </ul>
          {student.otherLanguages.length > 0 && (
            <p className="text-sm text-tc-muted-foreground">
              Also played:{" "}
              {student.otherLanguages
                .map((p) => `${getLanguageService(p.language).label} (${p.completedChapterIds.length} of ${p.availableCount})`)
                .join(", ")}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Practice · last 30 days</h3>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Submissions" value={student.submissions} />
            <Metric label="Pass rate" value={passRate} />
            <Metric label="Hints" value={student.hintsUsed} />
            <Metric label="Game overs" value={student.gameOvers} />
            <Metric label="XP" value={student.xp.toLocaleString()} />
            <Metric label="Zen idioms" value={`${student.zenLearned}/${student.zenSeen}`} />
          </div>
          <div className="flex items-end gap-3">
            <ActivityBars values={student.dailyActivity} height={32} barWidth={8} />
            <span className="text-xs text-tc-muted-foreground">Activity, last 14 days</span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Recent activity</h3>
          {row.events.length === 0 ? (
            <p className="text-sm text-tc-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l pl-4">
              {row.events.slice(0, TIMELINE_LIMIT).map((e, i) => {
                const { text, dot } = describeEvent(e);
                return (
                  <li key={`${e.createdAt}-${i}`} className="relative text-sm">
                    <span className={cn("absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-2 ring-tc-background", dot)} />
                    <div>{text}</div>
                    <div className="text-xs text-tc-muted-foreground">{formatAgo(e.createdAt, now)}</div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <Separator />
        <Button variant="outline" className="self-start text-tc-destructive hover:text-tc-destructive" onClick={onRemove}>
          <UserMinus /> Remove from class
        </Button>
      </div>
    </Sheet>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-tc-muted-foreground">{label}</div>
    </div>
  );
}
