import { headers, cookies } from "next/headers";
import type { CountryConfig, CountryCode } from "@/config/types";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
} from "@/config/countries";
import {
  COUNTRY_COOKIE,
  COUNTRY_HEADER,
  resolveCountryCodeFromHost,
} from "@/lib/country-routing/hostname";
import { setLocale } from "@/lib/i18n";

/**
 * Active country for the current server request (from middleware header / cookie).
 * Safe default: SE.
 */
export async function getRequestCountryCode(): Promise<CountryCode> {
  try {
    const h = await headers();
    const fromHeader = h.get(COUNTRY_HEADER);
    if (fromHeader?.trim()) {
      return fromHeader.trim().toUpperCase();
    }

    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      return resolveCountryCodeFromHost(host);
    }

    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(COUNTRY_COOKIE)?.value;
    if (fromCookie?.trim()) {
      return fromCookie.trim().toUpperCase();
    }
  } catch {
    // Outside request context (build / scripts)
  }
  return DEFAULT_COUNTRY_CODE;
}

export async function getRequestCountry(): Promise<CountryConfig> {
  const code = await getRequestCountryCode();
  const country = getCountryConfig(code);
  setLocale(country.defaultLanguage);
  return country;
}
