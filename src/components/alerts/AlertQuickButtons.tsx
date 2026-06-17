"use client";

import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  ALERT_TYPES,
  type AlertType,
} from "@/lib/constants";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { isSvgReportType } from "@/lib/svg-report-types";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";
import { cn } from "@/lib/utils";

interface AlertQuickButtonsProps {
  onSelect: (type: AlertType) => void;
  disabled?: boolean;
}

export function AlertQuickButtons({ onSelect, disabled }: AlertQuickButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ALERT_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(type)}
          className={cn(
            "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-card-border bg-card px-2 py-4 text-center transition active:scale-[0.97]",
            "hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
          )}
        >
          {type === "slow_traffic" ? (
            <QueueTrafficIcon />
          ) : isSvgReportType(type) ? (
            <ReportTypeIcon type={type} />
          ) : (
            <span className="text-3xl leading-none" aria-hidden>
              {ALERT_TYPE_ICONS[type]}
            </span>
          )}
          <span className="text-sm font-semibold leading-tight">
            {ALERT_TYPE_LABELS[type]}
          </span>
        </button>
      ))}
    </div>
  );
}
