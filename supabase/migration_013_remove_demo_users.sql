-- ============================================================
-- Migration #13 — remove the four pre-auth demo users
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- ⚠️  THIS DELETES DATA, AND MORE THAN THE FOUR ROWS NAMED BELOW.
--
-- These four public.users rows predate authentication: they have
-- auth_user_id = null, no password, and no way to sign in. They were left
-- in place by migration 007 so their listings survived. This removes them
-- so their phone numbers stop blocking real sign-ups.
--
-- BECAUSE listings.user_id IS "on delete cascade", DELETING THEM ALSO
-- DELETES:
--
--   יוסי כהן  05019823184989314 → 5 listings (3 with photos), 2 calendar events
--   משה לוי   0546660185        → 2 listings (0 with photos)
--   יובל לוי  0547397021        → 2 listings (2 with photos)
--   יוסי כהן  12423453245       → 1 listing  (0 with photos)
--
--   Total: 10 of the 12 listings, 5 of the 6 listings that have photos, and
--   both calendar events. interest_events and notification_attempts attached
--   to those listings go with them.
--
-- Confirmed as intended: this is demo/test data from before the site was
-- ever used by real contractors.
--
-- Note: the uploaded images stay in the `listing-images` storage bucket —
-- deleting a row does not delete the file it points at. Clear the bucket
-- separately if you want the files gone too.
--
-- The anon key cannot run this: public.users has SELECT/INSERT/UPDATE
-- policies but no DELETE policy. Running it here in the SQL editor uses a
-- privileged role that bypasses RLS, which is why no new policy is added —
-- there is no reason for the browser to be able to delete users.

delete from public.users
where id in (
  '4ea72c9d-68a9-4561-9a78-a4446db5d9a4',  -- יוסי כהן  05019823184989314
  '5ea01d7e-a30d-43c6-8d95-17758d372416',  -- משה לוי   0546660185
  'e2ff91aa-1270-4d2b-a09e-1032c0e90205',  -- יובל לוי  0547397021
  'a8b5d448-9747-4a7b-afcb-5c66acee3b61'   -- יוסי כהן  12423453245
)
and auth_user_id is null;  -- belt and braces: never touch a real account
