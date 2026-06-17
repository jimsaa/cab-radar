"use client";

import { useMemo, useState } from "react";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { AdminCivilkollActions } from "@/components/admin/AdminCivilkollActions";
import { TeslaLiveFeedPanel } from "@/components/admin/TeslaLiveFeedPanel";
import { TeslaQuickReportPanel } from "@/components/admin/TeslaQuickReportPanel";
import { ADMIN_COMMAND_CENTER_HEADER_HEIGHT } from "@/components/admin/TeslaCommandCenterHeader";
import { TeslaDrivingReportMap } from "@/components/tesla/TeslaDrivingReportMap";

/** CabRadar Driving Mode — quick report, live feed, and embedded map. */
export function TeslaDrivingMode() {
  const { snapshot, refresh } = useAdminCommandCenter();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const items = snapshot?.liveFeed ?? [];

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedReportId) ?? null,
    [items, selectedReportId]
  );

  return (
    <div
      className="flex flex-col overflow-hidden bg-[#1E2125] text-white"
      style={{ height: `calc(100dvh - ${ADMIN_COMMAND_CENTER_HEADER_HEIGHT}px)` }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden p-3">
        <section className="col-span-3 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Snabbrapport
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <TeslaQuickReportPanel
              mode="driving"
              onReported={() => void refresh()}
            />
          </div>
          <AdminCivilkollActions variant="tesla" lookupOnly />
        </section>

        <section className="col-span-5 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <div className="shrink-0 border-b border-[#3A4048] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0B6BE]">
              Live flöde
            </h2>
            <p className="mt-0.5 text-[10px] text-[#8A9099]">
              {snapshot?.testModeEnabled
                ? "Testläge — dina testrapporter visas här (syns bara för dig)"
                : "Välj en rapport · Platsen visas på kartan till höger"}
            </p>
          </div>
          <TeslaLiveFeedPanel
            items={items}
            privacyMode="driving"
            layout="list"
            selectedId={selectedReportId}
            onSelectId={setSelectedReportId}
          />
        </section>

        <section className="col-span-4 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TeslaLiveFeedPanel
              items={items}
              privacyMode="driving"
              layout="detail"
              selectedId={selectedReportId}
              onSelectId={setSelectedReportId}
            />
          </div>
          <TeslaDrivingReportMap selectedItem={selectedItem} height={260} />
        </section>
      </div>
    </div>
  );
}
