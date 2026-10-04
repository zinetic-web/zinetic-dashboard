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
