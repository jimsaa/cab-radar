"use client";

import { ExternalLink, Navigation } from "lucide-react";
import {
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
  const teslaUrl = teslaNavigateUrl(target);
  const mapsUrl = navigationGoogleMapsUrl(target);

  if (!teslaUrl && !mapsUrl) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {teslaUrl && (
        <a
          href={teslaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-card-border bg-card px-4 py-3 text-sm font-semibold text-white"
        >
          <Navigation className="h-4 w-4" />
          Skicka till Tesla
        </a>
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
  );
}
