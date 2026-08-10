-- ============================================================
-- Hulit upgrade migration #3 — 18-item batch
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================

-- Item 2: structured location needs a region alongside lat/lng (already present)
alter table public.listings
  add column if not exists region text;

-- Item 4: calendar event category/color coding
alter table public.calendar_events
  add column if not exists category text default 'site'
    check (category in ('site', 'inspection', 'delivery'));

-- Item 6: extra mandatory WhatsApp-operational-messages consent
alter table public.users
  add column if not exists consent_whatsapp_operational boolean not null default false;
