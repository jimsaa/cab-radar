import type { CountryConfig, FormatRuleConfig } from "@/config/types";
import { getActiveCountry } from "@/config/countries";
import { t } from "@/lib/i18n";

export interface ValidationResult {
  ok: boolean;
  normalized: string | null;
  errorKey?: string;
  message?: string;
}

function applyPattern(
  raw: string,
  rule: FormatRuleConfig,
  countryCode: string
): ValidationResult {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) {
    return {
      ok: false,
      normalized: null,
      errorKey: "validation.invalid_format",
      message: t("validation.invalid_format", { countryCode }),
    };
  }

  const re = new RegExp(rule.pattern, "i");
  if (!re.test(normalized)) {
    return {
      ok: false,
      normalized,
      errorKey: rule.descriptionKey,
      message: t(rule.descriptionKey, { countryCode }),
    };
  }

  return { ok: true, normalized };
}

/** Validate vehicle registration using the active country's format rule. */
export function validateVehicleRegistration(
  value: string,
  countryCode?: string | null
): ValidationResult {
  const country = getActiveCountry(countryCode);
  return applyPattern(value, country.formats.vehicleRegistration, country.code);
}

/** Validate taxi licence format using the active country's format rule. */
export function validateTaxiLicenseFormat(
  value: string,
  countryCode?: string | null
): ValidationResult {
  const country = getActiveCountry(countryCode);
  return applyPattern(value, country.formats.taxiLicense, country.code);
}

export function getEmergencyNumbers(countryCode?: string | null) {
  return getActiveCountry(countryCode).emergency;
}

export function getCountryFormatExamples(country: CountryConfig) {
  return {
    vehicleRegistration: country.formats.vehicleRegistration.example,
    taxiLicense: country.formats.taxiLicense.example,
  };
}
