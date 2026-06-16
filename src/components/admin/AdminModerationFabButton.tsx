"use client";

import { cn } from "@/lib/utils";

interface AdminModerationFabButtonProps {
  icon: string;
  label: string;
  badgeCount?: number;
  onClick: () => void;
  accent?: "blue" | "purple";
}

export function AdminModerationFabButton({
  icon,
  label,
  badgeCount = 0,
  onClick,
  accent = "blue",
}: AdminModerationFabButtonProps) {
  const showBadge = badgeCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-full border border-[#3A4048] bg-[#262B31]/95 px-4 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition hover:scale-[1.02] active:scale-[0.98]",
        accent === "blue"
          ? "hover:border-[#3B82F6]/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          : "hover:border-[#8B5CF6]/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
      )}
      aria-label={label}
    >
      <span className="text-lg leading-none" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
      {showBadge && (
        <span
          className={cn(
            "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-black tabular-nums text-white",
            accent === "blue" ? "bg-[#3B82F6]" : "bg-[#8B5CF6]"
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </button>
  );
}
