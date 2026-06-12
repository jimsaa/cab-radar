import { formatActiveDriverActivityLine } from "@/lib/admin-command-center";
import { cn } from "@/lib/utils";

interface ActiveDriversNetworkStatusProps {
  activeDrivers: number;
  lastDriverActivityAt?: string | null;
  /** Tesla command center uses light text on dark panel. */
  variant?: "tesla" | "mobile";
  className?: string;
}

export function ActiveDriversNetworkStatus({
  activeDrivers,
  lastDriverActivityAt = null,
  variant = "mobile",
  className,
}: ActiveDriversNetworkStatusProps) {
  const hasActive = activeDrivers > 0;
  const isTesla = variant === "tesla";

  return (
    <div className={cn("leading-tight", className)}>
      <p
        className={cn(
          "font-bold",
          isTesla ? "text-lg text-white" : "text-lg text-foreground"
        )}
      >
        {hasActive
          ? `🟢 Aktiva förare: ${activeDrivers}`
          : "⚫ Inga aktiva förare"}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[13px] opacity-75",
          isTesla ? "text-white" : "text-muted"
        )}
      >
        {formatActiveDriverActivityLine(lastDriverActivityAt)}
      </p>
    </div>
  );
}
