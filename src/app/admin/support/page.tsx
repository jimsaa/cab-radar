import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSupportTable } from "@/components/admin/AdminSupportTable";
import { fetchAllSupportMessages } from "@/lib/support";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Support" };

export default async function AdminSupportPage() {
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

  const messages = await fetchAllSupportMessages(supabase);
  const openCount = messages.filter((m) => m.status === "ny").length;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Support</h1>
      <AdminNav />
      {openCount > 0 && (
        <p className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          {openCount} nya meddelanden
        </p>
      )}
      <AdminSupportTable messages={messages} />
    </div>
  );
}
