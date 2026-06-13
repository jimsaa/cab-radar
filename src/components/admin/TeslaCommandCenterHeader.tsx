"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GsiDispatchAdminButton } from "@/components/gsi/GsiDispatchAdminButton";
import { GoteborgCAdminBadge } from "@/components/sj/GoteborgCAdminBadge";
import { APP_NAME } from "@/lib/constants";
import {
  formatSwedishClockNow,
  formatSwedishWeekdayDateLong,
} from "@/lib/datetime";

const REFRESH_MS = 60_000;

/** Compact fixed header — single row to maximize dashboard space. */
export const ADMIN_COMMAND_CENTER_HEADER_HEIGHT = 72;

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
    <div className="text-right leading-none">
      <p className="font-mono text-[32px] font-bold tabular-nums tracking-tight text-white">
        {time || "—:—"}
      </p>
      <p className="mt-0.5 text-xs text-white/70">{dateLine}</p>
    </div>
  );
}

/** Fixed admin command center header — compact single-row layout. */
export function TeslaCommandCenterHeader() {
  return (
    <header
      className="admin-command-center-header fixed top-0 left-0 right-0 z-[110] flex h-[72px] w-full shrink-0 items-center border-b border-white/[0.08] px-6"
      style={{ background: HEADER_GRADIENT }}
    >
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left — logo, titles, LIVE (side by side) */}
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={40}
            height={40}
            className="shrink-0 rounded-lg"
            priority
          />

          <div className="min-w-0 shrink-0 leading-tight">
            <h1 className="text-lg font-bold tracking-tight text-white">
              {APP_NAME}
            </h1>
            <p className="text-xs text-white/75">Admin Command Center</p>
          </div>

          <div className="min-w-0 shrink-0 border-l border-white/10 pl-3">
            <div className="flex items-center gap-1.5">
              <span
                className="admin-live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]"
                aria-hidden
              />
              <span className="text-xs font-semibold text-[#22C55E]">LIVE</span>
            </div>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[#8A9099]">
              Systemet uppdateras automatiskt
            </p>
          </div>
        </div>

        {/* Right — GSI then clock (matches reference layout) */}
        <div className="flex shrink-0 items-center gap-2">
          <GsiDispatchAdminButton />
          <GoteborgCAdminBadge />
          <SwedishDateTimeDisplay />
        </div>
      </div>
    </header>
  );
}
