import { redirect } from "next/navigation";
import { AdminActiveAlerts } from "@/components/admin/AdminActiveAlerts";
import { AdminAlertReview } from "@/components/admin/AdminAlertReview";
import { AdminNav } from "@/components/admin/AdminNav";
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
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Varningar</h1>
      <AdminNav />

      <section className="mb-8">
        <h2 className="mb-2 text-base font-semibold">Aktiva varningar</h2>
        <p className="mb-4 text-sm text-muted">
          Alla typer kan tas bort omedelbart. Taxi i nöd avslutas endast här
          eller när föraren trycker &quot;Jag är OK&quot;.
        </p>
        <AdminActiveAlerts alerts={active} />
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">Väntar på granskning</h2>
        <p className="mb-4 text-sm text-muted">
          Osäkra platser och tips kräver godkännande.
        </p>
        <AdminAlertReview alerts={pending} />
      </section>
    </div>
  );
}
