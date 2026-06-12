import { redirect } from "next/navigation";
import { AdminCommandCenterShell } from "@/components/admin/AdminCommandCenterShell";
import { fetchAdminRoleProfile, isFullAdmin } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile(supabase, user.id);

  return (
    <AdminCommandCenterShell isFullAdmin={isFullAdmin(profile ?? undefined)}>
      {children}
    </AdminCommandCenterShell>
  );
}
