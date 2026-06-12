/** GSI Dispatch quick-access — Phase 1 opens Swedavia; Phase 2 may add live queue data. */

export interface GsiDispatchSite {
  id: string;
  airportName: string;
  driverLabel: string;
  driverSubtitle: string;
  adminLabel: string;
  url: string;
  /** Reserved for Phase 2: polling, queue totals, threshold alerts, multi-airport. */
  phase2?: {
    swedaviaDriverId?: number;
  };
}

export const GSI_DISPATCH_SITES = {
  landvetter: {
    id: "landvetter",
    airportName: "Landvetter",
    driverLabel: "✈️ Landvetter GSI",
    driverSubtitle: "Köläge på Landvetter",
    adminLabel: "✈️ GSI Landvetter",
    url: "https://taxi.swedavia.se/GSIDispatchdisplay/driver/18",
    phase2: { swedaviaDriverId: 18 },
  },
} as const satisfies Record<string, GsiDispatchSite>;

export type GsiDispatchSiteId = keyof typeof GSI_DISPATCH_SITES;

export const DEFAULT_GSI_DISPATCH_SITE: GsiDispatchSite =
  GSI_DISPATCH_SITES.landvetter;

export function getGsiDispatchSite(
  id: GsiDispatchSiteId = "landvetter"
): GsiDispatchSite {
  return GSI_DISPATCH_SITES[id];
}

export function openGsiDispatch(
  site: GsiDispatchSite = DEFAULT_GSI_DISPATCH_SITE
): void {
  if (typeof window === "undefined") return;
  window.open(site.url, "_blank", "noopener,noreferrer");
}
