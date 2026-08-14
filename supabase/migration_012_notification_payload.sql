-- ============================================================
-- Migration #12 — keep Hebrew out of the trigger
-- Run in Supabase → SQL Editor → New query → Run
-- (Supersedes the function created in migration 010. Safe to re-run.)
-- ============================================================
--
-- WHY: the message text in migration 010 was composed inside plpgsql with
-- Hebrew string literals. Those literals did not survive the trip into the
-- SQL editor — they arrived re-encoded (UTF-8 read as CP1255), so live rows
-- ended up with messages like "׳©׳׳•׳ יובל לוי" — mojibake for the literal
-- part, correct Hebrew for the values read from columns.
--
-- That difference is the whole lesson: values pulled from table columns are
-- always fine; only literals typed into the migration are at risk.
--
-- FIX: the trigger no longer writes any Hebrew. It records the structured
-- facts in `payload` (keys ASCII, values straight from columns) and the Edge
-- Function composes the sentence in TypeScript, where encoding is not a
-- hazard. This also puts the wording where wording belongs.

alter table public.notification_attempts
  add column if not exists payload jsonb;

create or replace function public.handle_interest_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing record;
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

  -- ASCII keys, values straight from the columns: nothing here can be mangled.
  v_payload := jsonb_build_object(
    'material',   v_listing.material_type,
    'quantity',   v_listing.quantity_cubic,
    'location',   v_listing.location_text,
    'owner_name', v_listing.owner_name
  );

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

-- Clear the mojibake left by the previous version. Only test rows exist, and
-- the Edge Function fills `message` in from now on.
update public.notification_attempts
   set message = null
 where message is not null;
