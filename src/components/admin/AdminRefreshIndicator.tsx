"use client";

import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";
import { secondsSince } from "@/lib/admin-command-center";
import { cn } from "@/lib/utils";

export function AdminRefreshIndicator({ className }: { className?: string }) {
  const ctx = useAdminCommandCenterOptional();
  if (!ctx) return null;

  const live =
    ctx.lastUpdatedAt != null && (secondsSince(ctx.lastUpdatedAt) ?? 99) <= 8;

  return (
    <p
      className={cn(
        "text-[11px] font-medium leading-snug",
        live ? "text-[#22C55E]" : "text-[#8A9099]",
        className
      )}
      aria-live="polite"
    >
      {ctx.refreshLabel}
    </p>
  );
}
