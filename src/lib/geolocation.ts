import type { ReverseGeocodeResult } from "./types/database";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speedMps?: number | null;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS stöds inte"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speedMps: pos.coords.speed,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

export function watchPosition(
  onUpdate: (position: GeoPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): () => void {
  if (!navigator.geolocation) {
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onUpdate({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speedMps: pos.coords.speed,
      }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );

  return () => navigator.geolocation.clearWatch(id);
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const res = await fetch("/api/geocode/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });

  if (!res.ok) {
    return { road_address: null, city: null };
  }

  return res.json();
}
