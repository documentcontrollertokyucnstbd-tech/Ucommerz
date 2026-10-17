# UCOMMERZ — service marketplace

Turborepo + pnpm monorepo · Next.js 15 (App Router, React 19) · TypeScript strict · Tailwind 4 + shadcn/ui · Supabase · Resend · Google Maps.

```
ucommerz/
├─ apps/web/                 Next.js app (all UI, Server Actions, Route Handlers)
│  ├─ app/                   routes, components (incl. components/ui = shadcn), lib, hooks, actions
│  ├─ supabase/              SQL: migrations/0001_init.sql, reset_old_schema.sql, seed_demo.sql
│  ├─ middleware.ts          Supabase session refresh, route protection, rate limit, admin IP rules
│  └─ vercel.json            daily cron → /api/cron/reminders
└─ packages/
   ├─ config/                shared ESLint + tsconfig base
   └─ shared/                types, zod validators, constants (consumed as TS source)
```

## 1. Install & run (from the repo root)

```bash
# Node >= 20.9, pnpm >= 10
corepack enable
pnpm install
cp apps/web/.env.example apps/web/.env.local   # skip if you already have .env.local — it is included in this zip
pnpm dev                                       # http://localhost:3000
```

Other commands (repo root): `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`.
From `apps/web`: `pnpm dev`, `pnpm build`, `pnpm typecheck`.

## 2. Environment (`apps/web/.env.local`)

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase → Project Settings → API |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client | Maps JavaScript + Geocoding + Places |
| `NEXT_PUBLIC_APP_URL` | client | Public URL (used for emails, sitemap, canonical links) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | **Required** for: becoming a provider later (`Become a provider`), auto-confirm bookings, admin user deletion, service auto-approval setting, cron. Never expose it. |
| `RESEND_API_KEY`, `EMAIL_FROM` | server | Emails are skipped (not failed) when the key is absent. `EMAIL_FROM` must be on a Resend-verified domain. |
| `SESSION_SECRET` | server | Bearer token for `/api/cron/reminders` (`CRON_SECRET` is accepted too). |
| `ALLOWED_ORIGINS`, `RATE_LIMIT_*`, `ADMIN_IP_*`, `ENFORCE_ADMIN_IP_WHITELIST` | server | Optional hardening. |

> The `.env.local` you uploaded did not contain `SUPABASE_SERVICE_ROLE_KEY` — add it (Supabase → API → `service_role`) or the features listed above will report a clear error. Rotate any key you've shared outside your machine.

## 3. Database (Supabase → SQL Editor)

1. **Only if** your old prototype tables exist in this project: run `apps/web/supabase/reset_old_schema.sql` (drops the prototype's tables — destructive).
2. Run `apps/web/supabase/migrations/0001_init.sql` — 27 tables, RLS, triggers (notifications, ratings, booking-transition rules, protected columns), indexes, storage buckets + policies, realtime publication, seed categories/settings/report reasons.
3. Optional demo content: `apps/web/supabase/seed_demo.sql` (read the header first).
4. Register in the app, then make yourself admin:
   ```sql
   update public.users set role = 'ADMIN' where email = 'you@example.com';
   ```
5. Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/callback` (and your production URL + `/auth/callback`) to **Redirect URLs**.

## 4. What's in the app

| Area | Routes |
|---|---|
| Public | `/`, `/browse` (filters, sort, near-me radius, map), `/categories`, `/categories/[slug]`, `/services/[id]` (gallery, booking, reviews, map, JSON-LD), `/provider/[slug]` (portfolio, skills, packages, reviews) |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` |
| Account | `/profile` (photo, geocoded location, socials, enable provider role) |
| Customer | `/dashboard`, `/bookings`, `/bookings/[id]` (timeline, cancel, dispute, review), `/calendar`, `/favorites`, `/history`, `/messages` (realtime, attachments) |
| Provider | `/dashboard/provider-dashboard`, `my-services` (+create/edit), `my-packages`, `customers` (+notes), `provider-analytics`, `provider-profile` (+`/setup`), `provider-settings` (rules, hours + breaks, holidays), `message-templates`, `reminder-settings` |
| Admin | `/admin` (+`users`, `services`, `bookings`, `categories`, `reports`, `audit`, `security`, `settings`, `email-settings`) |
| API | `POST /api/bookings/send-reminder`, `POST /api/reminders/process`, `GET /api/cron/reminders` |
| SEO | `sitemap.xml`, `robots.txt`, per-page metadata, JSON-LD |

Conventions: guards (`requireUser/requireRole/requireAdmin`) in `app/lib/guards.ts`; every Server Action goes through `safeAction` (try/catch + zod + rate limit) and every UI mutation through `toastAction` (toast on success/failure); all env vars exposed to the browser are `NEXT_PUBLIC_*`.

## 5. Your original UI

Your prototype's visual language (oklch slate palette, glass cards, hero, category tiles, service cards, footer) lives in `app/globals.css`, `app/components/HomeSections.tsx`, `ServiceCard.tsx`, `Navigation.tsx`, `Footer.tsx`; images were copied to `apps/web/public`. New screens reuse those tokens and utilities (`glass`, `glass-card`).

## 6. Deploy (Vercel)

Import the repo, set **Root Directory** to `apps/web`, add the env vars above. `vercel.json` registers the daily reminder cron; set `SESSION_SECRET` (and optionally `CRON_SECRET` to the same value) so the cron call is authorised.

## 7. Notes / honest limits

* The code was authored in a sandbox without npm access, so it was verified statically (every file parses, every import/export resolves, stubbed type-check) but **not compiled with the real `next build`**. Run `pnpm install && pnpm typecheck && pnpm build` first; if the compiler flags anything, it will be small and local.
* The rate limiter is in-memory (per server instance) — swap in Upstash/Redis for multi-instance production.
* Payments are not implemented in v1 (bookings carry a total; settle off-platform). Types for a future integration are in `packages/shared/types/payment.types.ts`.
* SMS reminders store the preference; sending needs an SMS provider (e.g. Twilio) wired into `lib/reminders.ts`.
