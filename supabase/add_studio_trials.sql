-- Free trials for AI Studio: one small plan per service, once per account, never resets.

alter table public.studio_entitlements drop constraint if exists studio_entitlements_source_check;
alter table public.studio_entitlements
  add constraint studio_entitlements_source_check check (source in ('purchase', 'admin', 'trial'));

-- a customer can only ever take the trial of a service once
create unique index if not exists studio_entitlements_one_trial
  on public.studio_entitlements (user_id, service) where source = 'trial';
