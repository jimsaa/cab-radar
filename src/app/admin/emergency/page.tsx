import { redirect } from "next/navigation";
import { AdminEmergencyDashboard } from "@/components/admin/AdminEmergencyDashboard";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  canViewEmergencyPhone,
  hasEmergencyAdminAccess,
  isFullAdmin,
  fetchAdminRoleProfile,
} from "@/lib/admin-access";
import {
  fetchActiveEmergenciesForAdmin,
  redactEmergencyPhoneNumbers,
} from "@/lib/emergency";
import { formatSupabaseError } from "@/lib/db-errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Nödlägen — Admin" };

async function requireEmergencyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile(supabase, user.id);

  if (!hasEmergencyAdminAccess(profile ?? undefined)) redirect("/");
  return {
    supabase,
    viewerProfile: profile,
    isFullAdmin: isFullAdmin(profile ?? undefined),
    canViewPhone: canViewEmergencyPhone(profile ?? undefined),
  };
}

export default async function AdminEmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { supabase, isFullAdmin: fullAdmin, canViewPhone } =
    await requireEmergencyAdmin();
  let emergencies: Awaited<ReturnType<typeof fetchActiveEmergenciesForAdmin>> = [];
  let fetchError: string | null = null;

  try {
    const service = await createServiceClient();
    const raw = await fetchActiveEmergenciesForAdmin(service);
    emergencies = redactEmergencyPhoneNumbers(raw, canViewPhone);
    if (process.env.NODE_ENV === "development") {
      const { count } = await supabase
        .from("driver_alerts")
        .select("*", { count: "exact", head: true })
        .eq("type", "taxi_emergency")
        .eq("status", "active");
      console.log("[ADMIN EMERGENCY] active count:", count, "fetched:", emergencies.length);
      for (const e of emergencies) {
        console.log("[NÖD] Loaded emergency:", {
          id: e.id,
          created_by: e.created_by,
          driver: e.driver?.display_name,
          cabradar: e.driver?.cabradar_user_id,
          debug: e.driver_load_debug,
        });
      }
    }
  } catch (err) {
    console.error("[ADMIN EMERGENCY] fetch failed", err);
    fetchError = formatSupabaseError(err);
  }

  const { id } = await searchParams;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <AdminPageHeader
        title="Nödlägen"
        description={
          fullAdmin
            ? "Identifiera föraren, ring och navigera direkt."
            : canViewPhone
              ? "Co-admin med behörighet att ringa förare vid nödläge."
              : "Co-admin: plats och åtgärder — telefonnummer visas endast för behöriga Co-admins."
        }
      />
      <AdminNav mode={fullAdmin ? "full" : "emergency"} />
      <AdminEmergencyDashboard
        initialEmergencies={emergencies}
        initialSelectedId={id ?? null}
        fetchError={fetchError}
        canViewPhone={canViewPhone}
      />
    </div>
  );
}
