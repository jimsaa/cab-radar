import type { AlertType, StoredAlertType } from "./alert-types";
import type { DriverAlert } from "./types/database";

/** Radius for duplicate active-report detection (meters). */
export const NEARBY_ACTIVE_ALERT_RADIUS_M = 300;

/** Default LIVE TTL for operational report types (minutes). */
export const DEFAULT_LIVE_TTL_MINUTES = 15;

/**
 * Minutes until auto-expiry in LIVE feeds; null = no automatic expiry.
 * Source of truth for client/server filtering — based on created_at age.
 */
export const ALERT_TTL_MINUTES: Partial<Record<AlertType, number | null>> = {
  traffic_control: DEFAULT_LIVE_TTL_MINUTES,
  laser: DEFAULT_LIVE_TTL_MINUTES,
  all_vehicle_check: DEFAULT_LIVE_TTL_MINUTES,
  slow_traffic: DEFAULT_LIVE_TTL_MINUTES,
  total_stop: DEFAULT_LIVE_TTL_MINUTES,
  accident: DEFAULT_LIVE_TTL_MINUTES,
  taxi_emergency: null,
};

/** Legacy DB types still shown in feeds — same 15 min rule unless emergency. */
const LEGACY_LIVE_TTL_MINUTES: Partial<Record<StoredAlertType, number>> = {
  total_stop_accident: DEFAULT_LIVE_TTL_MINUTES,
  hazard_on_road: DEFAULT_LIVE_TTL_MINUTES,
};

/** Types where duplicate-nearby confirmation applies before creating a new report. */
export const DUPLICATE_CHECK_ALERT_TYPES: AlertType[] = [
  "traffic_control",
  "laser",
  "all_vehicle_check",
  "slow_traffic",
  "total_stop",
  "accident",
];

export function alertTypeHasDuplicateCheck(type: AlertType): boolean {
  return DUPLICATE_CHECK_ALERT_TYPES.includes(type);
}

/** LIVE TTL for a report type; null = never auto-expire (Taxi i nöd only). */
export function liveTtlMinutesForType(type: string): number | null {
  if (type === "taxi_emergency") return null;

  if (type in ALERT_TTL_MINUTES) {
    const configured = ALERT_TTL_MINUTES[type as AlertType];
    return configured ?? DEFAULT_LIVE_TTL_MINUTES;
  }

  if (type in LEGACY_LIVE_TTL_MINUTES) {
    return LEGACY_LIVE_TTL_MINUTES[type as StoredAlertType] ?? DEFAULT_LIVE_TTL_MINUTES;
  }

  return DEFAULT_LIVE_TTL_MINUTES;
}

export function alertAgeMinutes(
  createdAt: string,
  nowMs: number = Date.now()
): number {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return Infinity;
  return (nowMs - createdMs) / 60_000;
}

export function isAlertExpiredByTtl(
  alert: Pick<DriverAlert, "type" | "created_at">
): boolean {
  const ttlMinutes = liveTtlMinutesForType(alert.type);
  if (ttlMinutes == null) return false;
  return alertAgeMinutes(alert.created_at) >= ttlMinutes;
}

/**
 * Whether an alert should appear in LIVE feeds.
 * Uses created_at + per-type TTL (not expires_at alone) so stale DB TTLs cannot
 * keep reports visible beyond 15 minutes.
 */
export function isAlertCurrentlyLive(
  alert: Pick<
    DriverAlert,
    "status" | "admin_verified" | "type" | "created_at"
  >
): boolean {
  if (alert.status !== "active" || !alert.admin_verified) return false;
  if (alert.type === "taxi_emergency") return true;
  return !isAlertExpiredByTtl(alert);
}

/** Temporary debug — logs TTL evaluation for each candidate LIVE report. */
export function logLiveFeedTtlDebug(
  alerts: ReadonlyArray<
    Pick<DriverAlert, "id" | "type" | "created_at" | "status" | "admin_verified">
  >,
  context: string
): void {
  const serverNow = new Date().toISOString();

  for (const alert of alerts) {
    const ageMinutes = Math.round(alertAgeMinutes(alert.created_at));
    const ttlMinutes = liveTtlMinutesForType(alert.type);
    const expired = !isAlertCurrentlyLive(alert);

    console.log(
      `[LIVE FEED TTL] ${context}`,
      `\n  Report ${alert.id}`,
      `\n  Type: ${alert.type}`,
      `\n  Created: ${alert.created_at}`,
      `\n  Server: ${serverNow}`,
      `\n  Age: ${ageMinutes} minutes (TTL: ${ttlMinutes ?? "none"})`,
      `\n  Expired: ${expired ? "TRUE" : "FALSE"}`
    );
  }
}
