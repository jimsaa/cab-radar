import type { DriverAlert } from "./types/database";
import { isEmergencyAlertType } from "./emergency-rules";

/** Selectable cities at registration. "Annan" requires custom text. */
export const DRIVER_CITY_OPTIONS = [
  "Göteborg",
  "Stockholm",
  "Malmö",
  "Annan",
] as const;

export type DriverCityOption = (typeof DRIVER_CITY_OPTIONS)[number];

const CITY_ALIASES: Record<string, string> = {
  goteborg: "Göteborg",
  gothenburg: "Göteborg",
  gbg: "Göteborg",
  stockholm: "Stockholm",
  sthlm: "Stockholm",
  malmo: "Malmö",
  malmö: "Malmö",
};

/** Normalize free-text or geocoded city to a canonical name when possible. */
export function normalizeCityName(city: string | null | undefined): string | null {
  if (!city?.trim()) return null;
  const trimmed = city.trim();
  const key = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return CITY_ALIASES[key] ?? trimmed;
}

/** Resolve signup city selection + optional custom text. */
export function resolveDriverCity(
  selection: string,
  customCity: string
): string | null {
  const preset = selection.trim();
  if (preset === "Annan") {
    return customCity.trim() || null;
  }
  return preset || null;
}

export function isValidDriverCitySelection(
  selection: string,
  customCity: string
): boolean {
  if (!DRIVER_CITY_OPTIONS.includes(selection as DriverCityOption)) {
    return false;
  }
  if (selection === "Annan") {
    return customCity.trim().length >= 2;
  }
  return true;
}

export function citiesMatch(
  driverCity: string | null | undefined,
  alertCity: string | null | undefined
): boolean {
  if (!driverCity?.trim()) return true;
  if (!alertCity?.trim()) return false;

  const driver = normalizeCityName(driverCity);
  const alert = normalizeCityName(alertCity);
  if (!driver || !alert) return false;
  if (driver === alert) return true;

  const driverKey = driver.toLowerCase();
  const alertKey = alert.toLowerCase();
  return alertKey.includes(driverKey) || driverKey.includes(alertKey);
}

export interface DriverAlertFilterOptions {
  driverCity?: string | null;
  showNationalEmergencies?: boolean;
  isAdmin?: boolean;
  userId?: string | null;
}

/** City-scoped feed filter. Admins see all cities. */
export function filterAlertsForDriverCity(
  alerts: DriverAlert[],
  options: DriverAlertFilterOptions
): DriverAlert[] {
  if (options.isAdmin) return alerts;

  const driverCity = options.driverCity?.trim();
  if (!driverCity) return alerts;

  return alerts.filter((alert) => {
    if (
      isEmergencyAlertType(alert.type) &&
      options.showNationalEmergencies
    ) {
      return true;
    }
    return citiesMatch(driverCity, alert.city);
  });
}

export function formatDriverCityLabel(city: string | null | undefined): string {
  return city?.trim() || "Ej angiven";
}
