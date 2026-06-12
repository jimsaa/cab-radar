import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";

export type AdminBadgeKey =
  | "emergency"
  | "alerts"
  | "users"
  | "feedback"
  | "support"
  | "partner"
  | "civilkoll";

export type AdminBadgeCounts = Record<AdminBadgeKey, number>;

export const ADMIN_BADGE_KEYS: AdminBadgeKey[] = [
  "emergency",
  "alerts",
  "users",
  "feedback",
  "support",
  "partner",
  "civilkoll",
];

/** Maps admin nav href → badge key (undefined = no badge) */
export const ADMIN_HREF_BADGE: Record<string, AdminBadgeKey | undefined> = {
  "/admin/emergency": "emergency",
  "/admin/alerts": "alerts",
  "/admin/users": "users",
  "/admin/feedback": "feedback",
  "/admin/support": "support",
  "/admin/partner": "partner",
  "/admin/civilkoll": "civilkoll",
};

export function storageKey(adminUserId: string): string {
  return `cabrader_admin_seen_${adminUserId}`;
}

export function readSeenCounts(adminUserId: string): Partial<AdminBadgeCounts> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(adminUserId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<AdminBadgeCounts>;
  } catch {
    return {};
  }
}

export function writeSeenCounts(
  adminUserId: string,
  seen: Partial<AdminBadgeCounts>
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(adminUserId), JSON.stringify(seen));
}

export function isBadgeUnread(
  key: AdminBadgeKey,
  current: number,
  seen: Partial<AdminBadgeCounts>
): boolean {
  if (current <= 0) return false;
  const lastSeen = seen[key];
  if (lastSeen === undefined) return true;
  return current > lastSeen;
}

export function hasAnyUnread(
  counts: AdminBadgeCounts,
  seen: Partial<AdminBadgeCounts>
): boolean {
  return ADMIN_BADGE_KEYS.some((key) => isBadgeUnread(key, counts[key], seen));
}

async function safeCount(
  query: PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  try {
    const { count, error } = await query;
    if (error) {
      if (isMissingSchemaError(error as { code?: string; message?: string })) {
        return 0;
      }
      console.warn("[ADMIN] count query failed:", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn("[ADMIN] count query threw:", err);
    return 0;
  }
}

export async function fetchAdminBadgeCounts(
  supabase: SupabaseClient
): Promise<AdminBadgeCounts> {
  const [
    emergency,
    alerts,
    users,
    feedback,
    support,
    partner,
    civilkoll,
  ] = await Promise.all([
    safeCount(
      supabase
        .from("driver_alerts")
        .select("*", { count: "exact", head: true })
        .eq("type", "taxi_emergency")
        .eq("status", "active")
        .eq("is_test", false)
    ),
    safeCount(
      supabase
        .from("driver_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review")
        .eq("is_test", false)
    ),
    safeCount(
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending_verification")
        .eq("is_admin", false)
    ),
    safeCount(
      supabase
        .from("user_feedback")
        .select("*", { count: "exact", head: true })
        .eq("status", "ny")
    ),
    safeCount(
      supabase
        .from("support_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "ny")
    ),
    safeCount(
      supabase
        .from("partner_leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "ny")
    ),
    safeCount(
      supabase
        .from("civil_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
    ),
  ]);

  return { emergency, alerts, users, feedback, support, partner, civilkoll };
}

export interface AdminActionLine {
  key: AdminBadgeKey;
  message: string;
}

export function buildAdminActionSummary(
  counts: AdminBadgeCounts
): { lines: AdminActionLine[]; totalActions: number } {
  const lines: AdminActionLine[] = [];

  if (counts.users > 0) {
    lines.push({
      key: "users",
      message: `${counts.users} förare väntar på verifiering`,
    });
  }
  if (counts.emergency > 0) {
    lines.push({
      key: "emergency",
      message: `${counts.emergency} aktiv${counts.emergency > 1 ? "a" : "t"} nödläge`,
    });
  }
  if (counts.alerts > 0) {
    lines.push({
      key: "alerts",
      message: `${counts.alerts} varning${counts.alerts > 1 ? "ar" : ""} att granska`,
    });
  }
  if (counts.support > 0) {
    lines.push({
      key: "support",
      message: `${counts.support} ny${counts.support > 1 ? "a" : "tt"} supportärende`,
    });
  }
  if (counts.feedback > 0) {
    lines.push({
      key: "feedback",
      message: `${counts.feedback} ny${counts.feedback > 1 ? "a" : "tt"} feedback`,
    });
  }
  if (counts.partner > 0) {
    lines.push({
      key: "partner",
      message: `${counts.partner} ny${counts.partner > 1 ? "a" : "tt"} partnerförfrågan`,
    });
  }
  if (counts.civilkoll > 0) {
    lines.push({
      key: "civilkoll",
      message: `${counts.civilkoll} Civilkoll-anmälan${counts.civilkoll > 1 ? "er" : ""} att granska`,
    });
  }

  const totalActions = lines.reduce(
    (sum, line) => sum + counts[line.key],
    0
  );

  return { lines, totalActions };
}

export function adminFirstName(displayName: string | null | undefined): string {
  if (!displayName?.trim()) return "Admin";
  return displayName.trim().split(/\s+/)[0] ?? "Admin";
}
