-- ============================================================
-- Earthworks Marketplace — Supabase schema (MVP)
-- Run this once in Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- USERS ----------
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- LISTINGS (supply + demand share one table) ----------
create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('supply', 'demand')),
  user_id uuid not null references public.users(id) on delete cascade,

  material_type text not null check (material_type in ('sand', 'hamra', 'matza', 'other')),
  quantity_cubic numeric not null check (quantity_cubic > 0),

  location_text text not null,
  latitude double precision,
  longitude double precision,

  urgency text not null check (urgency in ('now', 'today', 'tomorrow', 'week', 'future')),
  available_until date,     -- supply only
  deadline date,            -- demand only
  max_radius_km numeric,    -- demand only, null = "open to offers"

  price_type text not null check (price_type in ('perCubic', 'total', 'flexible', 'freePickup')),
  price_value numeric,

  transport text not null check (transport in ('buyerPickup', 'sellerHelps', 'needsTransport', 'flexible')),
  contact_phone text not null,

  images text[] default '{}',
  video_url text,
  notes text,
  quality_requirements text,  -- demand only
  has_loading boolean default false, -- supply only

  status text not null default 'open'
    check (status in ('open', 'inTalks', 'closed', 'notRelevant', 'cancelled', 'draft')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_type_status_idx on public.listings (type, status);
create index if not exists listings_material_idx on public.listings (material_type);
create index if not exists listings_user_idx on public.listings (user_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------- MATCHES (cached pairs, mainly for admin stats) ----------
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  supply_listing_id uuid not null references public.listings(id) on delete cascade,
  demand_listing_id uuid not null references public.listings(id) on delete cascade,
  score text not null check (score in ('high', 'medium', 'low')),
  distance_km numeric,
  status text not null default 'new' check (status in ('new', 'contacted', 'relevant', 'closed', 'notRelevant')),
  created_at timestamptz not null default now(),
  unique (supply_listing_id, demand_listing_id)
);

-- ---------- INTEREST EVENTS (drives WhatsApp/SMS notifications) ----------
-- Every time someone taps "Call" or "WhatsApp" on a listing, the app
-- logs a row here. A Supabase Database Webhook (set up in the
-- dashboard, see README.md) fires on INSERT and calls the
-- notify-on-interest Edge Function, which messages the listing owner.
create table if not exists public.interest_events (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewer_user_id uuid references public.users(id),
  channel text not null check (channel in ('call', 'whatsapp')),
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists interest_events_listing_idx on public.interest_events (listing_id);

-- ============================================================
-- Row Level Security
-- ============================================================
-- MVP tradeoff: the app does NOT use Supabase Auth yet (per the
-- spec — "no complex permission system for the first version").
-- Users are identified client-side by a row in `users`, not by a
-- Supabase auth session. That means we can't write RLS policies
-- like `auth.uid() = user_id`. Instead we open reads to everyone
-- (all listings are meant to be publicly browsable anyway) and
-- allow inserts/updates through the anon key.
--
-- This is fine for a closed pilot with trusted contractors. Before
-- a public launch, upgrade to Supabase Auth (phone OTP) and tighten
-- these policies to auth.uid()-based checks — see README.md →
-- "Upgrading to real auth".

alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.matches enable row level security;
alter table public.interest_events enable row level security;

create policy "users_select_all" on public.users for select using (true);
create policy "users_upsert_all" on public.users for insert with check (true);
create policy "users_update_all" on public.users for update using (true);

create policy "listings_select_all" on public.listings for select using (true);
create policy "listings_insert_all" on public.listings for insert with check (true);
create policy "listings_update_all" on public.listings for update using (true);
create policy "listings_delete_all" on public.listings for delete using (true);

create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_upsert_all" on public.matches for insert with check (true);
create policy "matches_update_all" on public.matches for update using (true);

create policy "interest_events_select_all" on public.interest_events for select using (true);
create policy "interest_events_insert_all" on public.interest_events for insert with check (true);

-- ============================================================
-- Storage bucket for listing photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "listing_images_public_read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "listing_images_anyone_upload"
  on storage.objects for insert
  with check (bucket_id = 'listing-images');
