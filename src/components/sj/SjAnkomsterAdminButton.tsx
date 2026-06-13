"use client";

import { SJ_ANKOMSTER_ADMIN_LABEL, openSjAnkomster } from "@/lib/sj-ankomster";
import { cn } from "@/lib/utils";

interface SjAnkomsterAdminButtonProps {
  className?: string;
}

/** Compact admin utility — opens tagtider.net ankomster in a new tab. */
export function SjAnkomsterAdminButton({ className }: SjAnkomsterAdminButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openSjAnkomster()}
      className={cn(
        "shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#B0B6BE] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]",
        className
      )}
    >
      {SJ_ANKOMSTER_ADMIN_LABEL}
    </button>
  );
}
