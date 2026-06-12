import { alertTypeIcon } from "@/lib/alert-types";
import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";

interface AlertTypeIconDisplayProps {
  type: string;
  /** Compact layout for circular feed badges */
  variant?: "default" | "badge";
}

export function AlertTypeIconDisplay({
  type,
  variant = "default",
}: AlertTypeIconDisplayProps) {
  if (type === "slow_traffic") {
    return (
      <QueueTrafficIcon
        className={variant === "badge" ? "h-7 w-8" : undefined}
      />
    );
  }

  return (
    <span className="leading-none" aria-hidden>
      {alertTypeIcon(type)}
    </span>
  );
}
