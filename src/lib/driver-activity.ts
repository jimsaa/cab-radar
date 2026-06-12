import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimum age before a point appears on the admin map (privacy delay). */
export const ACTIVITY_DISPLAY_DELAY_MS = 15 * 60 * 1000;

/** Activity older than this is hidden and eligible for cleanup. */
export const ACTIVITY_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Minimum gap between browser-initiated activity recordings. */
export const ACTIVITY_RECORD_COOLDOWN_MS = 15 * 60 * 1000;

export interface AnonymizedActivityPoint {
  latitude: number;
  longitude: number;
}

export function isValidActivityCoordinate(
  latitude: number,
  longitude: number
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function activityDisplayWindow(): {
  oldest: string;
  newest: string;
} {
  const now = Date.now();
  return {
    oldest: new Date(now - ACTIVITY_RETENTION_MS).toISOString(),
    newest: new Date(now - ACTIVITY_DISPLAY_DELAY_MS).toISOString(),
  };
}

/** Persist activity for admin map + emergency proximity push targeting. */
export async function recordDriverActivityPoint(
  supabase: SupabaseClient,
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  if (!isValidActivityCoordinate(latitude, longitude)) {
    throw new Error("Invalid activity coordinates");
  }

  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      last_known_latitude: latitude,
      last_known_longitude: longitude,
      last_known_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }

  const { error: pointError } = await supabase
    .from("driver_activity_points")
    .insert({
      user_id: userId,
      latitude,
      longitude,
      recorded_at: now,
    });

  if (pointError) {
    throw pointError;
  }

  const cutoff = new Date(Date.now() - ACTIVITY_RETENTION_MS).toISOString();
  void supabase
    .from("driver_activity_points")
    .delete()
    .lt("recorded_at", cutoff)
    .then(({ error }) => {
      if (error) {
        console.warn("[ACTIVITY] cleanup failed:", error.message);
      }
    });
}

export async function fetchAnonymizedActivityPoints(
  supabase: SupabaseClient
): Promise<AnonymizedActivityPoint[]> {
  const { oldest, newest } = activityDisplayWindow();

  const { data, error } = await supabase
    .from("driver_activity_points")
    .select("latitude, longitude")
    .gte("recorded_at", oldest)
    .lte("recorded_at", newest)
    .order("recorded_at", { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    latitude: row.latitude as number,
    longitude: row.longitude as number,
  }));
}
