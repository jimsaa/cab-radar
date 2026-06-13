import { createAlert, alertNeedsAdmin, shouldPushNotify } from "@/lib/alerts";
import { alertTypeHasDuplicateCheck } from "@/lib/alert-ttl";
import { recordDriverActivityAt } from "@/lib/driver-activity-client";

import { syncMembershipProfile } from "@/lib/profile";

import { createClient } from "@/lib/supabase/client";

import type { CreateAlertInput, DriverAlert } from "@/lib/types/database";



async function profileTestModeEnabled(userId: string): Promise<boolean> {

  const supabase = createClient();

  const { data } = await supabase

    .from("profiles")

    .select("test_mode_enabled")

    .eq("id", userId)

    .maybeSingle();

  return Boolean(data?.test_mode_enabled);

}



export async function submitDriverAlert(

  userId: string,

  data: CreateAlertInput

): Promise<DriverAlert> {

  const supabase = createClient();

  const isTest = data.is_test ?? (await profileTestModeEnabled(userId));

  const alert = await createAlert(supabase, userId, { ...data, is_test: isTest });

  if (data.latitude != null && data.longitude != null) {
    void recordDriverActivityAt(
      data.latitude,
      data.longitude,
      `report:${data.type}`
    );
  }



  if (!isTest) {

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
    case "slow_traffic":
      return "✅ Kö rapporterad";
    case "total_stop":
      return "✅ Stopp rapporterad";
    case "accident":
      return "✅ Olycka rapporterad";
    case "taxi_emergency":
      return "✅ Taxi i nöd aktiverad";
    default:
      return "✅ Rapport skickad";
  }
}

export function adminExtendSuccessToast(): string {
  return "✅ Händelsen bekräftad — fortsatt aktiv";
}

export function extendSuccessMessage(): string {
  return "Tack! Händelsen är fortfarande aktiv.";
}


