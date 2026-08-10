-- ============================================================
-- Migration #6 — feedback (item 9) + flexible reminder offsets (item 3)
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
drop policy if exists "feedback_insert_all" on public.feedback;
create policy "feedback_insert_all" on public.feedback for insert with check (true);
drop policy if exists "feedback_select_all" on public.feedback;
create policy "feedback_select_all" on public.feedback for select using (true);

alter table public.calendar_events
  add column if not exists reminder_offset text
    check (reminder_offset in ('sameDay', 'dayBefore', 'twoDaysBefore', 'custom'));
