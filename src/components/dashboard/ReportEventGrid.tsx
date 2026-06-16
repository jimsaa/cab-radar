"use client";

import { Shield } from "lucide-react";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
} from "@/lib/dashboard-report-types";
import { logAlertButtonPressed } from "@/lib/report-alert-mapping";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";
import { cn } from "@/lib/utils";

interface ReportEventGridProps {
  onSelect: (item: DashboardReportType) => void;
  disabled?: boolean;
  columns?: 2 | 3;
  emergencyActive?: boolean;
}

export function ReportEventGrid({
  onSelect,
  disabled,
  columns = 2,
  emergencyActive = false,
}: ReportEventGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 ? "grid-cols-2" : "grid-cols-3"
      )}
    >
      {DASHBOARD_REPORT_TYPES.map((item) => {
        const isActiveEmergency = item.id === "nod" && emergencyActive;

        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              logAlertButtonPressed(item.id);
              onSelect(item);
            }}
            className={cn(
              "relative flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 text-center transition active:scale-[0.97] disabled:opacity-50",
              item.discreet
                ? cn(
                    "border bg-card/40 shadow-none",
                    isActiveEmergency
                      ? "border-muted/40 bg-card/60"
                      : "border-card-border hover:bg-card/55"
                  )
                : cn(
                    "border-2 bg-card/80 shadow-lg hover:bg-card",
                    item.borderClass,
                    item.glowClass
                  )
            )}
          >
            {item.discreet ? (
              <Shield
                className={cn(
                  "h-5 w-5",
                  isActiveEmergency ? "text-muted/55" : "text-muted/35"
                )}
                strokeWidth={1.25}
                aria-hidden
              />
            ) : item.id === "ko" ? (
              <QueueTrafficIcon />
            ) : item.id === "laser" ? (
              <ReportTypeIcon reportId="laser" />
            ) : (
              <span className="text-3xl leading-none" aria-hidden>
                {item.icon}
              </span>
            )}

            <span
              className={cn(
                "leading-tight",
                item.discreet
                  ? "text-xs font-normal text-muted/75"
                  : "text-sm font-bold"
              )}
            >
              {item.label}
            </span>

            {isActiveEmergency && (
              <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-muted/60">
                <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
                AKTIV
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
