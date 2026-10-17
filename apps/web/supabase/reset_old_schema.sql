-- OPTIONAL — destroys the tables of the earlier UCommerz prototype.
-- Only run on a project holding NO data you want to keep, then run migrations/0001_init.sql.
drop table if exists public.reviews cascade;
drop table if exists public.bookings cascade;
drop table if exists public.services cascade;
drop table if exists public.subcategories cascade;
drop table if exists public.categories cascade;
drop table if exists public.providers cascade;
