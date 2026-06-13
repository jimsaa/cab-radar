import type { AlertType } from "./alert-types";
import type { DriverAlert } from "./types/database";

/** Radius for duplicate active-report detection (meters). */
export const NEARBY_ACTIVE_ALERT_RADIUS_M = 300;

/** Minutes until auto-expiry; null = no automatic expiry. */
export const ALERT_TTL_MINUTES: Partial<Record<AlertType, number | null>> = {
  traffic_control: 15,
  laser: 15,
  slow_traffic: 15,
  total_stop: 15,
  accident: 60,
  taxi_emergency: null,
};

/** Types where duplicate-nearby confirmation applies before creating a new report. */
export const DUPLICATE_CHECK_ALERT_TYPES: AlertType[] = [
  "traffic_control",
  "laser",
  "slow_traffic",
  "total_stop",
  "accident",
];

export function alertTypeHasDuplicateCheck(type: AlertType): boolean {
  return DUPLICATE_CHECK_ALERT_TYPES.includes(type);
}

export function isAlertCurrentlyLive(
  alert: Pick<DriverAlert, "status" | "admin_verified" | "expires_at" | "type">
): boolean {
  if (alert.status !== "active" || !alert.admin_verified) return false;
  if (alert.type === "taxi_emergency") return true;
  return new Date(alert.expires_at).getTime() > Date.now();
}
