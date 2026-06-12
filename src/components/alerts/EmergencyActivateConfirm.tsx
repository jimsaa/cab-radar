"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAutoLocation } from "@/hooks/useAutoLocation";
import { defaultAlertTitle } from "@/lib/constants";
import type { ReportButtonId } from "@/lib/report-alert-mapping";
import type { CreateAlertInput } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface EmergencyActivateConfirmProps {
  reportButtonId: ReportButtonId;
  onSubmit: (data: CreateAlertInput) => Promise<void>;
  onCancel: () => void;
}

export function EmergencyActivateConfirm({
  reportButtonId,
  onSubmit,
  onCancel,
}: EmergencyActivateConfirmProps) {
  const location = useAutoLocation(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue =
    location.ready &&
    location.latitude != null &&
    location.longitude != null &&
    !submitting;

  async function handleContinue() {
    if (!canContinue) return;

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        type: "taxi_emergency",
        title: defaultAlertTitle("taxi_emergency"),
        description: "",
        latitude: location.latitude,
        longitude: location.longitude,
        road_address: location.roadAddress,
        city: location.city,
        is_major: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte fortsätta");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col" data-report-button={reportButtonId}>
      <div className="px-1 py-2 text-center">
        <p className="text-sm font-normal text-foreground/80">Bekräfta</p>
        <p className="mt-2 text-xs text-muted/80">Vill du fortsätta?</p>
        {location.loading && !location.ready && !location.error && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted/50">
            <Loader2 className="h-3 w-3 animate-spin" />
            Väntar…
          </p>
        )}
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-muted">{error}</p>
      )}
      {location.error && (
        <p className="mt-2 text-center text-xs text-muted">{location.error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "flex flex-1 items-center justify-center rounded-xl border border-card-border/60 bg-transparent py-3 text-xs font-normal text-foreground/50 transition active:scale-[0.98] disabled:opacity-30",
            submitting && "opacity-40"
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Fortsätt"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex flex-1 items-center justify-center rounded-xl border border-card-border bg-card/40 py-3 text-xs font-normal text-muted transition active:scale-[0.98]"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}
