"use client";



import { useEffect, useState } from "react";

import { Loader2, Shield } from "lucide-react";

import { ReportEventSheet } from "@/components/dashboard/ReportEventSheet";

import { useAppToast } from "@/components/ui/AppToast";

import {

  DASHBOARD_REPORT_TYPES,

  type DashboardReportType,

  reportAlertType,

} from "@/lib/dashboard-report-types";

import { QueueTrafficIcon } from "@/components/icons/QueueTrafficIcon";

import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";

import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";

import { geolocationErrorMessage } from "@/lib/geolocation-errors";

import { logAlertButtonPressed } from "@/lib/report-alert-mapping";

import { isEmergencyReportButton } from "@/lib/report-alert-mapping";

import {

  reportSuccessToast,

  submitDriverAlert,

} from "@/lib/submit-alert";

import { createClient } from "@/lib/supabase/client";

import { cn } from "@/lib/utils";



/** Shared Tesla quick-report card — equal visual weight for all types. */

const TESLA_REPORT_BUTTON_CLASS =

  "flex min-h-[72px] w-full items-center gap-4 rounded-[16px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-left text-base font-bold text-white transition hover:border-[#4A5159] hover:bg-[#2a3038] active:scale-[0.98] disabled:opacity-40";



/** Tesla-friendly display icons (operational reports only — nod uses Shield icon). */

const TESLA_ICONS: Record<string, string> = {

  taxikontroll: "🚕",

  stopp: "⛔",

  olycka: "🚑",

};



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

  const [submittingId, setSubmittingId] = useState<string | null>(null);



  const isDriving = mode === "driving";



  useEffect(() => {

    void createClient()

      .auth.getUser()

      .then(({ data }) => setUserId(data.user?.id ?? null));

  }, []);



  function openReport(item: DashboardReportType) {

    logAlertButtonPressed(item.id);

    setPreset(item);

    setSheetOpen(true);

  }



  async function submitInstant(item: DashboardReportType) {

    if (!userId || submittingId) return;



    setSubmittingId(item.id);

    try {

      const pos = await getCurrentPosition();

      const geo = await reverseGeocode(pos.latitude, pos.longitude);

      const alertType = reportAlertType(item);



      const alert = await submitDriverAlert(userId, {

        type: alertType,

        title: item.label,

        description: "",

        latitude: pos.latitude,

        longitude: pos.longitude,

        road_address: geo.road_address,

        city: geo.city,

        is_major: false,

      });



      onReported?.();

      const { message, variant } = reportSuccessToast(alertType, alert.is_test);

      showToast(message, { variant });

    } catch (err) {

      showToast(geolocationErrorMessage(err), { variant: "error" });

    } finally {

      setSubmittingId(null);

    }

  }



  function handleReportClick(item: DashboardReportType) {

    if (!userId) return;



    if (isDriving) {

      if (isEmergencyReportButton(item.id)) {

        openReport(item);

        return;

      }

      void submitInstant(item);

      return;

    }



    openReport(item);

  }



  return (

    <>

      <div className="flex min-h-0 flex-col gap-2">

        {DASHBOARD_REPORT_TYPES.map((item) => {

          const isSubmitting = submittingId === item.id;



          return (

            <button

              key={item.id}

              type="button"

              disabled={!userId || Boolean(submittingId)}

              onClick={() => handleReportClick(item)}

              className={cn(TESLA_REPORT_BUTTON_CLASS, isSubmitting && "opacity-70")}

            >

              {isSubmitting ? (

                <Loader2

                  className="h-8 w-8 shrink-0 animate-spin text-white/75"

                  aria-hidden

                />

              ) : item.id === "nod" ? (

                <Shield

                  className="h-5 w-5 shrink-0 text-white/75"

                  strokeWidth={1.5}

                  aria-hidden

                />

              ) : item.id === "ko" ? (

                <QueueTrafficIcon className="h-9 w-10" />

              ) : item.id === "laser" ? (

                <ReportTypeIcon reportId="laser" variant="tesla" />

              ) : (

                <span className="text-3xl leading-none" aria-hidden>

                  {TESLA_ICONS[item.id] ?? item.icon}

                </span>

              )}

              <span>{item.id === "nod" ? "Taxi i nöd" : item.label}</span>

            </button>

          );

        })}

      </div>



      {userId && (

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

      )}

    </>

  );

}

