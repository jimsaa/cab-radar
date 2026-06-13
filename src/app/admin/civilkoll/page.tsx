import { redirect } from "next/navigation";
import { AdminCivilkollActions } from "@/components/admin/AdminCivilkollActions";
import { AdminCivilkollDashboard } from "@/components/admin/AdminCivilkollDashboard";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  fetchCivilRegistry,
  fetchCivilSubmissions,
} from "@/lib/civilkoll";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — CivilKoll" };

export default async function AdminCivilkollPage() {
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

  const [submissions, registry] = await Promise.all([
    fetchCivilSubmissions(supabase),
    fetchCivilRegistry(supabase),
  ]);

  const pendingCount = submissions.filter(
    (item) => item.status === "pending"
  ).length;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <div className="py-2">
        <h1 className="text-xl font-bold">CivilKoll</h1>
        <p className="mt-1 text-sm text-muted">
          Snabb lookup och direktregistrering för admin. Användarinskick granskas
          separat.
        </p>
      </div>

      <AdminNav />

      <AdminCivilkollActions variant="dashboard" className="mb-4" autoFocus={false} />

      <AdminCivilkollDashboard
        submissions={submissions}
        registry={registry}
        pendingCount={pendingCount}
      />
    </div>
  );
}
