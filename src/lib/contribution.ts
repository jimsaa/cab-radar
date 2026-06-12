import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types/database";
import { meetsContributionRequirements, membershipStatusLine } from "./membership";

export interface ContributionCounts {
  monthly_reports_count: number;
  monthly_votes_count: number;
  monthly_points: number;
  total_approved_reports: number;
}

export interface OrphanAlertRow {
  id: string;
  type: string;
  created_at: string;
}

export interface ContributionAuditSummary {
  totalAlerts: number;
  linkedAlerts: number;
  orphanCount: number;
  orphanAlerts: OrphanAlertRow[];
}

const ZERO_COUNTS: ContributionCounts = {
  monthly_reports_count: 0,
  monthly_votes_count: 0,
  monthly_points: 0,
  total_approved_reports: 0,
};

function currentMonthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function computePoints(reports: number, votes: number): number {
  return reports * 10 + votes * 5;
}

function computeCountsForUser(
  userId: string,
  alerts: { created_by: string | null; created_at: string }[],
  votes: { user_id: string; created_at: string }[],
  monthStart: string
): ContributionCounts {
  let monthlyReports = 0;
  let lifetimeReports = 0;

  for (const alert of alerts) {
    if (alert.created_by !== userId) continue;
    lifetimeReports += 1;
    if (alert.created_at >= monthStart) {
      monthlyReports += 1;
    }
  }

  let monthlyVotes = 0;
  for (const vote of votes) {
    if (vote.user_id !== userId) continue;
    if (vote.created_at >= monthStart) {
      monthlyVotes += 1;
    }
  }

  return {
    monthly_reports_count: monthlyReports,
    monthly_votes_count: monthlyVotes,
    monthly_points: computePoints(monthlyReports, monthlyVotes),
    total_approved_reports: lifetimeReports,
  };
}

function logContributionStats(
  audit: ContributionAuditSummary,
  profiles: Profile[],
  countsByUser: Map<string, ContributionCounts>
): void {
  if (process.env.NODE_ENV !== "development") return;

  console.log("[STATS] Alerts found:", audit.totalAlerts);
  console.log("[STATS] Alerts linked to user:", audit.linkedAlerts);

  if (audit.orphanCount > 0) {
    console.warn("[STATS] Orphan alerts (created_by IS NULL):", audit.orphanCount);
    console.warn(
      "[STATS] Orphan alert IDs:",
      audit.orphanAlerts.map((a) => `${a.id} (${a.type})`)
    );
  }

  for (const profile of profiles) {
    const counts = countsByUser.get(profile.id) ?? ZERO_COUNTS;
    const label =
      profile.display_name ?? profile.cabradar_user_id ?? profile.id.slice(0, 8);

    console.log(`[STATS] Computed report count (${label}):`, {
      userId: profile.id,
      monthly_reports: counts.monthly_reports_count,
      monthly_votes: counts.monthly_votes_count,
      monthly_points: counts.monthly_points,
      lifetime_reports: counts.total_approved_reports,
      profile_cached_reports: profile.monthly_reports_count,
    });

    const merged = mergeContributionCounts(profile, counts);
    console.log(`[STATS] Membership status (${label}):`, {
      membership_type: profile.membership_type,
      meets_threshold: meetsContributionRequirements(merged),
      status_line: membershipStatusLine(merged),
    });
  }
}

/**
 * Single source of truth: count from driver_alerts.created_by + alert_votes.user_id.
 * Requires service role (or RLS allowing cross-user reads) for admin batch use.
 */
export async function fetchContributionAuditAndCounts(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{
  audit: ContributionAuditSummary;
  countsByUser: Map<string, ContributionCounts>;
}> {
  const monthStart = currentMonthStartIso();

  const [alertsRes, votesRes] = await Promise.all([
    supabase
      .from("driver_alerts")
      .select("id, type, created_by, created_at"),
    supabase.from("alert_votes").select("user_id, created_at"),
  ]);

  if (alertsRes.error) {
    console.error("[STATS] driver_alerts query failed:", alertsRes.error);
    throw alertsRes.error;
  }
  if (votesRes.error) {
    console.error("[STATS] alert_votes query failed:", votesRes.error);
    throw votesRes.error;
  }

  const alerts = alertsRes.data ?? [];
  const votes = votesRes.data ?? [];
  const orphanAlerts = alerts
    .filter((a) => !a.created_by)
    .map(({ id, type, created_at }) => ({ id, type, created_at }));

  const countsByUser = new Map<string, ContributionCounts>();
  for (const userId of userIds) {
    countsByUser.set(
      userId,
      computeCountsForUser(userId, alerts, votes, monthStart)
    );
  }

  const audit: ContributionAuditSummary = {
    totalAlerts: alerts.length,
    linkedAlerts: alerts.length - orphanAlerts.length,
    orphanCount: orphanAlerts.length,
    orphanAlerts,
  };

  return { audit, countsByUser };
}

/** Enrich profiles with live counts from alert history (admin / service role). */
export async function enrichProfilesWithContributionCounts(
  supabase: SupabaseClient,
  profiles: Profile[]
): Promise<{
  profiles: Profile[];
  audit: ContributionAuditSummary;
  countsByUser: Map<string, ContributionCounts>;
}> {
  const userIds = profiles.map((p) => p.id);
  const { audit, countsByUser } = await fetchContributionAuditAndCounts(
    supabase,
    userIds
  );

  logContributionStats(audit, profiles, countsByUser);

  const enriched = profiles.map((profile) =>
    mergeContributionCounts(profile, countsByUser.get(profile.id) ?? ZERO_COUNTS)
  );

  return { profiles: enriched, audit, countsByUser };
}

/** Persist profile counters when they drift from alert history. */
export async function persistContributionCountsIfDrifted(
  supabase: SupabaseClient,
  profiles: Profile[],
  countsByUser: Map<string, ContributionCounts>
): Promise<number> {
  let synced = 0;

  for (const profile of profiles) {
    if (profile.is_admin) continue;

    const computed = countsByUser.get(profile.id);
    if (!computed) continue;

    const drifted =
      computed.monthly_reports_count !== profile.monthly_reports_count ||
      computed.monthly_votes_count !== profile.monthly_votes_count ||
      computed.monthly_points !== profile.monthly_points ||
      computed.total_approved_reports !== profile.total_approved_reports;

    if (!drifted) continue;

    const { error } = await supabase.rpc("recalculate_user_monthly_contribution", {
      p_user_id: profile.id,
    });

    if (error) {
      console.warn(
        `[STATS] recalculate_user_monthly_contribution failed for ${profile.id}:`,
        error
      );
      continue;
    }

    synced += 1;
    if (process.env.NODE_ENV === "development") {
      console.log("[STATS] Synced profile counters for", profile.id, computed);
    }
  }

  return synced;
}

/** Count one user's contributions — works with user session (own alerts via RLS). */
export async function fetchContributionCountsFromSource(
  supabase: SupabaseClient,
  userId: string
): Promise<ContributionCounts> {
  const monthStart = currentMonthStartIso();

  const [reportsRes, votesRes, lifetimeRes] = await Promise.all([
    supabase
      .from("driver_alerts")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .gte("created_at", monthStart),
    supabase
      .from("alert_votes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart),
    supabase
      .from("driver_alerts")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
  ]);

  for (const res of [reportsRes, votesRes, lifetimeRes]) {
    if (res.error) {
      console.error("[STATS] count query failed:", res.error);
    }
  }

  const reports = reportsRes.count ?? 0;
  const votes = votesRes.count ?? 0;

  const counts: ContributionCounts = {
    monthly_reports_count: reports,
    monthly_votes_count: votes,
    monthly_points: computePoints(reports, votes),
    total_approved_reports: lifetimeRes.count ?? 0,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[STATS] Alerts linked to user:", lifetimeRes.count ?? 0);
    console.log("[STATS] Computed report count:", {
      userId,
      monthStart,
      ...counts,
    });
  }

  return counts;
}

export function mergeContributionCounts<T extends ContributionCounts>(
  profile: T,
  counts: ContributionCounts
): T {
  return {
    ...profile,
    monthly_reports_count: counts.monthly_reports_count,
    monthly_votes_count: counts.monthly_votes_count,
    monthly_points: counts.monthly_points,
    total_approved_reports: counts.total_approved_reports,
  };
}
