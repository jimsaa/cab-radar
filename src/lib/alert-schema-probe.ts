import type { SupabaseClient } from "@supabase/supabase-js";
import { ALERT_TYPES, type AlertType } from "@/lib/alert-types";

/** Returns alert types missing from the Postgres alert_type enum (PostgREST). */
export async function probeMissingAlertTypes(
  service: SupabaseClient
): Promise<AlertType[]> {
  const missing: AlertType[] = [];

  for (const type of ALERT_TYPES) {
    const { error } = await service
      .from("driver_alerts")
      .select("id")
      .eq("type", type)
      .limit(0);

    if (error?.code === "22P02") {
      missing.push(type);
    }
  }

  return missing;
}
