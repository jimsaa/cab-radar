"use client";

import { useEffect, useState } from "react";
import { geolocationErrorMessage } from "@/lib/geolocation-errors";
import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";

export interface AutoLocationState {
  latitude: number | null;
  longitude: number | null;
  roadAddress: string | null;
  city: string | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

export function useAutoLocation(enabled: boolean): AutoLocationState {
  const [state, setState] = useState<AutoLocationState>({
    latitude: null,
    longitude: null,
    roadAddress: null,
    city: null,
    loading: enabled,
    ready: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function capture() {
      setState((prev) => ({
        ...prev,
        loading: true,
        ready: false,
        error: null,
      }));

      try {
        const pos = await getCurrentPosition();
        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          latitude: pos.latitude,
          longitude: pos.longitude,
        }));

        const geo = await reverseGeocode(pos.latitude, pos.longitude);
        if (cancelled) return;

        setState({
          latitude: pos.latitude,
          longitude: pos.longitude,
          roadAddress: geo.road_address,
          city: geo.city,
          loading: false,
          ready: true,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          ready: false,
          error: geolocationErrorMessage(err),
        }));
      }
    }

    void capture();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

export function formatLocationLine(
  roadAddress: string | null,
  city: string | null,
  latitude: number | null,
  longitude: number | null
): string | null {
  const named = [roadAddress, city].filter(Boolean).join(", ");
  if (named) return named;
  if (latitude != null && longitude != null) {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
  return null;
}
