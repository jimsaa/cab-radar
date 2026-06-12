# CabRadar

Mobile-first Next.js + Supabase app for taxi drivers to share real-time traffic, safety, operational, and convenience alerts.

## Features (V1)

- **Driver alerts** — one-tap reporting for slow traffic, accidents, roadwork, hazards, pickup areas, hotspots, EV chargers, break spots, and tips
- **GPS + maps** — auto-capture coordinates, Google Maps links, reverse geocoding
- **Admin verification** — sensitive categories (unsafe pickup, general tips) require approval
- **Real-time feed** — Supabase Realtime + optional web push for priority alerts
- **Floating action button** — quick-report from anywhere on the radar screen
- **Taxi Deals** — partner offers drivers show to redeem
- **Banner ads** — admin-managed slots on dashboard, deals, and feed
- **Points prep** — reputation and reward fields in DB (not active in UI)

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (Auth, Postgres, Realtime) |
| Map | Leaflet + react-leaflet (dark Carto tiles) |
| Push | Web Push (service worker + VAPID) |

## Setup

### 1. Supabase

See [supabase/README.md](./supabase/README.md). Run `supabase/schema.sql` in the SQL Editor.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in Supabase URL/keys and generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3005](http://localhost:3005).

### 4. Admin access

After signing up:

```sql
update public.profiles set is_admin = true where id = '<your-user-uuid>';
```

## Legal note

CabRadar only supports lawful driver-safety and traffic information. It does not include features to evade police, speed checks, sobriety checks, inspections, or law enforcement.

## Project structure

```
cab-radar/
  src/app/           # Pages & API routes
  src/components/    # UI (alerts, map, admin, deals)
  src/lib/           # Supabase, alerts, geo, push
  supabase/          # Database schema
  public/sw.js       # Web push service worker
```
