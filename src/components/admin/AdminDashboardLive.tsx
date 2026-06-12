"use client";

import Link from "next/link";
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
import { AdminActivityMap } from "@/components/admin/AdminActivityMap";
import {
  AdminDashboardHeader,
  AdminStatCard,
} from "@/components/admin/AdminDashboardCards";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminRecentEvents } from "@/components/admin/AdminRecentEvents";
import { AdminRefreshIndicator } from "@/components/admin/AdminRefreshIndicator";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import {
  adminFirstName,
  buildAdminActionSummary,
} from "@/lib/admin-notifications";

interface AdminDashboardLiveProps {
  firstName: string;
}

export function AdminDashboardLive({ firstName }: AdminDashboardLiveProps) {
  const { snapshot } = useAdminCommandCenter();

  const counts = snapshot?.counts ?? {
    emergency: 0,
    alerts: 0,
    users: 0,
    feedback: 0,
    support: 0,
    partner: 0,
    civilkoll: 0,
  };
  const stats = snapshot?.stats ?? {
    activeDeals: 0,
    activeBanners: 0,
    liveHelp: 0,
    activeDrivers: 0,
  };

  const { lines: actionLines } = buildAdminActionSummary(counts);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <div className="flex items-start justify-between gap-3 py-2">
        <AdminDashboardHeader firstName={firstName} actionLines={actionLines} />
      </div>
      <AdminRefreshIndicator className="-mt-3 mb-4" />

      <AdminNav />

      <div className="mb-4 rounded-[18px] border border-card-border bg-card px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Aktiva förare
        </p>
        <p className="mt-1 text-2xl font-bold">{stats.activeDrivers}</p>
        <p className="mt-0.5 text-xs text-muted">Online senaste 30 min</p>
      </div>

      <AdminActivityMap />

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
            counts.civilkoll > 0 ? `${counts.civilkoll} väntar` : undefined
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
          value={stats.activeDeals}
          subtitle="aktiva"
        />

        <AdminStatCard
          href="/admin/help"
          icon={BookOpen}
          label="Hjälp"
          value={stats.liveHelp}
          subtitle="publicerade"
        />

        <AdminStatCard
          href="/admin/banners"
          icon={Image}
          label="Banners"
          value={stats.activeBanners}
          subtitle="aktiva"
        />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Senaste händelser</h2>
          <Link
            href="/admin/alerts"
            className="text-xs font-medium text-[#B0B6BE] hover:text-white"
          >
            Visa alla →
          </Link>
        </div>
        <AdminRecentEvents events={snapshot?.recentEvents ?? []} />
      </section>
    </div>
  );
}
