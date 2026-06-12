import type { AlertType } from "./alert-types";

/** Supabase `alert_type` for Taxi i nöd — never auto-expires or auto-closes. */
export const EMERGENCY_ALERT_TYPE = "taxi_emergency" satisfies AlertType;

/** Far-future expiry written to DB; cron must never close emergencies. */
export const EMERGENCY_NEVER_EXPIRES_AT = "2099-12-31T23:59:59.000Z";

export function isEmergencyAlertType(type: string): boolean {
  return type === EMERGENCY_ALERT_TYPE;
}

/** Only standard alerts may be closed by timers, validation votes, or cron. */
export function canAlertExpireAutomatically(type: string): boolean {
  return !isEmergencyAlertType(type);
}

/**
 * Taxi i nöd may ONLY be closed by:
 * 1. The driver ("Jag är OK")
 * 2. An administrator (manual resolve)
 *
 * Movement, GPS updates, distance, time, and inactivity must NEVER close an emergency.
 */
export const EMERGENCY_CLOSE_SOURCES = ["driver", "admin"] as const;
export type EmergencyCloseSource = (typeof EMERGENCY_CLOSE_SOURCES)[number];
