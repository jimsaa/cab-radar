"use client";

import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { AdminCivilkollActions } from "@/components/admin/AdminCivilkollActions";
import { TeslaLiveFeedPanel } from "@/components/admin/TeslaLiveFeedPanel";
import { ADMIN_COMMAND_CENTER_HEADER_HEIGHT } from "@/components/admin/TeslaCommandCenterHeader";
import { TeslaQuickReportPanel } from "@/components/admin/TeslaQuickReportPanel";

/** CabRadar Driving Mode — admin command center layout without admin tools. */
export function TeslaDrivingMode() {
  const { snapshot, refresh } = useAdminCommandCenter();

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

        <section className="col-span-9 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <div className="shrink-0 border-b border-[#3A4048] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0B6BE]">
              Live flöde
            </h2>
            <p className="mt-0.5 text-[10px] text-[#8A9099]">
              Tryck på en rapport · Skicka till Tesla för navigation
            </p>
          </div>
          <TeslaLiveFeedPanel
            items={snapshot?.liveFeed ?? []}
            privacyMode="driving"
          />
        </section>
      </div>
    </div>
  );
}
