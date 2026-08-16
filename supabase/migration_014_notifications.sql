-- ============================================================
-- Migration #14 — in-app notification centre
-- Run in Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- Until now the bell derived its contents on the fly from interest_events and
-- the client-side matcher. That cannot express three things the app now needs:
--
--   * a notification for the *interested* user, not just the listing owner
--   * a per-user read/unread state, for the unread count badge
--   * calendar reminders, which belong to nobody's listing at all
--
-- So notifications become real rows. Delivery to WhatsApp stays separate —
-- notification_attempts (migration 010/012) is about reaching someone
-- *outside* the app; this table is what they see *inside* it.

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),

  -- Who should see this.
  user_id uuid not null references public.users(id) on delete cascade,

  type text not null check (type in (
    'interest_received',  -- someone is interested in my listing
    'interest_sent',      -- confirmation that I registered interest
    'calendar_reminder'   -- a reminder I set came due
  )),

  title text not null,
  body text,

  -- Optional anchors, so tapping a notification can open the right thing.
  listing_id uuid references public.listings(id) on delete cascade,
  calendar_event_id uuid references public.calendar_events(id) on delete cascade,
  -- Who caused it (the interested party). Null once that account is gone.
  actor_user_id uuid references public.users(id) on delete set null,

  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- Unlike the rest of this schema, notifications are personal: you may only
-- read and update your own. auth.uid() is the auth account; public.users.id is
-- the profile it maps to via auth_user_id (migration 007).
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id in (select id from public.users where auth_user_id = auth.uid()));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id in (select id from public.users where auth_user_id = auth.uid()));

-- Inserts come from the interest trigger (security definer, bypasses RLS) and
-- from the client when a calendar reminder comes due for the signed-in user.
drop policy if exists "notifications_insert_all" on public.notifications;
create policy "notifications_insert_all"
  on public.notifications for insert with check (true);


-- ------------------------------------------------------------
-- Extend the interest trigger to write notifications for BOTH sides
-- ------------------------------------------------------------
-- Same no-Hebrew-literals rule as migration 012: every Hebrew string here
-- comes from a column, never from this file. Titles are assembled in the app.

create or replace function public.handle_interest_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
  v_actor   record;
  v_payload jsonb;
  v_status  text;
  v_attempt uuid;
  v_url     text;
  v_key     text;
begin
  select l.material_type,
         l.quantity_cubic,
         l.location_text,
         u.id    as owner_id,
         u.name  as owner_name,
         u.phone as owner_phone
    into v_listing
  from public.listings l
  join public.users u on u.id = l.user_id
  where l.id = new.listing_id;

  if not found then
    return new;
  end if;

  select id, name into v_actor from public.users where id = new.viewer_user_id;

  v_payload := jsonb_build_object(
    'material',   v_listing.material_type,
    'quantity',   v_listing.quantity_cubic,
    'location',   v_listing.location_text,
    'owner_name', v_listing.owner_name,
    'actor_name', coalesce(v_actor.name, ''),
    'channel',    new.channel
  );

  -- ---- in-app notifications -------------------------------------------
  -- The owner hears about it, unless they are the one who tapped.
  if v_listing.owner_id is distinct from new.viewer_user_id then
    insert into public.notifications (user_id, type, title, body, listing_id, actor_user_id)
    values (
      v_listing.owner_id,
      'interest_received',
      v_listing.material_type,
      coalesce(v_actor.name, ''),
      new.listing_id,
      new.viewer_user_id
    );

    -- And the interested party gets their own record of having reached out.
    if new.viewer_user_id is not null then
      insert into public.notifications (user_id, type, title, body, listing_id, actor_user_id)
      values (
        new.viewer_user_id,
        'interest_sent',
        v_listing.material_type,
        coalesce(v_listing.owner_name, ''),
        new.listing_id,
        v_listing.owner_id
      );
    end if;
  end if;

  -- ---- outbound delivery attempt (unchanged from migration 012) --------
  v_status := case
    when coalesce(trim(v_listing.owner_phone), '') = '' then 'skipped'
    else 'pending'
  end;

  insert into public.notification_attempts (
    interest_event_id, listing_id, recipient_user_id, recipient_phone,
    source_channel, status, payload, error
  )
  values (
    new.id, new.listing_id, v_listing.owner_id, v_listing.owner_phone,
    new.channel, v_status, v_payload,
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
        'payload', v_payload
      )
    );
  exception when others then
    update public.notification_attempts
       set status = 'failed', error = sqlerrm, updated_at = now()
     where id = v_attempt;
  end;

  return new;
exception when others then
  return new;
end;
$$;
