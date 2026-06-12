import { redirect } from "next/navigation";
import { AdminDealManager } from "@/components/admin/AdminDealManager";
import { AdminNav } from "@/components/admin/AdminNav";
import { fetchAllDeals } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Erbjudanden" };

export default async function AdminDealsPage() {
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

  const deals = await fetchAllDeals(supabase);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Erbjudanden</h1>
      <AdminNav />
      <AdminDealManager deals={deals} />
    </div>
  );
}
