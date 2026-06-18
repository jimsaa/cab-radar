import { alertNeedsAdmin, shouldPushNotify } from "@/lib/alerts";
import { formatAlertCreateError } from "@/lib/alert-create-errors";
import { alertTypeHasDuplicateCheck } from "@/lib/alert-ttl";
import {
  type DashboardReportType,
  reportAlertType,
} from "@/lib/dashboard-report-types";
import { recordDriverActivityAt } from "@/lib/driver-activity-client";
import { geolocationErrorMessage } from "@/lib/geolocation-errors";
import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";
import {
  logAlertButtonPressed,
  type ReportButtonId,
} from "@/lib/report-alert-mapping";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { CreateAlertInput, DriverAlert } from "@/lib/types/database";

export function reportSubmitErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as GeolocationPositionError).code === "number"
  ) {
    const geoCode = (err as GeolocationPositionError).code;
    if (geoCode >= 1 && geoCode <= 3) {
      return geolocationErrorMessage(err);
    }
  }

  if (err instanceof Error && err.message.trim()) {
    const message = err.message.trim();
    if (message.startsWith("Kunde inte skicka rapport")) return message;
    if (
      message.includes("Kontroll av alla fordon") ||
      message.includes("migration-alert")
    ) {
      return message;
    }
    return `Kunde inte skicka rapport: ${message}`;
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "").trim();
    if (message) {
      return formatAlertCreateError(err, undefined);
    }
  }

  return "Kunde inte skicka rapport. Försök igen.";
}

export async function submitDriverAlert(

  userId: string,

  data: CreateAlertInput

): Promise<DriverAlert> {

  const isTestOverride = data.is_test;

  const res = await fetch("/api/alerts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, is_test: isTestOverride }),
  });

  const payload = (await res.json()) as {
    ok?: boolean;
    alert?: DriverAlert;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.alert) {
    throw new Error(
      payload.error ?? "Kunde inte skicka rapport. Försök igen."
    );
  }

  const alert = payload.alert;

  if (data.latitude != null && data.longitude != null) {
    void recordDriverActivityAt(
      data.latitude,
      data.longitude,
      `report:${data.type}`
    );
  }



  if (!alert.is_test) {

    const supabase = createClient();

    void syncMembershipProfile(supabase, userId).catch((err) => {

      console.warn("[STATS] contribution sync failed:", err);

    });

  }



  if (shouldPushNotify(alert)) {

    await fetch("/api/alerts/notify", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(alert),

    });

  }



  return alert;

}

/** One-click report from dashboard button — GPS + geocode + create. */
export async function submitInstantDriverReport(
  userId: string,
  item: Pick<DashboardReportType, "id" | "label">,
  options?: { description?: string }
): Promise<DriverAlert> {
  logAlertButtonPressed(item.id as ReportButtonId);

  const pos = await getCurrentPosition();
  const geo = await reverseGeocode(pos.latitude, pos.longitude);
  const alertType = reportAlertType(item as DashboardReportType);

  return submitDriverAlert(userId, {
    type: alertType,
    title: item.label,
    description: options?.description?.trim() ?? "",
    latitude: pos.latitude,
    longitude: pos.longitude,
    road_address: geo.road_address,
    city: geo.city,
    is_major: false,
  });
}



export async function checkNearbyActiveAlert(

  type: CreateAlertInput["type"],

  latitude: number,

  longitude: number

): Promise<DriverAlert | null> {

  if (!alertTypeHasDuplicateCheck(type)) return null;



  const res = await fetch("/api/alerts/nearby-active", {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({ type, latitude, longitude }),

  });



  if (!res.ok) return null;



  const data = (await res.json()) as { nearby?: DriverAlert | null };

  return data.nearby ?? null;

}



export async function extendNearbyAlert(alertId: string): Promise<DriverAlert> {

  const res = await fetch("/api/alerts/extend-ttl", {

    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify({ alertId }),

  });



  const data = (await res.json()) as { alert?: DriverAlert; error?: string };




  if (!res.ok) {

    throw new Error(data.error ?? "Kunde inte förlänga varningen.");

  }



  if (!data.alert) {

    throw new Error("Kunde inte förlänga varningen.");

  }



  return data.alert;

}



export function reportSuccessMessage(

  type: CreateAlertInput["type"],

  isTest?: boolean

): string | null {

  if (type === "taxi_emergency") return null;

  if (isTest) return "Testrapport skickad — inga riktiga varningar skickades.";

  return alertNeedsAdmin(type)

    ? "Skickat för granskning."

    : "Varningen är skickad!";

}

export type ReportToastVariant = "success" | "emergency";

export function reportSuccessToast(
  type: CreateAlertInput["type"],
  isTest?: boolean
): { message: string; variant: ReportToastVariant } {
  if (type === "taxi_emergency") {
    return { message: "🚨 Nödläge aktiverat", variant: "emergency" };
  }

  if (isTest) {
    return { message: "✓ Testrapport skickad", variant: "success" };
  }

  if (alertNeedsAdmin(type)) {
    return { message: "✓ Skickat för granskning", variant: "success" };
  }

  return { message: "✓ Rapport skickad", variant: "success" };
}

/** Non-blocking Tesla admin toast after a successful report. */
export function adminReportSuccessToast(
  type: CreateAlertInput["type"],
  isTest?: boolean
): string {
  if (isTest) return "✅ Testrapport skickad";

  switch (type) {
    case "traffic_control":
      return "✅ Taxikontroll rapporterad";
    case "laser":
      return "✅ Laser rapporterad";
    case "all_vehicle_check":
      return "✅ Kontroll av alla fordon rapporterad";
    case "slow_traffic":
      return "✅ Kö rapporterad";
    case "total_stop":
      return "✅ Stopp rapporterad";
    case "accident":
      return "✅ Olycka rapporterad";
    case "taxi_emergency":
      return "🚨 Nödläge aktiverat";
    default:
      return "✅ Rapport skickad";
  }
}

export function adminExtendSuccessToast(): string {
  return "✓ Händelsen bekräftad";
}

export function extendSuccessToast(): string {
  return "✓ Händelsen bekräftad";
}

export function extendSuccessMessage(): string {
  return "Tack! Händelsen är fortfarande aktiv.";
}


