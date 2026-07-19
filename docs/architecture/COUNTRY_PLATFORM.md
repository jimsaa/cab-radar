# CabRadar Country-Aware Platform Architecture

CabRadar is evolving from a Sweden-only app into a **country-aware platform**.
Sweden (`SE`) remains the only **enabled** country. Existing behaviour is unchanged.

---

## Architecture Principles

1. **The platform is country-agnostic.** Core application code must not encode market-specific behaviour.
2. **Country-specific behaviour belongs in configuration** — country JSON, translation files, validation rules, aliases, feature flags, and domain lists.
3. **No country should ever become a special case in the codebase.** Avoid `if (country === "SE")`, `switch (country)`, or hard-coded market branches in app logic.
4. **Future countries should be enabled through configuration, not development.** Shipping a new market means config + translations + DNS + Admin activation — not a core rewrite.
5. **Root domains do not determine country.** `cabradar.se` and `cabradar.com` both resolve to the platform default country. Only an explicit country subdomain (`is.cabradar.se`) selects a market.
6. **Aliases are configurable.** Example: `uk.cabradar.se` → ISO `GB` → `config/countries/gb.json` via `subdomains: ["uk", "gb"]`.

---

## Folder structure

```
src/
  config/
    domains.json       # parent / apex domains (multi-domain ready)
    domains.ts
    countries/
      se.json          # enabled
      is.json … us.json
      gb.json          # United Kingdom (alias: uk)
      index.ts         # registry (getCountryConfig, aliases, …)
    reports/
      catalog.json     # canonical report type catalog
      index.ts
    types.ts
  locales/
    sv.json
    en.json
  lib/
    i18n/index.ts
    country-rules/validation.ts
    country-routing/
      hostname.ts       # Host → country code
      request.ts        # getRequestCountry() (server)
      use-request-country.ts
    platform/index.ts
docs/
  architecture/
    COUNTRY_PLATFORM.md
supabase/
  migration-country-platform.sql
```

---

## Country system

### Config shape (`src/config/countries/*.json`)

Each file defines:

| Field | Purpose |
|--------|---------|
| `code` | ISO 3166-1 Alpha-2 (file name should match, e.g. `gb.json` → `GB`) |
| `id` | Stable config id (usually lowercase ISO code) |
| `enabled` | Whether the country is live |
| `subdomains` | Hostname aliases (e.g. `["uk","gb"]` for United Kingdom) |
| `defaultLanguage` / `supportedLanguages` | i18n |
| `timezone`, `currency`, `locale` | Formatting |
| `emergency` | Emergency numbers |
| `formats.vehicleRegistration` / `taxiLicense` | Regex rules |
| `regions[]` / cities | Admin geo hierarchy seed source |
| `enabledReportTypes` / `enabledReportButtons` | Feature flags per country |
| `reportMenuCategories` | Tesla/Admin accordion menu |

### Runtime API

```ts
import { getActiveCountry, t, validateVehicleRegistration } from "@/lib/platform";

const country = getActiveCountry(profile.country_code); // defaults to SE
const label = t("reports.taxi_in_need");
const plate = validateVehicleRegistration(input, country.code);
```

Aliases resolve through the registry:

```ts
getCountryConfig("uk") // → gb.json (code GB)
getCountryConfig("GB") // → gb.json
```

---

## Report types

Canonical IDs live in `src/config/reports/catalog.json` (e.g. `traffic_control`, `need_cars`).

Display names come from locales:

- `reports.taxi_control` → Taxikontroll / Taxi control
- `reports.taxi_in_need` → Taxi i nöd / Taxi in need

Countries enable/disable types via `enabledReportTypes` / `enabledReportButtons`.

`alertTypeLabel()` already resolves through the catalog + `t()`.

---

## Translations (i18n)

```ts
t("reports.taxi_in_need")
t("report_menu.police")
t("utilities.gsi_landvetter")
```

- Default locale = active country's `defaultLanguage` (Sweden → `sv`).
- Fallback chain: active → `sv` → `en` → key.
- Full UI migration is incremental; new strings should use keys.

---

## Validation framework

`src/lib/country-rules/validation.ts`:

- `validateVehicleRegistration(value, countryCode?)`
- `validateTaxiLicenseFormat(value, countryCode?)`
- `getEmergencyNumbers(countryCode?)`

Patterns come from country JSON — not hardcoded in components.

---

## Database

Migration: `supabase/migration-country-platform.sql`

| Change | Notes |
|--------|--------|
| `profiles.country_code` | `text NOT NULL DEFAULT 'SE'` |
| `driver_alerts.country_code` | `text NOT NULL DEFAULT 'SE'` + trigger from profile |
| `geo_countries` / `geo_regions` / `geo_cities` | Admin hierarchy Country → Region → City |

Existing Swedish users need no action — defaults apply.

---

## Domain routing (multi-domain)

Primary production domain: **https://cabradar.se**.

Parent domains are listed in `src/config/domains.json`. Adding `cabradar.com` (or another apex) is a config + DNS change — not a routing rewrite.

| Host | Country | Config |
|------|---------|--------|
| `cabradar.se` / `www.cabradar.se` | default (`SE`) | `se.json` |
| `cabradar.com` / `www.cabradar.com` | default (`SE`) | `se.json` |
| `is.cabradar.se` | IS | `is.json` |
| `is.cabradar.com` | IS | `is.json` |
| `uk.cabradar.se` | GB (alias) | `gb.json` |
| `no` / `dk` / `fi` / `de` / `us` subdomains | matching ISO | matching JSON |
| `localhost` / Vercel preview | default (`SE`) | `se.json` |
| Unknown host / unknown subdomain | default (`SE`) | `se.json` |

### Flow

```
Host: uk.cabradar.se
  → middleware resolveCountryCodeFromHost()
  → x-cabradar-country: GB + cookie cabradar_country=GB
  → getRequestCountry() / useRequestCountry()
  → load /config/countries/gb.json
```

### Files

- `src/config/domains.json` — parent / primary apex hosts
- `src/lib/country-routing/hostname.ts` — Host → country code
- `src/lib/country-routing/request.ts` — server `getRequestCountry()`
- `src/lib/country-routing/use-request-country.ts` — client hook
- `src/middleware.ts` — sets header + cookie on every request

### Enabling a country

1. Add country JSON (`enabled: true`, optional `subdomains` aliases)
2. Import in `countries/index.ts`
3. Add translations
4. Create DNS: `xx.cabradar.se` (and any other parent domains) → app
5. Activate in Admin when ready
6. Done — **no routing code changes**

### Adding a root domain

1. Add the parent to `src/config/domains.json`
2. Point DNS (apex + `*.parent`) at the app
3. Done — **no routing code changes**

---

## How to add a new country

1. Copy `src/config/countries/se.json` → `xx.json`, set `code`/`id`, local rules, `subdomains`.
2. Import it in `src/config/countries/index.ts`.
3. Add locale files (or extend `en.json` / `sv.json`) for missing keys.
4. Seed `geo_*` tables (or extend the migration) for regions/cities.
5. Enable report types/utilities in the country JSON.
6. Point DNS subdomain `xx.{parent}` at the app.
7. Activate the country in Admin.
8. Deploy. **No core logic rewrite.**

---

## Admin hierarchy

Prepared as:

```
Country (geo_countries)
  └── Region (geo_regions)
        └── City (geo_cities)
```

Profiles and alerts already carry `country_code` for filtering. Future admin UI can manage these tables without a schema redesign.

---

## What did not change

- Mobile/App report UX behaviour
- Alert submit APIs
- Sweden as the only enabled country
- Existing Swedish copy for screens not yet migrated to `t()`
