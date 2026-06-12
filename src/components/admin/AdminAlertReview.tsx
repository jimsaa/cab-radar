"use client";

import { AlertCard } from "@/components/alerts/AlertCard";
import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";
import { adminVerifyAlert } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/client";
import type { DriverAlert } from "@/lib/types/database";

export function AdminAlertReview({ alerts }: { alerts: DriverAlert[] }) {
  const commandCenter = useAdminCommandCenterOptional();

  async function review(alertId: string, approved: boolean) {
    const supabase = createClient();
    await adminVerifyAlert(supabase, alertId, approved);

    if (approved) {
      const { data: alert } = await supabase
        .from("driver_alerts")
        .select("*")
        .eq("id", alertId)
        .single();
      if (alert) {
        await fetch("/api/alerts/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(alert),
        });
      }
    }

    void commandCenter?.refresh();
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted">Inga varningar att granska.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {alerts.map((alert) => (
        <li key={alert.id} className="space-y-3">
          <AlertCard alert={alert} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => review(alert.id, true)}
              className="btn-primary flex-1 !min-h-[44px]"
            >
              Godkänn
            </button>
            <button
              type="button"
              onClick={() => review(alert.id, false)}
              className="btn-danger flex-1"
            >
              Neka
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
