import {
  formatGoteborgCDelayLabel,
  goteborgCDepartureStatusLabel,
  type GoteborgCDeparture,
} from "@/lib/goteborg-c-trains";
import { cn } from "@/lib/utils";

interface GoteborgCDepartureListProps {
  departures: GoteborgCDeparture[];
  variant?: "user" | "admin";
  emptyLabel?: string;
}

function highlightClass(departure: GoteborgCDeparture): string {
  if (departure.flags.busReplacement) {
    return "border-danger/40 bg-danger/10";
  }
  if (departure.flags.cancelled) {
    return "border-danger/30 bg-danger/5";
  }
  if (departure.flags.significantDelay || departure.flags.trackChange) {
    return "border-warning/40 bg-warning/10";
  }
  return "border-card-border bg-card/40";
}

export function GoteborgCDepartureList({
  departures,
  variant = "user",
  emptyLabel = "Inga avgångar att visa just nu.",
}: GoteborgCDepartureListProps) {
  if (departures.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  if (variant === "admin") {
    return (
      <ul className="space-y-2">
        {departures.map((departure) => (
          <li
            key={departure.id}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-[12px] leading-snug",
              highlightClass(departure)
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-white">{departure.destination}</p>
              <span className="shrink-0 font-mono tabular-nums text-white/80">
                {departure.scheduledTime}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#B0B6BE]">
              {formatGoteborgCDelayLabel(departure)}
              {departure.track ? ` · Spår ${departure.track}` : ""}
              {goteborgCDepartureStatusLabel(departure) !== "—"
                ? ` · ${goteborgCDepartureStatusLabel(departure)}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {departures.map((departure) => (
        <li
          key={departure.id}
          className={cn(
            "rounded-xl border px-3 py-3 text-sm",
            highlightClass(departure)
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {departure.destination}
              </p>
              <p className="mt-0.5 text-xs text-muted">{departure.operator}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono font-semibold tabular-nums text-foreground">
                {departure.scheduledTime}
              </p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
                {departure.updatedTime
                  ? `Ny tid ${departure.updatedTime}`
                  : "Ny tid —"}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span>
              Spår {departure.track ?? "—"}
            </span>
            <span>Tåg {departure.trainNumber || "—"}</span>
            <span>{goteborgCDepartureStatusLabel(departure)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
