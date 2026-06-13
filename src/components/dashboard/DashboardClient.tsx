"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertValidationPrompt } from "@/components/alerts/AlertValidationPrompt";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardSafetyBanner } from "@/components/dashboard/RecentEventsList";
import { RadarLatestReports } from "@/components/dashboard/RadarLatestReports";
import { ReportEventGrid } from "@/components/dashboard/ReportEventGrid";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import { GsiDispatchCard } from "@/components/gsi/GsiDispatchCard";
import { GoteborgCTrainsCard } from "@/components/sj/GoteborgCTrainsCard";
import { useAlertValidationPrompt } from "@/hooks/useAlertValidationPrompt";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { useEmergencyGpsTracking } from "@/hooks/useEmergencyGpsTracking";
import type { DashboardReportType } from "@/lib/dashboard-report-types";
import {
  filterAlertsForDriverFeed,
  getOwnActiveEmergency,
} from "@/lib/emergency-driver";
import { logAlertButtonPressed } from "@/lib/report-alert-mapping";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";
import type { DriverAlert } from "@/lib/types/database";

interface DashboardClientProps {
  initialAlerts: DriverAlert[];
  userId: string | null;
  chimeEnabled: boolean;
  canValidate?: boolean;
  canReport?: boolean;
  isVerified?: boolean;
  driverCity?: string | null;
  showNationalEmergencies?: boolean;
  isAdmin?: boolean;
}

export function DashboardClient({
  initialAlerts,
  userId,
  chimeEnabled,
  canValidate = false,
  canReport = false,
  isVerified = false,
  driverCity = null,
  showNationalEmergencies = false,
  isAdmin = false,
}: DashboardClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportPreset, setReportPreset] = useState<DashboardReportType | null>(
    null
  );

  const { alerts, updateAlert } = useAlertsRealtime(initialAlerts, chimeEnabled);

  const cityFilterOptions = useMemo(
    () => ({
      driverCity,
      showNationalEmergencies,
      isAdmin,
    }),
    [driverCity, showNationalEmergencies, isAdmin]
  );

  const ownActiveEmergency = getOwnActiveEmergency(alerts, userId);
  const driverFeedAlerts = useMemo(
    () => filterAlertsForDriverFeed(alerts, userId, cityFilterOptions),
    [alerts, userId, cityFilterOptions]
  );

  const {
    promptText,
    submitting,
    respond,
    dismiss,
    pendingAlert,
  } = useAlertValidationPrompt({
    alerts,
    userId,
    enabled: canValidate,
    onAlertUpdated: updateAlert,
  });

  useEmergencyGpsTracking({
    alerts,
    userId,
    enabled: Boolean(userId && canReport),
  });

  useEffect(() => {
    if (!sheetOpen) {
      setReportPreset(null);
    }
  }, [sheetOpen]);

  useEffect(() => {
    if (!isVerified) return;

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void recordDriverActivityFromDevice("radar_refresh");
      }
    }

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [isVerified]);

  function openReport(item: DashboardReportType) {
    if (!canReport || !userId) return;
    logAlertButtonPressed(item.id);
    setReportPreset(item);
    setSheetOpen(true);
  }

  function handleEmergencyClosed(alertId: string) {
    const closed = alerts.find((a) => a.id === alertId);
    if (closed) {
      updateAlert({ ...closed, status: "expired", validation_status: "resolved" });
    }
  }

  return (
    <div className="safe-bottom mx-auto max-w-lg pb-4">
      <DashboardHero isVerified={isVerified} />

      <section className="px-4 pb-2">
        <h2 className="mb-3 text-base font-bold">Rapportera händelse</h2>
        <ReportEventGrid
          onSelect={openReport}
          disabled={!canReport}
          emergencyActive={Boolean(ownActiveEmergency)}
        />
        {!canReport && (
          <p className="mt-2 text-center text-xs text-muted">
            Verifiering krävs för att rapportera händelser.
          </p>
        )}
        <GsiDispatchCard className="mt-4" />
        <GoteborgCTrainsCard className="mt-3" />
      </section>

      <RadarLatestReports
        alerts={driverFeedAlerts}
        userId={userId}
        driverCity={driverCity}
        showNationalEmergencies={showNationalEmergencies}
        isAdmin={isAdmin}
        className="mt-6"
      />

      <DashboardSafetyBanner className="mt-6" />

      {userId && (
        <ReportEventSheet
          userId={userId}
          open={sheetOpen}
          preset={reportPreset}
          activeOwnEmergency={ownActiveEmergency}
          onClose={() => setSheetOpen(false)}
          onCreated={updateAlert}
          onEmergencyClosed={handleEmergencyClosed}
        />
      )}

      <AlertValidationPrompt
        promptText={canValidate ? promptText : null}
        visible={canValidate && !!pendingAlert}
        submitting={submitting}
        onRespond={respond}
        onDismiss={dismiss}
      />
    </div>
  );
}
