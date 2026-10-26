-- SIGNAL — cloud save for authenticated players.
-- One JSONB row per user holds the whole PersistedState blob
-- (progress / stats / unlocks / settings / library).
--
-- Apply via Supabase dashboard → SQL Editor, or the Supabase CLI.
-- Backend: app/src/lib/storage/supabase.ts

create table if not exists public.game_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: a user can only read/write their own row.
alter table public.game_state enable row level security;

drop policy if exists "own game_state" on public.game_state;
create policy "own game_state"
  on public.game_state
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
