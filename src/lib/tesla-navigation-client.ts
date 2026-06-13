"use client";

import {
  formatTeslaCoordinatePair,
  teslaNavigateHttpsUrl,
  teslaNavigateSchemeUrl,
} from "@/lib/tesla-navigation";

const SCHEME_TIMEOUT_MS = 1500;

async function probeTeslaHttps(lat: number, lng: number): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/tesla/navigate-probe?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch (err) {
    console.warn("[TESLA NAV] HTTPS probe request failed:", err);
    return false;
  }
}

function tryTeslaScheme(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("blur", onBlur);
      window.clearTimeout(timer);
      resolve(success);
    };

    const onBlur = () => finish(true);
    window.addEventListener("blur", onBlur);

    const timer = window.setTimeout(() => finish(false), SCHEME_TIMEOUT_MS);

    window.location.assign(url);
  });
}

export type TeslaNavigationFallbackCoords = { lat: number; lng: number };

/**
 * Opens Tesla navigation with HTTPS → tesla:// fallback chain.
 * Calls onFallback when both methods fail.
 */
export async function openTeslaNavigation(
  lat: number,
  lng: number,
  onFallback: (coords: TeslaNavigationFallbackCoords) => void
): Promise<void> {
  const httpsUrl = teslaNavigateHttpsUrl(lat, lng);
  const schemeUrl = teslaNavigateSchemeUrl(lat, lng);

  console.log("[TESLA NAV] Attempting method 1: HTTPS", httpsUrl);
  const httpsOk = await probeTeslaHttps(lat, lng);

  if (httpsOk) {
    console.log("[TESLA NAV] HTTPS probe OK — opening", httpsUrl);
    window.location.assign(httpsUrl);
    return;
  }

  console.warn("[TESLA NAV] HTTPS method failed");

  console.log("[TESLA NAV] Attempting method 2: tesla:// scheme", schemeUrl);
  const schemeOk = await tryTeslaScheme(schemeUrl);

  if (schemeOk) {
    console.log("[TESLA NAV] tesla:// scheme succeeded");
    return;
  }

  console.warn("[TESLA NAV] tesla:// scheme failed");
  console.warn(
    "[TESLA NAV] All methods failed — showing manual fallback for",
    formatTeslaCoordinatePair(lat, lng)
  );
  onFallback({ lat, lng });
}
