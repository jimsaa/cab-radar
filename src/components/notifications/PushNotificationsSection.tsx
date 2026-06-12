"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  enablePushNotifications,
  getNotificationPermission,
  isPushSupported,
  unsubscribeFromPush,
} from "@/lib/push";

interface PushNotificationsSectionProps {
  userId: string;
  pushEnabled: boolean;
  onChange: (enabled: boolean, prompted?: boolean) => void;
  disabled?: boolean;
}

export function PushNotificationsSection({
  userId,
  pushEnabled,
  onChange,
  disabled,
}: PushNotificationsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isPushSupported();

  async function persistPushSettings(enabled: boolean, prompted: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        push_enabled: enabled,
        push_prompted: prompted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error && !isMissingSchemaError(error)) {
      throw error;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(`cabrader_push_prompted_${userId}`, prompted ? "1" : "0");
    }

    onChange(enabled, prompted);
  }

  async function handleToggle(checked: boolean) {
    if (!supported) return;
    setLoading(true);
    setError(null);

    try {
      if (checked) {
        const permission = getNotificationPermission();
        if (permission === "denied") {
          setError(
            "Notiser är blockerade i webbläsaren. Aktivera dem i enhetsinställningarna."
          );
          setLoading(false);
          return;
        }

        const result = await enablePushNotifications();
        if (result === "denied") {
          await persistPushSettings(false, true);
          setError("Notiser nekades. Du kan aktivera dem senare här.");
        } else if (result === "granted") {
          await persistPushSettings(true, true);
        } else {
          setError("Det gick inte att aktivera push-notiser.");
        }
      } else {
        await unsubscribeFromPush();
        await persistPushSettings(false, true);
      }
    } catch {
      setError("Det gick inte att uppdatera notiser.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-base font-semibold">Notiser</h2>
      <label className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
        <div className="min-w-0 flex-1 pr-3">
            <p className="font-medium">🔔 Push-notiser</p>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Få varningar även när appen är stängd.
            </p>
            {!supported && (
              <p className="mt-2 text-xs text-muted">
                Push-notiser stöds inte i den här webbläsaren.
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs text-danger" role="alert">
                {error}
              </p>
            )}
        </div>
        <input
          type="checkbox"
          checked={pushEnabled && supported}
          disabled={disabled || loading || !supported}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-accent"
          aria-label="Push-notiser"
        />
      </label>
    </section>
  );
}
