"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUpDown, Search } from "lucide-react";
import { formatAgo, formatLocation } from "@/lib/classroom/summary";
import { getLanguageService } from "@/lib/lang/registry";
import type { StudentStatus, StudentSummary } from "@/types/classroom";
import { cn } from "@/components/teacher-ui/cn";
import { Input } from "@/components/teacher-ui/input";
import { Avatar, Progress } from "@/components/teacher-ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/teacher-ui/table";
import { ActivityBars } from "./charts";
import { STATUS_META, STATUS_ORDER, StatusBadge } from "./status";

type SortKey = "attention" | "name" | "progress" | "lastActive" | "xp";
type Filter = "all" | StudentStatus;

const FILTERS: Filter[] = ["all", "stuck", "idle", "not_started", "active", "finished"];

export function StudentsTable({ students, now, onSelect }: {
  students: StudentSummary[];
  now: number;
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("attention");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter(
      (s) => (filter === "all" || s.status === filter) && (!q || s.name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)),
    );
    const byName = (a: StudentSummary, b: StudentSummary) => a.name.localeCompare(b.name);
    const lastActive = (s: StudentSummary) => (s.lastActiveAt ? Date.parse(s.lastActiveAt) : 0);
    const sorters: Record<SortKey, (a: StudentSummary, b: StudentSummary) => number> = {
      attention: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byName(a, b),
      name: byName,
      progress: (a, b) => b.progress.completedChapterIds.length - a.progress.completedChapterIds.length || byName(a, b),
      lastActive: (a, b) => lastActive(b) - lastActive(a),
      xp: (a, b) => b.xp - a.xp,
    };
    return [...list].sort(sorters[sort]);
  }, [students, filter, sort, query]);

  const sortHead = (label: string, key: SortKey, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => setSort(key)}
        className={cn("-ml-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 hover:bg-tc-accent", sort === key && "text-tc-foreground")}
      >
        {label}
        {sort === key ? <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 text-tc-muted-foreground" />}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-fit flex-wrap gap-1 rounded-lg bg-tc-muted p-[3px]" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => {
            const count = f === "all" ? students.length : students.filter((s) => s.status === f).length;
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-tc-muted-foreground transition-colors",
                  active && "bg-tc-background text-tc-foreground shadow-sm",
                )}
              >
                {f === "all" ? "All" : STATUS_META[f].label}
                <span className="rounded-sm bg-tc-background/60 px-1 text-xs tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-tc-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="pl-8" aria-label="Search students" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-tc-muted/50">
            <TableRow className="hover:bg-transparent">
              {sortHead("Student", "name", "pl-4")}
              {sortHead("Status", "attention")}
              {sortHead("Progress", "progress", "min-w-[11rem]")}
              <TableHead className="hidden md:table-cell">Current activity</TableHead>
              {sortHead("Last active", "lastActive")}
              {sortHead("XP", "xp", "hidden sm:table-cell")}
              <TableHead className="hidden pr-4 lg:table-cell">Last 14 days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-24 text-center text-tc-muted-foreground">No students match.</TableCell>
              </TableRow>
            ) : (
              visible.map((s) => (
                <TableRow key={s.studentId} className="cursor-pointer" onClick={() => onSelect(s.studentId)}>
                  <TableCell className="pl-4">
                    <button type="button" onClick={() => onSelect(s.studentId)} className="flex min-w-[12rem] cursor-pointer items-center gap-3 text-left">
                      <Avatar name={s.name} src={s.avatarUrl} />
                      <span className="grid leading-tight">
                        <span className="max-w-[14rem] truncate font-medium">{s.name}</span>
                        {s.email && <span className="max-w-[14rem] truncate text-xs text-tc-muted-foreground">{s.email}</span>}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={s.status} />
                      {s.status === "stuck" && <span className="text-xs text-tc-muted-foreground">{s.failsOnCurrentStep} failed tries</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="tabular-nums">{s.progress.completedChapterIds.length} of {s.progress.availableCount}</span>
                        <span className="text-xs text-tc-muted-foreground">{getLanguageService(s.language).label}</span>
                      </div>
                      <Progress value={s.progress.completedChapterIds.length} max={s.progress.availableCount} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-tc-muted-foreground md:table-cell">{formatLocation(s.nowOn) ?? "—"}</TableCell>
                  <TableCell className="text-tc-muted-foreground">{formatAgo(s.lastActiveAt, now)}</TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{s.xp.toLocaleString()}</TableCell>
                  <TableCell className="hidden pr-4 lg:table-cell"><ActivityBars values={s.dailyActivity} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
