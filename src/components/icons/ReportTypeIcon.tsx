import { alertTypeIcon } from "@/lib/alert-types";
import { isSvgReportType } from "@/lib/svg-report-types";
import { AllVehicleCheckIcon } from "@/components/icons/AllVehicleCheckIcon";
import { CrowdIcon } from "@/components/icons/CrowdIcon";
import { LaserIcon } from "@/components/icons/LaserIcon";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";
import { cn } from "@/lib/utils";

export type ReportTypeIconVariant = "default" | "badge" | "large" | "tesla";

const VARIANT_CLASS: Record<ReportTypeIconVariant, string> = {
  default: "h-8 w-8",
  badge: "h-7 w-7",
  large: "h-12 w-12",
  tesla: "h-9 w-9",
};

const SVG_STROKE: Record<ReportTypeIconVariant, number> = {
  default: 1.75,
  badge: 1.85,
  large: 1.5,
  tesla: 1.65,
};

interface ReportTypeIconProps {
  /** Stored alert type, e.g. laser, slow_traffic */
  type?: string;
  /** Dashboard button id, e.g. laser, ko */
  reportId?: string;
  variant?: ReportTypeIconVariant;
  className?: string;
}

function resolveLaser(type?: string, reportId?: string): boolean {
  return type === "laser" || reportId === "laser";
}

function resolveAllVehicleCheck(type?: string, reportId?: string): boolean {
  return type === "all_vehicle_check" || reportId === "all_vehicle_check";
}

function resolveNeedCars(type?: string, reportId?: string): boolean {
  return type === "need_cars" || reportId === "need_cars";
}

function resolveQueue(type?: string, reportId?: string): boolean {
  return type === "slow_traffic" || reportId === "ko";
}

export function ReportTypeIcon({
  type,
  reportId,
  variant = "default",
  className,
}: ReportTypeIconProps) {
  const sizeClass = VARIANT_CLASS[variant];

  if (resolveQueue(type, reportId)) {
    return (
      <QueueTrafficIcon
        className={cn(
          variant === "tesla" ? "h-9 w-10" : sizeClass,
          className
        )}
      />
    );
  }

  if (resolveNeedCars(type, reportId)) {
    return (
      <CrowdIcon
        className={cn(sizeClass, "text-current", className)}
        strokeWidth={SVG_STROKE[variant]}
      />
    );
  }

  if (resolveAllVehicleCheck(type, reportId)) {
    return (
      <AllVehicleCheckIcon
        className={cn(sizeClass, "text-current", className)}
        strokeWidth={SVG_STROKE[variant]}
      />
    );
  }

  if (resolveLaser(type, reportId)) {
    return (
      <LaserIcon
        className={cn(sizeClass, "text-current", className)}
        strokeWidth={SVG_STROKE[variant]}
      />
    );
  }

  const iconType = type ?? reportId ?? "";
  const emoji = alertTypeIcon(iconType);

  if (!emoji && isSvgReportType(iconType)) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center leading-none",
        variant === "large" ? "text-5xl" : variant === "tesla" ? "text-3xl" : "text-3xl",
        className
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
