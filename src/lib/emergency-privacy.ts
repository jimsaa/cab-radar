import { distanceMeters } from "./geo";
import { googleMapsLink } from "./constants";
import type { DriverAlert } from "./types/database";

export const PUBLIC_EMERGENCY_LABEL = "Taxi i nöd";

export const PUBLIC_EMERGENCY_PUSH_TITLE = "🆘 Taxi i nöd";

export const PUBLIC_EMERGENCY_PUSH_BODY =
  "En förare i närheten har aktiverat nödläge.";

/** Drivers within this radius may receive emergency push notifications. */
export const NEARBY_EMERGENCY_RADIUS_M = 15_000;

/** Presence older than this is ignored for nearby push targeting. */
export const PRESENCE_STALE_MS = 30 * 60 * 1000;

export const EMERGENCY_SAFETY_GUIDANCE = [
  "Om du befinner dig i närheten, närma dig lugnt och på säkert avstånd.",
  "Utsätt aldrig dig själv för fara.",
  "Om du ser tecken på våld, hot eller annan allvarlig situation – ring 112 omedelbart.",
] as const;

export const EMERGENCY_PHONE_PRIVACY_NOTICE =
  "Telefonnummer delas endast med administratörer och behöriga Co-admins vid Taxi i nöd-larm för att möjliggöra snabb kontakt och bedömning av situationen.";

export function emergencyAwarenessPath(alertId: string): string {
  return `/emergency/${alertId}`;
}

export function isTaxiEmergencyAlert(
  alert: Pick<DriverAlert, "type">
): boolean {
  return alert.type === "taxi_emergency";
}

/** Approximate location only — never driver-identifying data. */
export function publicEmergencyLocationLabel(
  alert: Pick<DriverAlert, "road_address" | "city">
): string | null {
  const parts = [alert.road_address, alert.city].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export function publicEmergencyMapsUrl(
  alert: Pick<
    DriverAlert,
    | "latitude"
    | "longitude"
    | "emergency_last_latitude"
    | "emergency_last_longitude"
  >
): string | null {
  const lat = alert.emergency_last_latitude ?? alert.latitude;
  const lng = alert.emergency_last_longitude ?? alert.longitude;
  if (lat == null || lng == null) return null;
  return googleMapsLink(lat, lng);
}

export function isWithinEmergencyNotifyRadius(
  alertLat: number,
  alertLng: number,
  driverLat: number,
  driverLng: number,
  radiusM = NEARBY_EMERGENCY_RADIUS_M
): boolean {
  return (
    distanceMeters(alertLat, alertLng, driverLat, driverLng) <= radiusM
  );
}

export function isPresenceFresh(
  lastKnownAt: string | null | undefined,
  staleMs = PRESENCE_STALE_MS
): boolean {
  if (!lastKnownAt) return false;
  return Date.now() - new Date(lastKnownAt).getTime() <= staleMs;
}

export function emergencyAlertCoordinates(
  alert: Pick<
    DriverAlert,
    "latitude" | "longitude" | "emergency_last_latitude" | "emergency_last_longitude"
  >
): { lat: number; lng: number } | null {
  const lat = alert.emergency_last_latitude ?? alert.latitude;
  const lng = alert.emergency_last_longitude ?? alert.longitude;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}
