begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.ruleset_id as enum ('classic', 'quantum-standard', 'quantum-coherence');
create type public.match_status as enum ('waiting', 'playing', 'finished', 'cancelled');
create type public.match_kind as enum ('casual', 'competitive');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null check (char_length(alias) between 3 and 24),
  locale text not null default 'es' check (locale in ('es', 'en')),
  leaderboard_opt_in boolean not null default false,
  telemetry_opt_in boolean not null default false,
  age_13_confirmed boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_alias_casefold_idx on public.profiles (lower(alias));

create table public.guest_claims (
  guest_id text primary key check (char_length(guest_id) between 8 and 160),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create table public.progress_events (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_id text,
  lesson_id text not null,
  content_version text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  answer_index integer not null check (answer_index >= 0),
  correct boolean not null,
  hints_used smallint not null check (hints_used between 0 and 4),
  actions_taken integer not null check (actions_taken > 0),
  score smallint not null check (score between 0 and 100),
  offline_sequence bigint,
  received_at timestamptz not null default now(),
  check ((profile_id is not null) <> (guest_id is not null)),
  check (completed_at >= started_at)
);

create index progress_events_profile_time_idx on public.progress_events (profile_id, completed_at desc);
create index progress_events_guest_time_idx on public.progress_events (guest_id, completed_at desc);

create table public.skill_mastery (
  owner_key text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_id text,
  skill_id text not null,
  mastery numeric(5,1) not null default 0 check (mastery between 0 and 100),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  attempts integer not null default 0 check (attempts >= 0),
  independent_passes integer not null default 0 check (independent_passes >= 0),
  interval_index smallint not null default 0 check (interval_index between 0 and 4),
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (owner_key, skill_id),
  check ((profile_id is not null) <> (guest_id is not null)),
  check (owner_key = coalesce('profile:' || profile_id::text, 'guest:' || guest_id))
);

create table public.achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  earned_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  primary key (profile_id, achievement_id)
);

create table public.daily_challenges (
  challenge_date date not null,
  course text not null check (course in ('classic', 'quantum')),
  lesson_id text not null,
  seed text not null,
  ruleset public.ruleset_id not null,
  difficulty text not null check (difficulty in ('beginner', 'easy', 'medium', 'hard', 'master')),
  scoring_policy text not null,
  content_version text not null,
  primary key (challenge_date, course)
);

create table public.daily_attempts (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  guest_id text,
  challenge_date date not null,
  course text not null check (course in ('classic', 'quantum')),
  lesson_id text not null,
  answer_index integer not null,
  hints_used smallint not null check (hints_used between 0 and 4),
  actions_taken integer not null check (actions_taken > 0),
  duration_ms integer not null check (duration_ms >= 0),
  score smallint not null check (score between 0 and 100),
  validated_online boolean not null default false,
  received_at timestamptz not null default now(),
  check ((profile_id is not null) <> (guest_id is not null)),
  foreign key (challenge_date, course) references public.daily_challenges(challenge_date, course)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  ruleset public.ruleset_id not null,
  kind public.match_kind not null default 'casual',
  status public.match_status not null default 'waiting',
  white_profile_id uuid references public.profiles(id) on delete set null,
  black_profile_id uuid references public.profiles(id) on delete set null,
  white_guest_id text,
  black_guest_id text,
  config jsonb not null,
  server_state jsonb not null,
  state_hash text not null,
  version bigint not null default 0 check (version >= 0),
  turn text not null default 'w' check (turn in ('w', 'b')),
  white_time_ms bigint,
  black_time_ms bigint,
  turn_started_at timestamptz,
  measurement_paused_until timestamptz,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'competitive' or (ruleset = 'quantum-coherence' and config @> '{"timeControl":{"initialSeconds":600,"incrementSeconds":5}}'::jsonb))
);

create table public.match_events (
  match_id uuid not null references public.matches(id) on delete cascade,
  version bigint not null check (version > 0),
  action_id uuid not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_guest_id text,
  actor_color text not null check (actor_color in ('w', 'b')),
  action jsonb not null,
  resulting_hash text not null,
  server_timestamp timestamptz not null default now(),
  primary key (match_id, version),
  unique (match_id, action_id),
  check ((actor_profile_id is not null) <> (actor_guest_id is not null))
);

create index match_events_stream_idx on public.match_events (match_id, version);

create table public.ratings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  queue_id text not null default 'quantum-coherence-10+5',
  rating numeric(8,2) not null default 1500,
  deviation numeric(8,2) not null default 350,
  volatility numeric(8,6) not null default 0.06,
  games_played integer not null default 0,
  provisional boolean generated always as (games_played < 10) stored,
  updated_at timestamptz not null default now(),
  primary key (profile_id, queue_id)
);

create table public.entitlements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entitlement_id text not null,
  source text not null check (source in ('stripe', 'grant')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (profile_id, entitlement_id)
);

create table public.analytics_events (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  anonymous_session_id text,
  route text not null,
  lesson_id text,
  concept text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  score smallint check (score is null or score between 0 and 100),
  hint_level smallint check (hint_level is null or hint_level between 0 and 4),
  received_at timestamptz not null default now(),
  check ((profile_id is not null) <> (anonymous_session_id is not null))
);

-- RLS: clients may read their own functional data, but append-only events and all
-- match state mutations pass through the API/service role.
alter table public.profiles enable row level security;
alter table public.guest_claims enable row level security;
alter table public.progress_events enable row level security;
alter table public.skill_mastery enable row level security;
alter table public.achievements enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.daily_attempts enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.ratings enable row level security;
alter table public.entitlements enable row level security;
alter table public.analytics_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check (id = (select auth.uid()));
create policy progress_select_own on public.progress_events for select to authenticated
using (profile_id = (select auth.uid()));
create policy mastery_select_own on public.skill_mastery for select to authenticated
using (profile_id = (select auth.uid()));
create policy achievements_select_own on public.achievements for select to authenticated
using (profile_id = (select auth.uid()));
create policy daily_challenges_public_read on public.daily_challenges for select to anon, authenticated using (true);
create policy daily_attempts_select_own on public.daily_attempts for select to authenticated
using (profile_id = (select auth.uid()));
create policy ratings_select_own on public.ratings for select to authenticated
using (profile_id = (select auth.uid()));
create policy entitlements_select_own on public.entitlements for select to authenticated
using (profile_id = (select auth.uid()));
create policy analytics_select_own on public.analytics_events for select to authenticated
using (profile_id = (select auth.uid()));

create policy matches_players_read on public.matches for select to authenticated using (
  white_profile_id = (select auth.uid()) or black_profile_id = (select auth.uid())
);
create policy match_events_players_read on public.match_events for select to authenticated using (
  exists (
    select 1 from public.matches m
    where m.id = match_events.match_id
      and (m.white_profile_id = (select auth.uid()) or m.black_profile_id = (select auth.uid()))
  )
);

-- No INSERT/UPDATE/DELETE policies exist for matches or match_events. Authenticated
-- clients therefore cannot write snapshots or actions directly; only service_role can.

create or replace function private.apply_progress_event_v1(
  p_event jsonb,
  p_skill_id text,
  p_profile_id uuid default null,
  p_guest_id text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  owner text;
  success boolean;
  independent boolean;
  next_interval smallint;
  completed timestamptz;
begin
  if (p_profile_id is null) = (p_guest_id is null) then
    raise exception 'exactly one owner is required';
  end if;
  owner := coalesce('profile:' || p_profile_id::text, 'guest:' || p_guest_id);
  completed := (p_event->>'completedAt')::timestamptz;

  insert into public.progress_events (
    id, profile_id, guest_id, lesson_id, content_version, started_at, completed_at,
    answer_index, correct, hints_used, actions_taken, score, offline_sequence
  ) values (
    (p_event->>'id')::uuid, p_profile_id, p_guest_id, p_event->>'lessonId',
    p_event->>'contentVersion', (p_event->>'startedAt')::timestamptz, completed,
    (p_event->>'answerIndex')::integer, (p_event->>'correct')::boolean,
    (p_event->>'hintsUsed')::smallint, (p_event->>'actionsTaken')::integer,
    (p_event->>'score')::smallint, nullif(p_event->>'offlineSequence', '')::bigint
  ) on conflict (id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;

  success := (p_event->>'correct')::boolean and (p_event->>'score')::integer >= 70;
  independent := success and (p_event->>'hintsUsed')::integer = 0;

  select case
    when success then least(4, coalesce(interval_index, -1) + 1)
    else greatest(0, coalesce(interval_index, 0) - 1)
  end into next_interval
  from (select interval_index from public.skill_mastery where owner_key = owner and skill_id = p_skill_id) prior;
  next_interval := coalesce(next_interval, 0);

  insert into public.skill_mastery (
    owner_key, profile_id, guest_id, skill_id, mastery, confidence, attempts,
    independent_passes, interval_index, last_practiced_at, next_review_at
  ) values (
    owner, p_profile_id, p_guest_id, p_skill_id, round(((p_event->>'score')::numeric * 0.3)::numeric, 1),
    case when independent then 18 when success then 12 else 8 end, 1,
    case when independent then 1 else 0 end, next_interval, completed,
    completed + make_interval(days => (array[1,3,7,14,30])[next_interval + 1])
  ) on conflict (owner_key, skill_id) do update set
    mastery = round(skill_mastery.mastery * 0.7 + excluded.mastery, 1),
    confidence = least(100, skill_mastery.confidence + excluded.confidence),
    attempts = skill_mastery.attempts + 1,
    independent_passes = skill_mastery.independent_passes + excluded.independent_passes,
    interval_index = next_interval,
    last_practiced_at = completed,
    next_review_at = completed + make_interval(days => (array[1,3,7,14,30])[next_interval + 1]),
    updated_at = now();
  return true;
end;
$$;

revoke all on function private.apply_progress_event_v1(jsonb, text, uuid, text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.apply_progress_event_v1(jsonb, text, uuid, text) to service_role;

create or replace function private.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, alias)
  values (new.id, 'Jugador-' || upper(substr(replace(new.id::text, '-', ''), 1, 6)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users
for each row execute function private.handle_new_profile();

revoke all on function private.handle_new_profile() from public, anon, authenticated;

-- Explicit Data API grants are required for new Supabase projects. RLS remains
-- the row-level boundary; service_role is used only by the trusted API.
grant select on public.profiles, public.progress_events, public.skill_mastery,
  public.achievements, public.daily_attempts, public.matches, public.match_events,
  public.ratings, public.entitlements, public.analytics_events to authenticated;
grant update (alias, locale, leaderboard_opt_in, telemetry_opt_in, age_13_confirmed, settings, updated_at)
  on public.profiles to authenticated;
grant select on public.daily_challenges to anon, authenticated;
grant all on public.profiles, public.guest_claims, public.progress_events,
  public.skill_mastery, public.achievements, public.daily_challenges,
  public.daily_attempts, public.matches, public.match_events, public.ratings,
  public.entitlements, public.analytics_events to service_role;

create index matches_white_profile_idx on public.matches (white_profile_id);
create index matches_black_profile_idx on public.matches (black_profile_id);

commit;
