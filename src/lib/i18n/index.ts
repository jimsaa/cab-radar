import sv from "@/locales/sv.json";
import en from "@/locales/en.json";
import { getActiveCountry, DEFAULT_COUNTRY_CODE } from "@/config/countries";

type Messages = Record<string, unknown>;

const CATALOGS: Record<string, Messages> = {
  sv: sv as Messages,
  en: en as Messages,
};

let activeLocaleOverride: string | null = null;

/** Override locale for the current request/session (optional). */
export function setLocale(locale: string | null): void {
  activeLocaleOverride = locale;
}

export function getLocale(countryCode?: string | null): string {
  if (activeLocaleOverride) return activeLocaleOverride;
  const country = getActiveCountry(countryCode ?? DEFAULT_COUNTRY_CODE);
  return country.defaultLanguage;
}

function lookup(messages: Messages, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Translate a dotted key, e.g. t("reports.taxi_in_need").
 * Falls back: active locale → Swedish → English → key.
 */
export function t(
  key: string,
  options?: { locale?: string; countryCode?: string; params?: Record<string, string> }
): string {
  const locale =
    options?.locale ?? getLocale(options?.countryCode ?? DEFAULT_COUNTRY_CODE);
  const primary = CATALOGS[locale] ?? CATALOGS.sv;
  let value =
    lookup(primary, key) ??
    lookup(CATALOGS.sv, key) ??
    lookup(CATALOGS.en, key) ??
    key;

  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      value = value.replaceAll(`{${k}}`, v);
    }
  }
  return value;
}

export function hasTranslation(key: string, locale?: string): boolean {
  const loc = locale ?? getLocale();
  return Boolean(lookup(CATALOGS[loc] ?? CATALOGS.sv, key));
}
