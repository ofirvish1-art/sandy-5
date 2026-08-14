-- ============================================================
-- Migration #10 — "אני מעוניין" actually notifies the listing owner
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- Three things, in order:
--
--   1. Allow channel = 'interest'. The original constraint only permitted
--      'call' and 'whatsapp', so the quiet "I'm interested" flag was rejected
--      by the database every time and never recorded anything.
--
--   2. Add public.notification_attempts — a durable record of every attempt
--      to notify an owner, including the ones that could not be delivered and
--      why. Without this there is no way to tell "nobody tapped" apart from
--      "we tried and it failed".
--
--   3. Fire on INSERT into interest_events via a database TRIGGER rather than
--      a dashboard-configured Database Webhook. A trigger lives in version
--      control, applies with this migration, and cannot be silently missing —
--      which is exactly how the previous webhook came to never fire.
--
-- Delivery itself stays provider-agnostic: the trigger logs the attempt and,
-- if a delivery endpoint is configured, calls it. With no provider configured
-- the attempt is still recorded with status 'skipped', so the pipeline is
-- verifiable today and only the final hop is left to plug in.

-- ------------------------------------------------------------
-- 1. Allow the 'interest' channel
-- ------------------------------------------------------------
alter table public.interest_events
  drop constraint if exists interest_events_channel_check;

alter table public.interest_events
  add constraint interest_events_channel_check
  check (channel in ('call', 'whatsapp', 'interest'));


-- ------------------------------------------------------------
-- 2. Attempt log
-- ------------------------------------------------------------
create table if not exists public.notification_attempts (
  id uuid primary key default uuid_generate_v4(),
  interest_event_id uuid references public.interest_events(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  recipient_user_id uuid references public.users(id) on delete set null,
  recipient_phone text,

  -- Which tap caused this: 'call' | 'whatsapp' | 'interest'
  source_channel text not null,
  -- Which provider handled delivery; null until one is configured.
  provider text,

  status text not null check (status in ('skipped', 'pending', 'sent', 'failed')),
  error text,
  message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_attempts_event_idx
  on public.notification_attempts (interest_event_id);
create index if not exists notification_attempts_status_idx
  on public.notification_attempts (status, created_at desc);

alter table public.notification_attempts enable row level security;

-- Readable so the app (and you) can see delivery state. Rows are written only
-- by the trigger, which runs as definer and bypasses RLS.
drop policy if exists "notification_attempts_select_all" on public.notification_attempts;
create policy "notification_attempts_select_all"
  on public.notification_attempts for select using (true);


-- ------------------------------------------------------------
-- 3. Configuration, kept out of this file
-- ------------------------------------------------------------
-- RLS is enabled with NO policies, so anon and authenticated cannot read this
-- table at all. Only the service role and the SECURITY DEFINER trigger below
-- can see it. That keeps the service key out of the migration and out of reach
-- of the browser.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Once the delivery function is deployed, run these two (see the notes at the
-- bottom of this file). Until then the pipeline records 'skipped' attempts.
--
--   insert into public.app_config (key, value) values
--     ('notify_function_url', 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-on-interest')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
--
--   insert into public.app_config (key, value) values
--     ('notify_service_key', '<SERVICE_ROLE_KEY>')
--   on conflict (key) do update set value = excluded.value, updated_at = now();


-- ------------------------------------------------------------
-- 4. The trigger
-- ------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.handle_interest_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing   record;
  v_message   text;
  v_status    text;
  v_attempt   uuid;
  v_url       text;
  v_key       text;
begin
  select l.material_type,
         l.quantity_cubic,
         l.location_text,
         u.id   as owner_id,
         u.name as owner_name,
         u.phone as owner_phone
    into v_listing
  from public.listings l
  join public.users u on u.id = l.user_id
  where l.id = new.listing_id;

  if not found then
    return new;
  end if;

  v_message := format(
    'שלום %s, מישהו התעניין במודעה שלך בסנדיט: %s, %s קו״ב%s.',
    coalesce(nullif(trim(v_listing.owner_name), ''), 'קבלן'),
    v_listing.material_type,
    trim(to_char(v_listing.quantity_cubic, 'FM999999990.##')),
    case when coalesce(v_listing.location_text, '') <> ''
         then ' ב' || v_listing.location_text else '' end
  );

  -- An owner with no phone can never be reached; record that plainly.
  v_status := case
    when coalesce(trim(v_listing.owner_phone), '') = '' then 'skipped'
    else 'pending'
  end;

  insert into public.notification_attempts (
    interest_event_id, listing_id, recipient_user_id, recipient_phone,
    source_channel, status, message, error
  )
  values (
    new.id, new.listing_id, v_listing.owner_id, v_listing.owner_phone,
    new.channel, v_status, v_message,
    case when v_status = 'skipped' then 'owner has no phone number' end
  )
  returning id into v_attempt;

  if v_status <> 'pending' then
    return new;
  end if;

  select value into v_url from public.app_config where key = 'notify_function_url';
  select value into v_key from public.app_config where key = 'notify_service_key';

  if coalesce(v_url, '') = '' then
    update public.notification_attempts
       set status = 'skipped',
           error = 'no delivery provider configured yet',
           updated_at = now()
     where id = v_attempt;
    return new;
  end if;

  -- Delivery must never be able to block someone from expressing interest.
  begin
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(v_key, '')
      ),
      body := jsonb_build_object(
        'attempt_id', v_attempt,
        'interest_event_id', new.id,
        'listing_id', new.listing_id,
        'recipient_user_id', v_listing.owner_id,
        'recipient_phone', v_listing.owner_phone,
        'source_channel', new.channel,
        'message', v_message
      )
    );
  exception when others then
    update public.notification_attempts
       set status = 'failed', error = sqlerrm, updated_at = now()
     where id = v_attempt;
  end;

  return new;
exception when others then
  -- Whatever goes wrong above, the interest_events row still stands.
  return new;
end;
$$;

drop trigger if exists interest_events_notify on public.interest_events;

create trigger interest_events_notify
  after insert on public.interest_events
  for each row execute function public.handle_interest_event();


-- ============================================================
-- What is left to do, and where
-- ============================================================
-- This migration makes the pipeline fire and record attempts. It deliberately
-- does NOT bind to Twilio (that account is closed).
--
-- To finish delivery later:
--   1. Deploy the provider-agnostic function:
--        supabase functions deploy notify-on-interest
--   2. Set whichever provider you pick, e.g.
--        supabase secrets set WHATSAPP_PROVIDER=meta \
--                             WHATSAPP_API_URL=... \
--                             WHATSAPP_API_TOKEN=... \
--                             WHATSAPP_FROM=...
--   3. Insert the two app_config rows shown in section 3 above.
--
-- Nothing else changes: the trigger already sends the right payload, and the
-- function updates notification_attempts to 'sent' or 'failed'.
