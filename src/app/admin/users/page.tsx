import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import {
  enrichProfilesWithContributionCounts,
  persistContributionCountsIfDrifted,
} from "@/lib/contribution";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  ADMIN_PROFILE_COLUMNS,
  PROFILE_MINIMAL_COLUMNS,
  normalizeProfileRow,
} from "@/lib/profile";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export const metadata = { title: "Admin — Förare" };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  let users: Profile[] = [];
  const { data, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error && isMissingSchemaError(error)) {
    const { data: minimal } = await supabase
      .from("profiles")
      .select(PROFILE_MINIMAL_COLUMNS)
      .order("created_at", { ascending: false });
    users = (minimal ?? []).map((row) =>
      normalizeProfileRow(row as Record<string, unknown>)
    );
  } else if (!error) {
    users = (data ?? []).map((row) =>
      normalizeProfileRow(row as Record<string, unknown>)
    );
  }

  let orphanAlertCount = 0;

  try {
    const service = await createServiceClient();
    const profilesBeforeStats = users;
    const { profiles: enriched, audit, countsByUser } =
      await enrichProfilesWithContributionCounts(service, users);
    users = enriched;
    orphanAlertCount = audit.orphanCount;

    const synced = await persistContributionCountsIfDrifted(
      service,
      profilesBeforeStats,
      countsByUser
    );

    if (process.env.NODE_ENV === "development" && synced > 0) {
      console.log("[STATS] Persisted drift correction for", synced, "profiles");
    }
  } catch (statsErr) {
    console.error("[STATS] Failed to compute contribution stats:", statsErr);
  }

  return (
    <div className="safe-bottom mx-auto max-w-3xl px-4 pb-4">
      <h1 className="py-4 text-2xl font-bold">Användare</h1>
      <AdminNav />
      {orphanAlertCount > 0 && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
        >
          {orphanAlertCount} varning
          {orphanAlertCount === 1 ? "" : "ar"} saknar koppling till förare
          (created_by är NULL). Statistik kan inte tillskrivas dessa poster.
        </p>
      )}
      <AdminUsersTable users={users} isAdmin={Boolean(profile?.is_admin)} />
    </div>
  );
}
