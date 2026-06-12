import { googleMapsLink } from "./constants";

export interface NavigationTarget {
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}

/** Full address line, e.g. "Rödbo, Göteborg". */
export function alertFullAddress(
  roadAddress: string | null | undefined,
  city: string | null | undefined
): string {
  const parts = [roadAddress?.trim(), city?.trim()].filter(Boolean);
  if (parts.length === 0) return "Okänd plats";
  return parts.join(", ");
}

function coordsPair(
  lat: number | null,
  lng: number | null
): { lat: number; lng: number } | null {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return { lat, lng };
}

/** Tesla in-car navigation deep link — coordinates preferred. */
export function teslaNavigateUrl(target: NavigationTarget): string | null {
  const { latitude, longitude, address } = target;
  const coords = coordsPair(latitude, longitude);
  if (coords) {
    return `https://www.tesla.com/_ak/navigate?lat=${coords.lat}&lon=${coords.lng}`;
  }
  const query = address?.trim();
  if (query) {
    return `https://www.tesla.com/_ak/navigate?query=${encodeURIComponent(query)}`;
  }
  return null;
}

/** Google Maps fallback when Tesla navigation is unavailable. */
export function navigationGoogleMapsUrl(target: NavigationTarget): string | null {
  const { latitude, longitude, address } = target;
  const coords = coordsPair(latitude, longitude);
  if (coords) {
    return googleMapsLink(coords.lat, coords.lng);
  }
  const query = address?.trim();
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}

export function formatCoordinate(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(6);
}
