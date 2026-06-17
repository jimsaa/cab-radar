"use client";



import { useState } from "react";

import { MapPin } from "lucide-react";

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



interface TeslaNavigationButtonsProps {
  target: NavigationTarget;
  className?: string;
  /** Larger tap targets for Tesla touch UI */
  size?: "default" | "large";
  /** Hide the external Google Maps link */
  hideMapsLink?: boolean;
  /** Override the primary Tesla navigation button label */
  teslaLabel?: string;
}



export function TeslaNavigationButtons({
  target,
  className,
  size = "default",
  hideMapsLink = false,
  teslaLabel = "Skicka till Tesla",
}: TeslaNavigationButtonsProps) {

  const coords = navigationCoords(target);

  const teslaQueryUrl = coords ? null : teslaNavigateUrl(target);

  const mapsUrl = navigationGoogleMapsUrl(target);

  const large = size === "large";



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



  if (!coords && !teslaQueryUrl && !mapsUrl) {

    return (

      <p className="text-sm text-[#8A9099]">

        Ingen platsdata — navigation ej tillgänglig

      </p>

    );

  }



  return (

    <>

      <div className={cn("flex flex-col gap-2", className)}>

        {coords ? (

          <button

            type="button"

            onClick={handleTeslaNavigate}

            disabled={navigating}

            className={cn(

              "flex items-center justify-center gap-2 rounded-[14px] bg-[#3B82F6] font-bold text-white transition hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-60",

              large ? "px-5 py-4 text-base" : "px-4 py-3 text-sm"

            )}

          >

            <span aria-hidden>🚗</span>

            {navigating ? "Öppnar…" : teslaLabel}

          </button>

        ) : (

          teslaQueryUrl && (

            <a

              href={teslaQueryUrl}

              onClick={() => console.log("Tesla URL:", teslaQueryUrl)}

              className={cn(

                "flex items-center justify-center gap-2 rounded-[14px] bg-[#3B82F6] font-bold text-white transition hover:bg-[#2563eb] active:scale-[0.98]",

                large ? "px-5 py-4 text-base" : "px-4 py-3 text-sm"

              )}

            >

              <span aria-hidden>🚗</span>

              {teslaLabel}

            </a>

          )

        )}

        {mapsUrl && !hideMapsLink && (

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

