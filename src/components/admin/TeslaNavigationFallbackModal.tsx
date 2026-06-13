"use client";

import { useState } from "react";
import { formatTeslaCoordinatePair } from "@/lib/tesla-navigation";
import { cn } from "@/lib/utils";

interface TeslaNavigationFallbackModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  className?: string;
}

export function TeslaNavigationFallbackModal({
  lat,
  lng,
  onClose,
  className,
}: TeslaNavigationFallbackModalProps) {
  const [copied, setCopied] = useState(false);
  const coordinateText = formatTeslaCoordinatePair(lat, lng);

  async function copyCoordinates() {
    try {
      await navigator.clipboard.writeText(coordinateText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("[TESLA NAV] clipboard copy failed:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-[18px] border border-[#3A4048] bg-[#262B31] p-5 shadow-2xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tesla-nav-fallback-title"
      >
        <h2
          id="tesla-nav-fallback-title"
          className="text-base font-bold leading-snug text-white"
        >
          Tesla-navigering kunde inte öppnas automatiskt.
        </h2>

        <p className="mt-4 font-mono text-lg font-semibold tabular-nums text-[#B0B6BE]">
          {coordinateText}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void copyCoordinates()}
            className="flex items-center justify-center gap-2 rounded-[14px] bg-[#3B82F6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2563eb] active:scale-[0.98]"
          >
            📋 {copied ? "Kopierat!" : "Kopiera koordinater"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-[14px] border border-[#3A4048] bg-[#1B1E22] px-4 py-3 text-sm font-semibold text-[#B0B6BE] transition hover:border-[#4A5159] hover:text-white active:scale-[0.98]"
          >
            ❌ Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
