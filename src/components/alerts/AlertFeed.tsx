"use client";

import { AlertCard } from "./AlertCard";
import type { DriverAlert } from "@/lib/types/database";

interface AlertFeedProps {
  alerts: DriverAlert[];
  onVote?: (alertId: string, vote: 1 | -1) => void;
  onCloseEmergency?: (alertId: string) => void;
  currentUserId?: string | null;
}

export function AlertFeed({
  alerts,
  onVote,
  onCloseEmergency,
  currentUserId,
}: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
        <p className="text-4xl mb-2">📡</p>
        <p className="font-medium">Inga varningar</p>
        <p className="mt-1 text-sm text-muted">
          Tryck + för att rapportera.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <AlertCard
            alert={alert}
            onVote={onVote}
            onCloseEmergency={onCloseEmergency}
            currentUserId={currentUserId}
          />
        </li>
      ))}
    </ul>
  );
}
