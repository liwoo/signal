-- SIGNAL — classrooms: teachers onboard students and track their progress.
--
--   profiles           display name / email / avatar per user (for rosters)
--   classrooms         one row per class; owned by the teacher who created it
--   classroom_members  student ↔ classroom (inserted only via join_classroom)
--   progress_events    step-level activity log (submits, step/chapter clears,
--                      hints, game overs) — what the teacher dashboard reads
--                      for "now on", "stuck" and "last active"
--
-- Anyone signed in can create a class (becoming its teacher). Students join
-- with the class's 6-character code. A teacher can read the profile,
-- game_state and progress_events of students in their classes — nothing else.
--
-- Apply after 0001_game_state.sql. Spec: spec/infrastructure/classrooms.md

-- ── Profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email        text,
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

-- New sign-ups get a profile straight from their OAuth metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), ''),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill everyone who signed in before this migration.
insert into public.profiles (id, display_name, email, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), ''),
  u.email,
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ── Classrooms ──────────────────────────────────────────────────────────────

-- 6 chars from an alphabet with no look-alikes (no 0/O, 1/I/L) — easy to read
-- off a projector and type on a phone.
create or replace function public.gen_join_code()
returns text
language sql
volatile
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

create table if not exists public.classrooms (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  join_code   text not null unique default public.gen_join_code(),
  -- Closed classes keep their roster visible but stop accepting new students.
  joining_open boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists classrooms_teacher_idx on public.classrooms (teacher_id);

create table if not exists public.classroom_members (
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_id   uuid not null references auth.users (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

create index if not exists classroom_members_student_idx on public.classroom_members (student_id);

-- ── Activity log ────────────────────────────────────────────────────────────

create table if not exists public.progress_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('chapter_start', 'submit', 'step_complete', 'chapter_complete', 'hint', 'game_over')),
  language    text not null,
  chapter_id  text not null,
  step_id     text,
  -- kind-specific detail: { success, attempt } for submit, { xp } for clears, ...
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists progress_events_user_time_idx on public.progress_events (user_id, created_at desc);

-- ── RLS helpers ─────────────────────────────────────────────────────────────
-- security definer so policies on classrooms ↔ classroom_members can reference
-- each other without recursing through RLS.

create or replace function public.is_classroom_teacher(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from classrooms where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_classroom_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from classroom_members where classroom_id = cid and student_id = auth.uid());
$$;

-- True when the caller teaches a class this student belongs to.
create or replace function public.teaches_student(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from classroom_members m
    join classrooms c on c.id = m.classroom_id
    where m.student_id = sid and c.teacher_id = auth.uid()
  );
$$;

-- True when this user teaches a class the caller belongs to.
create or replace function public.is_my_teacher(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from classroom_members m
    join classrooms c on c.id = m.classroom_id
    where m.student_id = auth.uid() and c.teacher_id = tid
  );
$$;

-- ── Policies ────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.progress_events enable row level security;

-- profiles: your own, your students', your teachers'.
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.teaches_student(id) or public.is_my_teacher(id));

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- classrooms: teachers manage their own; students can see classes they're in.
drop policy if exists "read classrooms" on public.classrooms;
create policy "read classrooms" on public.classrooms
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_classroom_member(id));

drop policy if exists "create classrooms" on public.classrooms;
create policy "create classrooms" on public.classrooms
  for insert to authenticated
  with check (teacher_id = auth.uid());

drop policy if exists "update own classrooms" on public.classrooms;
create policy "update own classrooms" on public.classrooms
  for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "delete own classrooms" on public.classrooms;
create policy "delete own classrooms" on public.classrooms
  for delete to authenticated
  using (teacher_id = auth.uid());

-- classroom_members: students see their own memberships, teachers see their
-- rosters. Joining goes through join_classroom() (no insert policy), so a
-- class code is the only way in. Students may leave; teachers may remove.
drop policy if exists "read memberships" on public.classroom_members;
create policy "read memberships" on public.classroom_members
  for select to authenticated
  using (student_id = auth.uid() or public.is_classroom_teacher(classroom_id));

drop policy if exists "leave or remove" on public.classroom_members;
create policy "leave or remove" on public.classroom_members
  for delete to authenticated
  using (student_id = auth.uid() or public.is_classroom_teacher(classroom_id));

-- game_state (from 0001): teachers can read — never write — their students' saves.
drop policy if exists "teachers read student game_state" on public.game_state;
create policy "teachers read student game_state" on public.game_state
  for select to authenticated
  using (public.teaches_student(user_id));

-- progress_events: append-only for the player; readable by them and their teachers.
drop policy if exists "insert own events" on public.progress_events;
create policy "insert own events" on public.progress_events
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "read events" on public.progress_events;
create policy "read events" on public.progress_events
  for select to authenticated
  using (user_id = auth.uid() or public.teaches_student(user_id));

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- What a student sees before joining: the class name and who teaches it.
create or replace function public.classroom_preview(code text)
returns table (classroom_id uuid, name text, teacher_name text, joining_open boolean, already_member boolean, is_teacher boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    coalesce(nullif(p.display_name, ''), 'your teacher'),
    c.joining_open,
    exists (select 1 from classroom_members m where m.classroom_id = c.id and m.student_id = auth.uid()),
    c.teacher_id = auth.uid()
  from classrooms c
  left join profiles p on p.id = c.teacher_id
  where c.join_code = upper(btrim(code));
$$;

create or replace function public.join_classroom(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c classrooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select * into c from classrooms where join_code = upper(btrim(code));
  if not found then
    raise exception 'no class with that code' using errcode = 'P0002';
  end if;
  if c.teacher_id = auth.uid() then
    raise exception 'you teach this class' using errcode = 'P0001';
  end if;
  if exists (select 1 from classroom_members where classroom_id = c.id and student_id = auth.uid()) then
    return c.id;
  end if;
  if not c.joining_open then
    raise exception 'this class is closed to new students' using errcode = 'P0001';
  end if;
  insert into classroom_members (classroom_id, student_id) values (c.id, auth.uid());
  return c.id;
end;
$$;

-- Issue a fresh code (e.g. after the old one leaked). Old links stop working.
create or replace function public.rotate_join_code(cid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code text;
begin
  if not public.is_classroom_teacher(cid) then
    raise exception 'not your class' using errcode = '42501';
  end if;
  loop
    next_code := public.gen_join_code();
    exit when not exists (select 1 from classrooms where join_code = next_code);
  end loop;
  update classrooms set join_code = next_code where id = cid;
  return next_code;
end;
$$;

revoke all on function public.classroom_preview(text) from public, anon;
revoke all on function public.join_classroom(text) from public, anon;
revoke all on function public.rotate_join_code(uuid) from public, anon;
grant execute on function public.classroom_preview(text) to authenticated;
grant execute on function public.join_classroom(text) to authenticated;
grant execute on function public.rotate_join_code(uuid) to authenticated;
