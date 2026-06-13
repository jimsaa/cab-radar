"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminDispatchMap } from "@/contexts/AdminDispatchMapContext";
import { NETWORK_MAP_REFRESH_MS } from "@/lib/driver-activity";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";
import { networkMapOverlayMessage } from "@/lib/network-map-messages";
import { cn } from "@/lib/utils";

const NetworkMapCanvas = dynamic(
  () => import("./ActivityMapCanvas").then((m) => m.NetworkMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-[12px] bg-[#1B1E22]/80" />
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
  const { openMap } = useAdminDispatchMap();
  const [points, setPoints] = useState<AnonymizedActivityPoint[]>([]);
  const [activeDriverCount, setActiveDriverCount] = useState(0);
  const [positionCount, setPositionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const signatureRef = useRef("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity-map", { cache: "no-store" });
      const data = (await res.json()) as {
        points?: AnonymizedActivityPoint[];
        activeDriverCount?: number;
        positionCount?: number;
        unavailable?: boolean;
        error?: string;
      };

      if (!res.ok || data.unavailable) {
        console.error("[NETWORK MAP] fetch failed:", data.error ?? res.status);
        setUnavailable(true);
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
      setUnavailable(false);
    } catch (err) {
      console.error("[NETWORK MAP] load error:", err);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), NETWORK_MAP_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const overlayMessage = networkMapOverlayMessage(
    activeDriverCount,
    positionCount,
    unavailable
  );

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

      <button
        type="button"
        onClick={() => openMap()}
        className="group relative block w-full overflow-hidden rounded-[12px] border border-[#3A4048] text-left transition hover:border-[#4B5563] active:scale-[0.995]"
        aria-label="Öppna nätverkskarta i helskärm"
      >
        {loading ? (
          <div
            className="flex items-center justify-center bg-[#1B1E22]/80 text-xs text-[#8A9099]"
            style={{ height }}
          >
            Laddar karta…
          </div>
        ) : (
          <>
            <NetworkMapCanvas
              points={points}
              height={height}
              interactive={false}
              overlayMessage={overlayMessage}
            />
            <span
              className="pointer-events-none absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#3A4048]/80 bg-[#1E2125]/90 text-base text-[#B0B6BE] shadow-sm transition group-hover:border-[#4B5563] group-hover:text-white"
              aria-hidden
            >
              ⛶
            </span>
          </>
        )}
      </button>
    </div>
  );
}
