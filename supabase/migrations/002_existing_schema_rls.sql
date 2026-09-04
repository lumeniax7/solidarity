-- Solidarity: security and access policies for the existing Supabase schema.
-- Run this after the existing tables have been created. It does not rename or delete columns.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
      or coalesce(auth.jwt() ->> 'email' = 'admin@tontine.local', false);
$$;

create or replace function public.monthly_contribution()
returns integer
language sql
stable
security invoker
as $$
  select coalesce((select setting_value::integer from public.settings where setting_key = 'monthly_contribution'), 1000);
$$;

insert into public.settings (setting_key, setting_value, description)
values ('monthly_contribution', '1000', 'Cotisation mensuelle par membre')
on conflict (setting_key) do nothing;

alter table public.members enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

drop policy if exists members_read_authenticated on public.members;
drop policy if exists members_admin_insert on public.members;
drop policy if exists members_admin_update on public.members;
drop policy if exists members_admin_delete on public.members;
create policy members_read_authenticated on public.members for select to authenticated using (true);
create policy members_admin_insert on public.members for insert to authenticated with check (public.current_user_is_admin());
create policy members_admin_update on public.members for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy members_admin_delete on public.members for delete to authenticated using (public.current_user_is_admin());

drop policy if exists payments_read_authenticated on public.payment_transactions;
drop policy if exists payments_admin_insert on public.payment_transactions;
create policy payments_read_authenticated on public.payment_transactions for select to authenticated using (true);
create policy payments_admin_insert on public.payment_transactions for insert to authenticated with check (public.current_user_is_admin() and recorded_by = auth.uid());

drop policy if exists allocations_read_authenticated on public.payment_allocations;
drop policy if exists allocations_admin_insert on public.payment_allocations;
create policy allocations_read_authenticated on public.payment_allocations for select to authenticated using (true);
create policy allocations_admin_insert on public.payment_allocations for insert to authenticated with check (public.current_user_is_admin());

drop policy if exists cash_read_authenticated on public.cash_transactions;
drop policy if exists cash_admin_insert on public.cash_transactions;
create policy cash_read_authenticated on public.cash_transactions for select to authenticated using (true);
create policy cash_admin_insert on public.cash_transactions for insert to authenticated with check (public.current_user_is_admin() and recorded_by = auth.uid());

drop policy if exists withdrawals_read_authenticated on public.withdrawals;
drop policy if exists withdrawals_admin_insert on public.withdrawals;
drop policy if exists withdrawals_admin_update on public.withdrawals;
drop policy if exists withdrawals_admin_delete on public.withdrawals;
create policy withdrawals_read_authenticated on public.withdrawals for select to authenticated using (true);
create policy withdrawals_admin_insert on public.withdrawals for insert to authenticated with check (public.current_user_is_admin() and recorded_by = auth.uid());
create policy withdrawals_admin_update on public.withdrawals for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy withdrawals_admin_delete on public.withdrawals for delete to authenticated using (public.current_user_is_admin());

drop policy if exists announcements_read_authenticated on public.announcements;
drop policy if exists announcements_admin_insert on public.announcements;
create policy announcements_read_authenticated on public.announcements for select to authenticated using (published = true or public.current_user_is_admin());
create policy announcements_admin_insert on public.announcements for insert to authenticated with check (public.current_user_is_admin() and created_by = auth.uid());

drop policy if exists audit_read_authenticated on public.audit_logs;
create policy audit_read_authenticated on public.audit_logs for select to authenticated using (true);

drop policy if exists settings_read_authenticated on public.settings;
drop policy if exists settings_admin_update on public.settings;
create policy settings_read_authenticated on public.settings for select to authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

-- Existing schema uses UUID IDs and period_month/allocated_amount.
-- This view exposes the names expected by the dashboard without changing stored columns.
create or replace view public.solidarity_balance as
select
  coalesce((select sum(amount) from public.payment_transactions), 0) as total_contributions,
  coalesce((select sum(amount) from public.withdrawals), 0) as total_withdrawals,
  coalesce((select sum(amount) from public.payment_transactions), 0) - coalesce((select sum(amount) from public.withdrawals), 0) as balance,
  (select count(*) from public.members where coalesce(status, 'ACTIVE') not in ('INACTIVE', 'inactive')) as active_members;

grant execute on function public.current_user_is_admin(), public.monthly_contribution() to authenticated;
grant select on public.solidarity_balance to authenticated;
