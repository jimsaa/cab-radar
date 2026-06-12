"use client";

import { AlertTypeIconDisplay } from "@/components/icons/AlertTypeIconDisplay";
import { formatRelativeSwedish } from "@/lib/datetime";
import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";
import {
  approximateAlertLocation,
  filterLiveFeedByType,
} from "@/lib/live-feed";
import type { DriverAlert } from "@/lib/types/database";
import { formatTestAlertTypeLabel } from "@/lib/test-mode";
import Link from "next/link";

interface RadarLatestReportsProps {
  alerts: DriverAlert[];
  userId?: string | null;
  driverCity?: string | null;
  showNationalEmergencies?: boolean;
  isAdmin?: boolean;
  className?: string;
}

export function RadarLatestReports({
  alerts,
  userId,
  driverCity,
  showNationalEmergencies,
  isAdmin,
  className,
}: RadarLatestReportsProps) {
  const feedAlerts = filterLiveFeedByType(
    filterAlertsForDriverFeed(alerts, userId, {
      driverCity,
      showNationalEmergencies,
      isAdmin,
    }),
    "all"
  ).slice(0, 3);

  if (feedAlerts.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-base font-bold">Senaste i nätverket</h2>
        <Link
          href="/live"
          className="text-sm font-semibold text-accent-bright"
        >
          LIVE →
        </Link>
      </div>
      <ul className="flex flex-col gap-2 px-4">
        {feedAlerts.map((alert) => (
          <li
            key={alert.id}
            className="flex items-center gap-3 rounded-2xl border border-card-border bg-card/60 p-3"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background"
              aria-hidden
            >
              <AlertTypeIconDisplay type={alert.type} variant="badge" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {formatTestAlertTypeLabel(alert.type, Boolean(alert.is_test))}
              </p>
              <p className="truncate text-xs text-muted">
                {approximateAlertLocation(alert)}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              {formatRelativeSwedish(alert.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
