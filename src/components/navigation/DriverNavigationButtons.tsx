"use client";

import { useState } from "react";
import { ExternalLink, Navigation } from "lucide-react";
import { TeslaNavigationFallbackModal } from "@/components/admin/TeslaNavigationFallbackModal";
import {
  openTeslaNavigation,
  type TeslaNavigationFallbackPayload,
} from "@/lib/tesla-navigation-client";
import {
  navigationCoords,
  navigationGoogleMapsUrl,
  teslaNavigateUrl,
  type NavigationTarget,
} from "@/lib/tesla-navigation";
import type { TeslaNavigationSession } from "@/lib/tesla-navigation-debug";
import { cn } from "@/lib/utils";

interface DriverNavigationButtonsProps {
  target: NavigationTarget;
  className?: string;
}

export function DriverNavigationButtons({
  target,
  className,
}: DriverNavigationButtonsProps) {
  const coords = navigationCoords(target);
  const teslaQueryUrl = coords ? null : teslaNavigateUrl(target);
  const mapsUrl = navigationGoogleMapsUrl(target);

  const [navigating, setNavigating] = useState(false);
  const [fallback, setFallback] = useState<{
    lat: number;
    lng: number;
    session: TeslaNavigationSession | null;
  } | null>(null);

  function handleTeslaNavigate() {
    if (!coords || navigating) return;

    setNavigating(true);

    openTeslaNavigation(coords.lat, coords.lng, (payload: TeslaNavigationFallbackPayload) => {
      setNavigating(false);
      setFallback({
        lat: payload.lat,
        lng: payload.lng,
        session: payload.session,
      });
    });

    window.setTimeout(() => setNavigating(false), 4000);
  }

  if (!coords && !teslaQueryUrl && !mapsUrl) return null;

  return (
    <>
      <div className={cn("flex flex-col gap-2", className)}>
        {coords ? (
          <button
            type="button"
            onClick={handleTeslaNavigate}
            disabled={navigating}
            className="flex items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Navigation className="h-4 w-4" />
            {navigating ? "Öppnar…" : "Skicka till Tesla"}
          </button>
        ) : (
          teslaQueryUrl && (
            <a
              href={teslaQueryUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => console.log("Tesla URL:", teslaQueryUrl)}
              className="flex items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-semibold text-white"
            >
              <Navigation className="h-4 w-4" />
              Skicka till Tesla
            </a>
          )
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-card-border bg-background px-4 py-3 text-sm font-semibold text-accent"
          >
            <ExternalLink className="h-4 w-4" />
            Öppna i karta
          </a>
        )}
      </div>

      {fallback && (
        <TeslaNavigationFallbackModal
          lat={fallback.lat}
          lng={fallback.lng}
          session={fallback.session}
          onClose={() => setFallback(null)}
        />
      )}
    </>
  );
}
