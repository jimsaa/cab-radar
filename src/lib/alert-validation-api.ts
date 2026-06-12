import type { SupabaseClient } from "@supabase/supabase-js";
import type { DriverAlert } from "@/lib/types/database";
import type { ValidationResponse } from "./alert-validation";

export async function fetchUserValidatedAlertIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("alert_validations")
    .select("alert_id")
    .eq("user_id", userId);

  if (error) {
    console.error("[VALIDATION] fetch failed", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.alert_id as string));
}

export async function submitAlertValidation(
  alertId: string,
  response: ValidationResponse
): Promise<{ ok: boolean; error?: string; alert?: DriverAlert }> {
  const res = await fetch("/api/alerts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, response }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Kunde inte skicka svar." };
  }
  return { ok: true, alert: data.alert as DriverAlert | undefined };
}
