begin;

-- Compatibility schema for rooms already handled by the legacy client. These rows
-- are deliberately separate from authoritative `matches` and can be retired after
-- active rooms finish; no active room needs an in-place migration.
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  mode text not null check (mode in ('classic', 'quantum')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  host_color text not null check (host_color in ('w', 'b')),
  white_player_id uuid references auth.users(id) on delete set null,
  black_player_id uuid references auth.users(id) on delete set null,
  state jsonb not null,
  version bigint not null default 0,
  turn text not null default 'w' check (turn in ('w', 'b')),
  config jsonb not null default '{}'::jsonb,
  measurement_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_moves (
  room_id uuid not null references public.rooms(id) on delete cascade,
  version bigint not null,
  actor_color text check (actor_color in ('w', 'b')),
  mode text not null check (mode in ('classic', 'quantum')),
  move jsonb,
  state jsonb not null,
  created_at timestamptz not null default now(),
  primary key (room_id, version)
);

alter table public.rooms enable row level security;
alter table public.room_moves enable row level security;

create policy legacy_rooms_read_participant on public.rooms for select to authenticated using (
  status = 'waiting' or white_player_id = (select auth.uid()) or black_player_id = (select auth.uid())
);
create policy legacy_rooms_create on public.rooms for insert to authenticated with check (
  white_player_id = (select auth.uid()) or black_player_id = (select auth.uid())
);
create policy legacy_rooms_join_or_update on public.rooms for update to authenticated using (
  white_player_id = (select auth.uid()) or black_player_id = (select auth.uid())
  or (status = 'waiting' and (white_player_id is null or black_player_id is null))
) with check (
  white_player_id = (select auth.uid()) or black_player_id = (select auth.uid())
);
create policy legacy_room_moves_read on public.room_moves for select to authenticated using (
  exists (
    select 1 from public.rooms r where r.id = room_moves.room_id
      and (r.white_player_id = (select auth.uid()) or r.black_player_id = (select auth.uid()))
  )
);
create policy legacy_room_moves_insert on public.room_moves for insert to authenticated with check (
  exists (
    select 1 from public.rooms r where r.id = room_moves.room_id
      and (r.white_player_id = (select auth.uid()) or r.black_player_id = (select auth.uid()))
  )
);

grant select, insert, update on public.rooms to authenticated;
grant select, insert on public.room_moves to authenticated;
grant all on public.rooms, public.room_moves to service_role;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.match_events;

commit;
