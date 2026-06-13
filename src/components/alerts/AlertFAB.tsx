"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { EmergencyActivateConfirm } from "./EmergencyActivateConfirm";
import { AlertQuickButtons } from "./AlertQuickButtons";
import { QuickReportConfirm } from "./QuickReportConfirm";
import { useAppToast } from "@/components/ui/AppToast";
import {
  ALERT_TYPE_ICONS,
  ALERT_TYPE_LABELS,
  type AlertType,
} from "@/lib/constants";
import {
  logAlertButtonPressed,
  reportButtonIdForAlertType,
} from "@/lib/report-alert-mapping";
import {
  extendSuccessToast,
  reportSuccessToast,
  submitDriverAlert,
} from "@/lib/submit-alert";
import type { CreateAlertInput, DriverAlert } from "@/lib/types/database";

interface AlertFABProps {
  userId: string;
  enabled: boolean;
  onCreated?: (alert: DriverAlert) => void;
}

export function AlertFAB({ userId, enabled, onCreated }: AlertFABProps) {
  const showToast = useAppToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [selectedType, setSelectedType] = useState<AlertType | null>(null);

  if (!enabled) return null;

  function close() {
    setOpen(false);
    setStep("pick");
    setSelectedType(null);
  }

  function pickType(type: AlertType) {
    const buttonId = reportButtonIdForAlertType(type);
    if (buttonId) {
      logAlertButtonPressed(buttonId);
    } else {
      console.log("[ALERT] Button pressed:", type);
      console.log("[ALERT] Selected type:", type);
    }
    setSelectedType(type);
    setStep("confirm");
  }

  async function handleExtended(alert: DriverAlert) {
    onCreated?.(alert);
    close();
    showToast(extendSuccessToast());
  }

  async function handleSubmit(data: CreateAlertInput) {
    const alert = await submitDriverAlert(userId, data);
    onCreated?.(alert);
    close();

    const { message, variant } = reportSuccessToast(data.type, alert.is_test);
    showToast(message, { variant });
  }

  const isEmergency = selectedType === "taxi_emergency";
  const reportButtonId = selectedType
    ? reportButtonIdForAlertType(selectedType)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 transition-transform active:scale-95"
        aria-label="Ny varning"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={close}
          role="presentation"
        >
          <div
            className="relative max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-sm overflow-y-auto rounded-2xl border border-card-border bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-muted hover:bg-card"
                aria-label="Stäng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {step === "pick" && <AlertQuickButtons onSelect={pickType} />}

            {step === "confirm" && selectedType && isEmergency && reportButtonId && (
              <EmergencyActivateConfirm
                reportButtonId={reportButtonId}
                onSubmit={handleSubmit}
                onCancel={() => setStep("pick")}
              />
            )}

            {step === "confirm" && selectedType && !isEmergency && reportButtonId && (
              <QuickReportConfirm
                reportButtonId={reportButtonId}
                alertType={selectedType}
                displayLabel={ALERT_TYPE_LABELS[selectedType]}
                displayIcon={ALERT_TYPE_ICONS[selectedType]}
                onSubmit={handleSubmit}
                onExtended={handleExtended}
                onCancel={() => setStep("pick")}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
