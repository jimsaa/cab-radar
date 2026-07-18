/**
 * Country-aware platform helpers.
 * Prefer these over scattering getActiveCountry() calls in UI.
 */
export {
  DEFAULT_COUNTRY_CODE,
  getActiveCountry,
  getCountryConfig,
  getCountryCities,
  listEnabledCountries,
  listCountryConfigs,
  isCountryEnabled,
  resolveDefaultCityName,
} from "@/config/countries";

export {
  getReportCatalog,
  getEnabledReportTypes,
  getEnabledReportButtons,
  getEnabledUtilities,
  isReportTypeEnabled,
  getReportTypeEntry,
} from "@/config/reports";

export {
  validateVehicleRegistration,
  validateTaxiLicenseFormat,
  getEmergencyNumbers,
} from "@/lib/country-rules/validation";

export { t, getLocale, setLocale } from "@/lib/i18n";

export {
  COUNTRY_COOKIE,
  COUNTRY_HEADER,
  PRIMARY_APEX_HOST,
  resolveCountryCodeFromHost,
  resolveCountryFromHost,
  isCountrySubdomainHost,
} from "@/lib/country-routing/hostname";

export {
  getRequestCountryCode,
  getRequestCountry,
} from "@/lib/country-routing/request";
