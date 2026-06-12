"use client";

import { useEffect, useState } from "react";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
} from "@/lib/dashboard-report-types";
import { logAlertButtonPressed } from "@/lib/report-alert-mapping";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Tesla-friendly display icons (override dashboard defaults where needed). */
const TESLA_ICONS: Record<string, string> = {
  taxikontroll: "🚕",
  laser: "📡",
  ko: "🚗",
  stopp: "⛔",
  olycka: "🚑",
  nod: "🆘",
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
            className={cn(
              "flex min-h-[72px] w-full items-center gap-4 rounded-[16px] border px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40",
              item.discreet
                ? "border-[#3A4048] bg-[#1B1E22] hover:border-[#4A5159]"
                : "border-[#3A4048] bg-[#262B31] hover:border-[#4A5159] hover:bg-[#2a3038]"
            )}
          >
            <span className="text-3xl leading-none" aria-hidden>
              {TESLA_ICONS[item.id] ?? item.icon}
            </span>
            <span
              className={cn(
                "text-base font-bold",
                item.discreet ? "text-[#B0B6BE]" : "text-white"
              )}
            >
              {item.id === "nod" ? "Taxi i nöd" : item.label}
            </span>
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
