import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAlertCurrentlyLive } from "@/lib/alert-ttl";
import type { DriverAlert } from "@/lib/types/database";
import { shouldPushNotify } from "@/lib/alerts";
import { playAlertChime } from "@/lib/push";

function filterLiveAlerts(alerts: DriverAlert[]): DriverAlert[] {
  return alerts.filter(isAlertCurrentlyLive);
}

export function useAlertsRealtime(
  initial: DriverAlert[],
  chimeEnabled: boolean
) {
  const [alerts, setAlerts] = useState<DriverAlert[]>(() =>
    filterLiveAlerts(initial)
  );

  const updateAlert = useCallback((alert: DriverAlert) => {
    setAlerts((prev) => {
      if (!isAlertCurrentlyLive(alert)) {
        return prev.filter((a) => a.id !== alert.id);
      }
      const idx = prev.findIndex((a) => a.id === alert.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = alert;
        return next;
      }
      return prev;
    });
  }, []);

  const handleInsert = useCallback(
    (alert: DriverAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id)) return prev;
        if (!isAlertCurrentlyLive(alert)) return prev;
        return [alert, ...prev];
      });

      if (chimeEnabled && shouldPushNotify(alert)) {
        playAlertChime();
      }
    },
    [chimeEnabled]
  );

  useEffect(() => {
    setAlerts(filterLiveAlerts(initial));
  }, [initial]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAlerts((prev) => filterLiveAlerts(prev));
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("driver_alerts_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "driver_alerts" },
        (payload) => handleInsert(payload.new as DriverAlert)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "driver_alerts" },
        (payload) => {
          const updated = payload.new as DriverAlert;
          setAlerts((prev) => {
            const idx = prev.findIndex((a) => a.id === updated.id);
            if (!isAlertCurrentlyLive(updated)) {
              return prev.filter((a) => a.id !== updated.id);
            }
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            if (chimeEnabled && shouldPushNotify(updated)) playAlertChime();
            return [updated, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleInsert, chimeEnabled]);

  return { alerts, updateAlert };
}
