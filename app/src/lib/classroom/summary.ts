/**
 * Pure roster math for the teacher dashboard: raw rows (profile + game_state +
 * activity log) in, per-student and per-class summaries out. No React, no
 * Supabase — `now` is passed in so results are deterministic.
 */

import { normalizePersistedState, progressFor, type PersistedState } from "@/lib/storage/persistence";
import { CLASSROOM_CHAPTERS, classroomChaptersFor, type ClassroomChapter } from "@/data/classroom";
import { LANGUAGE_IDS, type LanguageId } from "@/types/game";
import type {
  ClassSummary,
  LanguageProgressSummary,
  ProgressEvent,
  RosterRow,
  StudentStatus,
  StudentSummary,
} from "@/types/classroom";

const DAY_MS = 86_400_000;
/** Failed submissions on one step (without clearing it) that flag a student as stuck. */
export const STUCK_FAILS = 5;
/** No activity for this long → idle. */
export const IDLE_DAYS = 7;
/** Days of activity the sparkline covers. */
export const ACTIVITY_DAYS = 14;

function languageProgress(state: PersistedState, language: LanguageId): LanguageProgressSummary {
  const available = classroomChaptersFor(language);
  const done = new Set(progressFor(state.progress, language).completedChapters);
  return {
    language,
    completedChapterIds: available.filter((c) => done.has(c.number)).map((c) => c.id),
    availableCount: available.length,
  };
}

/** Failed submits on the latest step, counted back until the step was last cleared. */
function failsOnLatestStep(events: ProgressEvent[]): number {
  const latest = events[0];
  if (!latest?.stepId || latest.kind === "step_complete" || latest.kind === "chapter_complete") return 0;
  let fails = 0;
  for (const e of events) {
    if (e.stepId !== latest.stepId || e.language !== latest.language) continue;
    if (e.kind === "step_complete" || (e.kind === "submit" && e.data.success === true)) break;
    if (e.kind === "submit" && e.data.success === false) fails++;
  }
  return fails;
}

function latestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export function summarizeStudent(row: RosterRow, now: number): StudentSummary {
  const state = normalizePersistedState(row.state ?? {});
  const language = state.settings.language ?? "go";
  const progress = languageProgress(state, language);
  const otherLanguages = LANGUAGE_IDS.filter((l) => l !== language)
    .map((l) => languageProgress(state, l))
    .filter((p) => p.completedChapterIds.length > 0);

  const events = row.events;
  const latest = events[0] ?? null;
  const lastActiveAt = latestIso(row.stateUpdatedAt, latest?.createdAt ?? null);
  const failsOnCurrentStep = failsOnLatestStep(events);

  const dailyActivity = new Array<number>(ACTIVITY_DAYS).fill(0);
  let submissions = 0;
  let successfulSubmissions = 0;
  let hintsUsed = 0;
  let gameOvers = 0;
  for (const e of events) {
    const daysAgo = Math.floor((now - Date.parse(e.createdAt)) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < ACTIVITY_DAYS) dailyActivity[ACTIVITY_DAYS - 1 - daysAgo]++;
    if (e.kind === "submit") {
      submissions++;
      if (e.data.success === true) successfulSubmissions++;
    } else if (e.kind === "hint") hintsUsed++;
    else if (e.kind === "game_over") gameOvers++;
  }

  const everCleared = progress.completedChapterIds.length > 0 || otherLanguages.length > 0;
  const idle = lastActiveAt === null || now - Date.parse(lastActiveAt) > IDLE_DAYS * DAY_MS;
  let status: StudentStatus;
  if (!everCleared && events.length === 0) status = "not_started";
  else if (progress.availableCount > 0 && progress.completedChapterIds.length >= progress.availableCount) status = "finished";
  else if (idle) status = "idle";
  else if (failsOnCurrentStep >= STUCK_FAILS) status = "stuck";
  else status = "active";

  const zen = state.library.entries;
  return {
    studentId: row.profile.id,
    name: row.profile.displayName || row.profile.email?.split("@")[0] || "student",
    email: row.profile.email,
    avatarUrl: row.profile.avatarUrl,
    joinedAt: row.joinedAt,
    status,
    xp: state.stats.xp,
    level: state.stats.level,
    language,
    progress,
    otherLanguages,
    lastActiveAt,
    nowOn: latest
      ? {
          chapterId: latest.chapterId,
          stepId: latest.stepId,
          language: latest.language,
          ...(latest.kind === "chapter_complete" ? { cleared: true } : {}),
        }
      : null,
    failsOnCurrentStep,
    submissions,
    successfulSubmissions,
    hintsUsed,
    gameOvers,
    zenLearned: zen.filter((e) => e.learned).length,
    zenSeen: zen.length,
    dailyActivity,
  };
}

export function summarizeClass(students: StudentSummary[], now: number): ClassSummary {
  const funnel = CLASSROOM_CHAPTERS.map((c) => ({
    chapterId: c.id,
    title: c.title,
    isBoss: c.isBoss,
    completed: students.filter((s) => s.progress.completedChapterIds.includes(c.id)).length,
    inProgress: students.filter(
      (s) => s.nowOn?.chapterId === c.id && s.nowOn.language === s.language && !s.progress.completedChapterIds.includes(c.id),
    ).length,
  }));
  const total = students.reduce((sum, s) => sum + s.progress.completedChapterIds.length, 0);
  return {
    studentCount: students.length,
    activeThisWeek: students.filter((s) => s.lastActiveAt && now - Date.parse(s.lastActiveAt) <= 7 * DAY_MS).length,
    stuck: students.filter((s) => s.status === "stuck").length,
    notStarted: students.filter((s) => s.status === "not_started").length,
    avgChaptersCompleted: students.length ? Math.round((total / students.length) * 10) / 10 : 0,
    funnel,
  };
}

// ── Display helpers ──

export function chapterById(id: string): ClassroomChapter | undefined {
  return CLASSROOM_CHAPTERS.find((c) => c.id === id);
}

/** "CH3 · SHAFT CODES · step 2/3" style location for a student's latest activity. */
export function describeLocation(nowOn: StudentSummary["nowOn"]): string {
  if (!nowOn) return "—";
  const chapter = chapterById(nowOn.chapterId);
  if (!chapter) return nowOn.chapterId;
  if (nowOn.cleared) return `cleared ${chapter.title.toLowerCase()}`;
  const stepIndex = nowOn.stepId ? chapter.steps.findIndex((s) => s.id === nowOn.stepId) : -1;
  const step = stepIndex >= 0 ? ` · step ${stepIndex + 1}/${chapter.steps.length}` : "";
  return `${chapter.title.toLowerCase()}${step}`;
}

/** "SHAFT CODES" → "Shaft Codes". */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** Teacher-console wording: "Shaft Codes · Step 2 of 3", "Finished Door Code", or null. */
export function formatLocation(nowOn: StudentSummary["nowOn"]): string | null {
  if (!nowOn) return null;
  const chapter = chapterById(nowOn.chapterId);
  if (!chapter) return nowOn.chapterId;
  const title = titleCase(chapter.title);
  if (nowOn.cleared) return `Finished ${title}`;
  const stepIndex = nowOn.stepId ? chapter.steps.findIndex((s) => s.id === nowOn.stepId) : -1;
  return stepIndex >= 0 ? `${title} · Step ${stepIndex + 1} of ${chapter.steps.length}` : `Started ${title}`;
}

export function formatAgo(iso: string | null, now: number): string {
  if (!iso) return "never";
  const ms = now - Date.parse(iso);
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The roster as a spreadsheet — one row per student, one 0/1 column per chapter. */
export function rosterToCsv(students: StudentSummary[]): string {
  const header = [
    "name", "email", "status", "language", "chapters_completed", "chapters_available",
    "xp", "level", "last_active", "now_on", "fails_on_current_step",
    "submissions", "successful_submissions", "hints_used", "zen_learned", "joined_at",
    ...CLASSROOM_CHAPTERS.map((c) => c.id),
  ];
  const rows = students.map((s) => [
    s.name, s.email ?? "", s.status, s.language, s.progress.completedChapterIds.length, s.progress.availableCount,
    s.xp, s.level, s.lastActiveAt ?? "", describeLocation(s.nowOn), s.failsOnCurrentStep,
    s.submissions, s.successfulSubmissions, s.hintsUsed, s.zenLearned, s.joinedAt,
    ...CLASSROOM_CHAPTERS.map((c) => (s.progress.completedChapterIds.includes(c.id) ? 1 : 0)),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
