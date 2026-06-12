"use client";

import { useEffect } from "react";
import {
  ALERT_RESOLVED_LABEL,
  rejectionVoteLabel,
} from "@/lib/alert-validation";
import {
  alertTypeIcon,
  alertTypeLabel,
  googleMapsLink,
  isCurrentAlertType,
  type AlertType,
} from "@/lib/constants";
import { isTaxiEmergencyAlert } from "@/lib/emergency-privacy";
import { logAlertFeedRender } from "@/lib/report-alert-mapping";
import type { DriverAlert } from "@/lib/types/database";
import { formatExpiry, formatRelativeTime, cn } from "@/lib/utils";
import { ThumbsDown, ThumbsUp, MapPin, ExternalLink } from "lucide-react";
import { PublicEmergencyAlertView } from "./PublicEmergencyAlertView";

const TYPE_COLORS: Record<AlertType, string> = {
  total_stop: "bg-danger/20 text-danger",
  slow_traffic: "bg-info/20 text-info",
  accident: "bg-danger/20 text-danger",
  taxi_emergency: "bg-danger/25 text-danger",
  taxi_info: "bg-accent/15 text-accent-bright",
  traffic_control: "bg-accent/20 text-accent",
  laser: "bg-purple-500/20 text-purple-300",
};

const LEGACY_COLORS: Record<string, string> = {
  total_stop_accident: "bg-danger/20 text-danger",
  roadwork: "bg-accent/20 text-accent",
  hazard_on_road: "bg-danger/20 text-danger",
  unsafe_pickup_area: "bg-danger/15 text-danger",
  taxi_queue_hotspot: "bg-success/20 text-success",
  ev_charger: "bg-info/20 text-info",
  restroom_break: "bg-muted/20 text-muted",
  general_driver_tip: "bg-accent/15 text-accent",
};

function chipColor(type: string): string {
  if (isCurrentAlertType(type)) return TYPE_COLORS[type];
  return LEGACY_COLORS[type] ?? "bg-muted/20 text-muted";
}

interface AlertCardProps {
  alert: DriverAlert;
  onVote?: (alertId: string, vote: 1 | -1) => void;
  onCloseEmergency?: (alertId: string) => void;
  currentUserId?: string | null;
  compact?: boolean;
}

export function AlertCard({
  alert,
  onVote,
  currentUserId,
  compact,
}: AlertCardProps) {
  const hasLocation = alert.latitude != null && alert.longitude != null;
  const mapsUrl = hasLocation
    ? googleMapsLink(alert.latitude!, alert.longitude!)
    : null;
  const rejections = alert.rejection_count ?? 0;
  const validationStatus = alert.validation_status ?? "active";
  const showResolved = validationStatus === "resolved";
  const rejectionLabel = rejectionVoteLabel(rejections);
  const isOwnEmergency =
    alert.type === "taxi_emergency" &&
    currentUserId != null &&
    alert.created_by === currentUserId;

  useEffect(() => {
    logAlertFeedRender(alert);
  }, [alert.id, alert.type]);

  if (isOwnEmergency) {
    return null;
  }

  if (isTaxiEmergencyAlert(alert)) {
    return <PublicEmergencyAlertView alert={alert} compact={compact} />;
  }

  return (
    <article
      className={cn(
        "rounded-2xl border border-card-border bg-card p-4",
        compact && "p-3"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className={cn("alert-chip", chipColor(alert.type))}>
          <span aria-hidden>{alertTypeIcon(alert.type)}</span>{" "}
          {alertTypeLabel(alert.type)}
          {alert.is_major && alert.type === "slow_traffic" && " · STOR"}
        </span>
        <span className="shrink-0 text-xs text-muted">
          {formatRelativeTime(alert.created_at)}
        </span>
      </div>

      <h3 className="text-base font-semibold leading-snug">{alert.title}</h3>

      {alert.description && (
        <p className="mt-1 text-sm text-muted leading-relaxed">
          {alert.description}
        </p>
      )}

      {showResolved && (
        <p className="mt-2 text-sm font-medium text-success">{ALERT_RESOLVED_LABEL}</p>
      )}

      {rejectionLabel && !showResolved && (
        <p className="mt-2 text-sm font-medium text-muted">{rejectionLabel}</p>
      )}

      {(alert.road_address || alert.city) && (
        <p className="mt-2 flex items-center gap-1 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[alert.road_address, alert.city].filter(Boolean).join(", ")}
        </p>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent"
        >
          Karta
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">
          {alert.type === "taxi_emergency"
            ? "Aktivt nödläge"
            : formatExpiry(alert.expires_at)}
        </span>
        {onVote && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onVote(alert.id, 1)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-success/10 hover:text-success"
              aria-label="Bra"
            >
              <ThumbsUp className="h-4 w-4" />
              {alert.upvotes}
            </button>
            <button
              type="button"
              onClick={() => onVote(alert.id, -1)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Dålig"
            >
              <ThumbsDown className="h-4 w-4" />
              {alert.downvotes}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function AlertTypeBadge({ type }: { type: string }) {
  return (
    <span className={cn("alert-chip", chipColor(type))}>
      <span aria-hidden>{alertTypeIcon(type)}</span> {alertTypeLabel(type)}
    </span>
  );
}

export { ALERT_TYPES } from "@/lib/constants";
