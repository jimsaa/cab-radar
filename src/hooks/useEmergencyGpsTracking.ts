"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DriverAlert } from "@/lib/types/database";
import { watchPosition } from "@/lib/geolocation";

const GPS_UPDATE_INTERVAL_MS = 30000;

interface UseEmergencyGpsTrackingOptions {
  alerts: DriverAlert[];
  userId: string | null;
  enabled: boolean;
}

export function useEmergencyGpsTracking({
  alerts,
  userId,
  enabled,
}: UseEmergencyGpsTrackingOptions) {
  const lastSentRef = useRef(0);
  const latestPosRef = useRef<{
    latitude: number;
    longitude: number;
    speedMps?: number | null;
  } | null>(null);

  const ownEmergencies = useMemo(
    () =>
      enabled
        ? alerts.filter(
            (a) =>
              a.type === "taxi_emergency" &&
              a.status === "active" &&
              a.created_by === userId
          )
        : [],
    [alerts, enabled, userId]
  );

  const emergencyIds = ownEmergencies.map((a) => a.id).join(",");

  useEffect(() => {
    if (!enabled || !userId || ownEmergencies.length === 0) return;

    async function sendUpdate() {
      const pos = latestPosRef.current;
      if (!pos) return;

      const now = Date.now();
      if (now - lastSentRef.current < GPS_UPDATE_INTERVAL_MS) return;
      lastSentRef.current = now;

      for (const alert of ownEmergencies) {
        await fetch("/api/alerts/emergency-gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId: alert.id,
            latitude: pos.latitude,
            longitude: pos.longitude,
            speedMps: pos.speedMps ?? null,
          }),
        }).catch(() => {});
      }
    }

    const stopWatch = watchPosition((pos) => {
      latestPosRef.current = pos;
      void sendUpdate();
    });

    const interval = setInterval(() => {
      void sendUpdate();
    }, GPS_UPDATE_INTERVAL_MS);

    return () => {
      stopWatch();
      clearInterval(interval);
    };
  }, [enabled, userId, emergencyIds, ownEmergencies]);
}
