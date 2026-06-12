"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ArrowLeft, List, Map as MapIcon } from "lucide-react";
import { AlertFeed } from "@/components/alerts/AlertFeed";
import { AlertValidationPrompt } from "@/components/alerts/AlertValidationPrompt";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import {
  DashboardSafetyBanner,
  RecentEventsList,
} from "@/components/dashboard/RecentEventsList";
import { ReportEventGrid } from "@/components/dashboard/ReportEventGrid";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import { useAlertValidationPrompt } from "@/hooks/useAlertValidationPrompt";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { useEmergencyGpsTracking } from "@/hooks/useEmergencyGpsTracking";
import { useDriverPresence } from "@/hooks/useDriverPresence";
import type { DashboardReportType } from "@/lib/dashboard-report-types";
import {
  filterAlertsForDriverFeed,
  getOwnActiveEmergency,
} from "@/lib/emergency-driver";
import { logAlertButtonPressed } from "@/lib/report-alert-mapping";
import { voteOnAlert } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/client";
import type { BannerAd, DriverAlert } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const AlertMap = dynamic(
  () => import("@/components/map/AlertMap").then((m) => m.AlertMap),
  {
    ssr: false,
    loading: () => (
      <div className="mx-4 h-[240px] animate-pulse rounded-2xl bg-card" />
    ),
  }
);

interface DashboardClientProps {
  initialAlerts: DriverAlert[];
  feedBanner: BannerAd | null;
  userId: string | null;
  chimeEnabled: boolean;
  canVote?: boolean;
  canValidate?: boolean;
  canReport?: boolean;
  isVerified?: boolean;
}

export function DashboardClient({
  initialAlerts,
  feedBanner,
  userId,
  chimeEnabled,
  canVote = false,
  canValidate = false,
  canReport = false,
  isVerified = false,
}: DashboardClientProps) {
  const [view, setView] = useState<"home" | "all">("home");
  const [allTab, setAllTab] = useState<"list" | "map">("list");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportPreset, setReportPreset] = useState<DashboardReportType | null>(
    null
  );

  const { alerts, updateAlert } = useAlertsRealtime(initialAlerts, chimeEnabled);

  const ownActiveEmergency = getOwnActiveEmergency(alerts, userId);
  const driverFeedAlerts = filterAlertsForDriverFeed(alerts, userId);

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

  useDriverPresence(Boolean(userId && isVerified));

  useEffect(() => {
    if (!sheetOpen) {
      setReportPreset(null);
    }
  }, [sheetOpen]);

  function openReport(item: DashboardReportType) {
    if (!canReport || !userId) return;
    logAlertButtonPressed(item.id);
    setReportPreset(item);
    setSheetOpen(true);
  }

  async function handleCloseEmergency(alertId: string) {
    const res = await fetch("/api/alerts/close-emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });

    if (!res.ok) {
      const data = await res.json();
      window.alert(data.error ?? "Kunde inte avsluta.");
      return;
    }

    const closed = alerts.find((a) => a.id === alertId);
    if (closed) {
      updateAlert({ ...closed, status: "expired", validation_status: "resolved" });
    }
  }

  function handleEmergencyClosed(alertId: string) {
    const closed = alerts.find((a) => a.id === alertId);
    if (closed) {
      updateAlert({ ...closed, status: "expired", validation_status: "resolved" });
    }
  }

  async function handleVote(alertId: string, vote: 1 | -1) {
    if (!userId) {
      window.alert("Logga in för att rösta.");
      return;
    }
    if (!canVote) {
      window.alert("Kräver verifierad förare.");
      return;
    }
    const supabase = createClient();
    await voteOnAlert(supabase, userId, alertId, vote);
  }

  if (view === "all") {
    return (
      <div className="safe-bottom mx-auto max-w-lg pb-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setView("home")}
            className="flex items-center gap-1 text-sm font-medium text-accent-bright"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka
          </button>
        </div>

        <div className="mb-3 flex gap-2 px-4">
          <button
            type="button"
            onClick={() => setAllTab("list")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold",
              allTab === "list"
                ? "bg-accent text-white"
                : "border border-card-border bg-card text-muted"
            )}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setAllTab("map")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold",
              allTab === "map"
                ? "bg-accent text-white"
                : "border border-card-border bg-card text-muted"
            )}
          >
            <MapIcon className="h-4 w-4" />
            Karta
          </button>
        </div>

        {allTab === "map" ? (
          <div className="px-4">
            <AlertMap alerts={driverFeedAlerts} />
          </div>
        ) : (
          <div className="px-4">
            <BannerSlot banner={feedBanner} />
            <div className="mt-3">
              <AlertFeed
                alerts={driverFeedAlerts}
                onVote={canVote ? handleVote : undefined}
                onCloseEmergency={handleCloseEmergency}
                currentUserId={userId}
              />
            </div>
          </div>
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
      </section>

      <RecentEventsList
        alerts={driverFeedAlerts}
        userId={userId}
        onShowAll={() => setView("all")}
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
