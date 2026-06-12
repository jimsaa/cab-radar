"use client";

import { ExternalLink } from "lucide-react";
import {
  getGsiDispatchSite,
  openGsiDispatch,
  type GsiDispatchSiteId,
} from "@/lib/gsi-dispatch";
import { cn } from "@/lib/utils";

interface GsiDispatchCardProps {
  siteId?: GsiDispatchSiteId;
  className?: string;
}

/** Driver quick access to Swedavia GSI Dispatch (external tab). */
export function GsiDispatchCard({
  siteId = "landvetter",
  className,
}: GsiDispatchCardProps) {
  const site = getGsiDispatchSite(siteId);

  return (
    <button
      type="button"
      onClick={() => openGsiDispatch(site)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-left transition hover:border-accent/40 active:scale-[0.99]",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{site.driverLabel}</span>
        <span className="mt-0.5 block text-sm text-muted">
          {site.driverSubtitle}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
