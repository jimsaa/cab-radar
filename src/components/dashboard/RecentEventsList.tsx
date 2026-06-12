"use client";

import { useEffect } from "react";
import { ChevronRight, MapPin, Shield } from "lucide-react";
import {
  alertTypeLabel,
  googleMapsLink,
} from "@/lib/constants";
import { AlertTypeIconDisplay } from "@/components/icons/AlertTypeIconDisplay";
import { isTaxiEmergencyAlert, publicEmergencyLocationLabel } from "@/lib/emergency-privacy";
import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";
import { logAlertFeedRender } from "@/lib/report-alert-mapping";
import type { DriverAlert } from "@/lib/types/database";
import { formatRelativeTimeAgo, cn } from "@/lib/utils";
import { formatTestAlertTypeLabel } from "@/lib/test-mode";
import { PublicEmergencyAlertView } from "@/components/alerts/PublicEmergencyAlertView";

interface RecentEventsListProps {
  alerts: DriverAlert[];
  userId?: string | null;
  onShowAll?: () => void;
  showAllLink?: boolean;
  className?: string;
}

function locationLine(alert: DriverAlert): string {
  if (isTaxiEmergencyAlert(alert)) {
    return publicEmergencyLocationLabel(alert) ?? "Ungefärlig plats";
  }
  const parts = [alert.road_address, alert.city].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return alert.title;
}

function RecentEventRow({ alert }: { alert: DriverAlert }) {
  useEffect(() => {
    logAlertFeedRender(alert);
  }, [alert.id, alert.type]);

  if (isTaxiEmergencyAlert(alert)) {
    return (
      <li>
        <PublicEmergencyAlertView alert={alert} compact showTimestamp />
      </li>
    );
  }

  const hasLocation = alert.latitude != null && alert.longitude != null;
  const mapsUrl = hasLocation
    ? googleMapsLink(alert.latitude!, alert.longitude!)
    : null;

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-xl"
        aria-hidden
      >
        <AlertTypeIconDisplay type={alert.type} variant="badge" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">
          {formatTestAlertTypeLabel(alert.type, Boolean(alert.is_test))}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {locationLine(alert)}
        </p>
        <p className="mt-0.5 text-xs text-muted/80">
          {formatRelativeTimeAgo(alert.created_at)}
        </p>
      </div>
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-card-border bg-background px-2.5 py-2 text-xs font-medium text-foreground"
        >
          <MapPin className="h-3.5 w-3.5 text-accent" />
          <span className="hidden min-[380px]:inline">Öppna i karta</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </a>
      ) : (
        <span className="shrink-0 text-xs text-muted">—</span>
      )}
    </li>
  );
}

export function RecentEventsList({
  alerts,
  userId,
  onShowAll,
  showAllLink = true,
  className,
}: RecentEventsListProps) {
  const visibleAlerts = filterAlertsForDriverFeed(alerts, userId);
  const preview = visibleAlerts.slice(0, 4);

  return (
    <section className={cn("px-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Senaste händelser</h2>
        {showAllLink && visibleAlerts.length > 0 && onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="text-sm font-semibold text-accent-bright"
          >
            Visa alla
          </button>
        )}
      </div>

      {preview.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted">Inga aktiva händelser just nu.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {preview.map((alert) => (
            <RecentEventRow key={alert.id} alert={alert} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardSafetyBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-4 rounded-2xl border border-accent/30 bg-accent/10 p-4",
        className
      )}
    >
      <div className="flex gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent-bright" />
        <div>
          <p className="font-semibold leading-snug">
            Tillsammans håller vi dig uppdaterad
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Rapportera endast det du ser – för allas säkerhet.
          </p>
        </div>
      </div>
    </div>
  );
}
