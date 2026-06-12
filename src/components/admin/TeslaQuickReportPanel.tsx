"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
} from "@/lib/dashboard-report-types";
import { logAlertButtonPressed } from "@/lib/report-alert-mapping";
import { createClient } from "@/lib/supabase/client";

/** Shared Tesla quick-report card — equal visual weight for all types. */
const TESLA_REPORT_BUTTON_CLASS =
  "flex min-h-[72px] w-full items-center gap-4 rounded-[16px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-left text-base font-bold text-white transition hover:border-[#4A5159] hover:bg-[#2a3038] active:scale-[0.98] disabled:opacity-40";

/** Tesla-friendly display icons (operational reports only — nod uses Shield icon). */
const TESLA_ICONS: Record<string, string> = {
  taxikontroll: "🚕",
  laser: "📡",
  ko: "🚗",
  stopp: "⛔",
  olycka: "🚑",
};

interface TeslaQuickReportPanelProps {
  onReported?: () => void;
}

export function TeslaQuickReportPanel({ onReported }: TeslaQuickReportPanelProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardReportType | null>(null);

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function openReport(item: DashboardReportType) {
    logAlertButtonPressed(item.id);
    setPreset(item);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="flex min-h-0 flex-col gap-2">
        {DASHBOARD_REPORT_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={!userId}
            onClick={() => openReport(item)}
            className={TESLA_REPORT_BUTTON_CLASS}
          >
            {item.id === "nod" ? (
              <Shield
                className="h-5 w-5 shrink-0 text-white/75"
                strokeWidth={1.5}
                aria-hidden
              />
            ) : (
              <span className="text-3xl leading-none" aria-hidden>
                {TESLA_ICONS[item.id] ?? item.icon}
              </span>
            )}
            <span>{item.id === "nod" ? "Taxi i nöd" : item.label}</span>
          </button>
        ))}
      </div>

      {userId && (
        <ReportEventSheet
          userId={userId}
          open={sheetOpen}
          preset={preset}
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
      )}
    </>
  );
}
