"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import {
  formatSwedishClockNow,
  formatSwedishWeekdayDateLong,
} from "@/lib/datetime";

const REFRESH_MS = 60_000;
const HEADER_HEIGHT_PX = 76;

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
    <div className="text-right leading-tight">
      <p className="font-mono text-2xl font-semibold tabular-nums text-white">
        {time || "—:—"}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-[#8A9099]">
        {dateLine}
      </p>
    </div>
  );
}

/** Fixed admin dashboard header — branding, LIVE status, Swedish clock. */
export function TeslaCommandCenterHeader() {
  return (
    <header
      className="admin-command-center-header fixed top-0 left-0 right-0 z-[110] flex h-[76px] min-h-[70px] max-h-[80px] w-full shrink-0 items-center border-b border-[#3A4048] bg-[#1E2125] px-6"
      style={{ height: HEADER_HEIGHT_PX }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={48}
          height={48}
          className="shrink-0 rounded-xl"
          priority
        />

        <div className="min-w-0">
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-white">
              {APP_NAME}
            </p>
            <p className="text-sm font-medium text-[#B0B6BE]">
              Admin Command Center
            </p>
          </div>

          <div className="mt-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="admin-live-dot h-2 w-2 shrink-0 rounded-full bg-[#22C55E]"
                aria-hidden
              />
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#22C55E]">
                LIVE
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#8A9099]">
              Systemet uppdateras automatiskt
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 pl-4">
        <SwedishDateTimeDisplay />
      </div>
    </header>
  );
}

export const ADMIN_COMMAND_CENTER_HEADER_HEIGHT = HEADER_HEIGHT_PX;
