"use client";

import {
  getGsiDispatchSite,
  openGsiDispatch,
  type GsiDispatchSiteId,
} from "@/lib/gsi-dispatch";
import { cn } from "@/lib/utils";

interface GsiDispatchAdminButtonProps {
  siteId?: GsiDispatchSiteId;
  className?: string;
}

/** Compact Tesla admin utility — opens Swedavia GSI in a new tab. */
export function GsiDispatchAdminButton({
  siteId = "landvetter",
  className,
}: GsiDispatchAdminButtonProps) {
  const site = getGsiDispatchSite(siteId);

  return (
    <button
      type="button"
      onClick={() => openGsiDispatch(site)}
      className={cn(
        "shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#B0B6BE] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]",
        className
      )}
    >
      {site.adminLabel}
    </button>
  );
}
