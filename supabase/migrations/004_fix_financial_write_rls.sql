-- Allow the authenticated administrator to record and correct financial operations.
-- The frontend writes the transaction, its allocations, and the cash ledger separately.
-- RLS stays enabled for every table.

begin;

drop policy if exists payment_transactions_admin_insert on public.payment_transactions;
drop policy if exists payment_transactions_admin_update on public.payment_transactions;
drop policy if exists payment_transactions_admin_delete on public.payment_transactions;
create policy payment_transactions_admin_insert on public.payment_transactions
  for insert to authenticated with check (public.current_user_is_admin());
create policy payment_transactions_admin_update on public.payment_transactions
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy payment_transactions_admin_delete on public.payment_transactions
  for delete to authenticated using (public.current_user_is_admin());

drop policy if exists payment_allocations_admin_insert on public.payment_allocations;
drop policy if exists payment_allocations_admin_update on public.payment_allocations;
drop policy if exists payment_allocations_admin_delete on public.payment_allocations;
create policy payment_allocations_admin_insert on public.payment_allocations
  for insert to authenticated with check (public.current_user_is_admin());
create policy payment_allocations_admin_update on public.payment_allocations
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy payment_allocations_admin_delete on public.payment_allocations
  for delete to authenticated using (public.current_user_is_admin());

-- cash_transactions is the ledger written after each payment or withdrawal.
drop policy if exists cash_transactions_admin_insert on public.cash_transactions;
drop policy if exists cash_transactions_admin_update on public.cash_transactions;
drop policy if exists cash_transactions_admin_delete on public.cash_transactions;
create policy cash_transactions_admin_insert on public.cash_transactions
  for insert to authenticated with check (public.current_user_is_admin());
create policy cash_transactions_admin_update on public.cash_transactions
  for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy cash_transactions_admin_delete on public.cash_transactions
  for delete to authenticated using (public.current_user_is_admin());

grant insert, update, delete on public.payment_transactions, public.payment_allocations, public.cash_transactions to authenticated;

commit;
