-- Shared, team-only store for glove recordings from the Collect page.
-- Replaces the hand-made prototype tables, which were empty apart from one test row.

-- ── Remove prototype tables ─────────────────────────────────────────────────
drop table if exists public."CUSTOM_SIGNS";
drop table if exists public."USERS";
drop table if exists public."DEMO";
drop table if exists public."ML - Session Data";
drop table if exists public."ML - Training Data";

-- ── Team allowlist ──────────────────────────────────────────────────────────
-- Anyone can sign up on the public site; only accounts listed here can read or
-- upload recordings. Members are added from the dashboard / SQL, never the app.
create table public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Kept out of the API-exposed schema so it can't be called over REST.
create schema if not exists private;

create or replace function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = (select auth.uid()));
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_team_member() to authenticated;
revoke execute on function private.is_team_member() from anon, public;

-- ── Recordings ──────────────────────────────────────────────────────────────
-- ids come from the browser (crypto.randomUUID), so re-uploading is idempotent.
create table public.recording_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  participant_id text not null check (char_length(participant_id) between 1 and 40),
  hand text not null check (hand in ('L', 'R')),
  calibration_open integer[] not null check (cardinality(calibration_open) = 5),
  calibration_closed integer[] not null check (cardinality(calibration_closed) = 5),
  calibrated_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.recording_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  sign_type text not null check (sign_type in ('static', 'moving', 'none')),
  rep integer not null check (rep > 0),
  window_ms integer not null check (window_ms between 200 and 30000),
  recorded_at timestamptz not null,
  notes text not null default '' check (char_length(notes) <= 140),
  -- [{ frame_idx, t_ms, raw[5], pct[5], imu[9] }, ...] — same shape as the frames CSV.
  frames jsonb not null check (jsonb_typeof(frames) = 'array'),
  frame_count integer generated always as (jsonb_array_length(frames)) stored,
  created_at timestamptz not null default now()
);

create index recording_sessions_user_id_idx on public.recording_sessions (user_id);
create index recordings_session_id_idx on public.recordings (session_id);
create index recordings_user_id_idx on public.recordings (user_id);
create index recordings_label_idx on public.recordings (label);

-- ── Access ──────────────────────────────────────────────────────────────────
alter table public.team_members enable row level security;
alter table public.recording_sessions enable row level security;
alter table public.recordings enable row level security;

-- Signed-out visitors get nothing at all.
revoke all on public.team_members, public.recording_sessions, public.recordings from anon;
-- The app only ever reads its own membership row.
revoke insert, update, delete on public.team_members from authenticated;

create policy "Members can see their own membership"
  on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));

-- Sessions: the whole team reads; you write only your own.
create policy "Team can read sessions"
  on public.recording_sessions for select to authenticated
  using ((select private.is_team_member()));

create policy "Team members add their own sessions"
  on public.recording_sessions for insert to authenticated
  with check ((select private.is_team_member()) and user_id = (select auth.uid()));

create policy "Owners update their sessions"
  on public.recording_sessions for update to authenticated
  using ((select private.is_team_member()) and user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owners delete their sessions"
  on public.recording_sessions for delete to authenticated
  using ((select private.is_team_member()) and user_id = (select auth.uid()));

-- Recordings: same, and a recording must belong to one of your own sessions.
create policy "Team can read recordings"
  on public.recordings for select to authenticated
  using ((select private.is_team_member()));

create policy "Team members add recordings to their own sessions"
  on public.recordings for insert to authenticated
  with check (
    (select private.is_team_member())
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.recording_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create policy "Owners update their recordings"
  on public.recordings for update to authenticated
  using ((select private.is_team_member()) and user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owners delete their recordings"
  on public.recordings for delete to authenticated
  using ((select private.is_team_member()) and user_id = (select auth.uid()));
