-- Zinetic Music: the whole database in one script, for a brand new Supabase project.
-- Run it ONCE in the SQL editor of an EMPTY project (Project > SQL Editor > New query > Run).
-- It is the 18 files in this folder merged in the order they were first written, with the
-- later fixes folded in. Do not run it on a project that already has these tables.
--
-- After it has run, create your admin account (Authentication > Users > Add user, with
-- "Auto Confirm User" ticked) and then make it an admin:
--   update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';

-- ======================================================================
-- Core: profiles, wallet, MCN checks (schema.sql with check_number and fix_rls_recursion already included)
-- ======================================================================
-- Zinetic Music — MCN Checker & Copyright/Claim Management
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

-- 1. Profiles ---------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');
create type public.user_status as enum ('pending', 'approved', 'rejected', 'blocked');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'user',
  status public.user_status not null default 'pending',
  wallet_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- SECURITY DEFINER bypasses RLS for this internal check — a plain subquery
-- on public.profiles inside a policy ON public.profiles would re-trigger
-- the same policy and cause "infinite recursion detected".
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  using (public.is_admin());

-- auto-create a pending profile row whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Wallet transactions ------------------------------------------------------
create type public.wallet_tx_type as enum ('topup', 'check_charge', 'refund', 'adjustment', 'studio_charge');

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.wallet_tx_type not null,
  amount numeric(12, 2) not null, -- positive = credit, negative = debit
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

create policy "Users can view their own transactions"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.wallet_transactions for select
  using (public.is_admin());

create policy "Admins can insert transactions"
  on public.wallet_transactions for insert
  with check (public.is_admin());

-- 3. MCN checks ---------------------------------------------------------------
create type public.check_status as enum ('success', 'not_found', 'error');

create table public.mcn_checks (
  id uuid primary key default gen_random_uuid(),
  check_number bigint generated always as identity,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel_input text not null, -- raw URL / handle / ID the user typed
  channel_id text,
  channel_name text,
  network text,
  network_contact_email text,
  subscriber_count bigint,
  total_views bigint,
  video_count integer,
  avatar_url text,
  status public.check_status not null default 'success',
  cost numeric(12, 2) not null default 15,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

alter table public.mcn_checks enable row level security;

create policy "Users can view their own checks"
  on public.mcn_checks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own checks"
  on public.mcn_checks for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all checks"
  on public.mcn_checks for select
  using (public.is_admin());

-- ======================================================================
-- Blocked users (add_blocked_user_status.sql, enum value already in the type above)
-- ======================================================================
-- Zinetic Music. Admin can block an approved user for a terms violation.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).


alter table public.profiles add column blocked_at timestamptz;
alter table public.profiles add column blocked_reason text;
alter table public.profiles add column blocked_by uuid references auth.users (id);

-- ======================================================================
-- Payment sessions (add_payment_sessions.sql)
-- ======================================================================
-- Zinetic Music. SSLCommerz wallet top-up sessions.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create type public.payment_status as enum ('pending', 'valid', 'failed', 'cancelled');

create table public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tran_id text not null unique,
  amount numeric(12, 2) not null,
  status public.payment_status not null default 'pending',
  val_id text,
  card_type text,
  raw_ipn jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

alter table public.payment_sessions enable row level security;

create policy "Users can view their own payment sessions"
  on public.payment_sessions for select
  using (auth.uid() = user_id);

create policy "Admins can view all payment sessions"
  on public.payment_sessions for select
  using (public.is_admin());

-- all writes go through the service-role client (init + IPN routes), so no
-- insert/update policy is needed for regular users or admins here.

-- ======================================================================
-- Payment sessions USD (add_payment_sessions_usd.sql)
-- ======================================================================
-- Zinetic Music. Add the USD amount actually credited to the wallet,
-- separate from the BDT amount charged through SSLCommerz.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

alter table public.payment_sessions
  add column usd_amount numeric(12, 2);

comment on column public.payment_sessions.amount is
  'BDT amount charged through SSLCommerz, used to validate the IPN.';
comment on column public.payment_sessions.usd_amount is
  'USD amount actually credited to the wallet.';

-- ======================================================================
-- Provider status and realtime (add_provider_status_and_realtime.sql)
-- ======================================================================
-- Zinetic Music. Server-side background refresh + live UI updates for
-- channels the provider is still processing.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

-- 1. A dedicated, indexed column for the provider's own processing state
--    ("pending" while they're still crawling it, "updated" once final),
--    so the cron job can find pending rows without scanning raw_response.
alter table public.mcn_checks add column provider_status text;

update public.mcn_checks
set provider_status = raw_response ->> 'status'
where raw_response is not null;

create index mcn_checks_provider_status_idx
  on public.mcn_checks (provider_status)
  where provider_status = 'pending';

-- 2. Enable Realtime on this table so the dashboard updates itself the
--    instant the cron job writes new network data, no page visit or
--    manual refresh needed.
alter publication supabase_realtime add table public.mcn_checks;

-- ======================================================================
-- Scheduled refresh of pending checks (pg_cron + pg_net, final version from update_pg_cron_domain.sql)
-- ======================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Zinetic Music. Point pg_cron at the branded domain now that it's live.
-- Run in Supabase SQL Editor.


select cron.schedule(
  'refresh-pending-mcn-checks',
  '*/1 * * * *',
  $$
  select net.http_get(
    url := 'https://cms.zineticmusic.com/api/cron/refresh-pending-checks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer d26e7740a11a7b8e3148b82e6152e328d6da8fbf941f17ecc4df3d1ea16a61e6'
    )
  );
  $$
);

-- ======================================================================
-- Studio (add_studio.sql)
-- ======================================================================
-- AI Studio: one row per generation (voice, video, ...). Files live in
-- storage (local disk for now), only the relative key is stored here.
create type public.studio_kind as enum ('voice', 'sfx', 'avatar_video', 'video_translate');
create type public.studio_status as enum ('processing', 'done', 'failed');

create table public.studio_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.studio_kind not null,
  provider text not null,
  status public.studio_status not null default 'processing',
  input jsonb not null default '{}'::jsonb,
  file_key text,
  mime_type text,
  provider_job_id text,
  error text,
  created_at timestamptz not null default now()
);

create index studio_generations_user_idx on public.studio_generations (user_id, created_at desc);

alter table public.studio_generations enable row level security;

create policy "Users read their own generations"
  on public.studio_generations for select
  using (auth.uid() = user_id);

create policy "Admins read all generations"
  on public.studio_generations for select
  using (public.is_admin());

-- ======================================================================
-- User products (add_user_products.sql, the one-off backfill is dropped: there are no users yet)
-- ======================================================================
-- Which dashboards each customer may open. One row per (user, product).
-- Admins manage this from /admin/products (service role), users can only read their own.
create table public.user_products (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product text not null check (product in ('cms', 'studio', 'distribution')),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, product)
);

alter table public.user_products enable row level security;

create policy "Users read their own products"
  on public.user_products for select
  using (auth.uid() = user_id);

create policy "Admins read all products"
  on public.user_products for select
  using (public.is_admin());

-- ======================================================================
-- Studio v2 (add_studio_v2.sql)
-- ======================================================================
-- AI Studio v2: every tool shares studio_generations. Kind becomes free text so
-- new tools do not need a migration, plus a result blob (transcripts etc).
alter table public.studio_generations alter column kind type text using kind::text;
drop type if exists public.studio_kind;
alter table public.studio_generations add column if not exists title text;
alter table public.studio_generations add column if not exists result jsonb;

-- Photo avatars a customer created, reusable in avatar videos
create table if not exists public.studio_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  image_key text not null,
  preview_file_key text,
  created_at timestamptz not null default now()
);
alter table public.studio_avatars enable row level security;
create policy "Users read their own avatars" on public.studio_avatars for select using (auth.uid() = user_id);
create policy "Admins read all avatars" on public.studio_avatars for select using (public.is_admin());

-- ======================================================================
-- Studio engines (add_studio_engines.sql)
-- ======================================================================
-- AI Studio engines: Service -> Engine -> Provider -> Model/endpoint -> Credit cost.
-- Managed from /admin/engines, nothing about a provider is hard-coded in the app.


create table if not exists public.studio_engines (
  id uuid primary key default gen_random_uuid(),
  service text not null,                 -- tool id: voice, dubbing, video-translation ...
  key text not null,                     -- stable id inside the service: v1, v2, v3 ...
  label text not null,                   -- what customers see: Engine 1
  description text,
  provider text not null,                -- elevenlabs | heygen | local | (future providers)
  model text,                            -- model id or API endpoint variant
  credit_cost numeric(10, 3) not null default 0,
  cost_unit text not null default 'generation' check (cost_unit in ('generation', 'minute', '1k_chars')),
  enabled boolean not null default true,
  features text[] not null default '{}',
  max_duration_seconds integer,          -- longest media accepted, null = no limit
  max_file_mb integer,
  max_chars integer,
  options jsonb not null default '{}'::jsonb,   -- processing options / defaults
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service, key)
);

alter table public.studio_engines enable row level security;

create policy "Signed-in users read enabled engines"
  on public.studio_engines for select
  using (enabled and auth.uid() is not null);

create policy "Admins read all engines"
  on public.studio_engines for select
  using (public.is_admin());

-- every generation remembers which engine ran and what it cost
alter table public.studio_generations add column if not exists engine_key text;
alter table public.studio_generations add column if not exists credits numeric(10, 3) not null default 0;
alter table public.studio_generations add column if not exists refunded boolean not null default false;

-- Atomic wallet debit: only succeeds when the balance covers it.
create or replace function public.studio_charge(p_user uuid, p_usd numeric, p_note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  update public.profiles
     set wallet_balance = wallet_balance - p_usd
   where id = p_user and wallet_balance >= p_usd
   returning wallet_balance into new_balance;
  if new_balance is null then
    return null;
  end if;
  if p_usd > 0 then
    insert into public.wallet_transactions (user_id, type, amount, note)
    values (p_user, 'studio_charge', -p_usd, p_note);
  end if;
  return new_balance;
end;
$$;

create or replace function public.studio_refund(p_user uuid, p_usd numeric, p_note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  update public.profiles set wallet_balance = wallet_balance + p_usd
   where id = p_user returning wallet_balance into new_balance;
  if p_usd > 0 then
    insert into public.wallet_transactions (user_id, type, amount, note)
    values (p_user, 'refund', p_usd, p_note);
  end if;
  return new_balance;
end;
$$;

revoke all on function public.studio_charge(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.studio_refund(uuid, numeric, text) from public, anon, authenticated;

-- Starting engines. Costs are placeholders, set the real ones in /admin/engines.
insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_duration_seconds, max_file_mb, max_chars, options, sort)
values
  ('voice', 'v1', 'Engine 1', 'Natural multilingual voices', 'elevenlabs', 'eleven_multilingual_v2', 0.02, '1k_chars', '{multilingual}', null, null, 5000, '{}', 1),
  ('voice-changer', 'v1', 'Engine 1', 'Keeps timing and emotion', 'elevenlabs', 'eleven_multilingual_sts_v2', 0.10, 'minute', '{}', 600, 50, null, '{}', 1),
  ('sound-effects', 'v1', 'Engine 1', 'Text to sound effects', 'elevenlabs', 'eleven_text_to_sound_v2', 0.03, 'generation', '{loop}', 30, null, 450, '{}', 1),
  ('music', 'v1', 'Engine 1', 'Full tracks from a prompt', 'elevenlabs', 'music_v1', 0.30, 'minute', '{}', 120, null, 1500, '{}', 1),
  ('transcribe', 'v1', 'Engine 1', 'Speakers and timestamps', 'elevenlabs', 'scribe_v1', 0.03, 'minute', '{speakers,timestamps}', 7200, 200, null, '{}', 1),
  ('audio-cleaner', 'v1', 'Engine 1', 'Noise removal and voice isolation', 'elevenlabs', 'audio-isolation', 0.05, 'minute', '{}', 600, 100, null, '{}', 1),
  ('dubbing', 'v1', 'Engine 1', 'Keeps each speaker''s own voice', 'elevenlabs', 'dubbing', 0.30, 'minute', '{audio,video,speaker-voices}', 1800, 200, null, '{}', 1),
  ('dubbing', 'v2', 'Engine 2', 'Video dubbing with lip sync', 'heygen', 'video_translate', 0.50, 'minute', '{video,lipsync}', 600, 200, null, '{"lipsync":true}', 2),
  ('video-translation', 'v1', 'Engine 1', 'Translation with lip sync', 'heygen', 'video_translate', 0.50, 'minute', '{video,lipsync}', 600, 200, null, '{"lipsync":true}', 1),
  ('video-translation', 'v2', 'Engine 2', 'Translated voice, original picture', 'elevenlabs', 'dubbing', 0.30, 'minute', '{video,speaker-voices}', 1800, 200, null, '{}', 2),
  ('avatar-video', 'v1', 'Engine 1', 'Presenter avatars', 'heygen', 'v2/video/generate', 0.50, 'generation', '{avatars,photo-avatars}', null, null, 4000, '{}', 1),
  ('avatar-creator', 'v1', 'Engine 1', 'Photo avatars', 'heygen', 'asset/upload', 0, 'generation', '{}', null, 10, null, '{}', 1),
  ('prompt-video', 'v1', 'Engine 1', 'Video from a prompt', 'heygen', 'v1/video_agent/generate', 1.00, 'generation', '{}', null, null, 2000, '{}', 1),
  ('short-clips', 'v1', 'Engine 1', 'Best moments, cut to size', 'local', 'ffmpeg+scribe_v1', 0.05, 'minute', '{vertical}', 7200, 200, null, '{}', 1),
  ('filler-remover', 'v1', 'Engine 1', 'Removes ums and long pauses', 'local', 'ffmpeg+scribe_v1', 0.05, 'minute', '{}', 7200, 200, null, '{}', 1)
on conflict (service, key) do nothing;

-- ======================================================================
-- Checkout orders (add_checkout_orders.sql)
-- ======================================================================
-- Paid sign-ups from the marketing checkout. A customer pays first, and once the
-- payment is validated the account is approved, the dashboard is unlocked and
-- the wallet is credited automatically, with no wait for an admin.

create table if not exists public.checkout_orders (
  id uuid primary key default gen_random_uuid(),
  tran_id text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  service text not null,                 -- service id from the pricing page
  plan text not null,                    -- plan name
  product text not null,                 -- cms | studio | distribution
  usd_price numeric(12, 2) not null,     -- what is charged
  usd_credit numeric(12, 2) not null,    -- what lands in the wallet
  bdt_amount numeric(12, 2) not null,    -- BDT charged through SSLCommerz
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'held')),
  site_origin text,                      -- where checkout started, to send them back on failure
  val_id text,
  card_type text,
  raw_ipn jsonb,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists checkout_orders_user_idx on public.checkout_orders (user_id);

alter table public.checkout_orders enable row level security;

create policy "Users read their own orders"
  on public.checkout_orders for select
  using (auth.uid() = user_id);

create policy "Admins read all orders"
  on public.checkout_orders for select
  using (public.is_admin());

-- Atomic wallet credit that also writes the ledger row.
create or replace function public.wallet_topup(p_user uuid, p_usd numeric, p_note text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  update public.profiles set wallet_balance = wallet_balance + p_usd
   where id = p_user returning wallet_balance into new_balance;
  if p_usd > 0 then
    insert into public.wallet_transactions (user_id, type, amount, note)
    values (p_user, 'topup', p_usd, p_note);
  end if;
  return new_balance;
end;
$$;

revoke all on function public.wallet_topup(uuid, numeric, text) from public, anon, authenticated;

-- ======================================================================
-- Studio entitlements (add_studio_entitlements.sql)
-- ======================================================================
-- AI Studio access is per service. A purchase records exactly what was bought
-- (the service, the plan and the amount promised, such as 30,000 characters) and
-- every run deducts from it. Replaces credit charging for Studio.

create table if not exists public.studio_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  service text not null,                 -- pricing page service id: voice-generator, dubbing ...
  plan text not null,                    -- Starter, Creator, Pro ...
  unit text not null check (unit in ('characters', 'minutes', 'generations', 'avatars')),
  quota numeric(14, 3) not null,         -- what the plan promised
  used numeric(14, 3) not null default 0,
  expires_at timestamptz,                -- null = does not expire
  source text not null default 'purchase' check (source in ('purchase', 'admin')),
  order_id uuid references public.checkout_orders(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists studio_entitlements_user_service_idx on public.studio_entitlements (user_id, service);

alter table public.studio_entitlements enable row level security;

create policy "Users read their own entitlements"
  on public.studio_entitlements for select
  using (auth.uid() = user_id);

create policy "Admins read all entitlements"
  on public.studio_entitlements for select
  using (public.is_admin());

-- each generation remembers which service plan it drew from and how much
alter table public.studio_generations add column if not exists service text;
alter table public.studio_generations add column if not exists units numeric(14, 3) not null default 0;

-- A purchase made from inside the dashboard returns the customer to that page
alter table public.checkout_orders add column if not exists return_path text not null default '/checkout';

-- Takes `p_amount` from the service's plans, oldest-expiring first. All or nothing.
create or replace function public.studio_consume(p_user uuid, p_service text, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  need numeric := p_amount;
  take numeric;
begin
  if p_amount <= 0 then
    return true;
  end if;
  for r in
    select id, quota - used as avail
      from public.studio_entitlements
     where user_id = p_user and service = p_service
       and (expires_at is null or expires_at > now())
       and quota - used > 0
     order by expires_at nulls last, created_at
       for update
  loop
    exit when need <= 0;
    take := least(r.avail, need);
    update public.studio_entitlements set used = used + take where id = r.id;
    need := need - take;
  end loop;
  if need > 0 then
    raise exception 'insufficient';
  end if;
  return true;
end;
$$;

-- Gives back what a failed run took
create or replace function public.studio_restore(p_user uuid, p_service text, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  back numeric := p_amount;
  give numeric;
begin
  for r in
    select id, used from public.studio_entitlements
     where user_id = p_user and service = p_service and used > 0
     order by created_at desc
       for update
  loop
    exit when back <= 0;
    give := least(r.used, back);
    update public.studio_entitlements set used = used - give where id = r.id;
    back := back - give;
  end loop;
end;
$$;

revoke all on function public.studio_consume(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.studio_restore(uuid, text, numeric) from public, anon, authenticated;

-- Engine "credit cost" is now a usage multiplier: 1 = the normal amount comes off the
-- plan, 2 = twice as much. Reset the old placeholder costs to 1.
update public.studio_engines set credit_cost = 1, cost_unit = 'generation';
update public.studio_engines set credit_cost = 1.5 where provider = 'heygen' and service in ('dubbing', 'video-translation');

-- ======================================================================
-- Admin panel (add_admin_panel.sql)
-- ======================================================================
-- Admin panel: an audit trail of what admins did, a private note per customer,
-- and one safe function for adding or removing Channel Checker credits.

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_email text,
  action text not null,                  -- review, block, topup, grant_service, ...
  target_user uuid references public.profiles(id) on delete set null,
  target_label text,                     -- who it was done to, kept even if the account is deleted
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_user);

alter table public.admin_audit enable row level security;

create policy "Admins read the audit log"
  on public.admin_audit for select
  using (public.is_admin());

alter table public.profiles add column if not exists admin_note text;

-- Adds (positive) or removes (negative) Channel Checker wallet balance, never below zero.
-- Returns the new balance, or null when a removal would go below zero.
create or replace function public.wallet_adjust(p_user uuid, p_usd numeric, p_note text, p_admin uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  update public.profiles
     set wallet_balance = wallet_balance + p_usd
   where id = p_user and wallet_balance + p_usd >= 0
   returning wallet_balance into new_balance;
  if new_balance is null then
    return null;
  end if;
  insert into public.wallet_transactions (user_id, type, amount, note, created_by)
  values (p_user, (case when p_usd >= 0 then 'topup' else 'adjustment' end)::public.wallet_tx_type, p_usd, p_note, p_admin);
  return new_balance;
end;
$$;

revoke all on function public.wallet_adjust(uuid, numeric, text, uuid) from public, anon, authenticated;

-- ======================================================================
-- Shared free trial (add_studio_trial.sql)
-- ======================================================================
-- One free trial per account, shared across every AI Studio service.
-- Rules live in studio_trial_config so they are edited in the admin, not in code.

create table if not exists public.studio_trial_config (
  id boolean primary key default true check (id),        -- a single row
  enabled boolean not null default true,
  days integer not null default 7,                       -- how long the trial lasts
  max_generations integer not null default 2,            -- successful generations in total
  max_spend numeric(8, 3) not null default 0.20,         -- provider cost in USD, in total
  limits jsonb not null default '{}'::jsonb,             -- per-request caps by tool: {"voice": {"maxChars": 1000}}
  updated_at timestamptz not null default now()
);

insert into public.studio_trial_config (id, limits) values (
  true,
  '{"voice":{"maxChars":1000},"transcribe":{"maxSeconds":600},"music":{"maxSeconds":30},"voice-changer":{"maxSeconds":30},"audio-cleaner":{"maxSeconds":30},"sound-effects":{"maxSeconds":5},"dubbing":{"maxSeconds":15},"video-translation":{"maxSeconds":15},"avatar-video":{"maxChars":150},"prompt-video":{"maxChars":200},"short-clips":{"maxSeconds":120},"filler-remover":{"maxSeconds":60}}'::jsonb
) on conflict (id) do nothing;

create table if not exists public.studio_trials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  service text,                                          -- the service they came in through
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  generations_used integer not null default 0,
  spend_used numeric(10, 4) not null default 0,
  ended boolean not null default false
);

alter table public.studio_trial_config enable row level security;
alter table public.studio_trials enable row level security;

create policy "Admins read trial config" on public.studio_trial_config for select using (public.is_admin());
create policy "Users read their own trial" on public.studio_trials for select using (auth.uid() = user_id);
create policy "Admins read all trials" on public.studio_trials for select using (public.is_admin());

-- What each engine costs us (the provider's rate), so a generation's real cost can be worked out.
-- A null rate means the cost is not known yet, and the engine is kept out of the free trial.
alter table public.studio_engines add column if not exists provider_rate numeric(12, 5);
alter table public.studio_engines add column if not exists rate_unit text not null default 'per_minute'
  check (rate_unit in ('per_1k_chars', 'per_minute', 'per_generation'));
alter table public.studio_engines add column if not exists trial_allowed boolean not null default true;

-- ElevenLabs rates from the pricing brief; HeyGen and the in-house tools are ESTIMATES to confirm.
update public.studio_engines set provider_rate = 0.08,  rate_unit = 'per_1k_chars' where service = 'voice' and key = 'v1';
update public.studio_engines set provider_rate = 0.12,  rate_unit = 'per_minute'   where service in ('voice-changer', 'sound-effects', 'audio-cleaner');
update public.studio_engines set provider_rate = 0.15,  rate_unit = 'per_minute'   where service = 'music';
update public.studio_engines set provider_rate = 0.00367, rate_unit = 'per_minute' where service in ('transcribe', 'short-clips', 'filler-remover');
update public.studio_engines set provider_rate = 0.50,  rate_unit = 'per_minute'   where service = 'dubbing' and provider = 'elevenlabs';
update public.studio_engines set provider_rate = 2.00,  rate_unit = 'per_minute'   where provider = 'heygen' and service in ('dubbing', 'video-translation');
update public.studio_engines set provider_rate = 0.50,  rate_unit = 'per_minute'   where service = 'video-translation' and provider = 'elevenlabs';
update public.studio_engines set provider_rate = 1.00,  rate_unit = 'per_minute'   where service = 'avatar-video';
update public.studio_engines set provider_rate = 2.00,  rate_unit = 'per_minute'   where service = 'prompt-video';
update public.studio_engines set provider_rate = 0,     rate_unit = 'per_generation' where service = 'avatar-creator';
-- Dubbing on the second engine is not part of the free trial
update public.studio_engines set trial_allowed = false where service = 'dubbing' and key = 'v2';

-- each generation records where it was paid from and what it cost us
alter table public.studio_generations add column if not exists funding text not null default 'plan' check (funding in ('plan', 'trial'));
alter table public.studio_generations add column if not exists provider_cost numeric(10, 4) not null default 0;

-- Takes one generation and `p_cost` dollars from a trial, all or nothing.
-- Returns ok, or why not: none, disabled, expired, generations, spend.
create or replace function public.studio_trial_consume(p_user uuid, p_cost numeric)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.studio_trials%rowtype;
  c public.studio_trial_config%rowtype;
begin
  select * into c from public.studio_trial_config limit 1;
  if not found or not c.enabled then return 'disabled'; end if;
  select * into t from public.studio_trials where user_id = p_user for update;
  if not found then return 'none'; end if;
  if t.ended or t.expires_at <= now() then return 'expired'; end if;
  if t.generations_used >= c.max_generations then return 'generations'; end if;
  if t.spend_used + p_cost > c.max_spend then return 'spend'; end if;
  update public.studio_trials set generations_used = generations_used + 1, spend_used = spend_used + p_cost where user_id = p_user;
  return 'ok';
end;
$$;

-- Gives back what a failed run took
create or replace function public.studio_trial_restore(p_user uuid, p_cost numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.studio_trials
     set generations_used = greatest(generations_used - 1, 0),
         spend_used = greatest(spend_used - p_cost, 0)
   where user_id = p_user;
end;
$$;

revoke all on function public.studio_trial_consume(uuid, numeric) from public, anon, authenticated;
revoke all on function public.studio_trial_restore(uuid, numeric) from public, anon, authenticated;

-- ======================================================================
-- Voice models and saved voices (add_voice_models.sql)
-- ======================================================================
-- Saved voices: the library voices a customer added to "My voices".
create table if not exists public.studio_voices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  voice_id text not null,
  name text not null,
  gender text,
  age text,
  accent text,
  language text,
  locale text,
  use_case text,
  description text,
  preview_url text,
  source text not null default 'library',
  created_at timestamptz not null default now(),
  primary key (user_id, voice_id)
);

alter table public.studio_voices enable row level security;

drop policy if exists "Users read their own voices" on public.studio_voices;
create policy "Users read their own voices" on public.studio_voices for select using (auth.uid() = user_id);
drop policy if exists "Admins read all voices" on public.studio_voices;
create policy "Admins read all voices" on public.studio_voices for select using (public.is_admin());

-- The older engine becomes "Multilingual v2" and moves down the list.
update public.studio_engines
   set label = 'Multilingual v2',
       description = 'Steady, natural narration. 29 languages.',
       sort = 4
 where service = 'voice' and key = 'v1';

insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_chars, options, sort, provider_rate, rate_unit, trial_allowed)
values
  ('voice', 'v4',       'Voice v4',       'Our most expressive and emotive voice. 85 languages.',         'elevenlabs', 'eleven_v4',       1,   'generation', '{multilingual,expressive}', 10000, '{}', 1, 0.08, 'per_1k_chars', true),
  ('voice', 'v4-turbo', 'Voice v4 Turbo', 'Fast and light, half the usage. 85 languages.',                'elevenlabs', 'eleven_v4_turbo', 0.5, 'generation', '{multilingual}',            10000, '{}', 2, 0.04, 'per_1k_chars', true),
  ('voice', 'v3',       'Voice v3',       'Dramatic delivery with audio tags such as [whispers]. 74 languages.', 'elevenlabs', 'eleven_v3', 1,   'generation', '{multilingual,audio-tags}', 5000,  '{}', 3, 0.08, 'per_1k_chars', true),
  ('voice', 'flash',    'Flash v2.5',     'Real-time speed for long scripts, half the usage. 32 languages.', 'elevenlabs', 'eleven_flash_v2_5', 0.5, 'generation', '{multilingual}',          40000, '{}', 5, 0.04, 'per_1k_chars', true)
on conflict (service, key) do nothing;

-- ======================================================================
-- HeyGen v3 and the Lip sync tool (add_heygen_v3.sql)
-- ======================================================================
insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_duration_seconds, max_file_mb, options, sort, provider_rate, rate_unit, trial_allowed)
values
  ('lip-sync', 'v1', 'Lip sync', 'Match any video to new speech, with the mouth redrawn to fit.', 'heygen', 'lipsyncs', 1, 'minute', '{video,lipsync}', 600, 200, '{}', 1, 2.00, 'per_minute', false)
on conflict (service, key) do nothing;
