import type { AlertType } from "./alert-types";
import { isTaxiEmergencyAlert, publicEmergencyLocationLabel } from "./emergency-privacy";
import type { DriverAlert } from "./types/database";

/** Report types shown in the LIVE information hub. */
export const LIVE_NETWORK_ALERT_TYPES = [
  "traffic_control",
  "laser",
  "all_vehicle_check",
  "need_cars",
  "slow_traffic",
  "total_stop",
  "accident",
  "taxi_emergency",
] as const satisfies readonly AlertType[];

export type LiveNetworkAlertType = (typeof LIVE_NETWORK_ALERT_TYPES)[number];

export type LiveFeedFilter = "all" | LiveNetworkAlertType;

export interface LiveFeedFilterOption {
  id: LiveFeedFilter;
  label: string;
  icon?: string;
}

export const LIVE_FEED_FILTER_OPTIONS: LiveFeedFilterOption[] = [
  { id: "all", label: "Alla" },
  { id: "traffic_control", label: "Taxikontroll", icon: "🚕" },
  { id: "laser", label: "Laser" },
  { id: "all_vehicle_check", label: "Kontroll av alla fordon" },
  { id: "need_cars", label: "Bilar behövs" },
  { id: "slow_traffic", label: "Kö", icon: "🚗🚗🚗" },
  { id: "total_stop", label: "Stopp", icon: "⛔" },
  { id: "accident", label: "Olycka", icon: "🚑" },
];

export function isLiveNetworkAlert(type: string): type is LiveNetworkAlertType {
  return (LIVE_NETWORK_ALERT_TYPES as readonly string[]).includes(type);
}

export function filterLiveFeedByType(
  alerts: DriverAlert[],
  filter: LiveFeedFilter
): DriverAlert[] {
  const networkAlerts = alerts.filter((alert) => isLiveNetworkAlert(alert.type));
  if (filter === "all") return networkAlerts;
  return networkAlerts.filter((alert) => alert.type === filter);
}

/** Driver-facing approximate location — never exact tracking copy. */
export function approximateAlertLocation(alert: DriverAlert): string {
  if (isTaxiEmergencyAlert(alert)) {
    return publicEmergencyLocationLabel(alert) ?? "Ungefärlig plats";
  }

  const parts = [alert.road_address?.trim(), alert.city?.trim()].filter(Boolean);
  if (parts.length === 0) return "Ungefärlig plats";
  return parts.join(", ");
}
