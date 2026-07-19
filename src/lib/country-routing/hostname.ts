/**
 * Hostname → country routing (configuration-driven).
 *
 * Examples:
 *   cabradar.se       → default country (SE) — apex, not because of .se TLD
 *   www.cabradar.se   → default country
 *   cabradar.com      → default country (same rule on any parent domain)
 *   is.cabradar.se    → IS → config/countries/is.json
 *   is.cabradar.com   → IS → config/countries/is.json
 *   uk.cabradar.se    → GB → config/countries/gb.json (alias)
 *   localhost         → default country
 *
 * Unknown host / unknown subdomain → default country (safe fallback).
 *
 * Adding a country: country JSON (with optional subdomains aliases) +
 * translations + DNS. Adding a root domain: config/domains.json + DNS.
 * No core routing logic changes.
 */

import type { CountryCode, CountryConfig } from "@/config/types";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
  listCountryConfigs,
} from "@/config/countries";
import {
  listApexHosts,
  listParentDomains,
  PRIMARY_APEX_HOST,
} from "@/config/domains";

export { PRIMARY_APEX_HOST };

/** Request header set by middleware — readable in Server Components / Route Handlers. */
export const COUNTRY_HEADER = "x-cabradar-country";

/** Non-httpOnly cookie so client components can read the active country. */
export const COUNTRY_COOKIE = "cabradar_country";

/** Host labels that never count as a country subdomain. */
const IGNORED_SUBDOMAIN_LABELS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "staging",
  "preview",
  "localhost",
]);

function normalizeHost(host: string | null | undefined): string {
  if (!host?.trim()) return "";
  return host.trim().toLowerCase().split(":")[0] ?? "";
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1" ||
    host.endsWith(".local")
  );
}

function isVercelPreview(host: string): boolean {
  return host.endsWith(".vercel.app");
}

/**
 * Build subdomain → country code map from country configs.
 * Includes ISO code, config id, and optional `subdomains` aliases (e.g. uk → GB).
 */
function buildSubdomainMap(): Map<string, CountryCode> {
  const map = new Map<string, CountryCode>();
  for (const country of listCountryConfigs()) {
    const code = country.code.toUpperCase();
    map.set(country.id.toLowerCase(), code);
    map.set(code.toLowerCase(), code);
    for (const alias of country.subdomains ?? []) {
      map.set(alias.toLowerCase(), code);
    }
  }
  return map;
}

let subdomainMapCache: Map<string, CountryCode> | null = null;

function subdomainMap(): Map<string, CountryCode> {
  if (!subdomainMapCache) subdomainMapCache = buildSubdomainMap();
  return subdomainMapCache;
}

/** Test helper — clears subdomain map cache after registering new countries. */
export function clearCountryRoutingCache(): void {
  subdomainMapCache = null;
}

function stripWww(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * If host is `{label}.{parent}` for a configured parent domain, return the label.
 * Multi-level leftovers (e.g. a.b.cabradar.se) return null → default country.
 */
function countryLabelUnderParent(host: string): string | null {
  const bare = stripWww(host);
  for (const parent of listParentDomains()) {
    if (bare === parent) return null;
    const suffix = `.${parent}`;
    if (!bare.endsWith(suffix)) continue;
    const label = bare.slice(0, -suffix.length);
    if (!label || label.includes(".")) return null;
    return label;
  }
  return null;
}

/**
 * Resolve ISO country code from a request Host header.
 * Always returns a valid code; unknown → DEFAULT_COUNTRY_CODE.
 * Root domain TLD never selects a country — only an explicit subdomain label does.
 */
export function resolveCountryCodeFromHost(
  hostHeader: string | null | undefined
): CountryCode {
  const host = normalizeHost(hostHeader);

  if (!host || isLocalHost(host) || isVercelPreview(host)) {
    return DEFAULT_COUNTRY_CODE;
  }

  // Apex / www on any configured parent → platform default (not TLD-based)
  if (listApexHosts().includes(host)) {
    return DEFAULT_COUNTRY_CODE;
  }

  const label = countryLabelUnderParent(host);
  if (label) {
    if (IGNORED_SUBDOMAIN_LABELS.has(label)) {
      return DEFAULT_COUNTRY_CODE;
    }
    const mapped = subdomainMap().get(label);
    if (mapped) return mapped;
    return DEFAULT_COUNTRY_CODE;
  }

  return DEFAULT_COUNTRY_CODE;
}

/**
 * Load country config for a hostname.
 * Uses the country file even when `enabled: false` (preview / pre-launch DNS).
 * Falls back to default country if the subdomain is unknown.
 */
export function resolveCountryFromHost(
  hostHeader: string | null | undefined
): CountryConfig {
  const code = resolveCountryCodeFromHost(hostHeader);
  return getCountryConfig(code);
}

/**
 * Whether this host is an explicit country subdomain (not apex/localhost).
 */
export function isCountrySubdomainHost(
  hostHeader: string | null | undefined
): boolean {
  const host = normalizeHost(hostHeader);
  if (!host || isLocalHost(host) || isVercelPreview(host)) return false;
  if (listApexHosts().includes(host)) return false;
  const label = countryLabelUnderParent(host);
  if (!label || IGNORED_SUBDOMAIN_LABELS.has(label)) return false;
  return subdomainMap().has(label);
}
