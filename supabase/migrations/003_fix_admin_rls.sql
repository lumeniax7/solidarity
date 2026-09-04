-- Fix admin writes for the GitHub Pages frontend using Supabase Auth.
-- RLS remains enabled. The admin decision uses Supabase Auth JWT metadata
-- or the configured administrator email; this project has no public.users table.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false)
    or coalesce((auth.jwt() ->> 'email') = 'admin@tontine.local', false);
$$;

grant execute on function public.current_user_is_admin() to authenticated;

-- Recreate the members policies so the deployed policy is deterministic.
drop policy if exists members_admin_insert on public.members;
drop policy if exists members_admin_update on public.members;
drop policy if exists members_admin_delete on public.members;

create policy members_admin_insert
  on public.members
  for insert
  to authenticated
  with check (public.current_user_is_admin());

create policy members_admin_update
  on public.members
  for update
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy members_admin_delete
  on public.members
  for delete
  to authenticated
  using (public.current_user_is_admin());
