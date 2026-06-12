"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { NETWORK_MAP_REFRESH_MS } from "@/lib/driver-activity";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";

const NetworkMapCanvas = dynamic(
  () => import("./ActivityMapCanvas").then((m) => m.NetworkMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px] animate-pulse rounded-xl bg-background/60" />
    ),
  }
);

function pointsSignature(points: AnonymizedActivityPoint[]): string {
  return points
    .map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`)
    .sort()
    .join("|");
}

export function AdminActivityMap() {
  const [points, setPoints] = useState<AnonymizedActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity-map", { cache: "no-store" });
      const data = (await res.json()) as {
        points?: AnonymizedActivityPoint[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Kunde inte ladda karta.");
        return;
      }

      const next = data.points ?? [];
      const nextSignature = pointsSignature(next);
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setPoints(next);
      }
      setError(null);
    } catch {
      setError("Kunde inte ladda karta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), NETWORK_MAP_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <section className="mb-4 rounded-[18px] border border-card-border bg-card p-4">
      <h2 className="text-sm font-semibold">Nätverkskarta</h2>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Ungefärlig närvaro från senaste 15 minuterna · uppdateras var 5:e minut.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-card-border">
        {loading ? (
          <div className="flex h-[180px] items-center justify-center bg-background/40 text-xs text-muted">
            Laddar karta…
          </div>
        ) : error ? (
          <div className="flex h-[180px] items-center justify-center bg-background/40 px-4 text-center text-xs text-muted">
            {error}
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center bg-background/40 px-4 text-center text-xs text-muted">
            Inga aktiva förare att visa
          </div>
        ) : (
          <NetworkMapCanvas points={points} />
        )}
      </div>
    </section>
  );
}
