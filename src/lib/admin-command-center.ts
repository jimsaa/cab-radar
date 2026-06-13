import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAdminBadgeCounts,
  type AdminBadgeCounts,
} from "./admin-notifications";
import {
  fetchAllActiveAlertsForAdmin,
  fetchPendingAlerts,
} from "./alerts";
import { alertTypeLabel } from "./constants";
import { alertTypeIcon } from "./constants";
import { formatTestAlertTypeLabel } from "./test-mode";
import { fetchCivilSubmissions } from "./civilkoll";
import { isMissingSchemaError } from "./db-errors";
import {
  fetchActiveEmergenciesForAdmin,
  redactEmergencyPhoneNumbers,
  type EmergencyAlertWithDriver,
} from "./emergency";
import { isPresenceFresh, PRESENCE_STALE_MS } from "./emergency-privacy";
import { fetchActiveDriverNetwork } from "./driver-activity";
import { fetchAllHelpArticles } from "./help";
import { fetchAllBanners, fetchAllDeals } from "./deals";
import { maskLicenceLast4 } from "./licence.shared";
import {
  formatRelativeSwedish,
  formatSwedishDateTime,
  formatSwedishTime,
  secondsSinceTimestamp,
} from "./datetime";
import { alertFullAddress } from "./tesla-navigation";
import type { DriverAlert } from "./types/database";

export const ADMIN_REFRESH_INTERVAL_MS = 5000;
export const TESLA_COMMAND_CENTER_MIN_WIDTH = 1024;

export interface AdminCommandCenterStats {
  activeDeals: number;
  activeBanners: number;
  liveHelp: number;
  activeDrivers: number;
  /** Latest network heartbeat — among active drivers when count > 0, else network-wide. */
  lastDriverActivityAt: string | null;
  verifiedDrivers: number;
  activeReports: number;
}

export interface CommandCenterDriver {
  id: string;
  display_name: string | null;
  cabradar_user_id: string | null;
  beta_user: boolean;
  verification_status: string;
  reports_count: number;
  last_known_at: string | null;
  is_online: boolean;
}

export interface CommandCenterPendingUser {
  id: string;
  display_name: string | null;
  cabradar_user_id: string | null;
  phone_number: string | null;
  driver_license_last4: string | null;
  driver_city: string | null;
  taxi_company_name: string | null;
  taxi_number: string | null;
  created_at: string;
}

export interface CommandCenterTestModeDriver {
  id: string;
  display_name: string | null;
  cabradar_user_id: string | null;
  driver_license_last4: string | null;
}

export interface CommandCenterOffer {
  id: string;
  business_name: string;
  offer_title: string;
  is_active: boolean;
}

export interface CommandCenterCivilItem {
  id: string;
  registration_number: string;
  submitter_display_name: string | null;
  created_at: string;
  is_test: boolean;
}

export interface LiveFeedItem {
  id: string;
  type: string;
  type_label: string;
  type_icon: string;
  driver_name: string;
  driver_license_last4: string | null;
  verification_status: string | null;
  /** Short location for list rows, e.g. "Rödbo, Göteborg" */
  location: string;
  /** Full address for navigation and detail panel */
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  time_label: string;
  timestamp_label: string;
  created_at: string;
  is_test: boolean;
}

export interface LiveFeedCreator {
  label: string;
  driver_license_last4: string | null;
  verification_status: string | null;
}

export interface AdminCommandCenterSnapshot {
  counts: AdminBadgeCounts;
  stats: AdminCommandCenterStats;
  emergencies: EmergencyAlertWithDriver[];
  activeAlerts: DriverAlert[];
  pendingAlerts: DriverAlert[];
  recentEvents: DriverAlert[];
  liveFeed: LiveFeedItem[];
  testLiveFeed: LiveFeedItem[];
  drivers: CommandCenterDriver[];
  pendingUsers: CommandCenterPendingUser[];
  testModeDrivers: CommandCenterTestModeDriver[];
  pendingCivil: CommandCenterCivilItem[];
  testPendingCivil: CommandCenterCivilItem[];
  activeOffers: CommandCenterOffer[];
  alertChimeEnabled: boolean;
  isFullAdmin: boolean;
  canViewEmergencyPhone: boolean;
}

export function formatCommandCenterDriverLabel(driver: {
  display_name: string | null;
  cabradar_user_id: string | null;
  driver_license_last4?: string | null;
}): string {
  if (driver.display_name?.trim()) return driver.display_name.trim();
  if (driver.driver_license_last4) {
    return `Leg ${maskLicenceLast4(driver.driver_license_last4)}`;
  }
  if (driver.cabradar_user_id) return driver.cabradar_user_id;
  return "Okänd förare";
}

async function fetchDriverNetworkStats(
  supabase: SupabaseClient
): Promise<{ activeDrivers: number; lastDriverActivityAt: string | null }> {
  try {
    const network = await fetchActiveDriverNetwork(supabase);
    const lastDriverActivityAt =
      network.activeDriverCount > 0
        ? network.lastActiveDriverActivityAt
        : network.lastNetworkActivityAt;
    return {
      activeDrivers: network.activeDriverCount,
      lastDriverActivityAt,
    };
  } catch (err) {
    if (isMissingSchemaError(err as { code?: string; message?: string })) {
      return { activeDrivers: 0, lastDriverActivityAt: null };
    }
    console.error("[ADMIN CC] active drivers stats failed:", err);
    return { activeDrivers: 0, lastDriverActivityAt: null };
  }
}

async function countVerifiedDrivers(supabase: SupabaseClient): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .eq("is_admin", false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchCommandCenterDrivers(
  supabase: SupabaseClient
): Promise<CommandCenterDriver[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, cabradar_user_id, beta_user, verification_status, monthly_reports_count, total_approved_reports, last_known_at"
      )
      .eq("is_admin", false)
      .neq("verification_status", "rejected")
      .order("last_known_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) {
      if (isMissingSchemaError(error)) return [];
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      display_name: row.display_name as string | null,
      cabradar_user_id: row.cabradar_user_id as string | null,
      beta_user: Boolean(row.beta_user),
      verification_status: row.verification_status as string,
      reports_count: Number(
        row.total_approved_reports ?? row.monthly_reports_count ?? 0
      ),
      last_known_at: row.last_known_at as string | null,
      is_online: isPresenceFresh(row.last_known_at as string | null),
    }));
  } catch {
    return [];
  }
}

async function fetchPendingUsers(
  supabase: SupabaseClient
): Promise<CommandCenterPendingUser[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, cabradar_user_id, phone_number, driver_license_last4, driver_city, taxi_company_name, taxi_number, created_at"
      )
      .eq("verification_status", "pending_verification")
      .eq("is_admin", false)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return [];
    return (data ?? []) as CommandCenterPendingUser[];
  } catch {
    return [];
  }
}

async function fetchTestModeDrivers(
  supabase: SupabaseClient
): Promise<CommandCenterTestModeDriver[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, cabradar_user_id, driver_license_last4")
      .eq("test_mode_enabled", true)
      .eq("is_admin", false)
      .neq("verification_status", "rejected")
      .order("display_name", { ascending: true, nullsFirst: false })
      .limit(20);

    if (error) {
      if (isMissingSchemaError(error)) return [];
      return [];
    }

    return (data ?? []) as CommandCenterTestModeDriver[];
  } catch {
    return [];
  }
}

async function fetchPendingCivilItems(
  supabase: SupabaseClient
): Promise<CommandCenterCivilItem[]> {
  try {
    const submissions = await fetchCivilSubmissions(supabase);
    return submissions
      .filter((s) => s.status === "pending")
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        registration_number: s.registration_number,
        submitter_display_name: s.submitter_display_name,
        created_at: s.created_at,
        is_test: Boolean((s as { is_test?: boolean }).is_test),
      }));
  } catch {
    return [];
  }
}

async function fetchActiveOffersList(
  supabase: SupabaseClient
): Promise<CommandCenterOffer[]> {
  try {
    const deals = await fetchAllDeals(supabase);
    return deals
      .filter((d) => d.is_active)
      .slice(0, 8)
      .map((d) => ({
        id: d.id,
        business_name: d.business_name,
        offer_title: d.offer_title,
        is_active: d.is_active,
      }));
  } catch {
    return [];
  }
}

async function loadFeedCreators(
  supabase: SupabaseClient,
  alerts: DriverAlert[]
): Promise<Map<string, LiveFeedCreator>> {
  const ids = [
    ...new Set(alerts.map((a) => a.created_by).filter((id): id is string => !!id)),
  ];
  if (ids.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, cabradar_user_id, driver_license_last4, verification_status"
    )
    .in("id", ids);

  const map = new Map<string, LiveFeedCreator>();
  for (const row of data ?? []) {
    const displayName = (row.display_name as string | null)?.trim();
    const cabradarId = (row.cabradar_user_id as string | null)?.trim();
    const licenseLast4 = (row.driver_license_last4 as string | null) ?? null;
    const label =
      displayName ||
      cabradarId ||
      (licenseLast4 ? `Leg ${maskLicenceLast4(licenseLast4)}` : "Okänd förare");

    map.set(row.id as string, {
      label,
      driver_license_last4: licenseLast4,
      verification_status: (row.verification_status as string | null) ?? null,
    });
  }
  return map;
}

export function formatAlertLocation(alert: DriverAlert): string {
  const full = alertFullAddress(alert.road_address, alert.city);
  if (full !== "Okänd plats") return full;
  if (alert.latitude != null && alert.longitude != null) {
    return `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`;
  }
  return full;
}

export function formatFeedTime(iso: string): string {
  return formatSwedishTime(iso);
}

export function formatFeedTimestamp(iso: string): string {
  return formatSwedishDateTime(iso);
}

export function buildLiveFeed(
  alerts: DriverAlert[],
  creators: Map<string, LiveFeedCreator>
): LiveFeedItem[] {
  return alerts
    .filter((a) => a.type !== "taxi_emergency")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 30)
    .map((alert) => {
      const creator = alert.created_by
        ? creators.get(alert.created_by)
        : undefined;

      return {
        id: alert.id,
        type: alert.type,
        type_label: formatTestAlertTypeLabel(alert.type, Boolean(alert.is_test)),
        type_icon: alertTypeIcon(alert.type),
        driver_name: creator?.label ?? "Okänd förare",
        driver_license_last4: creator?.driver_license_last4 ?? null,
        verification_status: creator?.verification_status ?? null,
        location: formatAlertLocation(alert),
        address: formatAlertLocation(alert),
        latitude: alert.latitude,
        longitude: alert.longitude,
        description: alert.description?.trim() || null,
        time_label: formatFeedTime(alert.created_at),
        timestamp_label: formatFeedTimestamp(alert.created_at),
        created_at: alert.created_at,
        is_test: Boolean(alert.is_test),
      };
    });
}

export async function fetchAdminCommandCenterSnapshot(
  serviceSupabase: SupabaseClient,
  options: {
    isFullAdmin: boolean;
    canViewEmergencyPhone: boolean;
    alertChimeEnabled: boolean;
  }
): Promise<AdminCommandCenterSnapshot> {
  const { isFullAdmin, canViewEmergencyPhone, alertChimeEnabled } = options;

  const counts = await fetchAdminBadgeCounts(serviceSupabase);

  let emergencies: EmergencyAlertWithDriver[] = [];
  try {
    const raw = await fetchActiveEmergenciesForAdmin(serviceSupabase);
    emergencies = redactEmergencyPhoneNumbers(raw, canViewEmergencyPhone);
  } catch (err) {
    console.error("[ADMIN CC] emergencies fetch failed:", err);
  }

  if (!isFullAdmin) {
    return {
      counts: {
        emergency: counts.emergency,
        alerts: 0,
        users: 0,
        feedback: 0,
        support: 0,
        partner: 0,
        civilkoll: 0,
      },
      stats: {
        activeDeals: 0,
        activeBanners: 0,
        liveHelp: 0,
        activeDrivers: 0,
        lastDriverActivityAt: null,
        verifiedDrivers: 0,
        activeReports: 0,
      },
      emergencies,
      activeAlerts: [],
      pendingAlerts: [],
      recentEvents: [],
      liveFeed: [],
      testLiveFeed: [],
      drivers: [],
      pendingUsers: [],
      testModeDrivers: [],
      pendingCivil: [],
      testPendingCivil: [],
      activeOffers: [],
      alertChimeEnabled,
      isFullAdmin: false,
      canViewEmergencyPhone,
    };
  }

  const [
    deals,
    banners,
    helpArticles,
    activeAlerts,
    pendingAlerts,
    driverNetworkStats,
    verifiedDrivers,
    drivers,
    pendingUsers,
    allPendingCivil,
    activeOffers,
    testModeDrivers,
  ] = await Promise.all([
    fetchAllDeals(serviceSupabase),
    fetchAllBanners(serviceSupabase),
    fetchAllHelpArticles(serviceSupabase),
    fetchAllActiveAlertsForAdmin(serviceSupabase),
    fetchPendingAlerts(serviceSupabase),
    fetchDriverNetworkStats(serviceSupabase),
    countVerifiedDrivers(serviceSupabase),
    fetchCommandCenterDrivers(serviceSupabase),
    fetchPendingUsers(serviceSupabase),
    fetchPendingCivilItems(serviceSupabase),
    fetchActiveOffersList(serviceSupabase),
    fetchTestModeDrivers(serviceSupabase),
  ]);

  const { activeDrivers, lastDriverActivityAt } = driverNetworkStats;

  const creatorProfiles = await loadFeedCreators(serviceSupabase, activeAlerts);
  const allFeed = buildLiveFeed(activeAlerts, creatorProfiles);
  const liveFeed = allFeed.filter((item) => !item.is_test);
  const testLiveFeed = allFeed.filter((item) => item.is_test);
  const pendingCivil = allPendingCivil.filter((c) => !c.is_test).slice(0, 10);
  const testPendingCivil = allPendingCivil.filter((c) => c.is_test).slice(0, 10);
  const recentEvents = activeAlerts
    .filter((a) => a.type !== "taxi_emergency")
    .slice(0, 15);
  const activeReports = activeAlerts.filter(
    (a) => a.type !== "taxi_emergency" && !a.is_test
  ).length;

  return {
    counts,
    stats: {
      activeDeals: deals.filter((d) => d.is_active).length,
      activeBanners: banners.filter((b) => b.is_active).length,
      liveHelp: helpArticles.filter((a) => a.published && a.admin_verified)
        .length,
      activeDrivers,
      lastDriverActivityAt,
      verifiedDrivers,
      activeReports,
    },
    emergencies,
    activeAlerts,
    pendingAlerts,
    recentEvents,
    liveFeed,
    testLiveFeed,
    drivers,
    pendingUsers,
    testModeDrivers,
    pendingCivil,
    testPendingCivil,
    activeOffers,
    alertChimeEnabled,
    isFullAdmin: true,
    canViewEmergencyPhone,
  };
}

export function secondsSince(timestamp: number | null): number | null {
  return secondsSinceTimestamp(timestamp);
}

export function formatAdminRefreshLabel(seconds: number | null): string {
  if (seconds == null) return "Ansluter…";
  if (seconds <= 2) return "🟢 Uppdaterad just nu";
  if (seconds === 1) return "🕒 Uppdaterad för 1 sekund sedan";
  if (seconds < 60) return `🕒 Uppdaterad för ${seconds} sekunder sedan`;
  const mins = Math.floor(seconds / 60);
  if (mins === 1) return "🕒 Uppdaterad för 1 minut sedan";
  return `🕒 Uppdaterad för ${mins} minuter sedan`;
}

export function formatDriverActivity(lastKnownAt: string | null): string {
  if (!lastKnownAt) return "Ingen aktivitet";
  return formatRelativeSwedish(lastKnownAt);
}

/** Secondary line for admin active-driver widget. */
export function formatActiveDriverActivityLine(
  lastDriverActivityAt: string | null
): string {
  if (!lastDriverActivityAt) return "Ingen aktivitet registrerad";
  const relative = formatRelativeSwedish(lastDriverActivityAt);
  const lowered =
    relative.charAt(0).toLowerCase() + relative.slice(1);
  return `Senaste aktivitet: ${lowered}`;
}
