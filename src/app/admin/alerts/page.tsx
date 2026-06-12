import { redirect } from "next/navigation";
import { AdminAlertsLive } from "@/components/admin/AdminAlertsLive";
import {
  fetchAllActiveAlertsForAdmin,
  fetchPendingAlerts,
} from "@/lib/alerts";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Varningar" };

export default async function AdminAlertsPage() {
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

  const [active, pending] = await Promise.all([
    fetchAllActiveAlertsForAdmin(supabase),
    fetchPendingAlerts(supabase),
  ]);

  return (
    <AdminAlertsLive initialActive={active} initialPending={pending} />
  );
}
