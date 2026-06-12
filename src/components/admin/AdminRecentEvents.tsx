"use client";

import { AlertCard } from "@/components/alerts/AlertCard";
import type { DriverAlert } from "@/lib/types/database";

export function AdminRecentEvents({ events }: { events: DriverAlert[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-[18px] border border-dashed border-card-border p-6 text-center text-sm text-muted">
        Inga aktiva rapporter just nu.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.slice(0, 5).map((alert) => (
        <li key={alert.id}>
          <AlertCard alert={alert} compact />
        </li>
      ))}
    </ul>
  );
}
