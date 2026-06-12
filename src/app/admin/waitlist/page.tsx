import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminWaitlistTable } from "@/components/admin/AdminWaitlistTable";
import { fetchWaitlist } from "@/lib/waitlist";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Intresselista" };

export default async function AdminWaitlistPage() {
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

  const entries = await fetchWaitlist(supabase);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Intresselista</h1>
      <p className="mb-4 text-sm text-muted">
        E-post från &quot;Snart öppnar&quot;-sidan.
      </p>
      <AdminNav />
      <AdminWaitlistTable entries={entries} />
    </div>
  );
}
