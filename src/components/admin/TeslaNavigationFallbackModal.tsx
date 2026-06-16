"use client";

import { useState } from "react";
import { formatTeslaCoordinatePair } from "@/lib/tesla-navigation";
import type { TeslaNavigationSession } from "@/lib/tesla-navigation-debug";
import {
  isTeslaDebugEnabled,
  methodLabel,
} from "@/lib/tesla-navigation-debug";
import { cn } from "@/lib/utils";

interface TeslaNavigationFallbackModalProps {
  lat: number;
  lng: number;
  session?: TeslaNavigationSession | null;
  onClose: () => void;
  className?: string;
}

export function TeslaNavigationFallbackModal({
  lat,
  lng,
  session,
  onClose,
  className,
}: TeslaNavigationFallbackModalProps) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const coordinateText = formatTeslaCoordinatePair(lat, lng);
  const primaryUrl = session?.primaryUrl ?? null;
  const debugEnabled = isTeslaDebugEnabled() || session?.teslaDebugEnabled;

  async function copyText(text: string, which: "coords" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "coords") {
        setCopiedCoords(true);
        window.setTimeout(() => setCopiedCoords(false), 2000);
      } else {
        setCopiedUrl(true);
        window.setTimeout(() => setCopiedUrl(false), 2000);
      }
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
          "max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[18px] border border-[#3A4048] bg-[#262B31] p-5 shadow-2xl",
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

        <p className="mt-3 text-sm leading-relaxed text-[#B0B6BE]">
          Tesla blocked automatic navigation. Tap &quot;Kopiera koordinater&quot; and
          paste into Tesla navigation.
        </p>

        <p className="mt-4 font-mono text-lg font-semibold tabular-nums text-[#B0B6BE]">
          {coordinateText}
        </p>

        {primaryUrl && (
          <div className="mt-4 rounded-[12px] border border-[#3A4048] bg-[#1B1E22]/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9099]">
              Generated URL (debug)
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-relaxed text-[#B0B6BE]">
              {primaryUrl}
            </p>
          </div>
        )}

        {debugEnabled && session && (
          <div className="mt-4 space-y-3 rounded-[12px] border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100/90">
            <p className="font-bold uppercase tracking-widest text-amber-300">
              Tesla Debug Mode
            </p>
            <p>
              <span className="text-[#8A9099]">User-Agent:</span>{" "}
              <span className="break-all font-mono">{session.userAgent}</span>
            </p>
            <p>
              <span className="text-[#8A9099]">Tesla browser detected:</span>{" "}
              {session.isTeslaBrowser ? "yes" : "no"}
            </p>
            <p>
              <span className="text-[#8A9099]">Outcome:</span> {session.outcome}
              {session.outcomeReason ? ` — ${session.outcomeReason}` : ""}
            </p>

            {session.probeResults && session.probeResults.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-amber-200">Server probes</p>
                <ul className="space-y-1 font-mono">
                  {session.probeResults.map((probe) => (
                    <li key={`${probe.variant}-${probe.url}`} className="break-all">
                      [{probe.variant}] status={probe.status} ok={String(probe.ok)} —{" "}
                      {probe.url}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {session.attempts.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-amber-200">Client attempts</p>
                <ul className="space-y-2">
                  {session.attempts.map((attempt, index) => (
                    <li
                      key={`${attempt.variant}-${attempt.method}-${index}`}
                      className="rounded border border-[#3A4048]/60 bg-[#1B1E22]/60 p-2"
                    >
                      <p>
                        {index + 1}. [{attempt.variant}] {methodLabel(attempt.method)} —{" "}
                        {attempt.success ? "SUCCESS" : "FAILED"}
                      </p>
                      <p className="break-all font-mono text-[10px] text-[#B0B6BE]">
                        {attempt.url}
                      </p>
                      <p className="text-[10px] text-[#8A9099]">{attempt.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void copyText(coordinateText, "coords")}
            className="flex items-center justify-center gap-2 rounded-[14px] bg-[#3B82F6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2563eb] active:scale-[0.98]"
          >
            📋 {copiedCoords ? "Kopierat!" : "Kopiera koordinater"}
          </button>
          {primaryUrl && (
            <button
              type="button"
              onClick={() => void copyText(primaryUrl, "url")}
              className="flex items-center justify-center gap-2 rounded-[14px] border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3B82F6]/20 active:scale-[0.98]"
            >
              🔗 {copiedUrl ? "URL kopierad!" : "Kopiera URL"}
            </button>
          )}
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
