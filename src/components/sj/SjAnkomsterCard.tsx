"use client";

import { ExternalLink } from "lucide-react";
import { recordDriverHeartbeatClient } from "@/lib/driver-activity-client";
import {
  SJ_ANKOMSTER_DRIVER_LABEL,
  SJ_ANKOMSTER_DRIVER_SUBTITLE,
  openSjAnkomster,
} from "@/lib/sj-ankomster";
import { cn } from "@/lib/utils";

interface SjAnkomsterCardProps {
  className?: string;
}

/** Driver quick access to SJ Ankomster Göteborg C (external tab). */
export function SjAnkomsterCard({ className }: SjAnkomsterCardProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void recordDriverHeartbeatClient("sj_ankomster");
        openSjAnkomster();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-left transition hover:border-accent/40 active:scale-[0.99]",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">
          {SJ_ANKOMSTER_DRIVER_LABEL}
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          {SJ_ANKOMSTER_DRIVER_SUBTITLE}
        </span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
