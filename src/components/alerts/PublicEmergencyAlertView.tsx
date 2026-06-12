"use client";

import {
  PUBLIC_EMERGENCY_LABEL,
  emergencyAwarenessPath,
  publicEmergencyLocationLabel,
  publicEmergencyMapsUrl,
} from "@/lib/emergency-privacy";
import type { DriverAlert } from "@/lib/types/database";
import { cn, formatRelativeTime } from "@/lib/utils";
import { ExternalLink, MapPin } from "lucide-react";
import Link from "next/link";
import { EmergencySafetyGuidance } from "./EmergencySafetyGuidance";

export type PublicEmergencyAlert = Pick<
  DriverAlert,
  | "id"
  | "road_address"
  | "city"
  | "latitude"
  | "longitude"
  | "emergency_last_latitude"
  | "emergency_last_longitude"
  | "created_at"
>;

interface PublicEmergencyAlertViewProps {
  alert: PublicEmergencyAlert;
  compact?: boolean;
  showTimestamp?: boolean;
  showGuidance?: boolean;
}

/** Driver-facing emergency alert — awareness only, no personal data. */
export function PublicEmergencyAlertView({
  alert,
  compact,
  showTimestamp = true,
  showGuidance = true,
}: PublicEmergencyAlertViewProps) {
  const location = publicEmergencyLocationLabel(alert);
  const mapsUrl = publicEmergencyMapsUrl(alert);

  return (
    <article
      className={cn(
        "rounded-2xl border border-danger/30 bg-danger/5 p-4",
        compact && "p-3"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="alert-chip bg-danger/25 text-danger">
          <span aria-hidden>🆘</span> {PUBLIC_EMERGENCY_LABEL}
        </span>
        {showTimestamp && (
          <span className="shrink-0 text-xs text-muted">
            {formatRelativeTime(alert.created_at)}
          </span>
        )}
      </div>

      {location && (
        <p className="flex items-start gap-1.5 text-sm leading-relaxed">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          <span>{location}</span>
        </p>
      )}

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold text-accent",
            location ? "mt-3" : "mt-1",
            compact ? "text-xs" : "text-sm"
          )}
        >
          📍 Öppna i karta
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {showGuidance && !compact && (
        <EmergencySafetyGuidance className="mt-4" compact />
      )}

      {compact && (
        <Link
          href={emergencyAwarenessPath(alert.id)}
          className="mt-2 inline-block text-xs font-semibold text-accent-bright"
        >
          Visa information och säkerhetsråd →
        </Link>
      )}
    </article>
  );
}