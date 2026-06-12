"use client";

import { MapPin } from "lucide-react";
import {
  navigationGoogleMapsUrl,
  teslaNavigateUrl,
  type NavigationTarget,
} from "@/lib/tesla-navigation";
import { cn } from "@/lib/utils";

interface TeslaNavigationButtonsProps {
  target: NavigationTarget;
  className?: string;
  /** Larger tap targets for Tesla touch UI */
  size?: "default" | "large";
}

export function TeslaNavigationButtons({
  target,
  className,
  size = "default",
}: TeslaNavigationButtonsProps) {
  const teslaUrl = teslaNavigateUrl(target);
  const mapsUrl = navigationGoogleMapsUrl(target);
  const large = size === "large";

  if (!teslaUrl && !mapsUrl) {
    return (
      <p className="text-sm text-[#8A9099]">
        Ingen platsdata — navigation ej tillgänglig
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {teslaUrl && (
        <a
          href={teslaUrl}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[14px] bg-[#3B82F6] font-bold text-white transition hover:bg-[#2563eb] active:scale-[0.98]",
            large ? "px-5 py-4 text-base" : "px-4 py-3 text-sm"
          )}
        >
          <span aria-hidden>🚗</span>
          Skicka till Tesla
        </a>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center justify-center gap-2 rounded-[14px] border border-[#3A4048] bg-[#1B1E22] font-semibold text-white transition hover:border-[#4A5159] hover:bg-[#262B31] active:scale-[0.98]",
            large ? "px-5 py-3.5 text-sm" : "px-4 py-2.5 text-xs"
          )}
        >
          <MapPin className={large ? "h-4 w-4" : "h-3.5 w-3.5"} />
          Google Maps
        </a>
      )}
    </div>
  );
}
