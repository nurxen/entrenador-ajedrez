-- Entrenador de Ajedrez · esquema de Supabase
-- Pégalo en Supabase → SQL Editor → New query → Run

create table if not exists public.games (
  user_id     uuid not null references auth.users (id) on delete cascade,
  id          text not null,                 -- "cc-<id de chess.com>" o "pgn-<hash>"
  source      text,                          -- 'chesscom' | 'pgn'
  url         text,
  pgn         text not null,
  played_at   timestamptz,
  white       text,
  black       text,
  result      text,
  time_class  text,
  my_color    text check (my_color in ('w', 'b')),
  accuracy    real,                          -- tu precisión en la partida
  opening     text,
  analysis    jsonb,                         -- análisis completo jugada a jugada
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists games_user_played on public.games (user_id, played_at desc);

-- Cada usuario solo ve y modifica sus propias partidas
alter table public.games enable row level security;

drop policy if exists "leer mis partidas" on public.games;
drop policy if exists "crear mis partidas" on public.games;
drop policy if exists "editar mis partidas" on public.games;
drop policy if exists "borrar mis partidas" on public.games;

create policy "leer mis partidas"   on public.games for select using (auth.uid() = user_id);
create policy "crear mis partidas"  on public.games for insert with check (auth.uid() = user_id);
create policy "editar mis partidas" on public.games for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "borrar mis partidas" on public.games for delete using (auth.uid() = user_id);

-- Vista útil para consultar tus estadísticas desde el panel de Supabase
create or replace view public.my_game_summary with (security_invoker = on) as
select played_at::date as fecha, white, black, result, my_color, accuracy, opening, time_class
from public.games order by played_at desc;

-- ───── Versión 2: progreso de entrenamiento (lecciones, repasos, racha) ─────
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "mi progreso" on public.progress;
create policy "mi progreso" on public.progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
