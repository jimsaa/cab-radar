"use client";

import { useEffect, useRef, useState } from "react";
import { GoteborgCDepartureList } from "@/components/sj/GoteborgCDepartureList";
import { useGoteborgCTrains } from "@/hooks/useGoteborgCTrains";
import type { GoteborgCTrainStatus } from "@/lib/goteborg-c-trains";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  GoteborgCTrainStatus | "unavailable",
  { badge: string; dot: string }
> = {
  ok: {
    badge:
      "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#86EFAC] hover:border-[#22C55E]/50",
    dot: "bg-[#22C55E]",
  },
  delays: {
    badge:
      "border-[#EAB308]/35 bg-[#EAB308]/10 text-[#FDE68A] hover:border-[#EAB308]/50",
    dot: "bg-[#EAB308]",
  },
  bus_replacement: {
    badge:
      "border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5] hover:border-[#EF4444]/50",
    dot: "bg-[#EF4444]",
  },
  unavailable: {
    badge:
      "border-white/10 bg-white/[0.04] text-[#B0B6BE] hover:border-white/20",
    dot: "bg-[#8A9099]",
  },
};

/** Compact Tesla admin badge — instant railway overview at a glance. */
export function GoteborgCAdminBadge({ className }: { className?: string }) {
  const { snapshot, loading } = useGoteborgCTrains();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const status = snapshot?.status ?? "unavailable";
  const styles = STATUS_STYLES[status];
  const label = loading && !snapshot
    ? "Göteborg C …"
    : snapshot?.adminLabel ?? "Göteborg C ej tillgänglig";

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.98]",
          styles.badge
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)}
          aria-hidden
        />
        🚆 {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Göteborg C avgångar"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[130] w-[min(92vw,22rem)] rounded-2xl border border-white/10 bg-[#161B22] p-3 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white">Nästa avgångar</p>
            <p className="text-[10px] text-[#8A9099]">
              {snapshot?.available ? snapshot.summaryLine : "Ej tillgänglig"}
            </p>
          </div>

          <GoteborgCDepartureList
            departures={snapshot?.departures ?? []}
            variant="admin"
            emptyLabel="🚆 Göteborg C ej tillgänglig"
          />
        </div>
      )}
    </div>
  );
}
