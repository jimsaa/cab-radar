"use client";

import { useMemo, useState } from "react";
import { AlertTypeIconDisplay } from "@/components/icons/AlertTypeIconDisplay";
import { LiveFilterChips } from "@/components/live/LiveFilterChips";
import { LiveReportDetail } from "@/components/live/LiveReportDetail";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { alertTypeLabel } from "@/lib/constants";
import { formatRelativeSwedish } from "@/lib/datetime";
import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";
import {
  approximateAlertLocation,
  filterLiveFeedByType,
  type LiveFeedFilter,
} from "@/lib/live-feed";
import type { DriverAlert } from "@/lib/types/database";
import { formatDriverCityLabel } from "@/lib/driver-city";
import { formatTestAlertTypeLabel } from "@/lib/test-mode";
import { cn } from "@/lib/utils";

interface LiveFeedClientProps {
  initialAlerts: DriverAlert[];
  userId: string | null;
  chimeEnabled: boolean;
  driverCity?: string | null;
  showNationalEmergencies?: boolean;
  isAdmin?: boolean;
}

export function LiveFeedClient({
  initialAlerts,
  userId,
  chimeEnabled,
  driverCity = null,
  showNationalEmergencies = false,
  isAdmin = false,
}: LiveFeedClientProps) {
  const [filter, setFilter] = useState<LiveFeedFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { alerts } = useAlertsRealtime(initialAlerts, chimeEnabled);

  const cityFilterOptions = useMemo(
    () => ({
      driverCity,
      showNationalEmergencies,
      isAdmin,
    }),
    [driverCity, showNationalEmergencies, isAdmin]
  );

  const feedAlerts = useMemo(() => {
    const scoped = filterAlertsForDriverFeed(alerts, userId, cityFilterOptions);
    return filterLiveFeedByType(scoped, filter);
  }, [alerts, userId, cityFilterOptions, filter]);

  const selected = feedAlerts.find((alert) => alert.id === selectedId) ?? null;

  if (selected) {
    return (
      <LiveReportDetail alert={selected} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div className="safe-bottom mx-auto max-w-lg pb-4 pt-1">
      <p className="mb-2 px-4 text-xs opacity-60">
        LIVE • {formatDriverCityLabel(driverCity)}
      </p>

      <LiveFilterChips value={filter} onChange={setFilter} />

      <ul className="mt-2 flex flex-col gap-2 px-4">
        {feedAlerts.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-card-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted">
              Inga rapporter att visa just nu.
            </p>
          </li>
        ) : (
          feedAlerts.map((alert) => (
            <li key={alert.id}>
              <button
                type="button"
                onClick={() => setSelectedId(alert.id)}
                className={cn(
                  "w-full rounded-2xl border border-card-border bg-card p-4 text-left transition active:scale-[0.99]",
                  alert.type === "taxi_emergency" && "border-danger/30 bg-danger/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-xl"
                    aria-hidden
                  >
                    <AlertTypeIconDisplay type={alert.type} variant="badge" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">
                      {formatTestAlertTypeLabel(
                        alert.type,
                        Boolean(alert.is_test)
                      ) || alertTypeLabel(alert.type)}
                    </p>
                    <p className="mt-1 text-sm text-muted leading-snug">
                      {approximateAlertLocation(alert)}
                    </p>
                    <p className="mt-1 text-xs text-muted/80">
                      {formatRelativeSwedish(alert.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
