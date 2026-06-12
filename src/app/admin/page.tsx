import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Handshake,
  Headphones,
  Image,
  MessageSquare,
  ScanSearch,
  ShieldAlert,
  Tag,
  Users,
} from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import {
  AdminDashboardHeader,
  AdminStatCard,
} from "@/components/admin/AdminDashboardCards";
import {
  adminFirstName,
  buildAdminActionSummary,
  fetchAdminBadgeCounts,
} from "@/lib/admin-notifications";
import {
  fetchAdminRoleProfile,
  isCoAdminOnly,
  isFullAdmin,
  type AdminRoleProfile,
} from "@/lib/admin-access";
import { fetchAllHelpArticles } from "@/lib/help";
import { fetchAllBanners, fetchAllDeals } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchAdminRoleProfile<
    AdminRoleProfile & { display_name?: string | null }
  >(supabase, user.id, ["display_name"]);

  if (isCoAdminOnly(profile ?? undefined)) redirect("/admin/emergency");
  if (!isFullAdmin(profile)) redirect("/");
  return { supabase, profile: profile! };
}

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin();

  const [counts, deals, banners, helpArticles] = await Promise.all([
    fetchAdminBadgeCounts(supabase),
    fetchAllDeals(supabase),
    fetchAllBanners(supabase),
    fetchAllHelpArticles(supabase),
  ]);

  const { lines: actionLines } = buildAdminActionSummary(counts);
  const firstName = adminFirstName(profile.display_name);

  const activeDeals = deals.filter((d) => d.is_active).length;
  const activeBanners = banners.filter((b) => b.is_active).length;
  const liveHelp = helpArticles.filter(
    (a) => a.published && a.admin_verified
  ).length;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <AdminDashboardHeader
        firstName={firstName}
        actionLines={actionLines}
      />

      <AdminNav />

      <div className="grid grid-cols-2 gap-3">
        <AdminStatCard
          href="/admin/emergency"
          icon={ShieldAlert}
          label="Nödlägen"
          subtitle={
            counts.emergency > 0
              ? `${counts.emergency} aktiv${counts.emergency > 1 ? "a" : "t"} nödläge`
              : undefined
          }
          attention="red"
          badgeCount={counts.emergency}
        />

        <AdminStatCard
          href="/admin/users"
          icon={Users}
          label="Förare"
          subtitle={
            counts.users > 0
              ? `${counts.users} väntar på verifiering`
              : undefined
          }
          attention="orange"
          badgeCount={counts.users}
        />

        <AdminStatCard
          href="/admin/civilkoll"
          icon={ScanSearch}
          label="Civilkoll"
          subtitle={
            counts.civilkoll > 0
              ? `${counts.civilkoll} väntar`
              : undefined
          }
          attention="orange"
          badgeCount={counts.civilkoll}
        />

        <AdminStatCard
          href="/admin/alerts"
          icon={AlertTriangle}
          label="Varningar"
          value={counts.alerts}
        />

        <AdminStatCard
          href="/admin/support"
          icon={Headphones}
          label="Support"
          subtitle={
            counts.support > 0
              ? `${counts.support} ny${counts.support > 1 ? "a" : "tt"} förfrågan`
              : undefined
          }
          attention="blue"
          badgeCount={counts.support}
        />

        <AdminStatCard
          href="/admin/feedback"
          icon={MessageSquare}
          label="Feedback"
          subtitle={
            counts.feedback > 0
              ? `${counts.feedback} ny${counts.feedback > 1 ? "a" : "tt"} feedback`
              : undefined
          }
          attention="purple"
          badgeCount={counts.feedback}
        />

        <AdminStatCard
          href="/admin/partner"
          icon={Handshake}
          label="Partner"
          subtitle={
            counts.partner > 0
              ? `${counts.partner} ny${counts.partner > 1 ? "a" : "tt"} förfrågan`
              : undefined
          }
          attention="green"
          badgeCount={counts.partner}
        />

        <AdminStatCard
          href="/admin/deals"
          icon={Tag}
          label="Erbjudanden"
          value={activeDeals}
          subtitle="aktiva"
        />

        <AdminStatCard
          href="/admin/help"
          icon={BookOpen}
          label="Hjälp"
          value={liveHelp}
          subtitle="publicerade"
        />

        <AdminStatCard
          href="/admin/banners"
          icon={Image}
          label="Banners"
          value={activeBanners}
          subtitle="aktiva"
        />
      </div>
    </div>
  );
}
