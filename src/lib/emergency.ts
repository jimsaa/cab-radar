import type { SupabaseClient } from "@supabase/supabase-js";
import { googleMapsLink } from "./constants";
import { isMissingSchemaError } from "./db-errors";
import { distanceMeters } from "./geo";
import { fetchCurrentProfile } from "./profile";
import type { DriverAlert, Profile } from "./types/database";

export const EMERGENCY_MOVEMENT_THRESHOLD_M = 25;
export const EMERGENCY_MOVING_SPEED_MPS = 1;
export const EMERGENCY_STALE_GPS_MS = 10 * 60 * 1000;
export const EMERGENCY_RECENT_MOVEMENT_MS = 2 * 60 * 1000;

export interface EmergencyAlertWithDriver extends DriverAlert {
  driver: Pick<
    Profile,
    | "id"
    | "display_name"
    | "phone_number"
    | "cabradar_user_id"
    | "taxi_company_name"
    | "taxi_operator"
    | "taxi_number"
  > | null;
  /** Dev-only hint when driver profile could not be loaded */
  driver_load_debug?: string | null;
}

type EmergencyDriverProfile = NonNullable<EmergencyAlertWithDriver["driver"]>;

function nodLog(label: string, payload?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (payload !== undefined) {
      console.log(label, payload);
    } else {
      console.log(label);
    }
  }
}

function pickEmergencyDriverFields(profile: Profile): EmergencyDriverProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    phone_number: profile.phone_number,
    cabradar_user_id: profile.cabradar_user_id,
    taxi_company_name: profile.taxi_company_name,
    taxi_operator: profile.taxi_operator,
    taxi_number: profile.taxi_number,
  };
}

/** Display name with profile → CabRadar ID → auth metadata fallbacks. */
export function emergencyDriverName(
  alert: Pick<EmergencyAlertWithDriver, "created_by" | "driver">
): string {
  const driver = alert.driver;
  if (driver?.display_name?.trim()) {
    return driver.display_name.trim();
  }
  if (driver?.cabradar_user_id?.trim()) {
    return driver.cabradar_user_id.trim();
  }
  if (alert.created_by) {
    return `Förare (${alert.created_by.slice(0, 8)}…)`;
  }
  return "Okänd förare";
}

export function emergencyCabradarId(
  driver: EmergencyAlertWithDriver["driver"]
): string {
  return driver?.cabradar_user_id?.trim() || "Ej angivet";
}

export interface EmergencyGpsStatus {
  label: string;
  detail: string | null;
  tone: "moving" | "stationary" | "unknown";
}

export function formatSpeedKmh(speedMps: number | null | undefined): string | null {
  if (speedMps == null || Number.isNaN(speedMps) || speedMps < 0) return null;
  return `${Math.round(speedMps * 3.6)} km/h`;
}

export function formatTimeSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return null;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "mindre än 1 min sedan";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h sedan`;
}

export function formatEmergencyActivatedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** e.g. "Aktiverad för 8 minuter sedan" */
export function formatEmergencyActivatedAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Aktiverad just nu";
  if (minutes === 1) return "Aktiverad för 1 minut sedan";
  if (minutes < 60) return `Aktiverad för ${minutes} minuter sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Aktiverad för 1 timme sedan";
  return `Aktiverad för ${hours} timmar sedan`;
}

export function emergencyTaxiCompany(
  driver: EmergencyAlertWithDriver["driver"]
): string {
  return (
    driver?.taxi_company_name?.trim() ||
    driver?.taxi_operator?.trim() ||
    "Ej angivet"
  );
}

export function emergencyTaxiNumber(
  driver: EmergencyAlertWithDriver["driver"]
): string {
  return driver?.taxi_number?.trim() || "Ej angivet";
}

export function emergencyLocationLabel(alert: EmergencyAlertWithDriver): string {
  if (alert.road_address || alert.city) {
    return [alert.road_address, alert.city].filter(Boolean).join(", ");
  }
  const lat = alert.emergency_last_latitude ?? alert.latitude;
  const lng = alert.emergency_last_longitude ?? alert.longitude;
  if (lat != null && lng != null) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
  return "Plats saknas";
}

/** Short street label for list cards, e.g. "Hjällbovägen" */
export function emergencyLocationShort(alert: EmergencyAlertWithDriver): string {
  if (alert.road_address?.trim()) {
    return alert.road_address.trim();
  }
  if (alert.city?.trim()) {
    return alert.city.trim();
  }
  const lat = alert.emergency_last_latitude ?? alert.latitude;
  const lng = alert.emergency_last_longitude ?? alert.longitude;
  if (lat != null && lng != null) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return "Okänd plats";
}

export function emergencyMapsUrl(alert: EmergencyAlertWithDriver): string | null {
  const lat = alert.emergency_last_latitude ?? alert.latitude;
  const lng = alert.emergency_last_longitude ?? alert.longitude;
  if (lat == null || lng == null) return null;
  return googleMapsLink(lat, lng);
}

export function emergencyPhoneTel(
  driver: EmergencyAlertWithDriver["driver"]
): string | null {
  const raw = driver?.phone_number?.replace(/\s/g, "");
  return raw || null;
}

export function emergencyPhoneDisplay(
  driver: EmergencyAlertWithDriver["driver"]
): string {
  return driver?.phone_number?.trim() || "Ej angivet";
}

/** Strip phone from emergencies when viewer lacks permission (defense in depth). */
export function redactEmergencyPhoneNumbers(
  emergencies: EmergencyAlertWithDriver[],
  canViewPhone: boolean
): EmergencyAlertWithDriver[] {
  if (canViewPhone) return emergencies;
  return emergencies.map((alert) => ({
    ...alert,
    driver: alert.driver
      ? { ...alert.driver, phone_number: null }
      : alert.driver,
  }));
}

/** GPS movement status for admin display only — never closes the emergency. */
export function getEmergencyGpsStatus(
  alert: Pick<
    DriverAlert,
    | "emergency_last_gps_at"
    | "emergency_last_movement_at"
    | "emergency_last_speed_mps"
  >
): EmergencyGpsStatus {
  const now = Date.now();
  const lastGpsAt = alert.emergency_last_gps_at
    ? new Date(alert.emergency_last_gps_at).getTime()
    : null;
  const lastMovementAt = alert.emergency_last_movement_at
    ? new Date(alert.emergency_last_movement_at).getTime()
    : null;

  if (!lastGpsAt || now - lastGpsAt > EMERGENCY_STALE_GPS_MS) {
    return {
      label: "⚠ Ingen GPS",
      detail: alert.emergency_last_gps_at
        ? `Senaste signal: ${formatTimeSince(alert.emergency_last_gps_at)}`
        : "Ingen GPS-data mottagen",
      tone: "unknown",
    };
  }

  const speed = alert.emergency_last_speed_mps;
  const speedLabel = formatSpeedKmh(speed);
  const recentlyMoved =
    lastMovementAt != null && now - lastMovementAt <= EMERGENCY_RECENT_MOVEMENT_MS;
  const movingBySpeed = speed != null && speed >= EMERGENCY_MOVING_SPEED_MPS;

  if (movingBySpeed || recentlyMoved) {
    return {
      label: "✓ Rör sig",
      detail: speedLabel ? `Hastighet: ${speedLabel}` : null,
      tone: "moving",
    };
  }

  return {
    label: "⚠ Stillastående",
    detail: formatTimeSince(alert.emergency_last_movement_at)
      ? `Senaste rörelse: ${formatTimeSince(alert.emergency_last_movement_at)}`
      : null,
    tone: "stationary",
  };
}

export function hasEmergencyMoved(
  prevLat: number | null | undefined,
  prevLng: number | null | undefined,
  nextLat: number,
  nextLng: number
): boolean {
  if (prevLat == null || prevLng == null) return true;
  return (
    distanceMeters(prevLat, prevLng, nextLat, nextLng) >=
    EMERGENCY_MOVEMENT_THRESHOLD_M
  );
}

const EMERGENCY_DRIVER_COLUMNS =
  "id, display_name, phone_number, cabradar_user_id, taxi_company_name, taxi_operator, taxi_number";

const EMERGENCY_DRIVER_COLUMNS_MINIMAL =
  "id, display_name, phone_number, cabradar_user_id";

async function loadAuthUserFallback(
  supabase: SupabaseClient,
  userId: string
): Promise<Partial<EmergencyDriverProfile>> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      nodLog("[NÖD] Auth fallback failed:", { userId, error });
      return {};
    }

    const user = data.user;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof meta.display_name === "string" && meta.display_name.trim()) ||
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      user.email?.split("@")[0] ||
      null;

    nodLog("[NÖD] Auth fallback:", {
      userId,
      email: user.email,
      displayName,
    });

    return {
      id: userId,
      display_name: displayName,
      phone_number:
        (typeof meta.phone_number === "string" ? meta.phone_number : null) ||
        user.phone ||
        null,
    };
  } catch (err) {
    nodLog("[NÖD] Auth fallback error:", err);
    return {};
  }
}

async function loadEmergencyDriverProfile(
  supabase: SupabaseClient,
  userId: string,
  options: { useAuthFallback?: boolean } = {}
): Promise<{ driver: EmergencyDriverProfile | null; debug: string | null }> {
  const profile = await fetchCurrentProfile(supabase, userId);

  if (profile) {
    nodLog("[NÖD] Profile join result:", pickEmergencyDriverFields(profile));
    return { driver: pickEmergencyDriverFields(profile), debug: null };
  }

  if (options.useAuthFallback) {
    const authPartial = await loadAuthUserFallback(supabase, userId);
    if (authPartial.display_name || authPartial.phone_number) {
      return {
        driver: {
          id: userId,
          display_name: authPartial.display_name ?? null,
          phone_number: authPartial.phone_number ?? null,
          cabradar_user_id: null,
          taxi_company_name: null,
          taxi_operator: null,
          taxi_number: null,
        },
        debug: "Profil saknas — visar auth-metadata.",
      };
    }
  }

  const debug =
    process.env.NODE_ENV === "development"
      ? `Ingen profil för created_by=${userId}`
      : null;
  nodLog("[NÖD] Driver found: false", { userId, debug });
  return { driver: null, debug };
}

async function loadEmergencyDriverProfiles(
  supabase: SupabaseClient,
  userIds: string[],
  options: { useAuthFallback?: boolean } = {}
): Promise<Map<string, EmergencyDriverProfile>> {
  const map = new Map<string, EmergencyDriverProfile>();
  if (userIds.length === 0) return map;

  // Fast path: batch select when service role / full access
  let data: Record<string, unknown>[] | null = null;
  let error: { code?: string; message?: string } | null = null;

  const full = await supabase
    .from("profiles")
    .select(EMERGENCY_DRIVER_COLUMNS)
    .in("id", userIds);
  data = full.data as Record<string, unknown>[] | null;
  error = full.error;

  if (error && isMissingSchemaError(error)) {
    const fallback = await supabase
      .from("profiles")
      .select(EMERGENCY_DRIVER_COLUMNS_MINIMAL)
      .in("id", userIds);
    data = fallback.data as Record<string, unknown>[] | null;
    error = fallback.error;
  }

  if (error) {
    nodLog("[NÖD] Batch profile fetch failed:", error);
  } else {
    for (const row of data ?? []) {
      const profile = row as Record<string, unknown>;
      const id = profile.id as string;
      map.set(id, {
        id,
        display_name: (profile.display_name as string | null) ?? null,
        phone_number: (profile.phone_number as string | null) ?? null,
        cabradar_user_id: (profile.cabradar_user_id as string | null) ?? null,
        taxi_company_name: (profile.taxi_company_name as string | null) ?? null,
        taxi_operator: (profile.taxi_operator as string | null) ?? null,
        taxi_number: (profile.taxi_number as string | null) ?? null,
      });
    }
    nodLog("[NÖD] Batch profile join:", {
      requested: userIds.length,
      found: map.size,
    });
  }

  // Per-user fetch + auth fallback for any missing IDs
  for (const userId of userIds) {
    if (map.has(userId)) continue;

    const { driver } = await loadEmergencyDriverProfile(supabase, userId, options);
    if (driver) {
      map.set(userId, driver);
    }
  }

  return map;
}

async function attachDriversToEmergencies(
  supabase: SupabaseClient,
  alerts: DriverAlert[],
  options: { useAuthFallback?: boolean } = {}
): Promise<EmergencyAlertWithDriver[]> {
  const driverIds = [
    ...new Set(
      alerts.map((a) => a.created_by).filter((id): id is string => !!id)
    ),
  ];

  nodLog("[NÖD] Driver IDs from alerts:", driverIds);

  const driverMap = await loadEmergencyDriverProfiles(
    supabase,
    driverIds,
    options
  );

  return alerts.map((alert) => {
    nodLog("[NÖD] Emergency record:", {
      id: alert.id,
      created_by: alert.created_by,
    });

    if (!alert.created_by) {
      const debug =
        process.env.NODE_ENV === "development"
          ? "created_by saknas på nödlarmet"
          : null;
      return { ...alert, driver: null, driver_load_debug: debug };
    }

    const driver = driverMap.get(alert.created_by) ?? null;
    let driver_load_debug: string | null = null;

    if (!driver) {
      driver_load_debug =
        process.env.NODE_ENV === "development"
          ? `Profil saknas för ${alert.created_by}`
          : null;
    }

    nodLog("[NÖD] Driver found:", {
      alertId: alert.id,
      found: Boolean(driver),
      name: driver?.display_name,
    });

    return { ...alert, driver, driver_load_debug };
  });
}

/** Active Taxi i nöd — use service client on admin pages (bypasses profile RLS). */
export async function fetchActiveEmergenciesForAdmin(
  serviceSupabase: SupabaseClient
): Promise<EmergencyAlertWithDriver[]> {
  return fetchActiveEmergenciesInternal(serviceSupabase, {
    useAuthFallback: true,
  });
}

/** @deprecated Prefer fetchActiveEmergenciesForAdmin with service client */
export async function fetchActiveEmergencies(
  supabase: SupabaseClient
): Promise<EmergencyAlertWithDriver[]> {
  return fetchActiveEmergenciesInternal(supabase, { useAuthFallback: true });
}

async function fetchActiveEmergenciesInternal(
  supabase: SupabaseClient,
  options: { useAuthFallback?: boolean } = {}
): Promise<EmergencyAlertWithDriver[]> {
  const { data, error } = await supabase
    .from("driver_alerts")
    .select("*")
    .eq("type", "taxi_emergency")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[EMERGENCY] active alerts fetch failed:", error);
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const alerts = (data ?? []) as DriverAlert[];
  nodLog("[EMERGENCY] fetchActiveEmergencies:", { rows: alerts.length });

  if (alerts.length === 0) return [];

  return attachDriversToEmergencies(supabase, alerts, options);
}

export async function closeEmergencyAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  const { error } = await supabase
    .from("driver_alerts")
    .update({
      status: "expired",
      expires_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      validation_status: "resolved",
    })
    .eq("id", alertId)
    .eq("type", "taxi_emergency")
    .eq("status", "active");

  if (error) throw error;
}
