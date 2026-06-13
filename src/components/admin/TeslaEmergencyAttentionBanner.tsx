"use client";

import { TeslaNavigationButtons } from "@/components/admin/TeslaNavigationButtons";
import type { EmergencyAlertWithDriver } from "@/lib/emergency";
import {
  emergencyDriverName,
  emergencyLocationLabel,
} from "@/lib/emergency";
import { cn } from "@/lib/utils";

interface TeslaEmergencyAttentionBannerProps {
  emergencies: EmergencyAlertWithDriver[];
  unacknowledgedIds: ReadonlySet<string>;
  onAcknowledge: (id: string) => void;
}

/** Sticky AKUT strip — visible while emergency is active, pulses until kvitterad. */
export function TeslaEmergencyAttentionBanner({
  emergencies,
  unacknowledgedIds,
  onAcknowledge,
}: TeslaEmergencyAttentionBannerProps) {
  const live = emergencies.filter((e) => !e.is_test);
  if (live.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-2">
      <ul className="space-y-2">
        {live.map((emergency) => {
          const unacknowledged = unacknowledgedIds.has(emergency.id);
          const driverName = emergencyDriverName(emergency);
          const location = emergencyLocationLabel(emergency);
          const navLat =
            emergency.emergency_last_latitude ?? emergency.latitude;
          const navLng =
            emergency.emergency_last_longitude ?? emergency.longitude;

          return (
            <li
              key={emergency.id}
              className={cn(
                "relative overflow-hidden rounded-[14px] border px-3 py-2.5",
                unacknowledged
                  ? "admin-emergency-attention-banner border-[#FF3B30]/80 bg-[#FF3B30]/15"
                  : "border-[#FF3B30]/35 bg-[#262B31]"
              )}
            >
              {unacknowledged && (
                <span className="absolute right-3 top-2 rounded-full bg-[#FF3B30] px-2.5 py-1 text-[11px] font-black tracking-wider text-white">
                  AKUT
                </span>
              )}

              <p className="pr-20 text-sm font-bold text-white">
                🚨 TAXI I NÖD · {driverName}
              </p>
              <p className="mt-0.5 text-xs text-[#FCA5A5]">{location}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TeslaNavigationButtons
                  target={{
                    latitude: navLat,
                    longitude: navLng,
                    address: location,
                  }}
                />
                {unacknowledged && (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(emergency.id)}
                    className="rounded-[10px] border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Kvittera larm
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
