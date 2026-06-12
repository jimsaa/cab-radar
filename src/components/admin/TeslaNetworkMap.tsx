"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { NETWORK_MAP_REFRESH_MS } from "@/lib/driver-activity";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";
import { networkMapEmptyMessage } from "@/lib/network-map-messages";
import { cn } from "@/lib/utils";

const NetworkMapCanvas = dynamic(
  () => import("./ActivityMapCanvas").then((m) => m.NetworkMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[280px] animate-pulse rounded-[12px] bg-[#1B1E22]/80"
      />
    ),
  }
);

function pointsSignature(points: AnonymizedActivityPoint[]): string {
  return points
    .map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`)
    .sort()
    .join("|");
}

/** Tesla dispatch network overview — approximate driver presence, not live tracking. */
export function TeslaNetworkMap({
  height = 280,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const [points, setPoints] = useState<AnonymizedActivityPoint[]>([]);
  const [activeDriverCount, setActiveDriverCount] = useState(0);
  const [positionCount, setPositionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signatureRef = useRef("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity-map", { cache: "no-store" });
      const data = (await res.json()) as {
        points?: AnonymizedActivityPoint[];
        activeDriverCount?: number;
        positionCount?: number;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Kunde inte ladda nätverkskarta.");
        return;
      }

      const next = data.points ?? [];
      const nextSignature = pointsSignature(next);
      if (nextSignature !== signatureRef.current) {
        signatureRef.current = nextSignature;
        setPoints(next);
      }
      setActiveDriverCount(data.activeDriverCount ?? 0);
      setPositionCount(data.positionCount ?? 0);
      setError(null);
    } catch {
      setError("Kunde inte ladda nätverkskarta.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), NETWORK_MAP_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const emptyMessage = networkMapEmptyMessage(activeDriverCount, positionCount);

  return (
    <div className={cn("shrink-0 px-4 py-3", className)}>
      <div className="mb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
          Nätverkskarta
        </h3>
        <p className="mt-0.5 text-[10px] text-[#8A9099]">
          Ungefärlig närvaro · uppdateras var 5:e minut
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#3A4048]">
        {loading ? (
          <div
            className="flex items-center justify-center bg-[#1B1E22]/80 text-xs text-[#8A9099]"
            style={{ height }}
          >
            Laddar karta…
          </div>
        ) : error ? (
          <div
            className="flex items-center justify-center bg-[#1B1E22]/80 px-4 text-center text-xs text-[#8A9099]"
            style={{ height }}
          >
            {error}
          </div>
        ) : points.length === 0 ? (
          <div
            className="flex items-center justify-center bg-[#1B1E22]/80 px-4 text-center text-sm text-[#8A9099]"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          <NetworkMapCanvas points={points} height={height} />
        )}
      </div>
    </div>
  );
}
