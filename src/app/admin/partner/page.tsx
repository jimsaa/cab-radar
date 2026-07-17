import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPartnerTable } from "@/components/admin/AdminPartnerTable";
import { fetchAllPartnerLeads } from "@/lib/partner";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Partner Leads" };

export default async function AdminPartnerPage() {
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

  const leads = await fetchAllPartnerLeads(supabase);
  const openCount = leads.filter((l) => l.status === "ny").length;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Partner Leads</h1>
      <AdminNav />
      {openCount > 0 && (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          {openCount} new lead{openCount === 1 ? "" : "s"}
        </p>
      )}
      <AdminPartnerTable leads={leads} />
    </div>
  );
}
