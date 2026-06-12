import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import {
  fetchContributionCountsFromSource,
  mergeContributionCounts,
} from "./contribution";
import type { Profile } from "./types/database";

/** Columns safe for client reads — excludes licence hash and plaintext */
export const PROFILE_SAFE_COLUMNS =
  "id, display_name, phone_number, cabradar_user_id, driver_license_last4, verification_status, is_admin, is_co_admin, co_admin_emergency_call, co_admin_manage_offers, beta_user, fab_enabled, alert_chime_enabled, push_enabled, push_prompted, membership_type, membership_expires_at, monthly_reports_count, monthly_votes_count, monthly_points, last_monthly_reset, reputation_score, report_usefulness_score, total_approved_reports, reward_points_balance, taxi_company_name, taxi_operator, taxi_number, taximeter_type, driver_city, show_national_emergencies, welcome_pending, created_at, updated_at";

export const PROFILE_CORE_COLUMNS =
  "id, display_name, phone_number, cabradar_user_id, driver_license_last4, verification_status, is_admin, fab_enabled, alert_chime_enabled, created_at, updated_at";

export const PROFILE_TAXI_COLUMNS =
  "taxi_company_name, taxi_operator, taxi_number, taximeter_type";

export const PROFILE_MEMBERSHIP_COLUMNS =
  "membership_type, membership_expires_at, monthly_reports_count, monthly_votes_count, monthly_points, last_monthly_reset";

export const PROFILE_REPUTATION_COLUMNS =
  "reputation_score, report_usefulness_score, total_approved_reports, reward_points_balance";

/** Optional groups fetched separately so one missing column does not drop taxi data. */
const PROFILE_OPTIONAL_GROUPS = [
  "is_co_admin, co_admin_emergency_call, co_admin_manage_offers, beta_user",
  "push_enabled, push_prompted",
  PROFILE_MEMBERSHIP_COLUMNS,
  PROFILE_REPUTATION_COLUMNS,
  PROFILE_TAXI_COLUMNS,
  "last_known_latitude, last_known_longitude, last_known_at",
  "driver_city, show_national_emergencies, welcome_pending, test_mode_enabled",
] as const;

/** Smallest column set that works on databases without membership/phone migrations */
export const PROFILE_MINIMAL_COLUMNS =
  "id, display_name, verification_status, is_admin, fab_enabled, alert_chime_enabled, created_at, updated_at";

/** Base columns when optional profile flags are not migrated yet */
export const PROFILE_BASE_COLUMNS =
  "id, display_name, verification_status, is_admin, created_at, updated_at";

export const ADMIN_PROFILE_COLUMNS =
  "id, display_name, phone_number, cabradar_user_id, driver_license_last4, verification_status, is_admin, is_co_admin, co_admin_emergency_call, co_admin_manage_offers, beta_user, membership_type, membership_expires_at, monthly_reports_count, monthly_votes_count, monthly_points, driver_city, taxi_company_name, taxi_number, test_mode_enabled, created_at";

export function normalizeProfileRow(row: Record<string, unknown>): Profile {
  const isAdmin = Boolean(row.is_admin);
  const verificationStatus =
    (row.verification_status as Profile["verification_status"]) ??
    "pending_verification";
  const hasMembershipColumn = Object.prototype.hasOwnProperty.call(
    row,
    "membership_type"
  );

  let membershipType: Profile["membership_type"];
  if (hasMembershipColumn && row.membership_type != null) {
    membershipType = row.membership_type as Profile["membership_type"];
  } else if (isAdmin) {
    membershipType = "active_driver";
  } else if (verificationStatus === "verified") {
    membershipType = "active_driver";
  } else {
    membershipType = "inactive";
  }

  return {
    id: row.id as string,
    display_name: (row.display_name as string | null) ?? null,
    phone_number: (row.phone_number as string | null) ?? null,
    cabradar_user_id: (row.cabradar_user_id as string | null) ?? null,
    driver_license_last4: (row.driver_license_last4 as string | null) ?? null,
    verification_status: verificationStatus,
    is_admin: isAdmin,
    is_co_admin: Object.prototype.hasOwnProperty.call(row, "is_co_admin")
      ? Boolean(row.is_co_admin)
      : false,
    co_admin_emergency_call: Object.prototype.hasOwnProperty.call(
      row,
      "co_admin_emergency_call"
    )
      ? Boolean(row.co_admin_emergency_call)
      : false,
    co_admin_manage_offers: Object.prototype.hasOwnProperty.call(
      row,
      "co_admin_manage_offers"
    )
      ? Boolean(row.co_admin_manage_offers)
      : false,
    beta_user: Object.prototype.hasOwnProperty.call(row, "beta_user")
      ? Boolean(row.beta_user)
      : false,
    fab_enabled: row.fab_enabled !== false,
    alert_chime_enabled: row.alert_chime_enabled !== false,
    push_enabled: row.push_enabled !== false,
    push_prompted: Boolean(row.push_prompted),
    membership_type: membershipType,
    membership_expires_at: (row.membership_expires_at as string | null) ?? null,
    monthly_reports_count: Number(row.monthly_reports_count ?? 0),
    monthly_votes_count: Number(row.monthly_votes_count ?? 0),
    monthly_points: Number(row.monthly_points ?? 0),
    last_monthly_reset:
      (row.last_monthly_reset as string) ?? new Date().toISOString(),
    reputation_score: Number(row.reputation_score ?? 0),
    report_usefulness_score: Number(row.report_usefulness_score ?? 0),
    total_approved_reports: Number(row.total_approved_reports ?? 0),
    reward_points_balance: Number(row.reward_points_balance ?? 0),
    taxi_company_name: (row.taxi_company_name as string | null) ?? null,
    taxi_operator: (row.taxi_operator as string | null) ?? null,
    taxi_number: (row.taxi_number as string | null) ?? null,
    taximeter_type: (row.taximeter_type as string | null) ?? null,
    last_known_latitude: (row.last_known_latitude as number | null) ?? null,
    last_known_longitude: (row.last_known_longitude as number | null) ?? null,
    last_known_at: (row.last_known_at as string | null) ?? null,
    driver_city: (row.driver_city as string | null) ?? null,
    show_national_emergencies: Object.prototype.hasOwnProperty.call(
      row,
      "show_national_emergencies"
    )
      ? Boolean(row.show_national_emergencies)
      : false,
    welcome_pending: Object.prototype.hasOwnProperty.call(row, "welcome_pending")
      ? Boolean(row.welcome_pending)
      : false,
    test_mode_enabled: Object.prototype.hasOwnProperty.call(
      row,
      "test_mode_enabled"
    )
      ? Boolean(row.test_mode_enabled)
      : false,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

async function fetchProfileRow(
  supabase: SupabaseClient,
  userId: string,
  columns: string
) {
  return supabase.from("profiles").select(columns).eq("id", userId).maybeSingle();
}

async function mergeOptionalProfileFields(
  supabase: SupabaseClient,
  userId: string,
  base: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const merged = { ...base };

  for (const columns of PROFILE_OPTIONAL_GROUPS) {
    const { data, error } = await fetchProfileRow(supabase, userId, columns);
    if (process.env.NODE_ENV === "development" && error) {
      console.warn(`[PROFILE] optional fetch skipped (${columns}):`, error);
    }
    if (!error && data) {
      Object.assign(merged, data as unknown as Record<string, unknown>);
    }
  }

  return merged;
}

export async function fetchCurrentProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const columnSets = [
    PROFILE_SAFE_COLUMNS,
    PROFILE_CORE_COLUMNS,
    PROFILE_MINIMAL_COLUMNS,
    PROFILE_BASE_COLUMNS,
  ];

  let lastSchemaError: unknown = null;

  for (const columns of columnSets) {
    const result = await fetchProfileRow(supabase, userId, columns);
    if (!result.error && result.data) {
      const merged =
        columns === PROFILE_SAFE_COLUMNS
          ? (result.data as unknown as Record<string, unknown>)
          : await mergeOptionalProfileFields(
              supabase,
              userId,
              result.data as unknown as Record<string, unknown>
            );

      if (process.env.NODE_ENV === "development") {
        console.log("[PROFILE] Reloaded profile:", merged);
      }

      return normalizeProfileRow(merged);
    }
    if (result.error) {
      if (isMissingSchemaError(result.error)) {
        lastSchemaError = result.error;
        continue;
      }
      throw result.error;
    }
  }

  if (lastSchemaError) throw lastSchemaError;
  return null;
}

export async function syncMembershipProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { error: rpcError } = await supabase.rpc("sync_membership_for_user", {
    p_user_id: userId,
  });

  if (rpcError && !isMissingSchemaError(rpcError)) {
    console.warn("[PROFILE] sync_membership_for_user failed:", rpcError);
  }

  const profile = await fetchCurrentProfile(supabase, userId);
  if (!profile) return null;

  try {
    const counts = await fetchContributionCountsFromSource(supabase, userId);
    return mergeContributionCounts(profile, counts);
  } catch (countErr) {
    console.warn("[PROFILE] contribution count fallback failed:", countErr);
    return profile;
  }
}

export async function countPendingVerifications(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("verification_status", "pending_verification")
    .eq("is_admin", false);

  if (error) {
    if (isMissingSchemaError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}
