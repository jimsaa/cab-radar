import { redirect } from "next/navigation";
import { AdminDashboardLive } from "@/components/admin/AdminDashboardLive";
import {
  fetchAdminRoleProfile,
  isCoAdminOnly,
  isFullAdmin,
  type AdminRoleProfile,
} from "@/lib/admin-access";
import { adminFirstName } from "@/lib/admin-notifications";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile<
    AdminRoleProfile & { display_name?: string | null }
  >(supabase, user.id, ["display_name"]);

  if (isCoAdminOnly(profile ?? undefined)) redirect("/admin/emergency");
  if (!isFullAdmin(profile)) redirect("/");
  return profile!;
}

export default async function AdminPage() {
  const profile = await requireAdmin();
  const firstName = adminFirstName(profile.display_name);

  return <AdminDashboardLive firstName={firstName} />;
}
