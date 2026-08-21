-- Finished replays are immutable, language-neutral action streams.
-- Browsers may read their own rows but cannot insert/update/delete them directly;
-- the authoritative API writes with the service role after validating the payload.

create table public.finished_replays (
  id text primary key check (char_length(id) between 8 and 160),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  ruleset public.ruleset_id not null,
  opponent_mode text not null check (opponent_mode in ('ai', 'local', 'online')),
  created_at timestamptz not null,
  result jsonb,
  initial_state jsonb,
  actions jsonb not null check (jsonb_typeof(actions) = 'array'),
  final_hash text,
  options jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  check (
    (ruleset = 'classic' and initial_state is null and final_hash is null)
    or
    (ruleset <> 'classic' and initial_state is not null and final_hash is not null)
  )
);

create index finished_replays_profile_created_idx
  on public.finished_replays (profile_id, created_at desc);

alter table public.finished_replays enable row level security;

create policy finished_replays_select_own
  on public.finished_replays
  for select
  to authenticated
  using ((select auth.uid()) = profile_id);

grant select on public.finished_replays to authenticated;
grant all on public.finished_replays to service_role;
