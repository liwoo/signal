/**
 * Classroom types — teachers, classes, rosters, and the activity log the
 * teacher dashboard reads. Mirrors supabase/migrations/0002_classrooms.sql.
 */

import type { LanguageId } from "./game";

/** A dedicated teacher account (public.teachers). Only teachers can create classes. */
export interface TeacherAccount {
  id: string;
  fullName: string;
  school: string;
  /** Set by SIGNAL staff after review; clients can't write it. */
  verified: boolean;
  createdAt: string;
}

export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  joinCode: string;
  joiningOpen: boolean;
  createdAt: string;
}

/** What a student sees before joining (from the classroom_preview RPC). */
export interface ClassroomPreview {
  classroomId: string;
  name: string;
  teacherName: string;
  teacherSchool: string;
  joiningOpen: boolean;
  alreadyMember: boolean;
  /** The caller teaches this class. */
  isTeacher: boolean;
  /** The caller has a teacher account (and so can't join as a student). */
  callerIsTeacher: boolean;
}

/** A class the signed-in student belongs to. */
export interface StudentClassroom {
  id: string;
  name: string;
  teacherName: string;
  teacherSchool: string;
  joinedAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export type ProgressEventKind =
  | "chapter_start"
  | "submit"
  | "step_complete"
  | "chapter_complete"
  | "hint"
  | "game_over";

export interface ProgressEvent {
  kind: ProgressEventKind;
  language: LanguageId;
  chapterId: string;
  stepId: string | null;
  /** submit: { success, attempt } · step/chapter_complete: { xp } · game_over: { cause } · hint: { level } */
  data: Record<string, string | number | boolean>;
  createdAt: string;
}

/** One student's raw rows, as fetched for the roster. */
export interface RosterRow {
  profile: Profile;
  joinedAt: string;
  /** The student's game_state blob (null if they've never loaded the game). */
  state: unknown;
  stateUpdatedAt: string | null;
  /** Newest first. */
  events: ProgressEvent[];
}

export type StudentStatus = "not_started" | "active" | "stuck" | "idle" | "finished";

export interface LanguageProgressSummary {
  language: LanguageId;
  /** Chapter ids cleared, in play order. */
  completedChapterIds: string[];
  /** Chapters playable in this language. */
  availableCount: number;
}

export interface StudentSummary {
  studentId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  status: StudentStatus;
  xp: number;
  level: number;
  /** The language they're currently set to learn in. */
  language: LanguageId;
  /** Progress in `language` — what the roster shows. */
  progress: LanguageProgressSummary;
  /** Every language they've cleared at least one chapter in. */
  otherLanguages: LanguageProgressSummary[];
  lastActiveAt: string | null;
  /** Where their latest activity was. `cleared` = it was finishing that chapter. */
  nowOn: { chapterId: string; stepId: string | null; language: LanguageId; cleared?: boolean } | null;
  /** Failed submissions on the step they're on, since they last cleared it. */
  failsOnCurrentStep: number;
  /** Totals over the fetched activity window. */
  submissions: number;
  successfulSubmissions: number;
  hintsUsed: number;
  gameOvers: number;
  /** Zen idioms followed / met. */
  zenLearned: number;
  zenSeen: number;
  /** Activity counts per day, oldest → today. */
  dailyActivity: number[];
}

export interface ChapterFunnelEntry {
  chapterId: string;
  title: string;
  isBoss: boolean;
  /** Students who cleared it (in their current language). */
  completed: number;
  /** Students whose latest activity is in it and who haven't cleared it. */
  inProgress: number;
}

export interface ClassSummary {
  studentCount: number;
  activeThisWeek: number;
  stuck: number;
  notStarted: number;
  avgChaptersCompleted: number;
  funnel: ChapterFunnelEntry[];
}
