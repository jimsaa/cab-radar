"use client";

import { cn } from "@/lib/utils";
import {
  TEST_MODE_BANNER_SUBTITLE,
  TEST_MODE_BANNER_TITLE,
} from "@/lib/test-mode";

interface TestModeBannerProps {
  active: boolean;
  className?: string;
}

/** Amber banner shown on all pages when test mode is active. */
export function TestModeBanner({ active, className }: TestModeBannerProps) {
  if (!active) return null;

  return (
    <div
      role="status"
      className={cn(
        "border-b border-amber-500/50 bg-amber-500/15 px-4 py-2.5 text-center",
        className
      )}
    >
      <p className="text-sm font-bold text-amber-200">{TEST_MODE_BANNER_TITLE}</p>
      <p className="text-xs text-amber-200/90">{TEST_MODE_BANNER_SUBTITLE}</p>
    </div>
  );
}

export function TestBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300",
        className
      )}
    >
      🧪 TEST
    </span>
  );
}
