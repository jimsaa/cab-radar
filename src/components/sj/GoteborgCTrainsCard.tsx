"use client";

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { GoteborgCDepartureList } from "@/components/sj/GoteborgCDepartureList";
import { ModalShell } from "@/components/ui/ModalShell";
import { useGoteborgCTrains } from "@/hooks/useGoteborgCTrains";
import { recordDriverHeartbeatClient } from "@/lib/driver-activity-client";
import { goteborgCUserTileLine } from "@/lib/goteborg-c-trains";
import { cn } from "@/lib/utils";

interface GoteborgCTrainsCardProps {
  className?: string;
}

/** Live Göteborg C departures summary for the Radar screen. */
export function GoteborgCTrainsCard({ className }: GoteborgCTrainsCardProps) {
  const { snapshot, loading } = useGoteborgCTrains();
  const [open, setOpen] = useState(false);

  const tileLine = snapshot
    ? goteborgCUserTileLine(snapshot)
    : "🚆 Göteborg C / SJ";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void recordDriverHeartbeatClient("goteborg_c_trains");
          setOpen(true);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-left transition hover:border-accent/40 active:scale-[0.99]",
          className
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">
            {loading && !snapshot ? "🚆 Göteborg C / SJ" : tileLine}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {loading && !snapshot
              ? "Hämtar tågläge…"
              : snapshot?.available
                ? "Nästa avgångar från Centralstationen"
                : "Tåginfo kunde inte hämtas"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        titleId="goteborg-c-trains-title"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2
              id="goteborg-c-trains-title"
              className="text-lg font-bold text-foreground"
            >
              Göteborg C
            </h2>
            <p className="mt-1 text-sm text-muted">
              {snapshot?.available
                ? snapshot.summaryLine
                : "Tåginfo ej tillgänglig just nu"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-2 text-muted hover:bg-background"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <GoteborgCDepartureList
          departures={snapshot?.departures ?? []}
          variant="user"
          emptyLabel={
            snapshot?.available
              ? "Inga kommande avgångar att visa."
              : "🚆 Göteborg C ej tillgänglig"
          }
        />
      </ModalShell>
    </>
  );
}
