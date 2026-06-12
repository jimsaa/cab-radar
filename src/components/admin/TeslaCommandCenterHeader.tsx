"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GsiDispatchAdminButton } from "@/components/gsi/GsiDispatchAdminButton";
import { APP_NAME } from "@/lib/constants";
import {
  formatSwedishClockNow,
  formatSwedishWeekdayDateLong,
} from "@/lib/datetime";

const REFRESH_MS = 60_000;

/** Matches fixed header + vertical padding (24px × 2) and content block. */
export const ADMIN_COMMAND_CENTER_HEADER_HEIGHT = 136;

const HEADER_GRADIENT =
  "linear-gradient(180deg, #161B22 0%, #111827 100%)";

function SwedishDateTimeDisplay() {
  const [time, setTime] = useState("");
  const [dateLine, setDateLine] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(formatSwedishClockNow());
      setDateLine(formatSwedishWeekdayDateLong(now));
    }
    tick();
    const id = window.setInterval(tick, REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-end text-right">
      <p className="font-mono text-[42px] font-bold leading-none tabular-nums tracking-tight text-white">
        {time || "—:—"}
      </p>
      <p className="mt-1 text-sm text-white/70">{dateLine}</p>
      <GsiDispatchAdminButton className="mt-2.5" />
    </div>
  );
}

/** Fixed admin command center header — Tesla-style 3-column layout. */
export function TeslaCommandCenterHeader() {
  return (
    <header
      className="admin-command-center-header fixed top-0 left-0 right-0 z-[110] w-full shrink-0 border-b border-white/[0.08] px-8 py-6"
      style={{
        background: HEADER_GRADIENT,
        minHeight: ADMIN_COMMAND_CENTER_HEADER_HEIGHT,
      }}
    >
      <div className="grid grid-cols-[1fr_minmax(0,2fr)_1fr] items-start gap-6">
        {/* Left — branding + LIVE */}
        <div className="flex min-w-0 items-start gap-4 justify-self-start">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={48}
            height={48}
            className="shrink-0 rounded-xl"
            priority
          />

          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-white">
              {APP_NAME}
            </h1>
            <p className="text-base text-white/75">Admin Command Center</p>

            <div className="mt-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="admin-live-dot h-2 w-2 shrink-0 rounded-full bg-[#22C55E]"
                  aria-hidden
                />
                <span className="text-sm font-semibold text-[#22C55E]">LIVE</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-[#8A9099]">
                Systemet uppdateras automatiskt
              </p>
            </div>
          </div>
        </div>

        {/* Center — intentional breathing room */}
        <div aria-hidden="true" className="min-w-0" />

        {/* Right — clock + utility */}
        <div className="justify-self-end">
          <SwedishDateTimeDisplay />
        </div>
      </div>
    </header>
  );
}
