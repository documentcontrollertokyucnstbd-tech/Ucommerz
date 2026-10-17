-- =============================================================================
-- UCOMMERZ — initial schema (Supabase / PostgreSQL)
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- (or `supabase db push` with the Supabase CLI).
--
-- Expects a FRESH public schema. If the project still contains tables from the
-- earlier prototype (providers, subcategories, services, categories, bookings,
-- reviews) run  supabase/reset_old_schema.sql  first.
-- =============================================================================

set check_function_bodies = off;

-- -----------------------------------------------------------------------------
-- 0. Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- True when the write comes from another trigger / trusted function, so the
-- "protect column" triggers below must not override it.
create or replace function public.bypass_protection()
returns boolean language plpgsql stable as $$
begin
  return pg_trigger_depth() > 1 or coalesce(current_setting('ucommerz.bypass', true), '') = '1';
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'SEEKER' check (role in ('PROVIDER', 'SEEKER', 'BOTH', 'ADMIN', 'SUPERADMIN')),
  bio text,
  location text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  total_reviews integer not null default 0 check (total_reviews >= 0),
  verified boolean not null default false,
  is_active boolean not null default true,
  slug text unique,
  social_links jsonb not null default '{}'::jsonb,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  description text,
  parent_id uuid references public.categories (id) on delete set null,
  order_position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  category text,
  sub_category text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  price_unit text not null default 'hour' check (price_unit in ('hour', 'day', 'session', 'project')),
  min_duration numeric(6, 2),
  max_duration numeric(6, 2),
  images text[] not null default '{}',
  location text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  is_remote boolean not null default false,
  is_on_site boolean not null default true,
  service_address text,
  service_latitude double precision,
  service_longitude double precision,
  service_radius numeric(8, 2),
  availability jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED')),
  views integer not null default 0,
  featured boolean not null default false,
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  seeker_id uuid not null references public.users (id) on delete cascade,
  provider_id uuid not null references public.users (id) on delete cascade,
  booking_date timestamptz not null,
  duration numeric(6, 2) not null default 1 check (duration > 0),
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  notes text,
  cancellation_reason text,
  completed_at timestamptz,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seeker_id <> provider_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  reviewee_id uuid not null references public.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  professionalism integer check (professionalism between 1 and 5),
  quality integer check (quality between 1 and 5),
  punctuality integer check (punctuality between 1 and 5),
  response text,
  response_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id) on delete cascade,
  receiver_id uuid not null references public.users (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  content text not null,
  attachments text[] not null default '{}',
  is_read boolean not null default false,
  read_at timestamptz,
  message_type text not null default 'TEXT' check (message_type in ('TEXT', 'IMAGE', 'FILE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> receiver_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  link text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, service_id)
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  discount_percentage numeric(5, 2) not null default 0 check (discount_percentage between 0 and 100),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_services (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (package_id, service_id)
);

create table public.package_bookings (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages (id) on delete cascade,
  seeker_id uuid not null references public.users (id) on delete cascade,
  provider_id uuid not null references public.users (id) on delete cascade,
  booking_date timestamptz not null,
  total_price numeric(12, 2) not null default 0,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('SERVICE', 'REVIEW', 'USER', 'MESSAGE')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'PENDING' check (status in ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolved_by uuid references public.users (id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_skills (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  skill_name text not null,
  skill_level text not null default 'INTERMEDIATE' check (skill_level in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
  years_experience integer not null default 0 check (years_experience >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_certifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  certificate_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_portfolio (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  image_urls text[] not null default '{}',
  project_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, day_of_week)
);

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  name text not null,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.booking_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.users (id) on delete cascade,
  min_notice_hours integer not null default 24 check (min_notice_hours >= 0),
  max_bookings_per_day integer not null default 8 check (max_bookings_per_day > 0),
  buffer_time_minutes integer not null default 15 check (buffer_time_minutes >= 0),
  auto_confirm boolean not null default false,
  cancellation_policy text not null default 'FLEXIBLE' check (cancellation_policy in ('FLEXIBLE', 'MODERATE', 'STRICT')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  customer_id uuid not null references public.users (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  subject text,
  content text not null,
  category text not null default 'GENERAL'
    check (category in ('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_COMPLETION', 'CANCELLATION', 'RESCHEDULE', 'GENERAL', 'REVIEW_REQUEST')),
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  recipient_email text,
  recipient_phone text,
  reminder_type text not null default 'EMAIL' check (reminder_type in ('EMAIL', 'SMS', 'BOTH')),
  reminder_time timestamptz not null,
  sent_at timestamptz,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminder_settings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.users (id) on delete cascade,
  enabled boolean not null default true,
  reminder_hours integer not null default 24 check (reminder_hours > 0),
  send_email boolean not null default true,
  send_sms boolean not null default false,
  sms_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  setting_group text not null default 'general',
  description text,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  action_type text not null,
  target_type text,
  target_id text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.report_reasons (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  target_type text not null check (target_type in ('SERVICE', 'REVIEW', 'USER', 'MESSAGE')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
create index idx_users_role on public.users (role);
create index idx_users_geo on public.users (latitude, longitude);
create index idx_categories_parent on public.categories (parent_id);
create index idx_services_provider on public.services (provider_id);
create index idx_services_status on public.services (status);
create index idx_services_category on public.services (category, sub_category);
create index idx_services_geo on public.services (latitude, longitude);
create index idx_services_featured on public.services (featured) where featured;
create index idx_services_fts on public.services using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
create index idx_bookings_seeker on public.bookings (seeker_id, booking_date desc);
create index idx_bookings_provider on public.bookings (provider_id, booking_date desc);
create index idx_bookings_service on public.bookings (service_id);
create index idx_bookings_status on public.bookings (status);
create index idx_reviews_service on public.reviews (service_id, created_at desc);
create index idx_reviews_reviewee on public.reviews (reviewee_id);
create index idx_messages_sender on public.messages (sender_id, created_at desc);
create index idx_messages_receiver on public.messages (receiver_id, created_at desc);
create index idx_messages_unread on public.messages (receiver_id) where not is_read;
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id) where not is_read;
create index idx_favorites_user on public.favorites (user_id);
create index idx_packages_provider on public.packages (provider_id);
create index idx_package_services_package on public.package_services (package_id);
create index idx_package_bookings_seeker on public.package_bookings (seeker_id);
create index idx_package_bookings_provider on public.package_bookings (provider_id);
create index idx_reports_status on public.reports (status, created_at desc);
create index idx_provider_skills_provider on public.provider_skills (provider_id);
create index idx_provider_certs_provider on public.provider_certifications (provider_id);
create index idx_provider_portfolio_provider on public.provider_portfolio (provider_id);
create index idx_provider_availability_provider on public.provider_availability (provider_id);
create index idx_holidays_provider on public.holidays (provider_id);
create index idx_customer_notes_pair on public.customer_notes (provider_id, customer_id);
create index idx_message_templates_provider on public.message_templates (provider_id);
create index idx_reminders_due on public.reminders (reminder_time) where status = 'PENDING';
create index idx_reminders_booking on public.reminders (booking_id);
create index idx_admin_logs_created on public.admin_logs (created_at desc);
create index idx_activity_logs_user on public.activity_logs (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. Auth-aware helper functions (used by RLS)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Triggers: updated_at
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'categories', 'services', 'bookings', 'reviews', 'messages', 'notifications',
    'packages', 'package_bookings', 'reports', 'provider_skills', 'provider_certifications',
    'provider_portfolio', 'provider_availability', 'business_hours', 'booking_rules',
    'customer_notes', 'message_templates', 'reminders', 'reminder_settings', 'platform_settings'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Profile creation on signup (+ email sync + slug)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare meta_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.users (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when meta_role in ('PROVIDER', 'SEEKER', 'BOTH') then meta_role else 'SEEKER' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_user_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.sync_user_email();

create or replace function public.generate_user_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(nullif(public.slugify(coalesce(new.full_name, split_part(new.email, '@', 1))), ''), 'user')
                || '-' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  return new;
end;
$$;

create trigger trg_users_slug before insert on public.users
  for each row execute function public.generate_user_slug();

-- Stop people promoting themselves / editing computed columns.
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

create trigger trg_users_protect before update on public.users
  for each row execute function public.protect_user_columns();

-- -----------------------------------------------------------------------------
-- 6. Service protections + views counter
-- -----------------------------------------------------------------------------
create or replace function public.protect_service_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.bypass_protection() or auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'PENDING';
    new.featured := false;
    new.rating := 0;
    new.total_reviews := 0;
    new.views := 0;
    return new;
  end if;

  new.featured := old.featured;
  new.rating := old.rating;
  new.total_reviews := old.total_reviews;
  new.views := old.views;
  new.provider_id := old.provider_id;

  if new.status is distinct from old.status then
    -- providers may toggle ACTIVE <-> INACTIVE, or re-submit a rejected service
    if not (
      (old.status = 'ACTIVE' and new.status = 'INACTIVE') or
      (old.status = 'INACTIVE' and new.status = 'ACTIVE') or
      (old.status = 'REJECTED' and new.status = 'PENDING')
    ) then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_services_protect_ins before insert on public.services
  for each row execute function public.protect_service_columns();
create trigger trg_services_protect_upd before update on public.services
  for each row execute function public.protect_service_columns();

create or replace function public.increment_service_views(p_service_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('ucommerz.bypass', '1', true);
  update public.services set views = views + 1 where id = p_service_id and status = 'ACTIVE';
  perform set_config('ucommerz.bypass', '', true);
end;
$$;
grant execute on function public.increment_service_views(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Booking integrity + status transitions
-- -----------------------------------------------------------------------------
create or replace function public.validate_booking_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare svc_provider uuid; svc_status text;
begin
  select provider_id, status into svc_provider, svc_status from public.services where id = new.service_id;
  if svc_provider is null then raise exception 'Service not found'; end if;
  if new.provider_id <> svc_provider then raise exception 'Booking provider must match the service provider'; end if;
  if auth.uid() is not null and not public.is_admin() then
    if svc_status <> 'ACTIVE' then raise exception 'This service is not available for booking'; end if;
    new.status := 'PENDING';
    new.completed_at := null;
    new.reminder_sent := false;
  end if;
  return new;
end;
$$;

create trigger trg_bookings_validate_ins before insert on public.bookings
  for each row execute function public.validate_booking_insert();

create or replace function public.enforce_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  allowed boolean := false;
begin
  if new.status = 'COMPLETED' and old.status <> 'COMPLETED' then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  if actor is null or public.is_admin() then return new; end if;

  if new.service_id <> old.service_id or new.seeker_id <> old.seeker_id
     or new.provider_id <> old.provider_id or new.total_price <> old.total_price then
    raise exception 'Immutable booking fields cannot be changed';
  end if;

  if actor = old.seeker_id then
    new.reminder_sent := old.reminder_sent;
    if old.status <> 'PENDING' then
      new.booking_date := old.booking_date;
      new.duration := old.duration;
    end if;
  end if;

  if new.status is distinct from old.status then
    if actor = old.provider_id then
      allowed := case old.status
        when 'PENDING' then new.status in ('CONFIRMED', 'CANCELLED')
        when 'CONFIRMED' then new.status in ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')
        when 'IN_PROGRESS' then new.status in ('COMPLETED', 'CANCELLED')
        else false
      end;
    elsif actor = old.seeker_id then
      allowed := case old.status
        when 'PENDING' then new.status = 'CANCELLED'
        when 'CONFIRMED' then new.status in ('CANCELLED', 'DISPUTED')
        when 'IN_PROGRESS' then new.status = 'DISPUTED'
        when 'COMPLETED' then new.status = 'DISPUTED'
        else false
      end;
    end if;
    if not allowed then
      raise exception 'Invalid status change: % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_bookings_enforce_upd before update on public.bookings
  for each row execute function public.enforce_booking_update();

-- -----------------------------------------------------------------------------
-- 8. Review integrity + rating aggregation
-- -----------------------------------------------------------------------------
create or replace function public.protect_review_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if auth.uid() = old.reviewee_id then
      new.booking_id := old.booking_id;
      new.reviewer_id := old.reviewer_id;
      new.reviewee_id := old.reviewee_id;
      new.service_id := old.service_id;
      new.rating := old.rating;
      new.comment := old.comment;
      new.professionalism := old.professionalism;
      new.quality := old.quality;
      new.punctuality := old.punctuality;
      if new.response is distinct from old.response then new.response_at := now(); end if;
    else
      raise exception 'Only the reviewed provider can respond to a review';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_reviews_protect before update on public.reviews
  for each row execute function public.protect_review_update();

create or replace function public.refresh_ratings()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_service uuid; v_reviewee uuid;
begin
  if tg_op = 'DELETE' then v_service := old.service_id; v_reviewee := old.reviewee_id;
  else v_service := new.service_id; v_reviewee := new.reviewee_id; end if;

  update public.services s
     set rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where service_id = v_service), 0),
         total_reviews = (select count(*) from public.reviews where service_id = v_service)
   where s.id = v_service;

  update public.users u
     set rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where reviewee_id = v_reviewee), 0),
         total_reviews = (select count(*) from public.reviews where reviewee_id = v_reviewee)
   where u.id = v_reviewee;
  return null;
end;
$$;

create trigger trg_reviews_refresh_ratings after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_ratings();

-- -----------------------------------------------------------------------------
-- 9. Message protection
-- -----------------------------------------------------------------------------
create or replace function public.protect_message_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.sender_id := old.sender_id;
    new.receiver_id := old.receiver_id;
    new.booking_id := old.booking_id;
    new.content := old.content;
    new.attachments := old.attachments;
    new.message_type := old.message_type;
    if new.is_read and not old.is_read then new.read_at := coalesce(new.read_at, now()); end if;
  end if;
  return new;
end;
$$;

create trigger trg_messages_protect before update on public.messages
  for each row execute function public.protect_message_update();

-- -----------------------------------------------------------------------------
-- 10. Automatic notifications (SECURITY DEFINER => bypass RLS)
-- -----------------------------------------------------------------------------
create or replace function public.notify_booking_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare svc_title text; seeker_name text;
begin
  select title into svc_title from public.services where id = new.service_id;
  select coalesce(full_name, email) into seeker_name from public.users where id = new.seeker_id;
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (new.provider_id, 'BOOKING_REQUEST', 'New booking request',
          seeker_name || ' requested "' || coalesce(svc_title, 'your service') || '"',
          '/dashboard/bookings/' || new.id, jsonb_build_object('booking_id', new.id));
  return new;
end;
$$;
create trigger trg_bookings_notify_ins after insert on public.bookings
  for each row execute function public.notify_booking_created();

create or replace function public.notify_booking_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare svc_title text; target uuid;
begin
  if new.status is not distinct from old.status then return new; end if;
  select title into svc_title from public.services where id = new.service_id;
  if auth.uid() is not null and auth.uid() = old.seeker_id then target := old.provider_id; else target := old.seeker_id; end if;
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (target, 'BOOKING_UPDATE', 'Booking ' || lower(replace(new.status, '_', ' ')),
          '"' || coalesce(svc_title, 'Service') || '" is now ' || lower(replace(new.status, '_', ' ')),
          '/dashboard/bookings/' || new.id, jsonb_build_object('booking_id', new.id, 'status', new.status));
  return new;
end;
$$;
create trigger trg_bookings_notify_upd after update on public.bookings
  for each row execute function public.notify_booking_status();

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text; updated integer;
begin
  select coalesce(full_name, email) into sender_name from public.users where id = new.sender_id;
  update public.notifications
     set message = left(new.content, 140), created_at = now(), title = 'New message from ' || sender_name
   where user_id = new.receiver_id and type = 'MESSAGE' and not is_read
     and metadata ->> 'sender_id' = new.sender_id::text;
  get diagnostics updated = row_count;
  if updated = 0 then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (new.receiver_id, 'MESSAGE', 'New message from ' || sender_name, left(new.content, 140),
            '/dashboard/messages?with=' || new.sender_id, jsonb_build_object('sender_id', new.sender_id));
  end if;
  return new;
end;
$$;
create trigger trg_messages_notify after insert on public.messages
  for each row execute function public.notify_message();

create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (new.reviewee_id, 'REVIEW', 'You received a new review',
          new.rating || '★ — ' || left(coalesce(new.comment, ''), 120),
          '/services/' || new.service_id, jsonb_build_object('review_id', new.id, 'service_id', new.service_id));
  return new;
end;
$$;
create trigger trg_reviews_notify after insert on public.reviews
  for each row execute function public.notify_review();

create or replace function public.notify_service_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and auth.uid() is not null and auth.uid() <> old.provider_id then
    insert into public.notifications (user_id, type, title, message, link, metadata)
    values (old.provider_id, 'SERVICE_UPDATE', 'Service ' || lower(new.status),
            '"' || new.title || '" is now ' || lower(new.status), '/dashboard/my-services',
            jsonb_build_object('service_id', new.id, 'status', new.status));
  end if;
  return new;
end;
$$;
create trigger trg_services_notify after update on public.services
  for each row execute function public.notify_service_status();

-- -----------------------------------------------------------------------------
-- 11. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;
alter table public.packages enable row level security;
alter table public.package_services enable row level security;
alter table public.package_bookings enable row level security;
alter table public.reports enable row level security;
alter table public.provider_skills enable row level security;
alter table public.provider_certifications enable row level security;
alter table public.provider_portfolio enable row level security;
alter table public.provider_availability enable row level security;
alter table public.business_hours enable row level security;
alter table public.holidays enable row level security;
alter table public.booking_rules enable row level security;
alter table public.customer_notes enable row level security;
alter table public.message_templates enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_settings enable row level security;
alter table public.admin_logs enable row level security;
alter table public.platform_settings enable row level security;
alter table public.activity_logs enable row level security;
alter table public.report_reasons enable row level security;

-- users: read all, update own row only (role/verified/etc. protected by trigger)
create policy "users_select_all" on public.users for select using (true);
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_admin_all" on public.users for all using (public.is_admin()) with check (public.is_admin());

-- Hide contact details (email / phone) from anonymous visitors at column level.
revoke select on public.users from anon;
grant select (id, full_name, avatar_url, role, bio, location, latitude, longitude, rating,
              total_reviews, verified, is_active, slug, social_links, website, created_at, updated_at)
  on public.users to anon;

-- categories
create policy "categories_public_read" on public.categories for select using (is_active or public.is_admin());
create policy "categories_admin_write" on public.categories for all using (public.is_superadmin()) with check (public.is_superadmin());

-- services
create policy "services_public_read" on public.services for select
  using (status = 'ACTIVE' or provider_id = auth.uid() or public.is_admin());
create policy "services_provider_insert" on public.services for insert
  with check (provider_id = auth.uid() and public.is_provider());
create policy "services_provider_update" on public.services for update
  using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "services_provider_delete" on public.services for delete using (provider_id = auth.uid());
create policy "services_admin_all" on public.services for all using (public.is_admin()) with check (public.is_admin());

-- bookings
create policy "bookings_participant_read" on public.bookings for select
  using (seeker_id = auth.uid() or provider_id = auth.uid() or public.is_admin());
create policy "bookings_seeker_insert" on public.bookings for insert
  with check (seeker_id = auth.uid() and provider_id = (select s.provider_id from public.services s where s.id = service_id));
create policy "bookings_participant_update" on public.bookings for update
  using (seeker_id = auth.uid() or provider_id = auth.uid())
  with check (seeker_id = auth.uid() or provider_id = auth.uid());
create policy "bookings_admin_all" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

-- reviews
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_insert_after_completed_booking" on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id and b.status = 'COMPLETED' and b.seeker_id = auth.uid()
        and b.provider_id = reviews.reviewee_id and b.service_id = reviews.service_id
    )
  );
create policy "reviews_reviewee_respond" on public.reviews for update
  using (reviewee_id = auth.uid()) with check (reviewee_id = auth.uid());
create policy "reviews_admin_all" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- messages
create policy "messages_participant_read" on public.messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "messages_sender_insert" on public.messages for insert with check (sender_id = auth.uid());
create policy "messages_receiver_mark_read" on public.messages for update
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());
create policy "messages_admin_read" on public.messages for select using (public.is_admin());

-- notifications (inserted by SECURITY DEFINER triggers / service role)
create policy "notifications_own_read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_own_delete" on public.notifications for delete using (user_id = auth.uid());

-- favorites
create policy "favorites_own_all" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- packages
create policy "packages_public_read" on public.packages for select
  using (is_active or provider_id = auth.uid() or public.is_admin());
create policy "packages_owner_write" on public.packages for all
  using (provider_id = auth.uid()) with check (provider_id = auth.uid() and public.is_provider());
create policy "packages_admin_all" on public.packages for all using (public.is_admin()) with check (public.is_admin());

create policy "package_services_public_read" on public.package_services for select
  using (exists (select 1 from public.packages p where p.id = package_id and (p.is_active or p.provider_id = auth.uid())));
create policy "package_services_owner_write" on public.package_services for all
  using (exists (select 1 from public.packages p where p.id = package_id and p.provider_id = auth.uid()))
  with check (exists (select 1 from public.packages p where p.id = package_id and p.provider_id = auth.uid()));

create policy "package_bookings_participant_read" on public.package_bookings for select
  using (seeker_id = auth.uid() or provider_id = auth.uid() or public.is_admin());
create policy "package_bookings_seeker_insert" on public.package_bookings for insert with check (seeker_id = auth.uid());
create policy "package_bookings_participant_update" on public.package_bookings for update
  using (seeker_id = auth.uid() or provider_id = auth.uid())
  with check (seeker_id = auth.uid() or provider_id = auth.uid());

-- reports
create policy "reports_reporter_insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_reporter_read_own" on public.reports for select using (reporter_id = auth.uid());
create policy "reports_admin_read" on public.reports for select using (public.is_admin());
create policy "reports_admin_update" on public.reports for update using (public.is_admin()) with check (public.is_admin());

-- provider_* : public read, owner write
create policy "provider_skills_read" on public.provider_skills for select using (true);
create policy "provider_skills_owner" on public.provider_skills for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "provider_certs_read" on public.provider_certifications for select using (true);
create policy "provider_certs_owner" on public.provider_certifications for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "provider_certs_admin" on public.provider_certifications for all using (public.is_admin()) with check (public.is_admin());
create policy "provider_portfolio_read" on public.provider_portfolio for select using (true);
create policy "provider_portfolio_owner" on public.provider_portfolio for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "provider_availability_read" on public.provider_availability for select using (true);
create policy "provider_availability_owner" on public.provider_availability for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Scheduling tables: owner CRUD + public read (booking form validates against hours/rules)
create policy "business_hours_read" on public.business_hours for select using (true);
create policy "business_hours_owner" on public.business_hours for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "holidays_read" on public.holidays for select using (true);
create policy "holidays_owner" on public.holidays for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "booking_rules_read" on public.booking_rules for select using (true);
create policy "booking_rules_owner" on public.booking_rules for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- Private provider tables: owner only
create policy "customer_notes_owner" on public.customer_notes for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "message_templates_owner" on public.message_templates for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "reminder_settings_owner" on public.reminder_settings for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- reminders: participants read; service role (cron) writes; providers may schedule for own bookings
create policy "reminders_participant_read" on public.reminders for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and (b.provider_id = auth.uid() or b.seeker_id = auth.uid())));
create policy "reminders_provider_insert" on public.reminders for insert
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.provider_id = auth.uid()));

-- logs
create policy "admin_logs_admin_read" on public.admin_logs for select using (public.is_admin());
create policy "admin_logs_admin_insert" on public.admin_logs for insert with check (public.is_admin() and admin_id = auth.uid());
create policy "activity_logs_own_read" on public.activity_logs for select using (user_id = auth.uid());
create policy "activity_logs_own_insert" on public.activity_logs for insert with check (user_id = auth.uid());
create policy "activity_logs_admin_read" on public.activity_logs for select using (public.is_admin());

-- platform settings & report reasons
create policy "platform_settings_public_read" on public.platform_settings for select
  using (setting_group in ('general', 'booking') or public.is_admin());
create policy "platform_settings_admin_write" on public.platform_settings for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "report_reasons_public_read" on public.report_reasons for select using (is_active or public.is_admin());
create policy "report_reasons_admin_write" on public.report_reasons for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 12. Realtime
-- -----------------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.bookings; exception when duplicate_object then null; end;
end $$;

-- -----------------------------------------------------------------------------
-- 13. Storage buckets + policies  (files live under  <bucket>/<user_id>/<file>)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('services', 'services', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('certificates', 'certificates', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('message-attachments', 'message-attachments', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do nothing;

create policy "ucommerz_storage_public_read" on storage.objects for select
  using (bucket_id in ('avatars', 'services', 'certificates', 'portfolio', 'message-attachments'));
create policy "ucommerz_storage_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'services', 'certificates', 'portfolio', 'message-attachments')
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ucommerz_storage_owner_update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'services', 'certificates', 'portfolio', 'message-attachments')
         and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ucommerz_storage_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'services', 'certificates', 'portfolio', 'message-attachments')
         and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- 14. Seed data
-- -----------------------------------------------------------------------------
insert into public.categories (name, slug, icon, description, parent_id, order_position) values
  ('Home Services', 'home-services', 'wrench', 'Repairs, installations and maintenance for your home', null, 1),
  ('Web & Software', 'web-software', 'code', 'Websites, apps and custom software', null, 2),
  ('Design & Creative', 'design-creative', 'palette', 'Graphic design, branding and video', null, 3),
  ('Photography', 'photography', 'camera', 'Events, portraits and commercial shoots', null, 4),
  ('Cleaning', 'cleaning', 'sparkles', 'Residential and commercial cleaning', null, 5),
  ('Business & Consulting', 'business-consulting', 'briefcase', 'Strategy, marketing and legal support', null, 6),
  ('AI & Data', 'ai-data', 'brain', 'Machine learning and data analysis', null, 7),
  ('Accounting & Finance', 'accounting-finance', 'calculator', 'Bookkeeping, tax and financial planning', null, 8)
on conflict (slug) do nothing;

insert into public.categories (name, slug, icon, description, parent_id, order_position)
select v.name, v.slug, null, null, c.id, v.pos
from (values
  ('home-services', 'Plumbing', 'plumbing', 1),
  ('home-services', 'Electrical Work', 'electrical-work', 2),
  ('home-services', 'Painting', 'painting', 3),
  ('home-services', 'Handyman', 'handyman', 4),
  ('web-software', 'Web Development', 'web-development', 1),
  ('web-software', 'Mobile Apps', 'mobile-apps', 2),
  ('web-software', 'E-commerce', 'e-commerce', 3),
  ('design-creative', 'Graphic Design', 'graphic-design', 1),
  ('design-creative', 'Branding', 'branding', 2),
  ('design-creative', 'Video Editing', 'video-editing', 3),
  ('photography', 'Wedding', 'wedding-photography', 1),
  ('photography', 'Portrait', 'portrait-photography', 2),
  ('photography', 'Product', 'product-photography', 3),
  ('cleaning', 'House Cleaning', 'house-cleaning', 1),
  ('cleaning', 'Office Cleaning', 'office-cleaning', 2),
  ('cleaning', 'Deep Cleaning', 'deep-cleaning', 3),
  ('business-consulting', 'Marketing', 'marketing', 1),
  ('business-consulting', 'Business Consulting', 'business-consulting-services', 2),
  ('business-consulting', 'Legal Support', 'legal-support', 3),
  ('ai-data', 'AI / Machine Learning', 'ai-ml', 1),
  ('ai-data', 'Data Analysis', 'data-analysis', 2),
  ('accounting-finance', 'Accounting', 'accounting', 1),
  ('accounting-finance', 'Tax Preparation', 'tax-preparation', 2),
  ('accounting-finance', 'Bookkeeping', 'bookkeeping', 3)
) as v(parent_slug, name, slug, pos)
join public.categories c on c.slug = v.parent_slug
on conflict (slug) do nothing;

insert into public.report_reasons (reason, target_type) values
  ('Spam or misleading', 'SERVICE'),
  ('Inappropriate content', 'SERVICE'),
  ('Fraud or scam', 'SERVICE'),
  ('Incorrect pricing / information', 'SERVICE'),
  ('Fake or abusive review', 'REVIEW'),
  ('Harassment', 'REVIEW'),
  ('Impersonation', 'USER'),
  ('Harassment or abuse', 'USER'),
  ('Suspicious activity', 'USER'),
  ('Spam', 'MESSAGE'),
  ('Harassment or threats', 'MESSAGE');

insert into public.platform_settings (setting_key, setting_value, setting_group, description) values
  ('site_name', '"UCOMMERZ"', 'general', 'Public name of the marketplace'),
  ('support_email', '"support@ucommerz.com"', 'general', 'Support contact shown to users'),
  ('commission_rate', '10', 'general', 'Platform commission in percent'),
  ('allow_registration', 'true', 'general', 'Allow new users to register'),
  ('maintenance_mode', 'false', 'general', 'Show maintenance banner to visitors'),
  ('require_service_approval', 'true', 'general', 'New services must be approved by an admin'),
  ('email_settings', '{"from_name":"UCOMMERZ","from_email":"notifications@ucommerz.com","reply_to":"","booking_emails":true,"reminder_emails":true,"review_request_emails":true}', 'email', 'Transactional email configuration')
on conflict (setting_key) do nothing;

-- To make yourself the super admin after registering (full access):
--   update public.users set role = 'SUPERADMIN' where email = 'you@example.com';
-- Moderators (limited staff: users, services, reports, bookings):
--   update public.users set role = 'ADMIN' where email = 'mod@example.com';
