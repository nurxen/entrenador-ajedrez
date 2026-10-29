-- Solo para quien ya instaló la versión 1: ejecuta esto en Supabase → SQL Editor
-- ───── Versión 2: progreso de entrenamiento (lecciones, repasos, racha) ─────
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "mi progreso" on public.progress;
create policy "mi progreso" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
