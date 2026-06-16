import { alertTypeIcon } from "@/lib/alert-types";
import { LaserIcon } from "@/components/icons/LaserIcon";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";import { cn } from "@/lib/utils";

export type ReportTypeIconVariant = "default" | "badge" | "large" | "tesla";

const VARIANT_CLASS: Record<ReportTypeIconVariant, string> = {
  default: "h-8 w-8",
  badge: "h-7 w-7",
  large: "h-12 w-12",
  tesla: "h-9 w-9",
};

const LASER_STROKE: Record<ReportTypeIconVariant, number> = {
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

  if (resolveLaser(type, reportId)) {
    return (
      <LaserIcon
        className={cn(sizeClass, "text-current", className)}
        strokeWidth={LASER_STROKE[variant]}
      />
    );
  }

  const iconType = type ?? reportId ?? "";
  const emoji = alertTypeIcon(iconType);

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
