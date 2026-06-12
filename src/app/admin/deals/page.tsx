import { redirect } from "next/navigation";
import { AdminOffersManager } from "@/components/admin/AdminOffersManager";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  canManageOffers,
  fetchAdminRoleProfile,
  isFullAdmin,
} from "@/lib/admin-access";
import { fetchAllOffersForAdmin } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Erbjudanden" };

export default async function AdminDealsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile(supabase, user.id);
  if (!canManageOffers(profile ?? undefined)) redirect("/");

  const offers = await fetchAllOffersForAdmin(supabase);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Erbjudanden</h1>
      <p className="mb-4 text-sm text-muted">
        Exklusiva förmåner för CabRadar-förare. Banner 1A → tryck → Banner 1B +
        inlösen.
      </p>
      <AdminNav mode={isFullAdmin(profile ?? undefined) ? "full" : "offers"} />
      <AdminOffersManager
        offers={offers}
        canDelete={isFullAdmin(profile ?? undefined)}
      />
    </div>
  );
}
