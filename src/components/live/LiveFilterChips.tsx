"use client";

import {
  LIVE_FEED_FILTER_OPTIONS,
  type LiveFeedFilter,
} from "@/lib/live-feed";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
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
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "border-accent bg-accent text-white"
                : "border-card-border bg-card text-muted hover:text-foreground"
            )}
          >
            {option.id === "laser" ? (
              <ReportTypeIcon type="laser" variant="badge" />
            ) : option.icon ? (
              <span aria-hidden>{option.icon}</span>
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
