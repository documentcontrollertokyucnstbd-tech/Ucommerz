-- UCOMMERZ 0002 — adds the SUPERADMIN role on top of an EXISTING database that already ran 0001_init.sql.
-- (Fresh installs of the updated 0001_init.sql already include all of this — don't run both.)
-- Safe to run more than once.

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('PROVIDER', 'SEEKER', 'BOTH', 'ADMIN', 'SUPERADMIN'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('ADMIN', 'SUPERADMIN') and u.is_active);
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'SUPERADMIN' and u.is_active);
$$;

create or replace function public.is_provider()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role in ('PROVIDER', 'BOTH', 'ADMIN', 'SUPERADMIN') and u.is_active
  );
$$;

create or replace function public.protect_user_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.bypass_protection() and auth.uid() is not null then
    if not public.is_admin() then
      new.role := old.role;
      new.verified := old.verified;
      new.is_active := old.is_active;
      new.rating := old.rating;
      new.total_reviews := old.total_reviews;
      new.email := old.email;
    elsif not public.is_superadmin() then
      -- moderators (ADMIN) can't change roles or touch other staff accounts
      new.role := old.role;
      if old.role in ('ADMIN', 'SUPERADMIN') and old.id <> auth.uid() then
        new.is_active := old.is_active;
        new.verified := old.verified;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Categories and platform settings: SUPERADMIN only (moderators can still read them).
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write" on public.platform_settings for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Then promote yourself:
--   update public.users set role = 'SUPERADMIN' where email = 'you@example.com';
