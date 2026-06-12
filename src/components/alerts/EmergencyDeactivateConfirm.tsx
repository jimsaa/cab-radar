"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface EmergencyDeactivateConfirmProps {
  alertId: string;
  onClosed: () => void;
  onCancel: () => void;
}

export async function closeOwnEmergency(alertId: string): Promise<void> {
  const res = await fetch("/api/alerts/close-emergency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Kunde inte avsluta");
  }
}

export function EmergencyDeactivateConfirm({
  alertId,
  onClosed,
  onCancel,
}: EmergencyDeactivateConfirmProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOk() {
    setError(null);
    setSubmitting(true);
    try {
      await closeOwnEmergency(alertId);
      onClosed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte avsluta");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="px-1 py-2 text-center">
        <p className="text-sm font-normal text-foreground/90">Allt är OK?</p>
      </div>

      {error && (
        <p className="mt-2 text-center text-xs text-muted">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex flex-1 items-center justify-center rounded-xl border border-card-border bg-card/40 py-3 text-xs font-normal text-muted transition active:scale-[0.98]"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={handleOk}
          disabled={submitting}
          className="flex flex-1 items-center justify-center rounded-xl bg-success py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Jag är OK"
          )}
        </button>
      </div>
    </div>
  );
}
