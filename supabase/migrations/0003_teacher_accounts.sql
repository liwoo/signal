-- SIGNAL — dedicated teacher accounts.
--
-- 0002 let any signed-in user create a class. Now teaching needs a teacher
-- account: a row in public.teachers, created through the teacher onboarding
-- at /teach (name + school). Only teachers can create classes, and teacher
-- accounts can't join classes as students — players and teachers stay separate.
--
-- `verified` is reserved for manual review (set it from the dashboard / service
-- role); clients can never write it.
--
-- Apply after 0002_classrooms.sql. Spec: spec/infrastructure/classrooms.md

create table if not exists public.teachers (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 120),
  school      text not null default '' check (char_length(school) <= 160),
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Anyone who already created a class under 0002 becomes a teacher.
insert into public.teachers (id, full_name)
select distinct on (c.teacher_id)
  c.teacher_id,
  coalesce(nullif(btrim(p.display_name), ''), 'Teacher')
from public.classrooms c
left join public.profiles p on p.id = c.teacher_id
on conflict (id) do nothing;

create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from teachers where id = uid);
$$;

alter table public.teachers enable row level security;

-- Clients may set their own name/school, never `verified`.
revoke insert, update on public.teachers from authenticated, anon;
grant select on public.teachers to authenticated;
grant insert (id, full_name, school) on public.teachers to authenticated;
grant update (full_name, school) on public.teachers to authenticated;

-- Your own account, and the teachers of classes you're in (for "taught by").
drop policy if exists "read teachers" on public.teachers;
create policy "read teachers" on public.teachers
  for select to authenticated
  using (id = auth.uid() or public.is_my_teacher(id));

-- A student account (in any class) can't also become a teacher.
drop policy if exists "create own teacher account" on public.teachers;
create policy "create own teacher account" on public.teachers
  for insert to authenticated
  with check (
    id = auth.uid()
    and not exists (select 1 from public.classroom_members m where m.student_id = auth.uid())
  );

drop policy if exists "update own teacher account" on public.teachers;
create policy "update own teacher account" on public.teachers
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only teacher accounts can create classes.
drop policy if exists "create classrooms" on public.classrooms;
create policy "create classrooms" on public.classrooms
  for insert to authenticated
  with check (teacher_id = auth.uid() and public.is_teacher(auth.uid()));

-- Preview now carries the school and whether the caller is a teacher account.
drop function if exists public.classroom_preview(text);
create function public.classroom_preview(code text)
returns table (
  classroom_id uuid,
  name text,
  teacher_name text,
  teacher_school text,
  joining_open boolean,
  already_member boolean,
  is_teacher boolean,
  caller_is_teacher boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    coalesce(nullif(t.full_name, ''), nullif(p.display_name, ''), 'your teacher'),
    coalesce(t.school, ''),
    c.joining_open,
    exists (select 1 from classroom_members m where m.classroom_id = c.id and m.student_id = auth.uid()),
    c.teacher_id = auth.uid(),
    public.is_teacher(auth.uid())
  from classrooms c
  left join teachers t on t.id = c.teacher_id
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
  if public.is_teacher(auth.uid()) then
    raise exception 'teacher accounts can''t join classes as students' using errcode = 'P0001';
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

revoke all on function public.classroom_preview(text) from public, anon;
grant execute on function public.classroom_preview(text) to authenticated;
revoke all on function public.is_teacher(uuid) from public, anon;
grant execute on function public.is_teacher(uuid) to authenticated;
