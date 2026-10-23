# Database

Supabase (Postgres) for sign-in and the team's shared glove recordings.

| Table | What's in it |
|---|---|
| `team_members` | Accounts allowed to read and upload recordings |
| `recording_sessions` | One per Collect session: participant, hand, calibration |
| `recordings` | One per sample: label, sign type, rep, and every frame as JSON |

Row-level security: signed-out visitors see nothing; team members read everything and write only their own rows. Signing up on the site does **not** grant access.

## Add a team member

They sign up on the site first, then run in the Supabase SQL editor:

```sql
insert into public.team_members (user_id)
select id from auth.users where email = 'teammate@example.com';
```

## Changing the schema

Add a new file in `migrations/` (`YYYYMMDDHHMMSS_name.sql`) and apply it with the Supabase CLI (`supabase db push`) or paste it into the SQL editor. Never edit a migration that has already run.
