-- Fixes the admin "add or remove Channel Checker credit" action, which failed with
-- "column type is of type wallet_tx_type but expression is of type text".
-- Run this once in the Supabase SQL editor. Safe to run again.

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
