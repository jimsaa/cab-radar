"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import {
  formatLocationLine,
  useAutoLocation,
} from "@/hooks/useAutoLocation";
import type { AlertType } from "@/lib/alert-types";
import type { ReportButtonId } from "@/lib/report-alert-mapping";
import type { CreateAlertInput } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export interface OptionalCommentReportConfig {
  reportId: ReportButtonId;
  alertType: AlertType;
  title: string;
  placeholder: string;
  examples: readonly string[];
}

export const TAXI_CONTROL_COMMENT_CONFIG: OptionalCommentReportConfig = {
  reportId: "taxikontroll",
  alertType: "traffic_control",
  title: "Taxikontroll",
  placeholder: "Polis + Transportstyrelsen · Utanför Landvetter · Flera patruller",
  examples: [
    "Polis + Transportstyrelsen",
    "Utanför Landvetter",
    "Flera patruller",
  ],
};

export const NEED_CARS_COMMENT_CONFIG: OptionalCommentReportConfig = {
  reportId: "need_cars",
  alertType: "need_cars",
  title: "Bilar behövs",
  placeholder: "Ex: Stor konsert slutade precis, många kunder väntar.",
  examples: [
    "Stor konsert slutade precis",
    "Många kunder väntar vid terminalen",
    "Event på Scandinavium",
  ],
};

interface OptionalCommentReportModalProps {
  open: boolean;
  config: OptionalCommentReportConfig;
  onClose: () => void;
  onSubmit: (data: CreateAlertInput) => Promise<void>;
  variant?: "tesla" | "app";
}

export function OptionalCommentReportModal({
  open,
  config,
  onClose,
  onSubmit,
  variant = "tesla",
}: OptionalCommentReportModalProps) {
  const isTesla = variant === "tesla";
  const location = useAutoLocation(open);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setComment("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

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

  async function handleSend() {
    if (!canSend) return;

    setError(null);
    setSubmitting(true);

    try {
      await onSubmit({
        type: config.alertType,
        title: config.title,
        description: comment.trim(),
        latitude: location.latitude!,
        longitude: location.longitude!,
        road_address: location.roadAddress,
        city: location.city,
        is_major: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skicka rapport.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "relative w-full max-w-lg overflow-y-auto rounded-[20px] border p-6 shadow-2xl",
          isTesla
            ? "border-[#3A4048] bg-[#1B1E22]"
            : "border-card-border bg-background"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optional-comment-report-title"
      >
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute right-4 top-4 rounded-full p-2 transition-colors",
            isTesla
              ? "text-[#8A9099] hover:bg-[#262B31] hover:text-white"
              : "text-muted hover:bg-card"
          )}
          aria-label="Stäng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <ReportTypeIcon
            reportId={config.reportId}
            variant={isTesla ? "tesla" : "badge"}
            className={
              config.reportId === "need_cars" ? "text-emerald-400" : "text-white"
            }
          />
          <div>
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                isTesla ? "text-[#8A9099]" : "text-muted"
              )}
            >
              Rapport
            </p>
            <h2
              id="optional-comment-report-title"
              className={cn(
                "text-2xl font-bold",
                isTesla ? "text-white" : "text-foreground"
              )}
            >
              {config.title}
            </h2>
          </div>
        </div>

        <div
          className={cn(
            "mt-5 rounded-[14px] border px-4 py-4",
            isTesla
              ? "border-[#3A4048] bg-[#262B31]"
              : "border-card-border bg-card/60"
          )}
        >
          <p
            className={cn(
              "text-sm",
              isTesla ? "text-[#B0B6BE]" : "text-foreground/90"
            )}
          >
            📍 {locationLine ?? "Hämtar plats…"}
          </p>
          {!location.ready && !location.error && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-xs",
                isTesla ? "text-[#8A9099]" : "text-muted"
              )}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              GPS hämtas automatiskt…
            </p>
          )}
        </div>

        <label className="mt-5 flex flex-col gap-2">
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-widest",
              isTesla ? "text-[#8A9099]" : "text-muted"
            )}
          >
            Kommentar (valfritt)
          </span>
          <textarea
            className={cn(
              "min-h-[100px] resize-none rounded-[14px] border px-4 py-3 text-base leading-relaxed focus:outline-none focus:ring-2",
              isTesla
                ? "border-[#3A4048] bg-[#262B31] text-white placeholder:text-[#6B7280] focus:ring-[#42A5F5]/40"
                : "field"
            )}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={config.placeholder}
            rows={3}
          />
          <ul
            className={cn(
              "space-y-1 text-xs",
              isTesla ? "text-[#6B7280]" : "text-muted"
            )}
          >
            {config.examples.map((example) => (
              <li key={example}>• {example}</li>
            ))}
          </ul>
        </label>

        {(error || location.error) && (
          <p
            className={cn(
              "mt-4 rounded-[12px] px-3 py-2 text-sm",
              isTesla
                ? "bg-[#FF3B30]/15 text-[#FF6B6B]"
                : "bg-danger/10 text-danger"
            )}
          >
            {error ?? location.error}
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={cn(
              "flex w-full min-h-[56px] items-center justify-center gap-2 rounded-[14px] px-5 text-lg font-bold transition active:scale-[0.98] disabled:opacity-45",
              isTesla
                ? config.reportId === "need_cars"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                : "btn-primary"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Skickar…
              </>
            ) : (
              "Skicka rapport"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "w-full min-h-[48px] rounded-[14px] border px-5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-45",
              isTesla
                ? "border-[#3A4048] bg-[#262B31] text-[#B0B6BE] hover:bg-[#2a3038] hover:text-white"
                : "btn-secondary"
            )}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer OptionalCommentReportModal with TAXI_CONTROL_COMMENT_CONFIG */
export function TaxiControlReportModal(
  props: Omit<OptionalCommentReportModalProps, "config">
) {
  return (
    <OptionalCommentReportModal {...props} config={TAXI_CONTROL_COMMENT_CONFIG} />
  );
}
