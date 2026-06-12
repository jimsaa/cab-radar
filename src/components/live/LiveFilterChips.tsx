"use client";

import {
  LIVE_FEED_FILTER_OPTIONS,
  type LiveFeedFilter,
} from "@/lib/live-feed";
import { cn } from "@/lib/utils";

interface LiveFilterChipsProps {
  value: LiveFeedFilter;
  onChange: (filter: LiveFeedFilter) => void;
}

export function LiveFilterChips({ value, onChange }: LiveFilterChipsProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {LIVE_FEED_FILTER_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "border-accent bg-accent text-white"
                : "border-card-border bg-card text-muted hover:text-foreground"
            )}
          >
            {option.icon ? `${option.icon} ${option.label}` : option.label}
          </button>
        );
      })}
    </div>
  );
}
