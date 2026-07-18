"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Loader2, Shield } from "lucide-react";
import {
  REPORT_MENU_CATEGORIES,
  reportsForCategory,
  type ReportMenuCategoryId,
} from "@/lib/report-menu-categories";
import type { DashboardReportType } from "@/lib/dashboard-report-types";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { isSvgReportType } from "@/lib/svg-report-types";
import { cn } from "@/lib/utils";

const CATEGORY_BUTTON_CLASS =
  "flex min-h-[64px] w-full items-center gap-3 rounded-[16px] border border-[#3A4048] bg-[#1c2128] px-4 py-3 text-left text-base font-bold text-white transition hover:border-[#4A5159] hover:bg-[#222831] active:scale-[0.99] sm:min-h-[72px]";

const REPORT_BUTTON_CLASS =
  "flex min-h-[64px] w-full items-center gap-4 rounded-[14px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-left text-base font-bold text-white transition hover:border-[#4A5159] hover:bg-[#2a3038] active:scale-[0.98] disabled:opacity-40 sm:min-h-[72px]";

const TESLA_ICONS: Record<string, string> = {
  taxikontroll: "🚕",
  stopp: "⛔",
  olycka: "🚑",
};

interface CollapsibleReportCategoryMenuProps {
  userId: string | null;
  submittingId: string | null;
  onSelect: (item: DashboardReportType) => void;
}

export function CollapsibleReportCategoryMenu({
  userId,
  submittingId,
  onSelect,
}: CollapsibleReportCategoryMenuProps) {
  const [expandedId, setExpandedId] = useState<ReportMenuCategoryId | null>(
    null
  );

  function toggleCategory(id: ReportMenuCategoryId) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      {REPORT_MENU_CATEGORIES.map((category) => {
        const expanded = expandedId === category.id;
        const reports = reportsForCategory(category);
        const panelId = `report-cat-${category.id}`;

        return (
          <div key={category.id} className="flex flex-col gap-1.5">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggleCategory(category.id)}
              className={cn(
                CATEGORY_BUTTON_CLASS,
                expanded && "border-sky-500/40 bg-[#1e2833]"
              )}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {category.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{category.label}</span>
              <ChevronDown
                  className={cn(
                  "h-5 w-5 shrink-0 text-white/60 transition-transform duration-300 ease-out",
                  expanded && "rotate-180 text-sky-300"
                )}
                aria-hidden
              />
            </button>

            <div
              id={panelId}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "flex flex-col gap-1.5 pl-1 pt-0.5 transition-opacity duration-300",
                    expanded ? "opacity-100" : "opacity-0"
                  )}
                >
                  {reports.map((item) => {
                    const isSubmitting = submittingId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!userId || Boolean(submittingId)}
                        onClick={() => onSelect(item)}
                        className={cn(
                          REPORT_BUTTON_CLASS,
                          isSubmitting && "opacity-70"
                        )}
                      >
                        <ReportButtonIcon
                          item={item}
                          isSubmitting={isSubmitting}
                        />
                        <span>
                          {item.id === "nod" ? "Taxi i nöd" : item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportButtonIcon({
  item,
  isSubmitting,
}: {
  item: DashboardReportType;
  isSubmitting: boolean;
}): ReactNode {
  if (isSubmitting) {
    return (
      <Loader2
        className="h-8 w-8 shrink-0 animate-spin text-white/75"
        aria-hidden
      />
    );
  }
  if (item.id === "nod") {
    return (
      <Shield
        className="h-5 w-5 shrink-0 text-white/75"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (item.id === "ko") {
    return <QueueTrafficIcon className="h-9 w-10" />;
  }
  if (isSvgReportType(item.id)) {
    return (
      <ReportTypeIcon
        reportId={item.id}
        variant="tesla"
        className={item.id === "need_cars" ? "text-emerald-400" : undefined}
      />
    );
  }
  return (
    <span className="text-3xl leading-none" aria-hidden>
      {TESLA_ICONS[item.id] ?? item.icon}
    </span>
  );
}
