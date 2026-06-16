"use client";

import { useEffect, useState } from "react";
import {
  getActiveTeslaNavigationSession,
  isTeslaDebugEnabled,
  methodLabel,
  setTeslaDebugEnabled,
  variantLabel,
} from "@/lib/tesla-navigation-debug";
import { describeTeslaNavigationEnvironment } from "@/lib/tesla-navigation-client";

/** Temporary overlay — enable with ?teslaDebug=1 on /tesla or /admin. */
export function TeslaNavigationDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    setEnabled(isTeslaDebugEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setSessionVersion((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  void sessionVersion;
  const env = describeTeslaNavigationEnvironment();
  const session = getActiveTeslaNavigationSession();

  return (
    <div className="fixed bottom-3 left-3 z-[500] max-h-[40dvh] w-[min(92vw,420px)] overflow-y-auto rounded-[14px] border border-amber-500/40 bg-[#1B1E22]/95 p-3 text-[11px] text-amber-100 shadow-2xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-bold uppercase tracking-widest text-amber-300">
          Tesla Nav Debug
        </p>
        <button
          type="button"
          onClick={() => {
            setTeslaDebugEnabled(false);
            setEnabled(false);
          }}
          className="rounded px-2 py-0.5 text-[10px] text-[#8A9099] hover:text-white"
        >
          Stäng
        </button>
      </div>

      <p className="break-all font-mono text-[10px] text-[#B0B6BE]">
        UA: {env.userAgent}
      </p>
      <p className="mt-1">
        Tesla browser: {env.isTeslaBrowser ? "yes" : "no"}
      </p>

      {session ? (
        <div className="mt-2 space-y-1">
          <p>Primary URL: {session.primaryUrl}</p>
          <p>
            Outcome: {session.outcome}
            {session.outcomeReason ? ` (${session.outcomeReason})` : ""}
          </p>
          {session.attempts.slice(-3).map((attempt, index) => (
            <p key={`${attempt.url}-${index}`} className="font-mono text-[10px]">
              [{attempt.variant}] {methodLabel(attempt.method)} →{" "}
              {attempt.success ? "OK" : "FAIL"} — {variantLabel(attempt.variant)}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[#8A9099]">No navigation session yet.</p>
      )}
    </div>
  );
}
