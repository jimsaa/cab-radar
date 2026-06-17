/** Admin dispatch attention — border colors, storage, type mapping. */

export const ADMIN_ALERTED_REPORTS_KEY = "cabradar_admin_alerted_reports";
export const ADMIN_ACKED_EMERGENCIES_KEY = "cabradar_admin_emergency_acked";
export const ADMIN_ALERTED_MAX_STORED = 500;

export const ADMIN_HIGHLIGHT_MS = 5000;
export const ADMIN_NY_BADGE_MS = 60_000;
export const ADMIN_BG_FLASH_MS = 5000;

export type AdminReportAttentionKind =
  | "laser"
  | "all_vehicle_check"
  | "traffic_control"
  | "slow_traffic"
  | "total_stop"
  | "accident"
  | "taxi_emergency"
  | "default";

export interface AdminReportAttentionStyle {
  kind: AdminReportAttentionKind;
  borderClass: string;
  pulseClass: string;
}

const ATTENTION_BY_KIND: Record<
  AdminReportAttentionKind,
  Omit<AdminReportAttentionStyle, "kind">
> = {
  laser: {
    borderClass: "admin-report-border-laser",
    pulseClass: "admin-report-pulse-laser",
  },
  all_vehicle_check: {
    borderClass: "admin-report-border-all-vehicle-check",
    pulseClass: "admin-report-pulse-all-vehicle-check",
  },
  traffic_control: {
    borderClass: "admin-report-border-taxikontroll",
    pulseClass: "admin-report-pulse-taxikontroll",
  },
  slow_traffic: {
    borderClass: "admin-report-border-ko",
    pulseClass: "admin-report-pulse-ko",
  },
  total_stop: {
    borderClass: "admin-report-border-stopp",
    pulseClass: "admin-report-pulse-stopp",
  },
  accident: {
    borderClass: "admin-report-border-olycka",
    pulseClass: "admin-report-pulse-olycka",
  },
  taxi_emergency: {
    borderClass: "admin-report-border-emergency",
    pulseClass: "admin-report-pulse-emergency",
  },
  default: {
    borderClass: "admin-report-border-default",
    pulseClass: "admin-report-pulse-default",
  },
};

export function adminReportAttentionKind(type: string): AdminReportAttentionKind {
  switch (type) {
    case "laser":
      return "laser";
    case "all_vehicle_check":
      return "all_vehicle_check";
    case "traffic_control":
    case "roadwork":
      return "traffic_control";
    case "slow_traffic":
      return "slow_traffic";
    case "total_stop":
    case "total_stop_accident":
      return "total_stop";
    case "accident":
    case "hazard_on_road":
      return "accident";
    case "taxi_emergency":
      return "taxi_emergency";
    default:
      return "default";
  }
}

export function adminReportAttentionStyle(
  type: string
): AdminReportAttentionStyle {
  const kind = adminReportAttentionKind(type);
  return { kind, ...ATTENTION_BY_KIND[kind] };
}

export interface ReportAttentionVisual {
  borderClass: string;
  pulseClass: string;
  showNyBadge: boolean;
  showAkutBadge: boolean;
  showBgFlash: boolean;
  isEmergencyUnacknowledged: boolean;
}

export function loadStoredIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function persistStoredIdSet(key: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const arr = [...ids].slice(-ADMIN_ALERTED_MAX_STORED);
    window.localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // Storage full or unavailable — attention still works in-session.
  }
}

export function loadAlertedReportIds(): Set<string> {
  return loadStoredIdSet(ADMIN_ALERTED_REPORTS_KEY);
}

export function persistAlertedReportIds(ids: Set<string>): void {
  persistStoredIdSet(ADMIN_ALERTED_REPORTS_KEY, ids);
}

export function loadAcknowledgedEmergencyIds(): Set<string> {
  return loadStoredIdSet(ADMIN_ACKED_EMERGENCIES_KEY);
}

export function persistAcknowledgedEmergencyIds(ids: Set<string>): void {
  persistStoredIdSet(ADMIN_ACKED_EMERGENCIES_KEY, ids);
}
