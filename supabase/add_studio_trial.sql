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
