import { redirect } from "next/navigation";
import { AdminCivilkollDashboard } from "@/components/admin/AdminCivilkollDashboard";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  fetchCivilRegistry,
  fetchCivilSubmissions,
} from "@/lib/civilkoll";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Civilkoll" };

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

  let submissions: Awaited<ReturnType<typeof fetchCivilSubmissions>> = [];
  let registry: Awaited<ReturnType<typeof fetchCivilRegistry>> = [];

  try {
    [submissions, registry] = await Promise.all([
      fetchCivilSubmissions(supabase),
      fetchCivilRegistry(supabase),
    ]);
  } catch (err) {
    console.error("[ADMIN CIVILKOLL] fetch failed", err);
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div id="admin-civilkoll" className="safe-bottom mx-auto max-w-lg scroll-mt-24 px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">🔍 Civilkoll</h1>
      <p className="mb-4 text-sm text-muted">
        Bygg och underhåll CabRadars interna observationsregister.
      </p>
      <AdminNav />
      {pendingCount > 0 && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium">
          {pendingCount} väntar på granskning
        </p>
      )}
      <AdminCivilkollDashboard
        submissions={submissions}
        registry={registry}
        pendingCount={pendingCount}
      />
    </div>
  );
}
