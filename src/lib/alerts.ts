import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALERT_TYPES_NEEDING_ADMIN,
  ALERT_TYPES_NEEDING_GPS,
  PUSH_NOTIFICATION_TYPES,
  isCurrentAlertType,
  type AlertType,
} from "./constants";
import { PUBLIC_EMERGENCY_LABEL } from "./emergency-privacy";
import type { CreateAlertInput, DriverAlert } from "./types/database";
import {
  logAlertDatabaseResponse,
  logAlertPayload,
} from "./report-alert-mapping";

export function alertNeedsGps(type: AlertType): boolean {
  return ALERT_TYPES_NEEDING_GPS.includes(type);
}

export function alertNeedsAdmin(type: AlertType): boolean {
  return ALERT_TYPES_NEEDING_ADMIN.includes(type);
}

export function shouldPushNotify(alert: Pick<DriverAlert, "type" | "is_major" | "status" | "admin_verified">): boolean {
  if (alert.status !== "active" || !alert.admin_verified) return false;
  if (alert.type === "slow_traffic") return alert.is_major;
  if (isCurrentAlertType(alert.type)) {
    return PUSH_NOTIFICATION_TYPES.includes(alert.type);
  }
  return (
    alert.type === "total_stop_accident" || alert.type === "hazard_on_road"
  );
}

export async function fetchActiveAlerts(
  supabase: SupabaseClient
): Promise<DriverAlert[]> {
  // Expires standard alerts only — taxi_emergency excluded in SQL (see emergency-rules.ts)
  await supabase.rpc("expire_stale_alerts");

  const { data, error } = await supabase
    .from("driver_alerts")
    .select("*")
    .eq("status", "active")
    .eq("admin_verified", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as DriverAlert[];
}

export async function createAlert(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAlertInput
): Promise<DriverAlert> {
  const isEmergency = input.type === "taxi_emergency";
  const row = {
    type: input.type,
    title: isEmergency ? PUBLIC_EMERGENCY_LABEL : input.title,
    description: isEmergency ? "" : (input.description ?? ""),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    road_address: input.road_address ?? null,
    city: input.city ?? null,
    is_major: input.is_major ?? false,
    created_by: userId,
  };

  logAlertPayload(row);

  if (isEmergency) {
    console.log("[NÖD] Auth user:", userId);
    console.log("[NÖD] Payload:", row);
  }

  const { data, error } = await supabase
    .from("driver_alerts")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("[ALERT] Database error:", error);
    if (isEmergency) {
      console.error("[NÖD] Insert failed:", error);
    }
    throw error;
  }

  if (isEmergency) {
    console.log("[NÖD] user_id stored:", (data as DriverAlert).created_by);
  }

  logAlertDatabaseResponse(data as DriverAlert);
  return data as DriverAlert;
}

export async function voteOnAlert(
  supabase: SupabaseClient,
  userId: string,
  alertId: string,
  vote: 1 | -1
): Promise<void> {
  const { error } = await supabase.from("alert_votes").upsert(
    { alert_id: alertId, user_id: userId, vote },
    { onConflict: "alert_id,user_id" }
  );
  if (error) throw error;
}

export async function fetchPendingAlerts(
  supabase: SupabaseClient
): Promise<DriverAlert[]> {
  const { data, error } = await supabase
    .from("driver_alerts")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DriverAlert[];
}

export async function fetchAllActiveAlertsForAdmin(
  supabase: SupabaseClient
): Promise<DriverAlert[]> {
  await supabase.rpc("expire_stale_alerts");

  const { data, error } = await supabase
    .from("driver_alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as DriverAlert[];
}

/** Admin: immediately close any alert (including Taxi i nöd). */
export async function adminRemoveAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("driver_alerts")
    .update({
      status: "expired",
      expires_at: now,
      updated_at: now,
      validation_status: "resolved",
    })
    .eq("id", alertId);

  if (error) throw error;
}

export async function adminVerifyAlert(
  supabase: SupabaseClient,
  alertId: string,
  approved: boolean
): Promise<void> {
  const { error } = await supabase
    .from("driver_alerts")
    .update({
      status: approved ? "active" : "rejected",
      admin_verified: approved,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) throw error;
}
