import { redirect } from "next/navigation";
import { AdminBannerManager } from "@/components/admin/AdminBannerManager";
import { AdminNav } from "@/components/admin/AdminNav";
import { fetchAllBanners } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Banners" };

export default async function AdminBannersPage() {
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

  const banners = await fetchAllBanners(supabase);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Banners</h1>
      <AdminNav />
      <p className="mb-4 text-sm text-muted">
        Platser: start, erbjudanden och flöde.
      </p>
      <AdminBannerManager banners={banners} />
    </div>
  );
}
