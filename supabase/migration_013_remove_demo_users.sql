-- ============================================================
-- Migration #13 — remove the four pre-auth demo users (v2)
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠️  THIS DELETES DATA, AND MORE THAN THE FOUR ROWS NAMED BELOW.
--
-- v1 of this migration failed with:
--   ERROR: 23503: update or delete on table "users" violates foreign key
--   constraint "interest_events_viewer_user_id_fkey"
--
-- CAUSE: schema.sql created interest_events.viewer_user_id as a plain
-- reference with no ON DELETE behavior, which defaults to NO ACTION. 11 live
-- rows have one of these 4 users as the *viewer* (someone who tapped
-- call/WhatsApp while "logged in" as them, under the old site's session
-- model) — those rows blocked the delete.
--
-- feedback.user_id has the identical latent bug (currently 0 rows reference
-- these 4 users, so it wasn't hit, but the next delete like this would hit
-- it). notification_attempts.recipient_user_id already has
-- "on delete set null" from migration 010 and does not need fixing.
--
-- FIX: both FKs are changed to ON DELETE SET NULL. An interest_events row
-- means "someone contacted this listing" — the listing, channel and
-- timestamp stay meaningful even if we no longer know which now-deleted
-- identity did the contacting, so nulling the column is correct rather than
-- deleting the row.
--
-- STATE SINCE v1 WAS WRITTEN: two of the four target rows have had their
-- phone number manually edited in the Table Editor (to free those numbers
-- for real sign-ups) — משה לוי's row now shows 0546660186, יובל לוי's now
-- shows 05473970214. This migration matches by id, not phone, so that has
-- no effect on which rows are removed. Recomputed against current data, the
-- cascade is unchanged from v1: 10 of 12 listings, 5 of 6 listings with
-- photos, both calendar events.
--
-- Note: the uploaded images stay in the `listing-images` storage bucket —
-- deleting a row does not delete the file it points at.
--
-- The anon key cannot run any of this: public.users has SELECT/INSERT/UPDATE
-- policies but no DELETE policy, and no new one is added — there is no
-- reason for the browser to be able to delete users.

-- ------------------------------------------------------------
-- 1. Fix the FKs that block this delete
-- ------------------------------------------------------------
alter table public.interest_events
  drop constraint if exists interest_events_viewer_user_id_fkey;

alter table public.interest_events
  add constraint interest_events_viewer_user_id_fkey
  foreign key (viewer_user_id) references public.users(id) on delete set null;

alter table public.feedback
  drop constraint if exists feedback_user_id_fkey;

alter table public.feedback
  add constraint feedback_user_id_fkey
  foreign key (user_id) references public.users(id) on delete set null;

-- ------------------------------------------------------------
-- 2. The delete itself
-- ------------------------------------------------------------
delete from public.users
where id in (
  '4ea72c9d-68a9-4561-9a78-a4446db5d9a4',  -- יוסי כהן  05019823184989314
  '5ea01d7e-a30d-43c6-8d95-17758d372416',  -- משה לוי   (now 0546660186)
  'e2ff91aa-1270-4d2b-a09e-1032c0e90205',  -- יובל לוי  (now 05473970214)
  'a8b5d448-9747-4a7b-afcb-5c66acee3b61'   -- יוסי כהן  12423453245
)
and auth_user_id is null;  -- belt and braces: never touch a real account
