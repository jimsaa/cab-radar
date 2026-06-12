# CabRadar — Supabase Setup

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).

2. Run the correct SQL file in the SQL Editor:

| Situation | File |
|-----------|------|
| **Brand-new** Supabase project (no `profiles` table) | `schema.sql` |
| **Existing** project (`profiles` already exists) | `migration-existing-project.sql` |

3. Enable **Email** auth under Authentication → Providers.
4. Create a **public** storage bucket: `cab-radar-media` (for deal images).
5. Copy `.env.local.example` to `.env.local` and fill in keys.
6. Generate VAPID keys for web push:

```bash
npx web-push generate-vapid-keys
```

7. Promote your account to admin after signup:

```sql
-- Fresh schema (is_admin only):
update public.profiles set is_admin = true where id = '<your-user-uuid>';

-- Shared project with CanTrove (role column):
update public.profiles set is_admin = true, role = 'admin' where id = '<your-user-uuid>';
```

## Driver verification

Run **`migration-driver-verification.sql`** to add phone, licence number, and pending verification flow.

## Verification v2 (licence hash, CabRadar User ID, feedback)

Run **`migration-verification-v2.sql`** after driver verification. This adds:

- CabRadar User ID (`CR-XXXXXX`) for every driver
- Hashed licence storage (6 digits, unique, masked as `XX1234` in UI)
- In-app feedback table for admin review

Add to `.env.local`:

```
LICENCE_HASH_SECRET=your-random-secret-here
```

Use the **same value** as the pepper in the migration SQL (`cabradar-change-this-pepper` — change both before production).

## Membership (active driver / årsmedlemskap)

Run **`migration-membership.sql`** after verification v2.

- **Aktiv förare** — gratis om du når 5 rapporter, 10 röster eller 50 poäng/månad
- **Årsmedlemskap** — 199 kr/år via Stripe (eller admin manuellt)

Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`

Monthly reset: `POST /api/cron/monthly-reset` with header `Authorization: Bearer <CRON_SECRET>` (schedule on 1st of each month via Vercel Cron or similar).

## Driver Help

Run **`migration-driver-help.sql`** after the main schema to add the knowledge base tables and seed the example M2 taximeter article.


Alerts are published on the `driver_alerts` table for in-app live updates.

## Push notifications

Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` in `.env.local`. Push is sent server-side when high-priority alerts are created (accident, hazard, major slow traffic).

## Local dev URL

App runs on [http://localhost:3005](http://localhost:3005). Add this Supabase auth redirect URL:

`http://localhost:3005/auth/callback`
