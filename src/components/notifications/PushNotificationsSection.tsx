"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  enablePushNotifications,
  getCurrentPushSubscription,
  getNotificationPermission,
  hasActivePushSubscription,
  isPushSupported,
  pushFailureMessage,
  syncExistingPushSubscription,
  unsubscribeFromPush,
} from "@/lib/push";

interface PushNotificationsSectionProps {
  userId: string;
  pushEnabled: boolean;
  isAdmin?: boolean;
  onChange: (enabled: boolean, prompted?: boolean) => void;
  disabled?: boolean;
}

export function PushNotificationsSection({
  userId,
  pushEnabled,
  isAdmin = false,
  onChange,
  disabled,
}: PushNotificationsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [available, setAvailable] = useState(() => isPushSupported());
  const syncStarted = useRef(false);

  async function persistPushSettings(enabled: boolean, prompted: boolean) {
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        push_enabled: enabled,
        push_prompted: prompted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError && !isMissingSchemaError(dbError)) {
      throw dbError;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(
        `cabrader_push_prompted_${userId}`,
        prompted ? "1" : "0"
      );
    }

    onChange(enabled, prompted);
  }

  useEffect(() => {
    if (!userId || syncStarted.current) return;
    syncStarted.current = true;

    async function syncPushState() {
      const supported = isPushSupported();
      setAvailable(supported);

      if (!supported) {
        if (pushEnabled) {
          try {
            await persistPushSettings(false, true);
          } catch {
            onChange(false, true);
          }
        }
        return;
      }

      const permission = getNotificationPermission();
      if (permission === "denied" || permission === "unsupported") {
        if (pushEnabled) {
          try {
            await persistPushSettings(false, true);
          } catch {
            onChange(false, true);
          }
        }
        return;
      }

      const subscribed = await hasActivePushSubscription();
      if (subscribed) {
        const syncResult = await syncExistingPushSubscription();
        if (syncResult.ok || syncResult.reason === "database_failed") {
          if (!pushEnabled) {
            try {
              await persistPushSettings(true, true);
            } catch {
              onChange(true, true);
            }
          }
        }
        return;
      }

      if (pushEnabled) {
        try {
          await persistPushSettings(false, true);
        } catch {
          onChange(false, true);
        }
      }
    }

    void syncPushState();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount per user
  }, [userId]);

  async function handleToggle(checked: boolean) {
    if (!available) return;
    setLoading(true);
    setError(null);
    setTestMessage(null);

    try {
      if (checked) {
        const permission = getNotificationPermission();
        if (permission === "denied") {
          setError(pushFailureMessage("permission_denied"));
          setLoading(false);
          return;
        }

        const result = await enablePushNotifications();
        if (result.ok) {
          await persistPushSettings(true, true);
        } else {
          await persistPushSettings(false, true);
          setError(pushFailureMessage(result.reason));
        }
      } else {
        await unsubscribeFromPush();
        await persistPushSettings(false, true);
      }
    } catch (err) {
      console.error("[PUSH] Toggle failed:", err);
      setError("Det gick inte att uppdatera notiser.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestNotification() {
    setTestLoading(true);
    setTestMessage(null);
    setError(null);

    try {
      const subscription = await getCurrentPushSubscription();
      if (!subscription) {
        setTestMessage("Ingen aktiv push-prenumeration på den här enheten.");
        return;
      }

      const json = subscription.toJSON();
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint }),
      });

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        sent?: number;
      } | null;

      if (!res.ok) {
        setTestMessage(body?.error ?? "Testnotisen kunde inte skickas.");
        return;
      }

      setTestMessage(
        body?.sent ? "Testnotis skickad — kolla enheten." : "Ingen prenumeration att skicka till."
      );
    } catch (err) {
      console.error("[PUSH] Test notification failed:", err);
      setTestMessage("Testnotisen kunde inte skickas.");
    } finally {
      setTestLoading(false);
    }
  }

  const checkboxChecked = pushEnabled && available;

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-base font-semibold">Notiser</h2>
      <label className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
        <div className="min-w-0 flex-1 pr-3">
          <p className="font-medium">🔔 Push-notiser</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Få varningar även när appen är stängd.
          </p>
          {!available && (
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
          checked={checkboxChecked}
          disabled={disabled || loading || !available}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-accent"
          aria-label="Push-notiser"
        />
      </label>

      {isAdmin && available && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => void handleTestNotification()}
            disabled={disabled || testLoading || !checkboxChecked}
            className="rounded-xl border border-card-border bg-card px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {testLoading ? "Skickar…" : "🔔 Skicka testnotis"}
          </button>
          {testMessage && (
            <p className="mt-2 text-xs text-muted" role="status">
              {testMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
