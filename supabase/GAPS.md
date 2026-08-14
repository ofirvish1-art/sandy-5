# Schema gaps — new v0 design vs. the live Supabase project

Living document. Verified against the running project `hrjxojobkssyszeycnbd`
(not just the `.sql` files). Updated as each porting step uncovers more.

Current live row counts: `users` 4 · `listings` 10 · `matches` 0 ·
`interest_events` 11 · `calendar_events` 2 · `feedback` 0.

---

## 1. There is no Supabase Auth today — BLOCKS the login/sign-up step

The old site never used Supabase Auth. Identity is a row in `public.users`
keyed by `phone`, upserted on the registration form and cached in
`localStorage` under `earthworks_user`. **No passwords exist anywhere**, and
`public.users` has no link to `auth.users`.

The new design's screen asks for an 8–15 character password on both sign-up
and login.

Missing before that screen can work for real:

- `public.users.auth_user_id uuid references auth.users(id)` — links an
  auth account to the existing profile row.
- A decision on what happens to the 4 existing `public.users` rows, which
  have no auth account and no password.
- Login accepts "phone **or** email"; Supabase Auth signs in by email only.
  Phone login needs either a lookup step or the phone provider enabled
  (currently disabled — checked via `/auth/v1/settings`).
- `mailer_autoconfirm` is **false**, so new sign-ups must confirm their email
  before they can sign in. Either turn autoconfirm on in the dashboard or the
  new-user flow needs a "check your inbox" state.

## 2. `loading` (העמסה) has nowhere to be stored

The new wizard and filters treat loading as three values —
`אני מעמיס` / `אתה מעמיס` / `תיאום בהמשך`. The database only has
`listings.has_loading boolean`. Needs a new `loading text` column; the
boolean can stay for backwards compatibility.

## 3. `transport` values do not line up

Database check constraint allows `buyerPickup | sellerHelps | needsTransport
| flexible`. The new UI offers three labels: `אני אקח` / `אתה תיקח` /
`תיאום בהמשך`. Needs an explicit mapping (and the mapping differs by listing
type — "אני אקח" means the opposite thing on a supply vs. a demand ad).

## 4. Existing rows carry legacy material values

8 of the 10 listings already use the Hebrew material names the new UI expects.
Two are legacy English enum values (`sand`, `hamra`) from before migration 002
dropped the check constraint. They will not match any filter or any
material gate in the matcher until they are normalised.

The material list also drifted: the old list had `מצע א` / `מצע ב`, the new
one has `מצע א'` / `מצע ג'` (note the geresh). No live rows use either, so
this is only a going-forward concern.

## 5. Three listings have no coordinates

`latitude`/`longitude` are null on 3 of 10 rows, and `location_text` is empty
on 2 of them. Those listings cannot appear on the map and score a neutral
fallback in distance matching. `lib/cities.js` on `main` has a city→lat/lng
table that can backfill them where a city name exists.

## 6. `calendar_events` cannot be updated (RLS) — needs migration 009

RLS is enabled with SELECT / INSERT / DELETE policies but **no UPDATE policy**,
so editing an event silently affects zero rows and reports success. Confirmed
live: PATCH returns HTTP 200 with `[]`; INSERT and DELETE both work.
Fixed by `migration_009_calendar_update_policy.sql`.

## 7. Only one reminder per calendar event

The redesign's calendar offered seven reminder options as a **multi-select**.
The database has a single `reminder_at` plus a `reminder_offset` constrained to
`sameDay | dayBefore | twoDaysBefore | custom`, so only one reminder per event
can be stored. The screen now offers exactly those four (plus "no reminder").

Supporting several reminders per event needs a `calendar_event_reminders`
child table. Two of the original options ("שעה לפני", "3 שעות לפני") also have
no anchor to compute from, because `event_date` is a date with no time of day.

## 8. `matches` and `feedback` tables are empty

Both exist with the right shape. `matches` is a cache the old site never
populated — matching was computed client-side on every load.
