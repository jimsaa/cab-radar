import type { SupabaseClient } from "@supabase/supabase-js";

/** Positions older than this are hidden from the admin network map. */
export const NETWORK_POSITION_FRESH_MS = 15 * 60 * 1000;

/** Activity older than this is eligible for cleanup in driver_activity_points. */
export const ACTIVITY_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Admin map polling interval — lightweight, not live tracking. */
export const NETWORK_MAP_REFRESH_MS = 5 * 60 * 1000;

/** Minimum gap between browser-initiated activity recordings. */
export const ACTIVITY_RECORD_COOLDOWN_MS = 15 * 60 * 1000;

export interface AnonymizedActivityPoint {
  latitude: number;
  longitude: number;
}

export interface ActiveDriverNetworkData {
  /** Verified non-admin drivers with last_known_at within 15 minutes. */
  activeDriverCount: number;
  /** Subset with valid coordinates to plot on the map. */
  positionCount: number;
  points: AnonymizedActivityPoint[];
  activeDriverIds: string[];
  positionedDriverIds: string[];
  /** Latest activity among currently active drivers (empty → null). */
  lastActiveDriverActivityAt: string | null;
  /** Latest activity from any verified non-admin driver. */
  lastNetworkActivityAt: string | null;
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

export function networkPositionSince(): string {
  return new Date(Date.now() - NETWORK_POSITION_FRESH_MS).toISOString();
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

function maxIsoTimestamp(
  ...values: (string | null | undefined)[]
): string | null {
  let max: string | null = null;
  for (const value of values) {
    if (!value) continue;
    const ms = new Date(value).getTime();
    if (!Number.isFinite(ms)) continue;
    if (!max || ms > new Date(max).getTime()) max = value;
  }
  return max;
}

/** Latest heartbeat from verified drivers — profiles, activity points, and reports. */
export async function fetchLatestVerifiedDriverActivityAt(
  supabase: SupabaseClient,
  options?: { restrictToUserIds?: string[] }
): Promise<string | null> {
  const restrictIds = options?.restrictToUserIds?.filter(Boolean);
  const hasRestrict = Boolean(restrictIds?.length);

  let profileQuery = supabase
    .from("profiles")
    .select("last_known_at")
    .eq("verification_status", "verified")
    .eq("is_admin", false)
    .not("last_known_at", "is", null)
    .order("last_known_at", { ascending: false })
    .limit(1);

  if (hasRestrict) {
    profileQuery = profileQuery.in("id", restrictIds!);
  }

  let pointsQuery = supabase
    .from("driver_activity_points")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1);

  if (hasRestrict) {
    pointsQuery = pointsQuery.in("user_id", restrictIds!);
  }

  const [profileRes, pointsRes, alertRes] = await Promise.all([
    profileQuery.maybeSingle(),
    pointsQuery.maybeSingle(),
    hasRestrict
      ? supabase
          .from("driver_alerts")
          .select("created_at")
          .in("user_id", restrictIds!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : supabase
          .from("driver_alerts")
          .select("created_at, profiles!inner(verification_status, is_admin)")
          .eq("profiles.verification_status", "verified")
          .eq("profiles.is_admin", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (pointsRes.error) throw pointsRes.error;
  if (alertRes.error) throw alertRes.error;

  return maxIsoTimestamp(
    profileRes.data?.last_known_at as string | null | undefined,
    pointsRes.data?.recorded_at as string | null | undefined,
    alertRes.data?.created_at as string | null | undefined
  );
}

/** Shared source for active-driver counter and admin network map. */
export async function fetchActiveDriverNetwork(
  supabase: SupabaseClient
): Promise<ActiveDriverNetworkData> {
  const since = networkPositionSince();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, last_known_latitude, last_known_longitude, last_known_at")
    .eq("verification_status", "verified")
    .eq("is_admin", false)
    .gte("last_known_at", since)
    .limit(500);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const activeDriverIds = rows.map((row) => row.id as string);
  const positionedRows = rows.filter(
    (row) =>
      row.last_known_latitude != null &&
      row.last_known_longitude != null &&
      isValidActivityCoordinate(
        row.last_known_latitude as number,
        row.last_known_longitude as number
      )
  );

  const points = positionedRows.map((row) => ({
    latitude: row.last_known_latitude as number,
    longitude: row.last_known_longitude as number,
  }));

  const positionedDriverIds = positionedRows.map((row) => row.id as string);

  const [lastNetworkActivityAt, lastActiveDriverActivityAt] = await Promise.all([
    fetchLatestVerifiedDriverActivityAt(supabase),
    activeDriverIds.length > 0
      ? fetchLatestVerifiedDriverActivityAt(supabase, {
          restrictToUserIds: activeDriverIds,
        })
      : Promise.resolve(null),
  ]);

  return {
    activeDriverCount: rows.length,
    positionCount: points.length,
    points,
    activeDriverIds,
    positionedDriverIds,
    lastActiveDriverActivityAt,
    lastNetworkActivityAt,
  };
}

/** One anonymized dot per recently active verified driver (no PII). */
export async function fetchAnonymizedActivityPoints(
  supabase: SupabaseClient
): Promise<AnonymizedActivityPoint[]> {
  const network = await fetchActiveDriverNetwork(supabase);
  return network.points;
}
