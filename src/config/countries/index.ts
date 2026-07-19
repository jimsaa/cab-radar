import type { CountryConfig, CountryCode } from "@/config/types";
import se from "@/config/countries/se.json";
import isConfig from "@/config/countries/is.json";
import noConfig from "@/config/countries/no.json";
import dk from "@/config/countries/dk.json";
import fi from "@/config/countries/fi.json";
import de from "@/config/countries/de.json";
import gb from "@/config/countries/gb.json";
import us from "@/config/countries/us.json";

/**
 * Registry of all country configs.
 * Adding a country = add JSON under config/countries + import here once
 * (or auto-discover in a future build step). No business logic changes.
 *
 * DNS: {subdomain}.{parent} — parents from config/domains.json
 * Aliases: country.subdomains (e.g. uk → GB → gb.json)
 */
const COUNTRY_CONFIGS: CountryConfig[] = [
  se as CountryConfig,
  isConfig as CountryConfig,
  noConfig as CountryConfig,
  dk as CountryConfig,
  fi as CountryConfig,
  de as CountryConfig,
  gb as CountryConfig,
  us as CountryConfig,
];

const BY_CODE = new Map(
  COUNTRY_CONFIGS.map((c) => [c.code.toUpperCase(), c] as const)
);

const BY_ID = new Map(COUNTRY_CONFIGS.map((c) => [c.id.toLowerCase(), c] as const));

/** Configurable aliases: subdomain / alternate labels → ISO code (e.g. uk → GB). */
const BY_ALIAS = new Map<string, CountryConfig>();
for (const country of COUNTRY_CONFIGS) {
  for (const alias of country.subdomains ?? []) {
    BY_ALIAS.set(alias.toLowerCase(), country);
  }
}

/** Platform default country when host has no country subdomain. Not TLD-derived. */
export const DEFAULT_COUNTRY_CODE: CountryCode = "SE";

export function listCountryConfigs(): readonly CountryConfig[] {
  return COUNTRY_CONFIGS;
}

export function listEnabledCountries(): CountryConfig[] {
  return COUNTRY_CONFIGS.filter((c) => c.enabled);
}

/**
 * Resolve config by ISO code, config id, or configured alias (e.g. "uk" → gb.json).
 */
export function getCountryConfig(
  codeOrId: string | null | undefined
): CountryConfig {
  if (!codeOrId?.trim()) {
    return BY_CODE.get(DEFAULT_COUNTRY_CODE)!;
  }
  const key = codeOrId.trim();
  return (
    BY_CODE.get(key.toUpperCase()) ??
    BY_ID.get(key.toLowerCase()) ??
    BY_ALIAS.get(key.toLowerCase()) ??
    BY_CODE.get(DEFAULT_COUNTRY_CODE)!
  );
}

export function getActiveCountry(
  preferredCode?: string | null
): CountryConfig {
  const preferred = preferredCode
    ? getCountryConfig(preferredCode)
    : getCountryConfig(DEFAULT_COUNTRY_CODE);
  if (preferred.enabled) return preferred;
  return listEnabledCountries()[0] ?? getCountryConfig(DEFAULT_COUNTRY_CODE);
}

export function isCountryEnabled(codeOrId: string): boolean {
  return getCountryConfig(codeOrId).enabled;
}

export function getCountryCities(country: CountryConfig): {
  id: string;
  name: string;
  aliases: string[];
  isOther: boolean;
}[] {
  return country.regions.flatMap((region) =>
    region.cities.map((city) => ({
      id: city.id,
      name: city.name,
      aliases: city.aliases ?? [],
      isOther: Boolean(city.isOther),
    }))
  );
}

export function resolveDefaultCityName(country: CountryConfig): string | null {
  if (!country.defaultCityId) return null;
  const city = getCountryCities(country).find(
    (c) => c.id === country.defaultCityId
  );
  return city?.name ?? null;
}
