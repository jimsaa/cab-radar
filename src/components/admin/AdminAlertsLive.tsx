"use client";

import { AdminActiveAlerts } from "@/components/admin/AdminActiveAlerts";
import { AdminAlertReview } from "@/components/admin/AdminAlertReview";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import type { DriverAlert } from "@/lib/types/database";

interface AdminAlertsLiveProps {
  initialActive: DriverAlert[];
  initialPending: DriverAlert[];
}

export function AdminAlertsLive({
  initialActive,
  initialPending,
}: AdminAlertsLiveProps) {
  const { snapshot } = useAdminCommandCenter();

  const active = snapshot?.activeAlerts ?? initialActive;
  const pending = snapshot?.pendingAlerts ?? initialPending;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <AdminPageHeader title="Varningar" />

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
