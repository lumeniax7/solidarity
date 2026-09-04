-- Required for both individual and group payments.
-- Run this migration in Supabase SQL Editor.

begin;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@tontine.local'
      or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
      or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      or coalesce(auth.jwt() -> 'user_metadata' ->> 'is_admin', 'false') = 'true'
      or coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', 'false') = 'true'
    );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

-- Remove any incomplete policies before recreating deterministic policies.
do $$
declare policy_name text;
begin
  foreach policy_name in array array[
    'payment_transactions_admin_insert', 'payment_transactions_admin_update', 'payment_transactions_admin_delete',
    'payment_allocations_admin_insert', 'payment_allocations_admin_update', 'payment_allocations_admin_delete',
    'cash_transactions_admin_insert', 'cash_transactions_admin_update', 'cash_transactions_admin_delete'
  ] loop
    execute format('drop policy if exists %I on public.%I', policy_name,
      case
        when policy_name like 'payment_transactions_%' then 'payment_transactions'
        when policy_name like 'payment_allocations_%' then 'payment_allocations'
        else 'cash_transactions'
      end);
  end loop;
end $$;

create policy payment_transactions_admin_insert on public.payment_transactions
  for insert to authenticated with check (public.current_user_is_admin());
create policy payment_transactions_admin_update on public.payment_transactions
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy payment_transactions_admin_delete on public.payment_transactions
  for delete to authenticated using (public.current_user_is_admin());

create policy payment_allocations_admin_insert on public.payment_allocations
  for insert to authenticated with check (public.current_user_is_admin());
create policy payment_allocations_admin_update on public.payment_allocations
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy payment_allocations_admin_delete on public.payment_allocations
  for delete to authenticated using (public.current_user_is_admin());

create policy cash_transactions_admin_insert on public.cash_transactions
  for insert to authenticated with check (public.current_user_is_admin());
create policy cash_transactions_admin_update on public.cash_transactions
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy cash_transactions_admin_delete on public.cash_transactions
  for delete to authenticated using (public.current_user_is_admin());

grant insert, update, delete on public.payment_transactions, public.payment_allocations, public.cash_transactions to authenticated;

commit;
