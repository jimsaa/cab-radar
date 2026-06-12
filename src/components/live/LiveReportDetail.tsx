"use client";

import { ChevronLeft } from "lucide-react";
import { AlertTypeIconDisplay } from "@/components/icons/AlertTypeIconDisplay";
import { EmergencySafetyGuidance } from "@/components/alerts/EmergencySafetyGuidance";
import { DriverNavigationButtons } from "@/components/navigation/DriverNavigationButtons";
import {
  formatRelativeSwedish,
  formatSwedishDateTime,
} from "@/lib/datetime";
import { isTaxiEmergencyAlert } from "@/lib/emergency-privacy";
import { approximateAlertLocation } from "@/lib/live-feed";
import { alertFullAddress } from "@/lib/tesla-navigation";
import type { DriverAlert } from "@/lib/types/database";
import { formatTestAlertTypeLabel } from "@/lib/test-mode";

interface LiveReportDetailProps {
  alert: DriverAlert;
  onBack: () => void;
}

export function LiveReportDetail({ alert, onBack }: LiveReportDetailProps) {
  const isEmergency = isTaxiEmergencyAlert(alert);
  const location = approximateAlertLocation(alert);
  const fullAddress = alertFullAddress(alert.road_address, alert.city);
  const notes = alert.description?.trim();

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 py-2 text-sm font-medium text-accent-bright"
      >
        <ChevronLeft className="h-4 w-4" />
        Tillbaka
      </button>

      <div className="mb-3 flex items-center gap-2">
        <AlertTypeIconDisplay type={alert.type} variant="badge" />
        <h1 className="text-xl font-bold">
          {formatTestAlertTypeLabel(alert.type, Boolean(alert.is_test))}
        </h1>
      </div>

      <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <DetailRow label="Plats" value={isEmergency ? location : fullAddress} />
        <DetailRow
          label="Tid"
          value={formatRelativeSwedish(alert.created_at)}
          sub={formatSwedishDateTime(alert.created_at)}
        />
        {notes && <DetailRow label="Anteckningar" value={notes} />}
      </div>

      {isEmergency && (
        <div className="mt-4">
          <EmergencySafetyGuidance />
        </div>
      )}

      <div className="mt-4">
        <DriverNavigationButtons
          target={{
            latitude: alert.latitude,
            longitude: alert.longitude,
            address: fullAddress,
          }}
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium leading-relaxed">{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-muted font-mono">{sub}</p>
      )}
    </div>
  );
}
