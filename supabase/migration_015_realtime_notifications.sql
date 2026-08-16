-- ============================================================
-- Migration #15 — live notifications while the app is open
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- Publishes public.notifications for Supabase Realtime, so the app is pushed
-- new rows the moment they are written instead of waiting for the next poll.
-- This is what makes the on-screen toast appear immediately when someone
-- taps "אני מעוניין" on one of your listings.
--
-- Scope: this only helps while the site is open in front of you. Delivery to
-- a closed tab or phone is web push, which is deliberately not built yet.
--
-- Row-level security still applies to realtime: subscribers are only sent
-- rows they could have SELECTed anyway, so the notifications_select_own
-- policy from migration 014 keeps one user's notifications private from
-- another's. Publishing the table does not widen access.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- Realtime sends only the changed row by default. The toast needs the
-- listing's material and the interested party's name, both of which are
-- already columns on notifications (title / body), so no REPLICA IDENTITY
-- change is required.
