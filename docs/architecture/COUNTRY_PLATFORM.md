# CabRadar Country-Aware Platform Architecture

CabRadar is evolving from a Sweden-only app into a **country-aware platform**.
Sweden (`SE`) remains the only **enabled** country. Existing behaviour is unchanged.

---

## Principles

1. **Configuration over conditionals** — never `if (country === "SE")` in app logic.
2. **Add a country by adding config** — JSON + translations + validation patterns.
3. **Backwards compatible** — default `country_code = SE` everywhere.
4. **Core stays agnostic** — UI and APIs read country config at runtime.

---

## Folder structure

```
src/
  config/
    countries/
      se.json          # enabled
      is.json          # stub, enabled: false
      no.json          # stub, enabled: false
      index.ts         # registry (getActiveCountry, …)
    reports/
      catalog.json     # canonical report type catalog
      index.ts         # enabled filters per country
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
    COUNTRY_PLATFORM.md        # this file
supabase/
  migration-country-platform.sql
```

---

## Country system

### Config shape (`src/config/countries/*.json`)

Each file defines:

| Field | Purpose |
|--------|---------|
| `code` | ISO 3166-1 Alpha-2 |
| `enabled` | Whether the country is live |
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

## Domain routing (subdomains)

Country is resolved automatically from the hostname — no manual picker.

| Host | Country |
|------|---------|
| `se.cabradar.com` | SE → `se.json` |
| `is.cabradar.com` | IS → `is.json` |
| `uk.cabradar.com` | GB → `uk.json` (alias) |
| `localhost` / Vercel preview | SE (default) |
| `www.cabradar.com` / apex | SE (default market) |

### Flow

```
Host: se.cabradar.com
  → middleware resolveCountryCodeFromHost()
  → x-cabradar-country: SE + cookie cabradar_country=SE
  → getRequestCountry() / useRequestCountry()
  → load /config/countries/se.json
```

### Files

- `src/lib/country-routing/hostname.ts` — pure hostname → country code
- `src/lib/country-routing/request.ts` — server `getRequestCountry()`
- `src/lib/country-routing/use-request-country.ts` — client hook
- `src/middleware.ts` — sets header + cookie on every request

### Enabling a country on DNS

1. Add/enable country JSON (`enabled: true`, optional `subdomains: ["xx"]`)
2. Import in `countries/index.ts`
3. Add translations
4. Create DNS: `xx.cabradar.com` → app
5. Done — **no routing code changes**

---

## How to add a new country

1. Copy `src/config/countries/se.json` → `xx.json`, set `code`, `enabled: true`, local rules, `subdomains`.
2. Import it in `src/config/countries/index.ts`.
3. Add locale files (or extend `en.json` / `sv.json`) for missing keys.
4. Seed `geo_*` tables (or extend the migration) for regions/cities.
5. Enable report types/utilities in the country JSON.
6. Point DNS subdomain `xx.cabradar.com` at the app.
7. Deploy. **No core logic rewrite.**

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
