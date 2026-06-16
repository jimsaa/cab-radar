import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVE_DRIVER_WINDOW_MS,
  networkPositionSince,
} from "./driver-activity";
import { publicDriverLabel } from "./driver-display";
import { hasCabRadarAccess } from "./membership";
import { isPresenceFresh } from "./emergency-privacy";
import type { DriverVerificationStatus } from "./verification";

export interface RecipientAuditRow {
  user_id: string;
  nickname: string | null;
  label: string;
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
  membership_type: string;
  has_cabradar_access: boolean;
  test_mode_enabled: boolean;
  last_known_at: string | null;
  updated_at: string | null;
  is_presence_fresh: boolean;
  included: boolean;
  reasons: string[];
}

interface ProfileAuditRow {
  id: string;
  nickname: string | null;
  display_name: string | null;
  cabradar_user_id: string | null;
  driver_license_last4: string | null;
  taxi_number: string | null;
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
  membership_type: string;
  beta_user: boolean;
  membership_expires_at: string | null;
  monthly_reports_count: number;
  monthly_votes_count: number;
  monthly_points: number;
  test_mode_enabled: boolean;
  last_known_at: string | null;
  updated_at: string | null;
}

function msSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function freshWithinWindow(iso: string | null, since: string): boolean {
  if (!iso) return false;
  return iso >= since;
}

/** Explain why each verified/non-admin driver was included or excluded for "Alla aktiva". */
export async function auditAllActiveMessageRecipients(
  supabase: SupabaseClient,
  includedUserIds: string[]
): Promise<RecipientAuditRow[]> {
  const since = networkPositionSince();
  const includedSet = new Set(includedUserIds);

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, nickname, display_name, cabradar_user_id, driver_license_last4, taxi_number, verification_status, is_admin, membership_type, beta_user, membership_expires_at, monthly_reports_count, monthly_votes_count, monthly_points, test_mode_enabled, last_known_at, updated_at"
    )
    .eq("is_admin", false)
    .order("nickname", { ascending: true, nullsFirst: false });

  if (profileError) throw profileError;

  const rows = (profiles ?? []) as ProfileAuditRow[];
  const profileIds = rows.map((row) => row.id);

  const [pointUserIds, alertUserIds] = await Promise.all([
    fetchRecentActivityPointUserIds(supabase, since, profileIds),
    fetchRecentAlertUserIds(supabase, since, profileIds),
  ]);

  return rows.map((row) => {
    const reasons: string[] = [];
    const label = publicDriverLabel(row);
    const presenceFresh = isPresenceFresh(row.last_known_at);
    const lastKnownMs = msSince(row.last_known_at);
    const updatedMs = msSince(row.updated_at);
    const hasAccess = hasCabRadarAccess({
      verification_status: row.verification_status,
      is_admin: row.is_admin,
      beta_user: row.beta_user,
      membership_type: row.membership_type as "active_driver" | "annual_member" | "inactive",
      membership_expires_at: row.membership_expires_at,
      monthly_reports_count: row.monthly_reports_count ?? 0,
      monthly_votes_count: row.monthly_votes_count ?? 0,
      monthly_points: row.monthly_points ?? 0,
    });

    const lastKnownFresh = freshWithinWindow(row.last_known_at, since);
    const updatedFresh = freshWithinWindow(row.updated_at, since);
    const recentPoint = pointUserIds.has(row.id);
    const recentAlert = alertUserIds.has(row.id);

    if (row.verification_status !== "verified") {
      reasons.push(`verification_status=${row.verification_status} (requires verified)`);
    } else {
      const activitySignals: string[] = [];
      if (lastKnownFresh) activitySignals.push("last_known_at fresh");
      if (updatedFresh) activitySignals.push("updated_at fresh");
      if (recentPoint) activitySignals.push("recent activity point");
      if (recentAlert) activitySignals.push("recent alert");

      if (activitySignals.length === 0) {
        if (!row.last_known_at) {
          reasons.push("last_known_at is null (no heartbeat recorded)");
        } else {
          reasons.push(
            `last_known_at expired (${Math.round((lastKnownMs ?? 0) / 60_000)} min ago, window=${ACTIVE_DRIVER_WINDOW_MS / 60_000} min)`
          );
        }
        reasons.push(
          `updated_at not within window (${row.updated_at ? `${Math.round((updatedMs ?? 0) / 60_000)} min ago` : "null"})`
        );
        reasons.push("no driver_activity_points within window");
        reasons.push("no driver_alerts within window");
        reasons.push(
          "excluded: no activity signal within 30 min (needs fresh last_known_at OR updated_at OR activity point OR alert)"
        );
      }
    }

    const included = includedSet.has(row.id);

    if (included) {
      const includeSignals: string[] = [];
      if (lastKnownFresh) includeSignals.push("last_known_at fresh");
      if (updatedFresh) includeSignals.push("updated_at fresh");
      if (recentPoint) includeSignals.push("recent activity point");
      if (recentAlert) includeSignals.push("recent alert");
      return {
        user_id: row.id,
        nickname: row.nickname,
        label,
        verification_status: row.verification_status,
        is_admin: row.is_admin,
        membership_type: row.membership_type,
        has_cabradar_access: hasAccess,
        test_mode_enabled: Boolean(row.test_mode_enabled),
        last_known_at: row.last_known_at,
        updated_at: row.updated_at,
        is_presence_fresh: presenceFresh,
        included: true,
        reasons: includeSignals.length > 0 ? includeSignals : ["included via active network"],
      };
    }

    return {
      user_id: row.id,
      nickname: row.nickname,
      label,
      verification_status: row.verification_status,
      is_admin: row.is_admin,
      membership_type: row.membership_type,
      has_cabradar_access: hasAccess,
      test_mode_enabled: Boolean(row.test_mode_enabled),
      last_known_at: row.last_known_at,
      updated_at: row.updated_at,
      is_presence_fresh: presenceFresh,
      included: false,
      reasons,
    };
  });
}

async function fetchRecentActivityPointUserIds(
  supabase: SupabaseClient,
  since: string,
  restrictToUserIds: string[]
): Promise<Set<string>> {
  const ids = new Set<string>();
  if (restrictToUserIds.length === 0) return ids;

  const chunkSize = 100;
  for (let i = 0; i < restrictToUserIds.length; i += chunkSize) {
    const chunk = restrictToUserIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("driver_activity_points")
      .select("user_id")
      .in("user_id", chunk)
      .gte("recorded_at", since);

    if (error) throw error;
    for (const row of data ?? []) {
      ids.add(row.user_id as string);
    }
  }

  return ids;
}

async function fetchRecentAlertUserIds(
  supabase: SupabaseClient,
  since: string,
  restrictToUserIds: string[]
): Promise<Set<string>> {
  const ids = new Set<string>();
  if (restrictToUserIds.length === 0) return ids;

  const chunkSize = 100;
  for (let i = 0; i < restrictToUserIds.length; i += chunkSize) {
    const chunk = restrictToUserIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("driver_alerts")
      .select("created_by")
      .in("created_by", chunk)
      .gte("created_at", since);

    if (error) throw error;
    for (const row of data ?? []) {
      const id = row.created_by as string | null;
      if (id) ids.add(id);
    }
  }

  return ids;
}

export function logAdminMessageRecipientAudit(
  messagePreview: string,
  audit: RecipientAuditRow[]
): void {
  const included = audit.filter((row) => row.included);
  const excluded = audit.filter((row) => !row.included);

  console.info("[ADMIN MSG] Sending message:", JSON.stringify(messagePreview));
  console.info(
    `[ADMIN MSG] Recipients generated: ${included.length} included, ${excluded.length} excluded (${audit.length} non-admin profiles audited)`
  );

  for (const row of audit) {
    console.info(
      `[ADMIN MSG] User ${row.label} (${row.user_id})`,
      JSON.stringify({
        included: row.included,
        nickname: row.nickname,
        verification_status: row.verification_status,
        membership_type: row.membership_type,
        has_cabradar_access: row.has_cabradar_access,
        test_mode_enabled: row.test_mode_enabled,
        is_presence_fresh: row.is_presence_fresh,
        last_known_at: row.last_known_at,
        updated_at: row.updated_at,
        reason: row.included ? row.reasons.join("; ") : row.reasons.join("; "),
      })
    );
  }
}
