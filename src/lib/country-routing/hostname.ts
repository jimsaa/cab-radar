/**
 * Hostname → country routing.
 *
 * Examples:
 *   se.cabradar.com  → SE
 *   is.cabradar.com  → IS
 *   uk.cabradar.com  → GB (subdomain alias)
 *   localhost        → SE (default)
 *   www.cabradar.com → SE (apex / default market)
 *
 * Adding a country: config JSON + DNS subdomain. No routing code changes
 * when the subdomain matches config id/code/aliases.
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

/** Host labels that never count as a country subdomain. */
const IGNORED_LABELS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "staging",
  "preview",
  "localhost",
]);

/** Apex / production hosts that default to Sweden when no country subdomain. */
const DEFAULT_MARKET_HOST_SUFFIXES = [
  "cabradar.com",
  "cabradar.se",
  "cabradar.app",
];

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

/**
 * Resolve ISO country code from a request Host header.
 * Always returns a valid code; defaults to SE.
 */
export function resolveCountryCodeFromHost(
  hostHeader: string | null | undefined
): CountryCode {
  const host = normalizeHost(hostHeader);

  if (!host || isLocalHost(host) || isVercelPreview(host)) {
    return DEFAULT_COUNTRY_CODE;
  }

  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2) {
    return DEFAULT_COUNTRY_CODE;
  }

  const first = labels[0]!;
  if (!IGNORED_LABELS.has(first)) {
    const mapped = subdomainMap().get(first);
    if (mapped) return mapped;
  }

  // Apex / www without country label → default market (Sweden)
  const withoutWww = host.startsWith("www.") ? host.slice(4) : host;
  if (
    DEFAULT_MARKET_HOST_SUFFIXES.some(
      (suffix) => withoutWww === suffix || withoutWww.endsWith(`.${suffix}`)
    )
  ) {
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
  const first = host.split(".")[0] ?? "";
  if (IGNORED_LABELS.has(first)) return false;
  return subdomainMap().has(first);
}
