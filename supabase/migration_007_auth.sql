-- ============================================================
-- Migration #7 — real Supabase Auth
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- Until now the app had no authentication: a "user" was just a row in
-- public.users keyed by phone, remembered in localStorage. The redesign
-- introduces a real login/sign-up screen backed by Supabase Auth.
--
-- This migration adds the missing link between an auth account and the
-- profile row that listings, calendar events and feedback point at.
-- Nothing is deleted and no existing column changes, so it is safe to
-- run against live data.

alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

create index if not exists users_auth_user_idx on public.users (auth_user_id);

-- The 4 pre-existing rows keep auth_user_id = null. They were created
-- before authentication existed and have no password, so they cannot be
-- signed into. They are left in place (rather than deleted) so the
-- listings that reference them stay intact.


-- ------------------------------------------------------------
-- Also required, in the dashboard rather than in SQL:
--   Authentication → Sign In / Providers → Email → turn OFF "Confirm email"
-- Otherwise every new sign-up must click a link in their inbox before
-- they can log in, and signUp() returns no session.
-- ------------------------------------------------------------
