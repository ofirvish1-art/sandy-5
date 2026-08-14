-- ============================================================
-- Migration #11 — star rating on feedback
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- The redesigned feedback sheet asks for 1–5 stars alongside the free text.
-- public.feedback only had `message`, so the rating had nowhere to go.
--
-- Nullable on purpose: the two feedback paths (rating + text, or text alone)
-- should both remain valid, and existing rows have no rating to backfill.

alter table public.feedback
  add column if not exists rating smallint
    check (rating is null or (rating >= 1 and rating <= 5));
