"use client";

import { useEffect, useState } from "react";
import {
  NEED_CARS_COMMENT_CONFIG,
  OptionalCommentReportModal,
  TAXI_CONTROL_COMMENT_CONFIG,
  type OptionalCommentReportConfig,
} from "@/components/alerts/OptionalCommentReportModal";
import { CollapsibleReportCategoryMenu } from "@/components/admin/CollapsibleReportCategoryMenu";
import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";
import { useAppToast } from "@/components/ui/AppToast";
import {
  type DashboardReportType,
  reportAlertType,
} from "@/lib/dashboard-report-types";
import {
  isEmergencyReportButton,
  isOptionalCommentReportButton,
} from "@/lib/report-alert-mapping";
import {
  reportSubmitErrorMessage,
  reportSuccessToast,
  submitDriverAlert,
  submitInstantDriverReport,
} from "@/lib/submit-alert";
import { createClient } from "@/lib/supabase/client";
import type { CreateAlertInput } from "@/lib/types/database";

interface TeslaQuickReportPanelProps {
  onReported?: () => void;
  /** Admin command center vs Tesla View driving mode. */
  mode?: "admin" | "driving";
}

export function TeslaQuickReportPanel({
  onReported,
  mode = "admin",
}: TeslaQuickReportPanelProps) {
  const showToast = useAppToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardReportType | null>(null);
  const [commentConfig, setCommentConfig] =
    useState<OptionalCommentReportConfig | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const isDriving = mode === "driving";

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function openEmergencyReport(item: DashboardReportType) {
    setPreset(item);
    setSheetOpen(true);
  }

  async function submitInstant(item: DashboardReportType) {
    if (!userId || submittingId) return;

    setSubmittingId(item.id);
    try {
      const alert = await submitInstantDriverReport(userId, item);
      onReported?.();
      const { message, variant } = reportSuccessToast(
        reportAlertType(item),
        alert.is_test
      );
      showToast(message, { variant });
    } catch (err) {
      showToast(reportSubmitErrorMessage(err), { variant: "error" });
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleCommentSubmit(data: CreateAlertInput) {
    if (!userId || !commentConfig) return;

    const alert = await submitDriverAlert(userId, data);
    onReported?.();
    setCommentConfig(null);
    const { message, variant } = reportSuccessToast(
      commentConfig.alertType,
      alert.is_test
    );
    showToast(message, { variant });
  }

  function handleReportClick(item: DashboardReportType) {
    if (!userId) return;

    if (isEmergencyReportButton(item.id)) {
      openEmergencyReport(item);
      return;
    }

    if (isOptionalCommentReportButton(item.id)) {
      setCommentConfig(
        item.id === "need_cars"
          ? NEED_CARS_COMMENT_CONFIG
          : TAXI_CONTROL_COMMENT_CONFIG
      );
      return;
    }

    void submitInstant(item);
  }

  return (
    <>
      <CollapsibleReportCategoryMenu
        userId={userId}
        submittingId={submittingId}
        onSelect={handleReportClick}
      />

      {userId && (
        <>
          {commentConfig && (
            <OptionalCommentReportModal
              open
              config={commentConfig}
              variant="tesla"
              onClose={() => setCommentConfig(null)}
              onSubmit={handleCommentSubmit}
            />
          )}

          <ReportEventSheet
            userId={userId}
            open={sheetOpen}
            preset={preset}
            isAdmin={!isDriving}
            onClose={() => {
              setSheetOpen(false);
              setPreset(null);
            }}
            onCreated={() => {
              onReported?.();
              setSheetOpen(false);
              setPreset(null);
            }}
          />
        </>
      )}
    </>
  );
}
