-- Supabase's default grants include TRUNCATE/TRIGGER/REFERENCES, which ignore row-level security.
-- The app never needs them.
revoke truncate, trigger, references on public.team_members, public.recording_sessions, public.recordings from authenticated;
