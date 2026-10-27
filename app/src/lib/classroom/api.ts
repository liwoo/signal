/**
 * Supabase data access for classrooms. RLS (0002_classrooms.sql) is the real
 * gate — these calls just shape rows into the types in @/types/classroom.
 * Every function throws a ClassroomError with a player-facing message on failure.
 */

import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type {
  Classroom,
  ClassroomPreview,
  Profile,
  ProgressEvent,
  RosterRow,
  StudentClassroom,
  TeacherAccount,
} from "@/types/classroom";

export class ClassroomError extends Error {}

/** How far back the roster reads the activity log. */
export const ROSTER_EVENT_WINDOW_DAYS = 30;
const ROSTER_EVENT_LIMIT = 10_000;

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new ClassroomError("cloud offline — auth isn't configured");
  return supabase;
}

/** Turn a PostgREST / RPC error into something we can show. RPCs raise readable messages. */
function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const raw = error?.message ?? "";
  const readable = /^(no class|you teach|this class is closed|not your class|not signed in|teacher accounts can't)/i.test(raw);
  throw new ClassroomError(readable ? raw.toLowerCase() : fallback);
}

interface ClassroomRow {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  joining_open: boolean;
  created_at: string;
}

function toClassroom(r: ClassroomRow): Classroom {
  return {
    id: r.id,
    teacherId: r.teacher_id,
    name: r.name,
    joinCode: r.join_code,
    joiningOpen: r.joining_open,
    createdAt: r.created_at,
  };
}

const CLASSROOM_COLUMNS = "id, teacher_id, name, join_code, joining_open, created_at";

// ── Profiles ──

/** Keep the signed-in user's roster name / avatar fresh (called on sign-in). */
export async function upsertOwnProfile(user: User): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const meta = user.user_metadata ?? {};
  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: (meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "",
    email: user.email ?? null,
    avatar_url: (meta.avatar_url as string) ?? null,
    updated_at: new Date().toISOString(),
  });
}

// ── Teacher account ──

interface TeacherRow {
  id: string;
  full_name: string;
  school: string;
  verified: boolean;
  created_at: string;
}

const TEACHER_COLUMNS = "id, full_name, school, verified, created_at";

function toTeacher(r: TeacherRow): TeacherAccount {
  return { id: r.id, fullName: r.full_name, school: r.school, verified: r.verified, createdAt: r.created_at };
}

/** The signed-in user's teacher account, or null if they don't have one. */
export async function getTeacherAccount(userId: string): Promise<TeacherAccount | null> {
  const { data, error } = await client().from("teachers").select(TEACHER_COLUMNS).eq("id", userId).maybeSingle();
  if (error) fail(error, "couldn't load your teacher account");
  return data ? toTeacher(data as TeacherRow) : null;
}

export async function createTeacherAccount(
  userId: string,
  details: { fullName: string; school: string },
): Promise<TeacherAccount> {
  const { data, error } = await client()
    .from("teachers")
    .insert({ id: userId, full_name: details.fullName.trim(), school: details.school.trim() })
    .select(TEACHER_COLUMNS)
    .single();
  if (error) {
    // RLS refuses accounts that are already a student in a class.
    if (error.code === "42501") {
      throw new ClassroomError(
        "This Google account is a student in a class. Sign in with your school account, or leave your classes at /join first.",
      );
    }
    fail(error, "Couldn't create your teacher account.");
  }
  return toTeacher(data as TeacherRow);
}

export async function updateTeacherAccount(
  userId: string,
  details: { fullName: string; school: string },
): Promise<void> {
  const { error } = await client()
    .from("teachers")
    .update({ full_name: details.fullName.trim(), school: details.school.trim() })
    .eq("id", userId);
  if (error) fail(error, "Couldn't save your details.");
}

// ── Teacher ──

export async function listTeachingClassrooms(teacherId: string): Promise<Classroom[]> {
  const { data, error } = await client()
    .from("classrooms")
    .select(CLASSROOM_COLUMNS)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });
  if (error) fail(error, "couldn't load your classes");
  return (data as ClassroomRow[]).map(toClassroom);
}

/** Student counts per class, for the class list. */
export async function countStudents(classroomIds: string[]): Promise<Record<string, number>> {
  if (classroomIds.length === 0) return {};
  const { data, error } = await client()
    .from("classroom_members")
    .select("classroom_id")
    .in("classroom_id", classroomIds);
  if (error) fail(error, "couldn't count students");
  const counts: Record<string, number> = {};
  for (const r of data as { classroom_id: string }[]) counts[r.classroom_id] = (counts[r.classroom_id] ?? 0) + 1;
  return counts;
}

export async function createClassroom(teacherId: string, name: string): Promise<Classroom> {
  const { data, error } = await client()
    .from("classrooms")
    .insert({ teacher_id: teacherId, name: name.trim() })
    .select(CLASSROOM_COLUMNS)
    .single();
  if (error) fail(error, "couldn't create the class");
  return toClassroom(data as ClassroomRow);
}

export async function updateClassroom(
  id: string,
  patch: Partial<Pick<Classroom, "name" | "joiningOpen">>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.joiningOpen !== undefined) row.joining_open = patch.joiningOpen;
  const { error } = await client().from("classrooms").update(row).eq("id", id);
  if (error) fail(error, "couldn't update the class");
}

export async function rotateJoinCode(id: string): Promise<string> {
  const { data, error } = await client().rpc("rotate_join_code", { cid: id });
  if (error) fail(error, "couldn't issue a new code");
  return data as string;
}

export async function deleteClassroom(id: string): Promise<void> {
  const { error } = await client().from("classrooms").delete().eq("id", id);
  if (error) fail(error, "couldn't delete the class");
}

export async function removeStudent(classroomId: string, studentId: string): Promise<void> {
  const { error } = await client()
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId);
  if (error) fail(error, "couldn't remove the student");
}

interface EventRow {
  user_id: string;
  kind: ProgressEvent["kind"];
  language: ProgressEvent["language"];
  chapter_id: string;
  step_id: string | null;
  data: ProgressEvent["data"] | null;
  created_at: string;
}

/** Everything the dashboard needs for one class: members + profiles + saves + recent activity. */
export async function fetchRoster(classroomId: string): Promise<RosterRow[]> {
  const supabase = client();
  const { data: members, error: mErr } = await supabase
    .from("classroom_members")
    .select("student_id, joined_at")
    .eq("classroom_id", classroomId);
  if (mErr) fail(mErr, "couldn't load the roster");
  const rows = members as { student_id: string; joined_at: string }[];
  if (rows.length === 0) return [];
  const ids = rows.map((m) => m.student_id);
  const since = new Date(Date.now() - ROSTER_EVENT_WINDOW_DAYS * 86_400_000).toISOString();

  const [profiles, states, events] = await Promise.all([
    supabase.from("profiles").select("id, display_name, email, avatar_url").in("id", ids),
    supabase.from("game_state").select("user_id, state, updated_at").in("user_id", ids),
    supabase
      .from("progress_events")
      .select("user_id, kind, language, chapter_id, step_id, data, created_at")
      .in("user_id", ids)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ROSTER_EVENT_LIMIT),
  ]);
  if (profiles.error) fail(profiles.error, "couldn't load student names");
  if (states.error) fail(states.error, "couldn't load student progress");
  if (events.error) fail(events.error, "couldn't load student activity");

  const profileById = new Map(
    (profiles.data as { id: string; display_name: string; email: string | null; avatar_url: string | null }[]).map((p) => [
      p.id,
      { id: p.id, displayName: p.display_name, email: p.email, avatarUrl: p.avatar_url } satisfies Profile,
    ]),
  );
  const stateById = new Map(
    (states.data as { user_id: string; state: unknown; updated_at: string }[]).map((s) => [s.user_id, s]),
  );
  const eventsById = new Map<string, ProgressEvent[]>();
  for (const e of events.data as EventRow[]) {
    const list = eventsById.get(e.user_id) ?? [];
    list.push({
      kind: e.kind,
      language: e.language,
      chapterId: e.chapter_id,
      stepId: e.step_id,
      data: e.data ?? {},
      createdAt: e.created_at,
    });
    eventsById.set(e.user_id, list);
  }

  return rows.map((m) => ({
    profile: profileById.get(m.student_id) ?? { id: m.student_id, displayName: "", email: null, avatarUrl: null },
    joinedAt: m.joined_at,
    state: stateById.get(m.student_id)?.state ?? null,
    stateUpdatedAt: stateById.get(m.student_id)?.updated_at ?? null,
    events: eventsById.get(m.student_id) ?? [],
  }));
}

// ── Student ──

export async function previewClassroom(code: string): Promise<ClassroomPreview | null> {
  const { data, error } = await client().rpc("classroom_preview", { code });
  if (error) fail(error, "couldn't look up that code");
  const row = (data as {
    classroom_id: string;
    name: string;
    teacher_name: string;
    teacher_school: string | null;
    joining_open: boolean;
    already_member: boolean;
    is_teacher: boolean;
    caller_is_teacher: boolean | null;
  }[])[0];
  if (!row) return null;
  return {
    classroomId: row.classroom_id,
    name: row.name,
    teacherName: row.teacher_name,
    teacherSchool: row.teacher_school ?? "",
    joiningOpen: row.joining_open,
    alreadyMember: row.already_member,
    isTeacher: row.is_teacher,
    callerIsTeacher: Boolean(row.caller_is_teacher),
  };
}

export async function joinClassroom(code: string): Promise<string> {
  const { data, error } = await client().rpc("join_classroom", { code });
  if (error) fail(error, "couldn't join the class");
  return data as string;
}

export async function listStudentClassrooms(studentId: string): Promise<StudentClassroom[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("classroom_members")
    .select("joined_at, classrooms ( id, name, teacher_id )")
    .eq("student_id", studentId);
  if (error) fail(error, "couldn't load your classes");
  const rows = data as unknown as { joined_at: string; classrooms: { id: string; name: string; teacher_id: string } | null }[];
  const classes = rows.filter((r) => r.classrooms);
  const teacherIds = [...new Set(classes.map((r) => r.classrooms!.teacher_id))];
  const teachers = new Map<string, { full_name: string; school: string }>();
  if (teacherIds.length) {
    const { data } = await supabase.from("teachers").select("id, full_name, school").in("id", teacherIds);
    for (const t of (data ?? []) as { id: string; full_name: string; school: string }[]) teachers.set(t.id, t);
  }
  return classes.map((r) => ({
    id: r.classrooms!.id,
    name: r.classrooms!.name,
    teacherName: teachers.get(r.classrooms!.teacher_id)?.full_name || "your teacher",
    teacherSchool: teachers.get(r.classrooms!.teacher_id)?.school ?? "",
    joinedAt: r.joined_at,
  }));
}

export async function leaveClassroom(classroomId: string, studentId: string): Promise<void> {
  const { error } = await client()
    .from("classroom_members")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId);
  if (error) fail(error, "couldn't leave the class");
}
