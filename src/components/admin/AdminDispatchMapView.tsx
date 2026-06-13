"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { buildDispatchMapReports } from "@/lib/admin-dispatch-map";
import { NETWORK_MAP_REFRESH_MS } from "@/lib/driver-activity";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";
import { cn } from "@/lib/utils";

const DispatchMapCanvas = dynamic(
  () => import("./DispatchMapCanvas").then((m) => m.DispatchMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-lg text-[#8A9099]">
        Laddar karta…
      </div>
    ),
  }
);

export function useDispatchMapData(
  active: boolean,
  focusReportId: string | null
) {
  const { snapshot } = useAdminCommandCenter();
  const [driverPoints, setDriverPoints] = useState<AnonymizedActivityPoint[]>(
    []
  );
  const [fitToken, setFitToken] = useState(0);

  const reports = useMemo(
    () => buildDispatchMapReports(snapshot),
    [snapshot]
  );

  useEffect(() => {
    if (active) setFitToken((token) => token + 1);
  }, [active, focusReportId]);

  const loadDrivers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity-map", { cache: "no-store" });
      const data = (await res.json()) as {
        points?: AnonymizedActivityPoint[];
        unavailable?: boolean;
      };
      if (!res.ok || data.unavailable) return;
      setDriverPoints(data.points ?? []);
    } catch (err) {
      console.error("[DISPATCH MAP] load error:", err);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadDrivers();
    const interval = window.setInterval(
      () => void loadDrivers(),
      NETWORK_MAP_REFRESH_MS
    );
    return () => window.clearInterval(interval);
  }, [active, loadDrivers]);

  return { reports, driverPoints, fitToken };
}

interface AdminDispatchMapViewProps {
  mode: "modal" | "page";
  focusReportId?: string | null;
  onClose?: () => void;
  className?: string;
}

export function AdminDispatchMapView({
  mode,
  focusReportId = null,
  onClose,
  className,
}: AdminDispatchMapViewProps) {
  const isActive = mode === "page" || Boolean(onClose);
  const { reports, driverPoints, fitToken } = useDispatchMapData(
    isActive,
    focusReportId
  );

  const markerCount = reports.length + driverPoints.length;
  const focusQuery = focusReportId
    ? `?focus=${encodeURIComponent(focusReportId)}`
    : "";

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden bg-[#1E2125]",
        mode === "page" ? "h-full" : "h-full rounded-[20px] border border-[#3A4048]",
        className
      )}
    >
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-[#3A4048] bg-[#1E2125] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          {mode === "page" && (
            <Link
              href="/admin"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-[#3A4048] bg-[#262B31] text-white transition hover:bg-[#323840] active:scale-95"
              aria-label="Tillbaka till dashboard"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
            </Link>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Nätverkskarta
            </h2>
            <p className="mt-0.5 text-xs text-[#8A9099] sm:text-sm">
              {reports.length} aktiva rapporter · {driverPoints.length} förare
              {markerCount === 0 ? " · inga markörer" : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {mode === "modal" && (
            <Link
              href={`/admin/map${focusQuery}`}
              onClick={onClose}
              className="hidden items-center gap-1.5 rounded-[12px] border border-[#3A4048] bg-[#262B31] px-3 py-2.5 text-sm font-semibold text-[#B0B6BE] transition hover:text-white sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
              Helsida
            </Link>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#3A4048] bg-[#262B31] text-white transition hover:bg-[#323840] active:scale-95 sm:h-14 sm:w-14"
              aria-label="Stäng karta"
            >
              <X className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-[1000] flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#3A4048] bg-[#1E2125]/95 text-white shadow-lg backdrop-blur-sm transition hover:bg-[#262B31] active:scale-95 sm:right-4 sm:top-4"
            aria-label="Stäng karta"
          >
            <X className="h-8 w-8" strokeWidth={2.5} />
          </button>
        )}

        <DispatchMapCanvas
          driverPoints={driverPoints}
          reports={reports}
          focusReportId={focusReportId}
          fitToken={fitToken}
          height="100%"
          className="h-full"
        />
      </div>
    </div>
  );
}
