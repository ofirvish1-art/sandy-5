-- ============================================================
-- Redesign migration #5 — calendar reminders (item 8) + cron schedule
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================

alter table public.calendar_events
  add column if not exists color text,
  add column if not exists reminder_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

-- Old fixed-category constraint is no longer used (custom events now use
-- a free color instead of one of 3 categories) — drop it so old rows and
-- new ones both save fine.
alter table public.calendar_events
  drop constraint if exists calendar_events_category_check;

-- Schedule the new reminder-sending function to run every 10 minutes,
-- same pattern as the existing send-relevance-check job. Replace
-- <PROJECT_REF> and <SERVICE_ROLE_KEY> before running (Find & Replace,
-- same as the earlier migrations).
select cron.schedule(
  'send-calendar-reminders-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-calendar-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
