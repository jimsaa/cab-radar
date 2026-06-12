import { ShieldAlert } from "lucide-react";
import { EMERGENCY_SAFETY_GUIDANCE } from "@/lib/emergency-privacy";
import { cn } from "@/lib/utils";

interface EmergencySafetyGuidanceProps {
  className?: string;
  compact?: boolean;
}

export function EmergencySafetyGuidance({
  className,
  compact,
}: EmergencySafetyGuidanceProps) {
  return (
    <aside
      className={cn(
        "rounded-2xl border border-card-border bg-card/80",
        compact ? "p-3" : "p-4",
        className
      )}
      aria-label="Säkerhetsinformation"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className={cn(
            "shrink-0 text-accent-bright",
            compact ? "mt-0.5 h-4 w-4" : "mt-0.5 h-5 w-5"
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold leading-snug",
              compact ? "text-sm" : "text-base"
            )}
          >
            Din säkerhet först
          </p>
          <ul
            className={cn(
              "mt-2 space-y-2 text-muted leading-relaxed",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {EMERGENCY_SAFETY_GUIDANCE.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent-bright" aria-hidden>
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
