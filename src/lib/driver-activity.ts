import type { SupabaseClient } from "@supabase/supabase-js";

/** Positions older than this are hidden from the admin network map. */
export const NETWORK_POSITION_FRESH_MS = 30 * 60 * 1000;

/** Verified drivers with activity within this window count as active. */
export const ACTIVE_DRIVER_WINDOW_MS = NETWORK_POSITION_FRESH_MS;

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
  /** Verified non-admin drivers with activity within 30 minutes. */
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
  return new Date(Date.now() - ACTIVE_DRIVER_WINDOW_MS).toISOString();
}

function activeDriverSince(): string {
  return networkPositionSince();
}

/** Lightweight presence ping — no GPS required (app open, page change, etc.). */
export async function recordDriverHeartbeat(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      last_known_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  if (error) throw error;
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
    .select("last_known_at, updated_at")
    .eq("verification_status", "verified")
    .eq("is_admin", false)
    .order("last_known_at", { ascending: false })
    .limit(1);

  if (hasRestrict) {
    profileQuery = profileQuery.in("id", restrictIds!);
  } else {
    profileQuery = profileQuery.not("last_known_at", "is", null);
  }

  const profileRes = await profileQuery.maybeSingle();
  if (profileRes.error) throw profileRes.error;

  let updatedQuery = supabase
    .from("profiles")
    .select("updated_at")
    .eq("verification_status", "verified")
    .eq("is_admin", false)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (hasRestrict) {
    updatedQuery = updatedQuery.in("id", restrictIds!);
  }

  let pointsQuery = supabase
    .from("driver_activity_points")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1);

  if (hasRestrict) {
    pointsQuery = pointsQuery.in("user_id", restrictIds!);
  }

  const [pointsRes, alertRes, updatedRes] = await Promise.all([
    pointsQuery.maybeSingle(),
    hasRestrict
      ? supabase
          .from("driver_alerts")
          .select("created_at")
          .in("created_by", restrictIds!)
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
    updatedQuery.maybeSingle(),
  ]);

  if (pointsRes.error) throw pointsRes.error;
  if (alertRes.error) throw alertRes.error;
  if (updatedRes.error) throw updatedRes.error;

  return maxIsoTimestamp(
    profileRes.data?.last_known_at as string | null | undefined,
    profileRes.data?.updated_at as string | null | undefined,
    updatedRes.data?.updated_at as string | null | undefined,
    pointsRes.data?.recorded_at as string | null | undefined,
    alertRes.data?.created_at as string | null | undefined
  );
}

async function fetchVerifiedProfileIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Set<string>> {
  const verified = new Set<string>();
  if (userIds.length === 0) return verified;

  const chunkSize = 100;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .in("id", chunk)
      .eq("verification_status", "verified")
      .eq("is_admin", false);

    if (error) throw error;
    for (const row of data ?? []) {
      verified.add(row.id as string);
    }
  }

  return verified;
}

async function fetchRecentlyActiveDriverIds(
  supabase: SupabaseClient,
  since: string
): Promise<Set<string>> {
  const ids = new Set<string>();

  const [byPresence, byUpdated, pointRows, alertRows] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("verification_status", "verified")
      .eq("is_admin", false)
      .gte("last_known_at", since),
    supabase
      .from("profiles")
      .select("id")
      .eq("verification_status", "verified")
      .eq("is_admin", false)
      .gte("updated_at", since),
    supabase.from("driver_activity_points").select("user_id").gte("recorded_at", since),
    supabase
      .from("driver_alerts")
      .select("created_by")
      .gte("created_at", since)
      .not("created_by", "is", null),
  ]);

  if (byPresence.error) throw byPresence.error;
  if (byUpdated.error) throw byUpdated.error;
  if (pointRows.error) throw pointRows.error;
  if (alertRows.error) throw alertRows.error;

  for (const row of byPresence.data ?? []) ids.add(row.id as string);
  for (const row of byUpdated.data ?? []) ids.add(row.id as string);

  const pointUserIds = [
    ...new Set((pointRows.data ?? []).map((row) => row.user_id as string)),
  ];
  const alertUserIds = [
    ...new Set(
      (alertRows.data ?? [])
        .map((row) => row.created_by as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [verifiedFromPoints, verifiedFromAlerts] = await Promise.all([
    fetchVerifiedProfileIds(supabase, pointUserIds),
    fetchVerifiedProfileIds(supabase, alertUserIds),
  ]);

  for (const id of verifiedFromPoints) ids.add(id);
  for (const id of verifiedFromAlerts) ids.add(id);

  return ids;
}

/** Shared source for active-driver counter and admin network map. */
export async function fetchActiveDriverNetwork(
  supabase: SupabaseClient
): Promise<ActiveDriverNetworkData> {
  const since = activeDriverSince();

  const activeIdSet = await fetchRecentlyActiveDriverIds(supabase, since);
  const activeDriverIds = [...activeIdSet];

  if (activeDriverIds.length === 0) {
    const lastNetworkActivityAt =
      await fetchLatestVerifiedDriverActivityAt(supabase);
    return {
      activeDriverCount: 0,
      positionCount: 0,
      points: [],
      activeDriverIds: [],
      positionedDriverIds: [],
      lastActiveDriverActivityAt: null,
      lastNetworkActivityAt,
    };
  }

  const [profileRes, pointRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, last_known_latitude, last_known_longitude, last_known_at")
      .in("id", activeDriverIds),
    supabase
      .from("driver_activity_points")
      .select("user_id, latitude, longitude, recorded_at")
      .in("user_id", activeDriverIds)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (pointRes.error) throw pointRes.error;

  const latestPointByUser = new Map<
    string,
    { latitude: number; longitude: number }
  >();
  for (const row of pointRes.data ?? []) {
    const userId = row.user_id as string;
    if (latestPointByUser.has(userId)) continue;
    const latitude = row.latitude as number;
    const longitude = row.longitude as number;
    if (!isValidActivityCoordinate(latitude, longitude)) continue;
    latestPointByUser.set(userId, { latitude, longitude });
  }

  const points: AnonymizedActivityPoint[] = [];
  const positionedDriverIds: string[] = [];

  for (const row of profileRes.data ?? []) {
    const userId = row.id as string;
    const profileLat = row.last_known_latitude as number | null;
    const profileLng = row.last_known_longitude as number | null;
    const lastKnownAt = row.last_known_at as string | null;
    const profileFresh =
      lastKnownAt != null && lastKnownAt >= since &&
      profileLat != null &&
      profileLng != null &&
      isValidActivityCoordinate(profileLat, profileLng);

    if (profileFresh) {
      points.push({ latitude: profileLat, longitude: profileLng });
      positionedDriverIds.push(userId);
      continue;
    }

    const fallback = latestPointByUser.get(userId);
    if (fallback) {
      points.push(fallback);
      positionedDriverIds.push(userId);
    }
  }

  const [lastNetworkActivityAt, lastActiveDriverActivityAt] = await Promise.all([
    fetchLatestVerifiedDriverActivityAt(supabase),
    fetchLatestVerifiedDriverActivityAt(supabase, {
      restrictToUserIds: activeDriverIds,
    }),
  ]);

  return {
    activeDriverCount: activeDriverIds.length,
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
