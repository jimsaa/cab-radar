"use client";

import { useState } from "react";
import { AlertCard } from "@/components/alerts/AlertCard";
import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";
import { isEmergencyAlertType } from "@/lib/emergency-rules";
import type { DriverAlert } from "@/lib/types/database";

interface AdminActiveAlertsProps {
  alerts: DriverAlert[];
}

export function AdminActiveAlerts({ alerts }: AdminActiveAlertsProps) {
  const commandCenter = useAdminCommandCenterOptional();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeAlert(alertId: string, isEmergency: boolean) {
    const message = isEmergency
      ? "Avsluta detta nödläge? Kontakta föraren om du inte redan gjort det."
      : "Ta bort denna varning omedelbart?";
    if (!window.confirm(message)) return;

    setRemovingId(alertId);
    const res = await fetch("/api/admin/remove-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
    setRemovingId(null);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? "Kunde inte ta bort varningen.");
      return;
    }

    void commandCenter?.refresh();
  }

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted">Inga aktiva varningar just nu.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {alerts.map((alert) => {
        const isEmergency = isEmergencyAlertType(alert.type);
        return (
          <li key={alert.id} className="space-y-3">
            <AlertCard alert={alert} />
            <button
              type="button"
              disabled={removingId === alert.id}
              onClick={() => removeAlert(alert.id, isEmergency)}
              className="btn-danger w-full !min-h-[44px] disabled:opacity-50"
            >
              {removingId === alert.id
                ? "Tar bort…"
                : isEmergency
                  ? "✅ Avsluta nödläge"
                  : "Ta bort"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
