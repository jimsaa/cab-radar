import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminDispatchMapPageClient } from "@/components/admin/AdminDispatchMapPageClient";
import {
  fetchAdminRoleProfile,
  isCoAdminOnly,
  isFullAdmin,
} from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Karta" };

export default async function AdminMapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile(supabase, user.id);
  if (isCoAdminOnly(profile ?? undefined)) redirect("/admin/emergency");
  if (!isFullAdmin(profile)) redirect("/");

  return (
    <div
      className="admin-dispatch-map-page flex flex-col overflow-hidden"
      style={{
        height: "calc(100dvh - var(--admin-command-center-header-height, 72px))",
      }}
    >
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-[#8A9099]">
            Laddar karta…
          </div>
        }
      >
        <AdminDispatchMapPageClient />
      </Suspense>
    </div>
  );
}
