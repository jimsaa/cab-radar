import { createAlert, alertNeedsAdmin, shouldPushNotify } from "@/lib/alerts";
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

  if (
    data.latitude != null &&
    data.longitude != null &&
    !isTest
  ) {
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


