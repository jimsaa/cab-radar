import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAdminBadgeCounts,
  type AdminBadgeCounts,
} from "./admin-notifications";
import {
  fetchAllActiveAlertsForAdmin,
  fetchPendingAlerts,
} from "./alerts";
import { isMissingSchemaError } from "./db-errors";
import {
  fetchActiveEmergenciesForAdmin,
  redactEmergencyPhoneNumbers,
  type EmergencyAlertWithDriver,
} from "./emergency";
import { PRESENCE_STALE_MS } from "./emergency-privacy";
import { fetchAllHelpArticles } from "./help";
import { fetchAllBanners, fetchAllDeals } from "./deals";
import type { DriverAlert } from "./types/database";

export const ADMIN_REFRESH_INTERVAL_MS = 5000;

export interface AdminCommandCenterStats {
  activeDeals: number;
  activeBanners: number;
  liveHelp: number;
  activeDrivers: number;
}

export interface AdminCommandCenterSnapshot {
  counts: AdminBadgeCounts;
  stats: AdminCommandCenterStats;
  emergencies: EmergencyAlertWithDriver[];
  activeAlerts: DriverAlert[];
  pendingAlerts: DriverAlert[];
  recentEvents: DriverAlert[];
  alertChimeEnabled: boolean;
  isFullAdmin: boolean;
}

async function countActiveDrivers(supabase: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - PRESENCE_STALE_MS).toISOString();
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .eq("is_admin", false)
      .gte("last_known_at", since);

    if (error) {
      if (isMissingSchemaError(error)) return 0;
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
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
      },
      emergencies,
      activeAlerts: [],
      pendingAlerts: [],
      recentEvents: [],
      alertChimeEnabled,
      isFullAdmin: false,
    };
  }

  const [
    deals,
    banners,
    helpArticles,
    activeAlerts,
    pendingAlerts,
    activeDrivers,
  ] = await Promise.all([
    fetchAllDeals(serviceSupabase),
    fetchAllBanners(serviceSupabase),
    fetchAllHelpArticles(serviceSupabase),
    fetchAllActiveAlertsForAdmin(serviceSupabase),
    fetchPendingAlerts(serviceSupabase),
    countActiveDrivers(serviceSupabase),
  ]);

  const recentEvents = activeAlerts
    .filter((a) => a.type !== "taxi_emergency")
    .slice(0, 15);

  return {
    counts,
    stats: {
      activeDeals: deals.filter((d) => d.is_active).length,
      activeBanners: banners.filter((b) => b.is_active).length,
      liveHelp: helpArticles.filter((a) => a.published && a.admin_verified)
        .length,
      activeDrivers,
    },
    emergencies,
    activeAlerts,
    pendingAlerts,
    recentEvents,
    alertChimeEnabled,
    isFullAdmin: true,
  };
}

export function secondsSince(timestamp: number | null): number | null {
  if (timestamp == null) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
}

export function formatAdminRefreshLabel(seconds: number | null): string {
  if (seconds == null) return "Ansluter…";
  if (seconds <= 2) return "🟢 Uppdaterad just nu";
  if (seconds < 60) return `🕒 Uppdaterad för ${seconds} sek sedan`;
  const mins = Math.floor(seconds / 60);
  return `🕒 Uppdaterad för ${mins} min sedan`;
}
