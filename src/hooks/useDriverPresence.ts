"use client";

import { useEffect } from "react";

const PRESENCE_INTERVAL_MS = 5 * 60 * 1000;

async function postPresence(latitude: number, longitude: number): Promise<void> {
  await fetch("/api/profile/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
}

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 12_000,
    });
  });
}

/** Updates last-known location for nearby emergency push targeting. */
export function useDriverPresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    async function syncPresence() {
      try {
        const position = await readPosition();
        await postPresence(
          position.coords.latitude,
          position.coords.longitude
        );
      } catch {
        // Presence is best-effort — no user-facing error
      }
    }

    void syncPresence();
    const interval = window.setInterval(syncPresence, PRESENCE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [enabled]);
}
