"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PREFERRED_VIEW_META,
  PREFERRED_VIEWS,
  preferredViewFromPathname,
  preferredViewHomePath,
  type PreferredView,
} from "@/lib/preferred-view";
import { cn } from "@/lib/utils";

interface ViewModeSwitcherProps {
  variant?: "app" | "cockpit";
  className?: string;
}

export function ViewModeSwitcher({
  variant = "app",
  className,
}: ViewModeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [switching, setSwitching] = useState<PreferredView | null>(null);

  const activeView = preferredViewFromPathname(pathname);
  const isCockpit = variant === "cockpit";

  const switchView = useCallback(
    (view: PreferredView) => {
      if (view === activeView || pending) return;

      setSwitching(view);
      router.push(preferredViewHomePath(view), { scroll: false });

      startTransition(async () => {
        try {
          await fetch("/api/profile/preferred-view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ view }),
          });
        } catch {
          // navigation already happened
        } finally {
          setSwitching(null);
        }
      });
    },
    [activeView, pending, router]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-2xl p-1 transition-opacity duration-200",
        isCockpit
          ? "border border-white/10 bg-black/20"
          : "border border-card-border bg-card/80",
        pending && "opacity-80",
        className
      )}
      role="toolbar"
      aria-label="Byt vy"
    >
      {PREFERRED_VIEWS.map((view) => {
        const meta = PREFERRED_VIEW_META[view];
        const isActive = activeView === view;
        const isLoading = switching === view;

        return (
          <button
            key={view}
            type="button"
            title={meta.label}
            aria-label={meta.label}
            aria-pressed={isActive}
            disabled={pending}
            onClick={() => switchView(view)}
            className={cn(
              "flex min-w-[2.5rem] flex-col items-center justify-center rounded-xl px-1.5 py-1 text-[10px] font-semibold transition-all duration-200 sm:min-w-[2.75rem] sm:px-2 sm:py-1.5",
              isActive
                ? isCockpit
                  ? "bg-[#42A5F5]/25 text-white shadow-sm ring-1 ring-[#42A5F5]/50"
                  : "bg-accent/20 text-accent-bright shadow-sm ring-1 ring-accent/40"
                : isCockpit
                  ? "text-[#8A9099] hover:bg-white/5 hover:text-white"
                  : "text-muted hover:bg-background/60 hover:text-foreground",
              isLoading && "animate-pulse"
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {meta.emoji}
            </span>
            <span className="mt-0.5 hidden min-[420px]:inline">
              {meta.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
