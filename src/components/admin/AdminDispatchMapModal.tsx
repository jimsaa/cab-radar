"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { useAdminDispatchMap } from "@/contexts/AdminDispatchMapContext";
import { buildDispatchMapReports } from "@/lib/admin-dispatch-map";
import { NETWORK_MAP_REFRESH_MS } from "@/lib/driver-activity";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";

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

export function AdminDispatchMapModal() {
  const { isOpen, focusReportId, closeMap } = useAdminDispatchMap();
  const { snapshot } = useAdminCommandCenter();
  const [driverPoints, setDriverPoints] = useState<AnonymizedActivityPoint[]>(
    []
  );
  const [mounted, setMounted] = useState(false);

  const [fitToken, setFitToken] = useState(0);

  const reports = useMemo(
    () => buildDispatchMapReports(snapshot),
    [snapshot]
  );

  useEffect(() => {
    if (isOpen) setFitToken((token) => token + 1);
  }, [isOpen, focusReportId]);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadDrivers();
    const interval = window.setInterval(() => void loadDrivers(), NETWORK_MAP_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [isOpen, loadDrivers]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMap();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeMap]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const markerCount = reports.length + driverPoints.length;

  return createPortal(
    <div
      className="admin-dispatch-map-overlay fixed inset-0 z-[600] flex items-center justify-center bg-black/75 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Utökad nätverkskarta"
    >
      <div className="relative flex h-[88vh] w-[min(96vw,1400px)] flex-col overflow-hidden rounded-[20px] border border-[#3A4048] bg-[#1E2125] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#3A4048] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Nätverkskarta
            </h2>
            <p className="mt-0.5 text-sm text-[#8A9099] sm:text-base">
              {reports.length} aktiva rapporter · {driverPoints.length} förare
              {markerCount === 0 ? " · inga markörer" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={closeMap}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border border-[#3A4048] bg-[#262B31] text-white transition hover:bg-[#323840] active:scale-95"
            aria-label="Stäng karta"
          >
            <X className="h-8 w-8" strokeWidth={2.5} />
          </button>
        </header>

        <div className="min-h-0 flex-1">
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
    </div>,
    document.body
  );
}
