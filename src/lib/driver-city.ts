import type { DriverAlert } from "./types/database";
import { isEmergencyAlertType } from "./emergency-rules";

/** Preset operating cities — add future locations here. */
export const PREDEFINED_DRIVER_CITIES = [
  "Göteborg",
  "Stockholm",
  "Malmö",
] as const;

export type PredefinedDriverCity = (typeof PREDEFINED_DRIVER_CITIES)[number];

/** Selectable cities in profile/signup. "Annan" = no preset local feed (optional custom name). */
export const DRIVER_CITY_OPTIONS = [
  ...PREDEFINED_DRIVER_CITIES,
  "Annan",
] as const;

export type DriverCityOption = (typeof DRIVER_CITY_OPTIONS)[number];

export const DEFAULT_DRIVER_CITY: PredefinedDriverCity = "Göteborg";

/** Marker stored when driver selects Annan without a custom city name. */
export const DRIVER_CITY_OTHER_MARKER = "Annan";

/** Local radar reports filtered by operating city. */
export const LOCAL_CITY_FILTERED_ALERT_TYPES = [
  "traffic_control",
  "laser",
  "slow_traffic",
  "total_stop",
  "accident",
] as const;

const CITY_ALIASES: Record<string, string> = {
  goteborg: "Göteborg",
  gothenburg: "Göteborg",
  gbg: "Göteborg",
  stockholm: "Stockholm",
  sthlm: "Stockholm",
  malmo: "Malmö",
  malmö: "Malmö",
};

export function isLocalCityFilteredAlert(type: string): boolean {
  return (LOCAL_CITY_FILTERED_ALERT_TYPES as readonly string[]).includes(type);
}

export function isPredefinedDriverCity(
  city: string | null | undefined
): city is PredefinedDriverCity {
  if (!city?.trim()) return false;
  return (PREDEFINED_DRIVER_CITIES as readonly string[]).includes(city.trim());
}

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

/** Resolve dropdown selection + optional custom text for storage. */
export function resolveDriverCity(
  selection: string,
  customCity: string
): string | null {
  const preset = selection.trim();
  if (preset === DRIVER_CITY_OTHER_MARKER) {
    const custom = customCity.trim();
    return custom.length >= 2 ? custom : DRIVER_CITY_OTHER_MARKER;
  }
  return preset || null;
}

/** Map stored profile value back to dropdown fields. */
export function splitDriverCityStored(stored: string | null | undefined): {
  selection: DriverCityOption;
  customCity: string;
} {
  if (!stored?.trim()) {
    return { selection: DEFAULT_DRIVER_CITY, customCity: "" };
  }

  const value = stored.trim();
  if (
    (DRIVER_CITY_OPTIONS as readonly string[]).includes(value) &&
    value !== DRIVER_CITY_OTHER_MARKER
  ) {
    return { selection: value as DriverCityOption, customCity: "" };
  }

  if (value === DRIVER_CITY_OTHER_MARKER) {
    return { selection: DRIVER_CITY_OTHER_MARKER, customCity: "" };
  }

  return { selection: DRIVER_CITY_OTHER_MARKER, customCity: value };
}

export function driverCityNeedsSelection(
  stored: string | null | undefined
): boolean {
  return !stored?.trim();
}

export function isValidDriverCitySelection(
  selection: string,
  customCity: string,
  options?: { requireCustomForOther?: boolean }
): boolean {
  if (!(DRIVER_CITY_OPTIONS as readonly string[]).includes(selection)) {
    return false;
  }
  if (selection === DRIVER_CITY_OTHER_MARKER) {
    if (options?.requireCustomForOther) {
      return customCity.trim().length >= 2;
    }
    return true;
  }
  return true;
}

export function citiesMatch(
  driverCity: string | null | undefined,
  alertCity: string | null | undefined
): boolean {
  if (!driverCity?.trim()) return false;
  if (!alertCity?.trim()) return false;

  const driver = normalizeCityName(driverCity);
  const alert = normalizeCityName(alertCity);
  if (!driver || !alert) return false;
  if (driver === alert) return true;

  const driverKey = driver.toLowerCase();
  const alertKey = alert.toLowerCase();
  return alertKey.includes(driverKey) || driverKey.includes(alertKey);
}

export interface DriverCityFilterResolution {
  receivesLocalAlerts: boolean;
  matchCity: string | null;
}

/** Resolve how a stored city value should affect the feed. */
export function resolveDriverCityForFilter(
  stored: string | null | undefined
): DriverCityFilterResolution {
  if (!stored?.trim()) {
    return { receivesLocalAlerts: false, matchCity: null };
  }

  const value = stored.trim();
  if (value === DRIVER_CITY_OTHER_MARKER) {
    return { receivesLocalAlerts: false, matchCity: null };
  }

  if (isPredefinedDriverCity(value)) {
    return { receivesLocalAlerts: true, matchCity: value };
  }

  return { receivesLocalAlerts: true, matchCity: value };
}

export interface DriverAlertFilterOptions {
  driverCity?: string | null;
  showNationalEmergencies?: boolean;
  isAdmin?: boolean;
  userId?: string | null;
}

function alertVisibleForDriverCity(
  alert: DriverAlert,
  options: DriverAlertFilterOptions,
  resolution: DriverCityFilterResolution
): boolean {
  if (isEmergencyAlertType(alert.type)) {
    if (options.showNationalEmergencies) return true;
    if (!resolution.matchCity) return false;
    return citiesMatch(resolution.matchCity, alert.city);
  }

  if (!isLocalCityFilteredAlert(alert.type)) {
    return true;
  }

  if (!resolution.receivesLocalAlerts || !resolution.matchCity) {
    return false;
  }

  return citiesMatch(resolution.matchCity, alert.city);
}

/** City-scoped feed filter. Admins see all cities. */
export function filterAlertsForDriverCity(
  alerts: DriverAlert[],
  options: DriverAlertFilterOptions
): DriverAlert[] {
  if (options.isAdmin) return alerts;

  const resolution = resolveDriverCityForFilter(options.driverCity);
  return alerts.filter((alert) =>
    alertVisibleForDriverCity(alert, options, resolution)
  );
}

export function formatDriverCityLabel(city: string | null | undefined): string {
  if (!city?.trim()) return "Ej angiven";
  if (city.trim() === DRIVER_CITY_OTHER_MARKER) return "Annan";
  return city.trim();
}
