import {
  buildGoteborgCTrainsSnapshot,
  GoteborgC_CACHE_TTL_MS,
  GoteborgC_SOURCE_URL,
  parseTagtiderDepartures,
  unavailableGoteborgCSnapshot,
  type GoteborgCTrainsSnapshot,
} from "./goteborg-c-trains";

let cached: GoteborgCTrainsSnapshot | null = null;
let cacheExpiresAt = 0;
let inflight: Promise<GoteborgCTrainsSnapshot> | null = null;

export async function fetchGoteborgCTrainsSnapshot(): Promise<GoteborgCTrainsSnapshot> {
  const now = Date.now();
  if (cached && now < cacheExpiresAt) {
    return cached;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(GoteborgC_SOURCE_URL, {
        headers: {
          "User-Agent": "CabRadar/1.0 (+https://www.cabradar.se)",
          Accept: "text/html",
        },
        next: { revalidate: Math.floor(GoteborgC_CACHE_TTL_MS / 1000) },
      });

      if (!res.ok) {
        throw new Error(`tagtider responded ${res.status}`);
      }

      const html = await res.text();
      const departures = parseTagtiderDepartures(html);
      const snapshot = buildGoteborgCTrainsSnapshot(
        departures,
        new Date().toISOString()
      );

      cached = snapshot;
      cacheExpiresAt = Date.now() + GoteborgC_CACHE_TTL_MS;
      return snapshot;
    } catch (err) {
      console.warn("[Göteborg C] fetch failed:", err);
      const fallback = unavailableGoteborgCSnapshot(new Date().toISOString());
      cached = fallback;
      cacheExpiresAt = Date.now() + 60_000;
      return fallback;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
