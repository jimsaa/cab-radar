/**
 * Multi-domain routing config.
 * Add a root domain here (and DNS) — hostname routing needs no code changes.
 *
 * Root domains never determine country; only a country subdomain label does.
 * Apex / www always fall back to DEFAULT_COUNTRY_CODE.
 */
import domainsJson from "@/config/domains.json";

export interface DomainsConfig {
  primaryApexHost: string;
  parentDomains: string[];
}

export const domainsConfig: DomainsConfig = {
  primaryApexHost: domainsJson.primaryApexHost,
  parentDomains: [...domainsJson.parentDomains],
};

/** Production primary apex (marketing / password-reset fallback). */
export const PRIMARY_APEX_HOST = domainsConfig.primaryApexHost;

/** Parent domains that accept `{country}.parent` subdomains. */
export function listParentDomains(): readonly string[] {
  return domainsConfig.parentDomains;
}

/**
 * Exact hosts that mean "no country subdomain" → platform default country.
 * Includes apex and www for every configured parent domain.
 */
export function listApexHosts(): readonly string[] {
  const hosts: string[] = [];
  for (const parent of domainsConfig.parentDomains) {
    hosts.push(parent);
    hosts.push(`www.${parent}`);
  }
  return hosts;
}
