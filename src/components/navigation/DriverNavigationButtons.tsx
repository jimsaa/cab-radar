"use client";

import { useState } from "react";
import { ExternalLink, Navigation } from "lucide-react";
import { TeslaNavigationFallbackModal } from "@/components/admin/TeslaNavigationFallbackModal";
import { openTeslaNavigation } from "@/lib/tesla-navigation-client";
import {
  navigationCoords,
  navigationGoogleMapsUrl,
  teslaNavigateUrl,
  type NavigationTarget,
} from "@/lib/tesla-navigation";
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
  const [fallbackCoords, setFallbackCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  async function handleTeslaNavigate() {
    if (!coords || navigating) return;

    setNavigating(true);
    try {
      await openTeslaNavigation(coords.lat, coords.lng, setFallbackCoords);
    } finally {
      setNavigating(false);
    }
  }

  if (!coords && !teslaQueryUrl && !mapsUrl) return null;

  return (
    <>
      <div className={cn("flex flex-col gap-2", className)}>
        {coords ? (
          <button
            type="button"
            onClick={() => void handleTeslaNavigate()}
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

      {fallbackCoords && (
        <TeslaNavigationFallbackModal
          lat={fallbackCoords.lat}
          lng={fallbackCoords.lng}
          onClose={() => setFallbackCoords(null)}
        />
      )}
    </>
  );
}
