import catalog from "@/config/reports/catalog.json";
import type { ReportCatalog, ReportTypeCatalogEntry } from "@/config/types";
import { getActiveCountry } from "@/config/countries";

const REPORT_CATALOG = catalog as ReportCatalog;

export function getReportCatalog(): ReportCatalog {
  return REPORT_CATALOG;
}

export function getAllReportTypeEntries(): ReportTypeCatalogEntry[] {
  return REPORT_CATALOG.reportTypes;
}

export function getReportTypeEntry(
  alertTypeId: string
): ReportTypeCatalogEntry | undefined {
  return REPORT_CATALOG.reportTypes.find((r) => r.id === alertTypeId);
}

/** Report types enabled for a country (from country config, not hardcoded). */
export function getEnabledReportTypes(
  countryCode?: string | null
): ReportTypeCatalogEntry[] {
  const country = getActiveCountry(countryCode);
  const enabled = new Set(country.enabledReportTypes);
  return REPORT_CATALOG.reportTypes.filter((r) => enabled.has(r.id));
}

export function isReportTypeEnabled(
  alertTypeId: string,
  countryCode?: string | null
): boolean {
  const country = getActiveCountry(countryCode);
  return country.enabledReportTypes.includes(alertTypeId);
}

export function getEnabledReportButtons(
  countryCode?: string | null
): string[] {
  return getActiveCountry(countryCode).enabledReportButtons;
}

export function getEnabledUtilities(countryCode?: string | null): string[] {
  return getActiveCountry(countryCode).enabledUtilities;
}
