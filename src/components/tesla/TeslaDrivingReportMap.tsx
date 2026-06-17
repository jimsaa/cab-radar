"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { LiveFeedItem } from "@/lib/admin-command-center";
import { liveFeedItemToDispatchReport } from "@/lib/admin-dispatch-map";
import { formatCoordinate } from "@/lib/tesla-navigation";
import { cn } from "@/lib/utils";

const DispatchMapCanvas = dynamic(
  () => import("@/components/admin/DispatchMapCanvas").then((m) => m.DispatchMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex animate-pulse items-center justify-center rounded-[12px] bg-[#1B1E22]/80 text-xs text-[#8A9099]">
        Laddar karta…
      </div>
    ),
  }
);

interface TeslaDrivingReportMapProps {
  selectedItem: LiveFeedItem | null;
  height?: number;
  className?: string;
}

/** Embedded map for Tesla / Tab driving mode — centers on the selected report. */
export function TeslaDrivingReportMap({
  selectedItem,
  height = 240,
  className,
}: TeslaDrivingReportMapProps) {
  const [fitToken, setFitToken] = useState(0);

  const report = useMemo(
    () => (selectedItem ? liveFeedItemToDispatchReport(selectedItem) : null),
    [selectedItem]
  );

  useEffect(() => {
    if (report) setFitToken((token) => token + 1);
  }, [report?.id, report?.latitude, report?.longitude]);

  const locationLabel = selectedItem?.address || selectedItem?.location;
  const hasCoords =
    selectedItem?.latitude != null && selectedItem?.longitude != null;

  return (
    <div className={cn("shrink-0 border-t border-[#3A4048] px-4 py-3", className)}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
        Plats på karta
      </h3>

      {report ? (
        <>
          <div
            className="mt-2 overflow-hidden rounded-[12px] border border-[#3A4048]"
            style={{ height }}
          >
            <DispatchMapCanvas
              driverPoints={[]}
              reports={[report]}
              focusReportId={report.id}
              fitToken={fitToken}
              height={height}
            />
          </div>

          {locationLabel && (
            <p className="mt-2 text-sm font-semibold leading-snug text-white">
              {locationLabel}
            </p>
          )}

          {hasCoords && (
            <p className="mt-1 font-mono text-xs text-[#8A9099]">
              {formatCoordinate(selectedItem!.latitude)},{" "}
              {formatCoordinate(selectedItem!.longitude)}
            </p>
          )}
        </>
      ) : (
        <div
          className="mt-2 flex items-center justify-center rounded-[12px] border border-dashed border-[#3A4048] bg-[#1B1E22]/60 px-4 text-center text-sm text-[#8A9099]"
          style={{ height }}
        >
          Välj en rapport för att visa plats
        </div>
      )}
    </div>
  );
}
