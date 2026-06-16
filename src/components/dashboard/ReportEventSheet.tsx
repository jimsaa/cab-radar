"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { EmergencyActivateConfirm } from "@/components/alerts/EmergencyActivateConfirm";
import { EmergencyDeactivateConfirm } from "@/components/alerts/EmergencyDeactivateConfirm";
import { QuickReportConfirm } from "@/components/alerts/QuickReportConfirm";
import { ReportEventGrid } from "@/components/dashboard/ReportEventGrid";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import {
  type DashboardReportType,
  reportAlertType,
} from "@/lib/dashboard-report-types";
import { isEmergencyReportButton } from "@/lib/report-alert-mapping";
import {
  adminReportSuccessToast,
  reportSuccessToast,
  submitDriverAlert,
} from "@/lib/submit-alert";
import {
  ADMIN_REPORT_SUBMIT_ERROR,
  useAdminToast,
} from "@/components/admin/AdminToast";
import type { CreateAlertInput, DriverAlert } from "@/lib/types/database";

interface ReportEventSheetProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (alert: DriverAlert) => void;
  onEmergencyClosed?: (alertId: string) => void;
  preset?: DashboardReportType | null;
  activeOwnEmergency?: DriverAlert | null;
  /** Tesla admin — uses admin-specific toast copy. */
  isAdmin?: boolean;
}

export function ReportEventSheet({
  userId,
  open,
  onClose,
  onCreated,
  onEmergencyClosed,
  preset,
  activeOwnEmergency,
  isAdmin = false,
}: ReportEventSheetProps) {
  const showToast = useAdminToast();
  const [step, setStep] = useState<"pick" | "confirm">(preset ? "confirm" : "pick");
  const [selected, setSelected] = useState<DashboardReportType | null>(
    preset ?? null
  );

  useEffect(() => {
    if (!open) return;

    if (preset) {
      setStep("confirm");
      setSelected(preset);
    } else {
      setStep("pick");
      setSelected(null);
    }
  }, [open, preset]);

  if (!open) return null;

  function handleClose() {
    setStep("pick");
    setSelected(null);
    onClose();
  }

  function pickReport(item: DashboardReportType) {
    setSelected(item);
    setStep("confirm");
  }

  function handleCancelConfirm() {
    if (preset) {
      handleClose();
      return;
    }
    setStep("pick");
    setSelected(null);
  }

  async function handleSubmit(data: CreateAlertInput) {
    try {
      const alert = await submitDriverAlert(userId, data);
      onCreated?.(alert);
      handleClose();

      if (isAdmin) {
        const message = adminReportSuccessToast(data.type, alert.is_test);
        showToast(message, {
          variant: data.type === "taxi_emergency" ? "emergency" : "success",
        });
        return;
      }

      const { message, variant } = reportSuccessToast(data.type, alert.is_test);
      showToast(message, { variant });
    } catch {
      showToast(ADMIN_REPORT_SUBMIT_ERROR, { variant: "error" });
      throw new Error("report submit failed");
    }
  }

  function handleEmergencyClosed() {
    if (activeOwnEmergency) {
      onEmergencyClosed?.(activeOwnEmergency.id);
    }
    handleClose();
  }

  const isEmergency = selected ? isEmergencyReportButton(selected.id) : false;
  const isDeactivating = isEmergency && Boolean(activeOwnEmergency);
  const alertType = selected ? reportAlertType(selected) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
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
            onClick={handleClose}
            className="rounded-full p-2 text-muted hover:bg-card"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "pick" && (
          <ReportEventGrid
            onSelect={pickReport}
            columns={2}
            emergencyActive={Boolean(activeOwnEmergency)}
          />
        )}

        {step === "confirm" && selected && isDeactivating && activeOwnEmergency && (
          <EmergencyDeactivateConfirm
            alertId={activeOwnEmergency.id}
            onClosed={handleEmergencyClosed}
            onCancel={handleCancelConfirm}
          />
        )}

        {step === "confirm" && selected && isEmergency && !isDeactivating && (
          <EmergencyActivateConfirm
            reportButtonId={selected.id}
            isAdmin={isAdmin}
            onSubmit={handleSubmit}
            onCancel={handleCancelConfirm}
          />
        )}

        {step === "confirm" && selected && alertType && !isEmergency && (
          <QuickReportConfirm
            reportButtonId={selected.id}
            alertType={alertType}
            displayLabel={selected.label}
            displayIcon={
              <ReportTypeIcon reportId={selected.id} variant="badge" />
            }
            isAdmin={isAdmin}
            onSubmit={handleSubmit}
            onCancel={handleCancelConfirm}
          />
        )}
      </div>
    </div>
  );
}
