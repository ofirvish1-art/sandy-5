-- ============================================================
-- Hulit (חולית) redesign — migration on top of the original schema.sql
-- Run this in Supabase → SQL Editor → New query → Run
-- (Safe to run once; re-running will just skip things that already exist.)
-- ============================================================

-- ---------- USERS: mandatory email + consent tracking ----------
alter table public.users
  add column if not exists email text,
  add column if not exists consent_terms boolean not null default false,
  add column if not exists consent_privacy boolean not null default false,
  add column if not exists consent_contact_disclosure boolean not null default false,
  add column if not exists consented_at timestamptz;

-- ---------- LISTINGS: material_type is now free text ----------
-- The original schema restricted material_type to a fixed enum. The new
-- material list is long (and has a free-text "אחר" escape hatch), so we
-- drop that constraint and just store whatever the picker/free-text sent.
alter table public.listings
  drop constraint if exists listings_material_type_check;

-- ---------- CALENDAR EVENTS (personal reminders on the Trades Calendar) ----------
create table if not exists public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;
create policy if not exists "calendar_events_select_all" on public.calendar_events for select using (true);
create policy if not exists "calendar_events_insert_all" on public.calendar_events for insert with check (true);
create policy if not exists "calendar_events_delete_all" on public.calendar_events for delete using (true);

-- ---------- INTEREST EVENTS: track the delayed "still relevant?" follow-up ----------
alter table public.interest_events
  add column if not exists follow_up_sent_at timestamptz,
  add column if not exists follow_up_status text
    check (follow_up_status in ('relevant', 'pending', 'closed'));

-- ============================================================
-- Scheduled follow-up: exactly ~1 hour after the first interaction on a
-- listing, WhatsApp the owner asking if it's still relevant.
--
-- This runs the send-relevance-check Edge Function every 10 minutes via
-- pg_cron + pg_net. Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below
-- with your own values (Project Settings → API) before running this part.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-relevance-check-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-relevance-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
