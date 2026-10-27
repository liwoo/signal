# Classrooms Spec

## Purpose

Let teachers onboard a class of students and follow each student's progress through SIGNAL: who has started, which chapter and step they're on, who is stuck, and who has gone quiet.

Builds on Google sign-in + the `game_state` cloud save (`authentication.md`, `0001_game_state.sql`).

---

## Roles — teacher accounts are separate

Teaching requires a **teacher account**: a row in `public.teachers` (name + school), created through the onboarding form the first time someone signs in at `/teach` (`0003_teacher_accounts.sql`).

- Only teacher accounts can create classes (RLS on `classrooms` insert).
- Teacher accounts can't join classes as students (`join_classroom` refuses; `/join` explains and links to `/teach`).
- A Google account that's already a student in a class can't register as a teacher (RLS on `teachers` insert) — teachers use their school account.
- Clients may write `full_name` and `school` only. `verified` is reserved for manual review by SIGNAL staff (service role / dashboard) and isn't enforced yet.
- Students are ordinary player accounts — no registration step.

## Onboarding flow

### Teacher

1. Opens `/teach` (linked from the landing footer as "for teachers") → Google sign-in (returns to `/teach`).
2. First time only: **Create your teacher account** — name (prefilled from Google), school/organization, and a confirmation they're an educator.
3. Creates a class by name. The database issues a 6-character **join code** from an unambiguous alphabet (no `0/O`, `1/I/L`).
4. **Invite students** dialog: copy the invite link (`/join/<CODE>`) or code, or **Show on projector** (full-screen code).
5. Class menu: rename, close/reopen joining (roster stays, no new students), reset join code (old code + links stop working), delete class (students keep their own game progress).

### Student

1. Opens `/join/<CODE>` or types the code at `/join` → Google sign-in (returns to the same join URL).
2. Sees the class name, the teacher's name, and a plain disclosure of what the teacher will see. Taps **JOIN CLASS**.
3. Lands on `/play`. Progress from before joining counts — the teacher sees the student's whole save.
4. Can **LEAVE** any class from `/join` at any time; the teacher loses access immediately.

Students never need a code to play — classes are opt-in.

## What teachers see (`/teach`)

The console is a standard shadcn-style dashboard (sidebar of classes, breadcrumb header, cards, table, sheets/dialogs) — deliberately not the game's terminal look. See "Design system" below.

- **Class stats:** students, active this week, average chapters cleared, stuck now, not started.
- **Chapter progress funnel:** per built chapter, how many students cleared it and how many are currently in it (in each student's current language).
- **Roster:** name/email, status, chapters cleared (n / available in their language), "now on" (chapter · step), last active, XP, 14-day activity sparkline. Sortable; filterable by status. Auto-refreshes every 60s while visible. **EXPORT CSV** (one 0/1 column per chapter).
- **Student drawer:** chapter checklist, other languages played, practice stats over 30 days (submissions, pass rate, hints, game overs, XP/level, zen idioms), a readable activity timeline, and **REMOVE FROM CLASS**.

### Status rules (`src/lib/classroom/summary.ts`)

| Status | Rule (first match wins) |
| --- | --- |
| NOT STARTED | no chapter cleared in any language and no recorded activity |
| FINISHED | cleared every chapter available in their current language |
| IDLE | no activity (save or event) for 7+ days |
| STUCK | 5+ failed submissions on their current step since it was last cleared |
| ACTIVE | otherwise |

Teachers cannot see: the code students write, their chats with Maya, or other classes' students. Teachers cannot change student progress.

## Data model (`supabase/migrations/0002_classrooms.sql`)

| Table | Purpose |
| --- | --- |
| `profiles` | display name / email / avatar. Created by trigger on sign-up, backfilled for existing users, refreshed by the client on every sign-in. |
| `teachers` | teacher accounts: `full_name`, `school`, `verified` (staff-only). Backfilled for anyone who created a class before 0003. |
| `classrooms` | `teacher_id`, `name`, unique `join_code`, `joining_open`. Insert requires a teacher account. |
| `classroom_members` | `(classroom_id, student_id)`, `joined_at`. **No insert policy** — rows are only created by the `join_classroom` RPC, so a code is the only way in. |
| `progress_events` | append-only activity log: `chapter_start`, `submit` (`{success, attempt}`), `step_complete` (`{xp, attempts}`), `chapter_complete`, `hint` (`{level}`), `game_over` (`{cause}`). |

RPCs (all `security definer`, `authenticated` only): `classroom_preview(code)` (returns teacher name + school, and whether the caller is a teacher account), `join_classroom(code)`, `rotate_join_code(cid)`.

### RLS summary

- Teachers: full control of their own `classrooms`; read + delete their classes' memberships; **read-only** on their students' `profiles`, `game_state`, `progress_events`.
- Students: read their own memberships and the classes/teachers they belong to; leave (delete own membership); insert their own `progress_events`. Cannot see classmates.
- Cross-table checks go through `security definer` helpers (`is_classroom_teacher`, `is_classroom_member`, `teaches_student`, `is_my_teacher`) to avoid policy recursion.

## Client architecture

- `src/lib/classroom/activity.ts` — `recordActivity()` fire-and-forget sink. `AuthProvider` sets the user via `setActivityUser()`; signed-out play records nothing. Called from `useGame` (submit / step / chapter / hint / timer game over) and `play/page.tsx` (chapter start, boss outcomes) next to the existing analytics calls.
- `src/lib/classroom/api.ts` — Supabase reads/writes, throws `ClassroomError` with player-facing messages.
- `src/lib/classroom/summary.ts` — pure roster math (tested in `summary.test.ts`).
- `src/data/classroom.ts` — built chapters in play order (`Challenge.chapter` ↔ id). **Add new chapters here** when they ship, in step with `CHAPTERS` in `play/page.tsx`.
- `src/components/teacher/` — the console: `TeacherConsole` (sign-in → teacher account → dashboard gates), `TeacherSignIn`, `TeacherOnboarding`, `TeacherDashboard` (sidebar shell), `ClassPage`, `StudentsTable`, `StudentSheet`, `charts`, `status`.
- `src/components/teacher-ui/` — shadcn-style primitives (see Design system).
- `src/components/classroom/` — the student join flow (`JoinClassroom`), in the game look.
- Sign-in return path: `signInWithGoogle(returnPath)` sets the OAuth `redirectTo` **and** stashes the path in sessionStorage (`src/lib/storage/return-path.ts`), so the round-trip lands back on `/join/<CODE>` or `/teach` even if Supabase falls back to the Site URL.

## Setup checklist

1. Apply `supabase/migrations/0002_classrooms.sql` then `0003_teacher_accounts.sql` (SQL editor or `supabase db push`).
2. Supabase → Auth → URL Configuration → Redirect URLs: allow `https://<prod-domain>/**` and `http://localhost:3000/**` (needed for `/teach` and `/join/*` returns).

## Design system (teacher console only)

- Primitives in `src/components/teacher-ui/` mirror shadcn/ui (new-york, neutral): Button, Card, Badge, Input/Label, Table, Dialog, Sheet, DropdownMenu, Avatar, Progress, Skeleton, Separator. Icons from `lucide-react`. Font: Geist / Geist Mono (`app/teach/layout.tsx`).
- Tokens are `tc-*` (`bg-tc-card`, `text-tc-muted-foreground`, …), defined in `globals.css` and only resolved inside `.teacher-ui`. Light by default, dark via `prefers-color-scheme`.
- Charts follow the dataviz method: one blue ramp (`tc-chart-1` cleared, `tc-chart-2` in progress), legend + hover tooltips; status badges use the reserved status hues (`tc-good`, `tc-warning`, `tc-critical`) always with an icon and label.
- `shadcn init` is intentionally not used: it would rewrite the game's global `--color-*` tokens.

## Visual QA

`test-visual/capture-classroom.mjs` drives `/teach` (signed out, onboarding, dashboard, chart hover, student sheet, filters, menu, invite, projector, dark mode, mobile) and `/join` against a faked Supabase (planted session + intercepted REST) with an 8-student fixture roster.

## Later

- Assignments / target chapter per class, due dates.
- Teacher-only notes per student.
- Co-teachers.
- Pruning `progress_events` older than a school year.
