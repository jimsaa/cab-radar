"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { TaxiControlReportModal } from "@/components/alerts/TaxiControlReportModal";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import { useAppToast } from "@/components/ui/AppToast";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
  reportAlertType,
} from "@/lib/dashboard-report-types";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { isSvgReportType } from "@/lib/svg-report-types";
import {
  isEmergencyReportButton,
  isTaxiControlReportButton,
} from "@/lib/report-alert-mapping";
import {
  reportSubmitErrorMessage,
  reportSuccessToast,
  submitDriverAlert,
  submitInstantDriverReport,
} from "@/lib/submit-alert";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CreateAlertInput } from "@/lib/types/database";

/** Shared Tesla quick-report card — equal visual weight for all types. */
const TESLA_REPORT_BUTTON_CLASS =
  "flex min-h-[72px] w-full items-center gap-4 rounded-[16px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-left text-base font-bold text-white transition hover:border-[#4A5159] hover:bg-[#2a3038] active:scale-[0.98] disabled:opacity-40";

/** Tesla-friendly display icons (operational reports only — nod uses Shield icon). */
const TESLA_ICONS: Record<string, string> = {
  taxikontroll: "🚕",
  stopp: "⛔",
  olycka: "🚑",
};

interface TeslaQuickReportPanelProps {
  onReported?: () => void;
  /** Admin command center vs Tesla View driving mode. */
  mode?: "admin" | "driving";
}

export function TeslaQuickReportPanel({
  onReported,
  mode = "admin",
}: TeslaQuickReportPanelProps) {
  const showToast = useAppToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardReportType | null>(null);
  const [taxiControlOpen, setTaxiControlOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const isDriving = mode === "driving";

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function openEmergencyReport(item: DashboardReportType) {
    setPreset(item);
    setSheetOpen(true);
  }

  async function submitInstant(item: DashboardReportType) {
    if (!userId || submittingId) return;

    setSubmittingId(item.id);
    try {
      const alert = await submitInstantDriverReport(userId, item);
      onReported?.();
      const { message, variant } = reportSuccessToast(
        reportAlertType(item),
        alert.is_test
      );
      showToast(message, { variant });
    } catch (err) {
      showToast(reportSubmitErrorMessage(err), { variant: "error" });
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleTaxiControlSubmit(data: CreateAlertInput) {
    if (!userId) return;

    const alert = await submitDriverAlert(userId, data);
    onReported?.();
    setTaxiControlOpen(false);
    const { message, variant } = reportSuccessToast("traffic_control", alert.is_test);
    showToast(message, { variant });
  }

  function handleReportClick(item: DashboardReportType) {
    if (!userId) return;

    if (isEmergencyReportButton(item.id)) {
      openEmergencyReport(item);
      return;
    }

    if (isTaxiControlReportButton(item.id)) {
      setTaxiControlOpen(true);
      return;
    }

    void submitInstant(item);
  }

  return (
    <>
      <div className="flex min-h-0 flex-col gap-2">
        {DASHBOARD_REPORT_TYPES.map((item) => {
          const isSubmitting = submittingId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!userId || Boolean(submittingId)}
              onClick={() => handleReportClick(item)}
              className={cn(TESLA_REPORT_BUTTON_CLASS, isSubmitting && "opacity-70")}
            >
              {isSubmitting ? (
                <Loader2
                  className="h-8 w-8 shrink-0 animate-spin text-white/75"
                  aria-hidden
                />
              ) : item.id === "nod" ? (
                <Shield
                  className="h-5 w-5 shrink-0 text-white/75"
                  strokeWidth={1.5}
                  aria-hidden
                />
              ) : item.id === "ko" ? (
                <QueueTrafficIcon className="h-9 w-10" />
              ) : isSvgReportType(item.id) ? (
                <ReportTypeIcon reportId={item.id} variant="tesla" />
              ) : (
                <span className="text-3xl leading-none" aria-hidden>
                  {TESLA_ICONS[item.id] ?? item.icon}
                </span>
              )}
              <span>{item.id === "nod" ? "Taxi i nöd" : item.label}</span>
            </button>
          );
        })}
      </div>

      {userId && (
        <>
          <TaxiControlReportModal
            open={taxiControlOpen}
            variant="tesla"
            onClose={() => setTaxiControlOpen(false)}
            onSubmit={handleTaxiControlSubmit}
          />

          <ReportEventSheet
            userId={userId}
            open={sheetOpen}
            preset={preset}
            isAdmin={!isDriving}
            onClose={() => {
              setSheetOpen(false);
              setPreset(null);
            }}
            onCreated={() => {
              onReported?.();
              setSheetOpen(false);
              setPreset(null);
            }}
          />
        </>
      )}
    </>
  );
}
