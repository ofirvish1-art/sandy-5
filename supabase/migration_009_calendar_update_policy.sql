-- ============================================================
-- Migration #9 — allow editing calendar events
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- public.calendar_events has RLS enabled and policies for SELECT, INSERT and
-- DELETE — but none for UPDATE. With RLS on and no matching policy, an update
-- is not an error: it simply matches zero rows and reports success. So
-- "edit event" silently did nothing, on the old site as well as the new one.
--
-- Verified against the live project: a PATCH to calendar_events returns
-- HTTP 200 with an empty array, while INSERT and DELETE both work.
--
-- (migration_002_hulit.sql created those policies with
-- `create policy if not exists`, which PostgreSQL does not actually support
-- for policies — which is likely how UPDATE came to be missing.)

drop policy if exists "calendar_events_update_all" on public.calendar_events;

create policy "calendar_events_update_all"
  on public.calendar_events
  for update
  using (true)
  with check (true);
