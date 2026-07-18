import type { CountryConfig, CountryCode } from "@/config/types";
import se from "@/config/countries/se.json";
import isConfig from "@/config/countries/is.json";
import noConfig from "@/config/countries/no.json";

/**
 * Registry of all country configs.
 * Adding a country = add JSON under config/countries + import here once
 * (or auto-discover in a future build step). No business logic changes.
 */
const COUNTRY_CONFIGS: CountryConfig[] = [
  se as CountryConfig,
  isConfig as CountryConfig,
  noConfig as CountryConfig,
];

const BY_CODE = new Map(
  COUNTRY_CONFIGS.map((c) => [c.code.toUpperCase(), c] as const)
);

const BY_ID = new Map(COUNTRY_CONFIGS.map((c) => [c.id, c] as const));

/** Default platform country (Sweden). */
export const DEFAULT_COUNTRY_CODE: CountryCode = "SE";

export function listCountryConfigs(): readonly CountryConfig[] {
  return COUNTRY_CONFIGS;
}

export function listEnabledCountries(): CountryConfig[] {
  return COUNTRY_CONFIGS.filter((c) => c.enabled);
}

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
