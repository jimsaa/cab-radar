/**
 * Hostname → country routing (primary domain: cabradar.se).
 *
 * Examples:
 *   cabradar.se       → SE (production default)
 *   www.cabradar.se   → SE
 *   is.cabradar.se    → IS → config/countries/is.json
 *   uk.cabradar.se    → GB → config/countries/uk.json
 *   localhost         → SE
 *
 * Unknown host / unknown subdomain → SE (safe fallback).
 *
 * Adding a country: config JSON + translations + DNS `xx.cabradar.se`.
 * No core routing logic changes when the subdomain matches config id/code/aliases.
 */

import type { CountryCode, CountryConfig } from "@/config/types";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
  listCountryConfigs,
} from "@/config/countries";

/** Request header set by middleware — readable in Server Components / Route Handlers. */
export const COUNTRY_HEADER = "x-cabradar-country";

/** Non-httpOnly cookie so client components can read the active country. */
export const COUNTRY_COOKIE = "cabradar_country";

/** Production apex — Sweden default market. */
export const PRIMARY_APEX_HOST = "cabradar.se";

/**
 * Apex hosts that serve Sweden when there is no country subdomain.
 * Primary is cabradar.se; others are legacy / alternate entry points.
 */
const APEX_HOSTS = [
  PRIMARY_APEX_HOST,
  "www.cabradar.se",
  "cabradar.com",
  "www.cabradar.com",
  "cabradar.app",
  "www.cabradar.app",
] as const;

/** Parent domains that accept `{country}.parent` subdomains. */
const COUNTRY_PARENT_DOMAINS = [
  PRIMARY_APEX_HOST,
  "cabradar.com",
  "cabradar.app",
] as const;

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
 * If host is `{label}.cabradar.se` (or other parent), return the label.
 * Multi-level leftovers (e.g. a.b.cabradar.se) return null → fallback SE.
 */
function countryLabelUnderParent(host: string): string | null {
  const bare = stripWww(host);
  for (const parent of COUNTRY_PARENT_DOMAINS) {
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
 * Always returns a valid code; unknown → SE.
 */
export function resolveCountryCodeFromHost(
  hostHeader: string | null | undefined
): CountryCode {
  const host = normalizeHost(hostHeader);

  if (!host || isLocalHost(host) || isVercelPreview(host)) {
    return DEFAULT_COUNTRY_CODE;
  }

  // Exact apex / www → Sweden
  if ((APEX_HOSTS as readonly string[]).includes(host)) {
    return DEFAULT_COUNTRY_CODE;
  }

  const label = countryLabelUnderParent(host);
  if (label) {
    if (IGNORED_SUBDOMAIN_LABELS.has(label)) {
      return DEFAULT_COUNTRY_CODE;
    }
    const mapped = subdomainMap().get(label);
    if (mapped) return mapped;
    // Unknown subdomain under cabradar.se → safe fallback
    return DEFAULT_COUNTRY_CODE;
  }

  return DEFAULT_COUNTRY_CODE;
}

/**
 * Load country config for a hostname.
 * Uses the country file even when `enabled: false` (preview / pre-launch DNS).
 * Falls back to Sweden if the subdomain is unknown.
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
  if ((APEX_HOSTS as readonly string[]).includes(host)) return false;
  const label = countryLabelUnderParent(host);
  if (!label || IGNORED_SUBDOMAIN_LABELS.has(label)) return false;
  return subdomainMap().has(label);
}
