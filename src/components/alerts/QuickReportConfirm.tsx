"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  formatLocationLine,
  useAutoLocation,
} from "@/hooks/useAutoLocation";
import type { AlertType } from "@/lib/constants";
import type { ReportButtonId } from "@/lib/report-alert-mapping";
import type { CreateAlertInput } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface QuickReportConfirmProps {
  reportButtonId: ReportButtonId;
  alertType: AlertType;
  displayLabel: string;
  displayIcon: string;
  onSubmit: (data: CreateAlertInput) => Promise<void>;
  onCancel: () => void;
  isAdmin?: boolean;
}

export function QuickReportConfirm({
  reportButtonId,
  alertType,
  displayLabel,
  displayIcon,
  onSubmit,
  onCancel,
  isAdmin = false,
}: QuickReportConfirmProps) {
  const location = useAutoLocation(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationLine = formatLocationLine(
    location.roadAddress,
    location.city,
    location.latitude,
    location.longitude
  );

  const canSend =
    location.ready &&
    location.latitude != null &&
    location.longitude != null &&
    !submitting;

  function buildPayload(): CreateAlertInput {
    return {
      type: alertType,
      title: displayLabel,
      description: comment.trim(),
      latitude: location.latitude!,
      longitude: location.longitude!,
      road_address: location.roadAddress,
      city: location.city,
      is_major: false,
    };
  }

  async function handleSend() {
    if (!canSend) return;

    const payload = buildPayload();
    setError(null);
    setSubmitting(true);

    try {
      console.log("[ALERT] Selected type:", alertType);
      await onSubmit(payload);
    } catch (err) {
      if (!isAdmin) {
        setError(err instanceof Error ? err.message : "Kunde inte skicka");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col" data-report-button={reportButtonId}>
      {!location.ready && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            disabled
            className="btn-primary flex-1 !min-h-[44px] opacity-45"
          >
            Skicka
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 !min-h-[44px]"
          >
            Avbryt
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-card-border bg-card/60 px-4 py-5 text-center">
        <p className="text-lg font-bold text-foreground">
          <span aria-hidden>{displayIcon}</span> {displayLabel}
        </p>

        <p className="mt-4 text-sm text-foreground/90">
          📍 {locationLine ?? "Hämtar plats…"}
        </p>

        {!location.ready && !location.error && (
          <p className="mt-2 text-xs text-muted animate-pulse">
            GPS hämtas automatiskt…
          </p>
        )}

        {location.loading && location.latitude != null && !location.ready && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Slår upp väg…
          </p>
        )}
      </div>

      {(error || location.error) && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {error ?? location.error}
        </p>
      )}

      {!commentOpen ? (
        <button
          type="button"
          onClick={() => setCommentOpen(true)}
          className="mt-4 self-start text-sm font-medium text-accent-bright hover:underline"
        >
          + Lägg till kommentar
        </button>
      ) : (
        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs text-muted">Kommentar (valfritt)</span>
          <textarea
            className="field min-h-[72px] resize-none text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder='T.ex. "2 bilar" eller "Kontroll båda riktningar"'
            rows={2}
            autoFocus
          />
        </label>
      )}

      {location.ready && (
        <>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={cn(
              "btn-primary mt-5 w-full !min-h-[56px] text-base font-bold",
              submitting && "opacity-80"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Skickar…
              </>
            ) : (
              "Skicka varning"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary mt-2 w-full !min-h-[44px]"
          >
            Avbryt
          </button>
        </>
      )}
    </div>
  );
}
