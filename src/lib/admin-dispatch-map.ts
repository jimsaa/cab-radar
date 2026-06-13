import type { AdminCommandCenterSnapshot } from "@/lib/admin-command-center";
import { alertTypeIcon, alertTypeLabel } from "@/lib/constants";
import type { EmergencyAlertWithDriver } from "@/lib/emergency";
import { emergencyLocationLabel } from "@/lib/emergency";
import { PUBLIC_EMERGENCY_LABEL } from "@/lib/emergency-privacy";

export interface DispatchMapReport {
  id: string;
  type: string;
  typeLabel: string;
  typeIcon: string;
  latitude: number;
  longitude: number;
  location: string;
  timeLabel: string;
  description: string | null;
  isEmergency: boolean;
}

export interface DispatchMarkerStyle {
  border: string;
  fill: string;
  glow: string;
}

const MARKER_STYLES: Record<string, DispatchMarkerStyle> = {
  traffic_control: {
    border: "#F4C430",
    fill: "#CA8A04",
    glow: "rgba(244,196,48,0.55)",
  },
  roadwork: {
    border: "#F4C430",
    fill: "#CA8A04",
    glow: "rgba(244,196,48,0.55)",
  },
  laser: {
    border: "#C084FC",
    fill: "#9333EA",
    glow: "rgba(168,85,247,0.55)",
  },
  slow_traffic: {
    border: "#FB923C",
    fill: "#EA580C",
    glow: "rgba(249,115,22,0.55)",
  },
  total_stop: {
    border: "#F87171",
    fill: "#DC2626",
    glow: "rgba(239,68,68,0.55)",
  },
  total_stop_accident: {
    border: "#F87171",
    fill: "#DC2626",
    glow: "rgba(239,68,68,0.55)",
  },
  accident: {
    border: "#60A5FA",
    fill: "#2563EB",
    glow: "rgba(59,130,246,0.55)",
  },
  hazard_on_road: {
    border: "#60A5FA",
    fill: "#2563EB",
    glow: "rgba(59,130,246,0.55)",
  },
  taxi_emergency: {
    border: "#FF3B30",
    fill: "#FF3B30",
    glow: "rgba(255,59,48,0.65)",
  },
};

const DEFAULT_MARKER_STYLE: DispatchMarkerStyle = {
  border: "#94A3B8",
  fill: "#64748B",
  glow: "rgba(148,163,184,0.45)",
};

export function dispatchMarkerStyle(type: string): DispatchMarkerStyle {
  return MARKER_STYLES[type] ?? DEFAULT_MARKER_STYLE;
}

export function buildDispatchMapReports(
  snapshot: AdminCommandCenterSnapshot | null
): DispatchMapReport[] {
  if (!snapshot) return [];

  const reports: DispatchMapReport[] = [];

  for (const emergency of snapshot.emergencies) {
    const lat = emergency.emergency_last_latitude ?? emergency.latitude;
    const lng = emergency.emergency_last_longitude ?? emergency.longitude;
    if (lat == null || lng == null) continue;

    reports.push(emergencyToMapReport(emergency, lat, lng));
  }

  for (const item of snapshot.liveFeed) {
    if (item.latitude == null || item.longitude == null) continue;

    reports.push({
      id: item.id,
      type: item.type,
      typeLabel: item.type_label,
      typeIcon: item.type_icon,
      latitude: item.latitude,
      longitude: item.longitude,
      location: item.address || item.location,
      timeLabel: item.time_label,
      description: item.description,
      isEmergency: false,
    });
  }

  return reports;
}

function emergencyToMapReport(
  emergency: EmergencyAlertWithDriver,
  lat: number,
  lng: number
): DispatchMapReport {
  return {
    id: emergency.id,
    type: "taxi_emergency",
    typeLabel: PUBLIC_EMERGENCY_LABEL,
    typeIcon: "🆘",
    latitude: lat,
    longitude: lng,
    location: emergencyLocationLabel(emergency),
    timeLabel: new Date(emergency.created_at).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Stockholm",
    }),
    description: null,
    isEmergency: true,
  };
}

export function dispatchReportMarkerHtml(
  report: DispatchMapReport,
  focused = false
): string {
  const style = dispatchMarkerStyle(report.type);
  const size = report.isEmergency ? 40 : focused ? 38 : 34;
  const ring = focused
    ? `box-shadow:0 0 0 4px ${style.glow}, 0 0 18px ${style.glow};`
    : `box-shadow:0 0 10px ${style.glow};`;

  return `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${style.fill};border:3px solid ${style.border};font-size:${report.isEmergency ? 18 : 16}px;${ring}">${report.typeIcon || alertTypeIcon(report.type)}</div>`;
}

export function dispatchReportPopupHtml(report: DispatchMapReport): string {
  const comment = report.description?.trim();
  const typeLine = report.typeLabel || alertTypeLabel(report.type);

  return `
    <div class="admin-dispatch-popup">
      <p class="admin-dispatch-popup-title">${typeLine}</p>
      <p class="admin-dispatch-popup-location">${escapeHtml(report.location)}</p>
      <p class="admin-dispatch-popup-time">${escapeHtml(report.timeLabel)}</p>
      ${
        comment
          ? `<p class="admin-dispatch-popup-comment">"${escapeHtml(comment)}"</p>`
          : ""
      }
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
