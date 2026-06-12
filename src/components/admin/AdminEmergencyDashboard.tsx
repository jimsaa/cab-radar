"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminEmergencyDetail } from "@/components/admin/AdminEmergencyDetail";
import { AdminEmergencyListCard } from "@/components/admin/AdminEmergencyListCard";
import { type EmergencyAlertWithDriver } from "@/lib/emergency";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw } from "lucide-react";

interface AdminEmergencyDashboardProps {
  initialEmergencies: EmergencyAlertWithDriver[];
  initialSelectedId?: string | null;
  fetchError?: string | null;
  canViewPhone: boolean;
}

function defaultSelectedId(
  emergencies: EmergencyAlertWithDriver[],
  initialSelectedId?: string | null
): string | null {
  if (initialSelectedId && emergencies.some((e) => e.id === initialSelectedId)) {
    return initialSelectedId;
  }
  if (emergencies.length === 1) {
    return emergencies[0]!.id;
  }
  return null;
}

export function AdminEmergencyDashboard({
  initialEmergencies,
  initialSelectedId,
  fetchError,
  canViewPhone,
}: AdminEmergencyDashboardProps) {
  const router = useRouter();
  const [emergencies, setEmergencies] =
    useState<EmergencyAlertWithDriver[]>(initialEmergencies);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    defaultSelectedId(initialEmergencies, initialSelectedId)
  );
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    setEmergencies(initialEmergencies);
    setSelectedId((prev) => {
      if (prev && initialEmergencies.some((e) => e.id === prev)) {
        return prev;
      }
      return defaultSelectedId(initialEmergencies, initialSelectedId);
    });
  }, [initialEmergencies, initialSelectedId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin_emergency_alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_alerts",
          filter: "type=eq.taxi_emergency",
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const closeEmergency = useCallback(
    async (alertId: string) => {
      if (!window.confirm("Markera nödläget som löst?")) return;
      setClosingId(alertId);

      const res = await fetch("/api/alerts/close-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });

      setClosingId(null);

      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Kunde inte avsluta nödläge.");
        return;
      }

      setEmergencies((prev) => {
        const next = prev.filter((e) => e.id !== alertId);
        setSelectedId((current) => {
          if (current !== alertId) return current;
          if (next.length === 1) return next[0]!.id;
          return null;
        });
        return next;
      });
      router.refresh();
    },
    [router]
  );

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-center">
        <p className="font-medium text-danger">Kunde inte ladda nödlägen</p>
        <p className="mt-2 text-sm text-muted break-words">{fetchError}</p>
      </div>
    );
  }

  if (emergencies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
        <p className="text-3xl mb-2">✓</p>
        <p className="font-medium">Inga aktiva nödlägen</p>
        <p className="mt-1 text-sm text-muted">
          Aktiva Taxi i nöd-varningar visas här i realtid.
        </p>
      </div>
    );
  }

  const selected = selectedId
    ? emergencies.find((e) => e.id === selectedId) ?? null
    : null;

  if (selected) {
    return (
      <AdminEmergencyDetail
        alert={selected}
        closing={closingId === selected.id}
        showBack={emergencies.length > 1}
        canViewPhone={canViewPhone}
        onBack={() => setSelectedId(null)}
        onClose={() => closeEmergency(selected.id)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {emergencies.length} aktiv{emergencies.length === 1 ? "t" : "a"}{" "}
          nödläge{emergencies.length === 1 ? "" : "n"}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Uppdatera
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {emergencies.map((alert) => (
          <li key={alert.id}>
            <AdminEmergencyListCard
              alert={alert}
              onSelect={() => setSelectedId(alert.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
