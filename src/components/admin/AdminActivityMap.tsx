"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";

const ActivityMapCanvas = dynamic(
  () => import("./ActivityMapCanvas").then((m) => m.ActivityMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px] animate-pulse rounded-xl bg-background/60" />
    ),
  }
);

const REFRESH_MS = 60_000;

export function AdminActivityMap() {
  const [points, setPoints] = useState<AnonymizedActivityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      setPoints(data.points ?? []);
      setError(null);
    } catch {
      setError("Kunde inte ladda karta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  return (
    <section className="mb-4 rounded-[18px] border border-card-border bg-card p-4">
      <h2 className="text-sm font-semibold">🗺 Aktivitetskarta</h2>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Visar anonymiserad aktivitet från de senaste 15 minuterna.
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
            Ingen anonymiserad aktivitet att visa ännu.
          </div>
        ) : (
          <ActivityMapCanvas points={points} />
        )}
      </div>

      {!loading && !error && points.length > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          {points.length} anonymiserad{points.length === 1 ? "" : "a"} punkt
          {points.length === 1 ? "" : "er"} (15 min fördröjning, max 24 timmar).
        </p>
      )}
    </section>
  );
}
