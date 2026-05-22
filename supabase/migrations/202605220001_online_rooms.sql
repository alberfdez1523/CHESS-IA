create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  mode text not null check (mode in ('classic', 'quantum')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  host_color text not null check (host_color in ('w', 'b')),
  white_player_id uuid,
  black_player_id uuid,
  state jsonb not null,
  version integer not null default 0,
  turn text not null default 'w' check (turn in ('w', 'b')),
  config jsonb not null default '{}'::jsonb,
  measurement_seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rooms replica identity full;

alter table public.rooms enable row level security;

drop policy if exists "rooms_select_authenticated" on public.rooms;
drop policy if exists "rooms_insert_authenticated" on public.rooms;
drop policy if exists "rooms_update_authenticated" on public.rooms;
drop policy if exists "rooms_delete_authenticated" on public.rooms;

create policy "rooms_select_authenticated"
  on public.rooms for select
  to authenticated
  using (true);

create policy "rooms_insert_authenticated"
  on public.rooms for insert
  to authenticated
  with check (true);

create policy "rooms_update_authenticated"
  on public.rooms for update
  to authenticated
  using (true)
  with check (true);

create policy "rooms_delete_authenticated"
  on public.rooms for delete
  to authenticated
  using (true);

create or replace function public.abandon_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rooms where id = p_room_id;
  return found;
end;
$$;

grant execute on function public.abandon_room(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end;
$$;
