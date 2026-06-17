import type { AlertType } from "./alert-types";
import { alertTypeDisplayLabel } from "./alert-types";

/** Dashboard button identifiers (driver-facing). */
export type ReportButtonId =
  | "stopp"
  | "ko"
  | "taxikontroll"
  | "laser"
  | "all_vehicle_check"
  | "olycka"
  | "nod";

/** Maps each dashboard button to its Supabase `alert_type` value. */
export const REPORT_BUTTON_TO_ALERT_TYPE: Record<ReportButtonId, AlertType> = {
  stopp: "total_stop",
  ko: "slow_traffic",
  taxikontroll: "traffic_control",
  laser: "laser",
  all_vehicle_check: "all_vehicle_check",
  olycka: "accident",
  nod: "taxi_emergency",
};

export function alertTypeForReportButton(id: ReportButtonId): AlertType {
  return REPORT_BUTTON_TO_ALERT_TYPE[id];
}

export function isEmergencyReportButton(id: ReportButtonId): boolean {
  return id === "nod";
}

const ALERT_TYPE_TO_REPORT_BUTTON: Partial<
  Record<AlertType, ReportButtonId>
> = {
  total_stop: "stopp",
  slow_traffic: "ko",
  traffic_control: "taxikontroll",
  laser: "laser",
  all_vehicle_check: "all_vehicle_check",
  accident: "olycka",
  taxi_emergency: "nod",
};

export function reportButtonIdForAlertType(
  type: AlertType
): ReportButtonId | null {
  return ALERT_TYPE_TO_REPORT_BUTTON[type] ?? null;
}

export function formatAlertFeedDisplay(type: string): string {
  return alertTypeDisplayLabel(type);
}

export function logAlertButtonPressed(buttonId: ReportButtonId): void {
  console.log("[ALERT] Button pressed:", buttonId);
  console.log("[ALERT] Selected type:", REPORT_BUTTON_TO_ALERT_TYPE[buttonId]);
}

export function logAlertPayload(payload: {
  type: string;
  title?: string;
  [key: string]: unknown;
}): void {
  console.log("[ALERT] Payload sent:", payload.type, payload);
}

export function logAlertDatabaseResponse(alert: {
  type: string;
  id?: string;
}): void {
  console.log("[ALERT] Database response:", alert.type, alert);
}

export function logAlertFeedRender(alert: { type: string; id?: string }): void {
  console.log(
    "[ALERT] Feed item rendered as:",
    alert.type,
    formatAlertFeedDisplay(alert.type)
  );
}
