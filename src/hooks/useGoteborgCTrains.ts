"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoteborgC_CACHE_TTL_MS,
  type GoteborgCTrainsSnapshot,
} from "@/lib/goteborg-c-trains";

export function useGoteborgCTrains() {
  const [snapshot, setSnapshot] = useState<GoteborgCTrainsSnapshot | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/trains/goteborg-c");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as GoteborgCTrainsSnapshot;
      setSnapshot(data);
    } catch {
      setSnapshot((prev) =>
        prev ?? {
          available: false,
          fetchedAt: new Date().toISOString(),
          status: "unavailable",
          disruptionCount: 0,
          summaryLine: "ej tillgänglig",
          adminLabel: "Göteborg C ej tillgänglig",
          departures: [],
        }
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), GoteborgC_CACHE_TTL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { snapshot, loading, refresh };
}
