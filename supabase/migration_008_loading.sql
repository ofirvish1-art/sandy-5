-- ============================================================
-- Migration #8 — "who loads the material" (העמסה)
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- The redesigned publishing wizard asks who does the loading, with three
-- answers: אני מעמיס / אתה מעמיס / תיאום בהמשך.
--
-- The database only had `has_loading boolean`, which can record "loading is
-- available" but not who provides it. This adds the missing column.
--
-- `has_loading` is kept and still written to (true when the publisher loads),
-- so the old Edge Functions and any existing queries keep working.

-- NOTE: this file records what is ACTUALLY deployed. The value for "the
-- publisher loads" went in as 'publisherHauls', not the 'publisherLoads' this
-- migration was first drafted with. Confirmed by probing the live check
-- constraint. The application code matches these values exactly — do not
-- "fix" the naming here without migrating the data and lib/supabase/listings.ts
-- in the same change.

alter table public.listings
  add column if not exists loading text
    check (loading in ('publisherHauls', 'counterpartyLoads', 'flexible'));

-- Backfill the 10 existing rows from the boolean we already have. Rows where
-- has_loading is true become 'publisherHauls'; the rest are left as
-- 'flexible' (coordinate later), which is the honest reading of "unknown".
update public.listings
set loading = case when has_loading then 'publisherHauls' else 'flexible' end
where loading is null;
