import { createAlert, alertNeedsAdmin, shouldPushNotify } from "@/lib/alerts";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { CreateAlertInput, DriverAlert } from "@/lib/types/database";

export async function submitDriverAlert(
  userId: string,
  data: CreateAlertInput
): Promise<DriverAlert> {
  const supabase = createClient();
  const alert = await createAlert(supabase, userId, data);

  void syncMembershipProfile(supabase, userId).catch((err) => {
    console.warn("[STATS] contribution sync failed:", err);
  });

  if (shouldPushNotify(alert)) {
    await fetch("/api/alerts/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });
  }

  return alert;
}

export function reportSuccessMessage(type: CreateAlertInput["type"]): string | null {
  if (type === "taxi_emergency") return null;
  return alertNeedsAdmin(type)
    ? "Skickat för granskning."
    : "Varningen är skickad!";
}
