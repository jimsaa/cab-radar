import type { DriverAlert } from "./types/database";
import {
  filterAlertsForDriverCity,
  type DriverAlertFilterOptions,
} from "./driver-city";

export function getOwnActiveEmergency(
  alerts: DriverAlert[],
  userId: string | null | undefined
): DriverAlert | null {
  if (!userId) return null;
  return (
    alerts.find(
      (a) =>
        a.type === "taxi_emergency" &&
        a.status === "active" &&
        a.created_by === userId
    ) ?? null
  );
}

export function filterAlertsForDriverFeed(
  alerts: DriverAlert[],
  userId: string | null | undefined,
  cityOptions?: DriverAlertFilterOptions
): DriverAlert[] {
  const withoutOwnEmergency = !userId
    ? alerts
    : alerts.filter(
        (a) =>
          !(
            a.type === "taxi_emergency" &&
            a.created_by === userId &&
            a.status === "active"
          )
      );

  if (!cityOptions) return withoutOwnEmergency;
  return filterAlertsForDriverCity(withoutOwnEmergency, {
    ...cityOptions,
    userId,
  });
}
