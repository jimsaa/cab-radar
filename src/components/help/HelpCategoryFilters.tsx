"use client";

import {
  HELP_CATEGORIES,
  HELP_CATEGORY_ICONS,
  HELP_CATEGORY_LABELS,
  type HelpCategory,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HelpCategoryFiltersProps {
  selected: HelpCategory | null;
  onSelect: (category: HelpCategory | null) => void;
}

export function HelpCategoryFilters({
  selected,
  onSelect,
}: HelpCategoryFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition",
          selected === null
            ? "bg-accent text-white"
            : "bg-card border border-card-border text-muted"
        )}
      >
        Alla
      </button>
      {HELP_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat === selected ? null : cat)}
          className={cn(
            "shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition whitespace-nowrap",
            selected === cat
              ? "bg-accent text-white"
              : "bg-card border border-card-border text-muted"
          )}
        >
          {HELP_CATEGORY_ICONS[cat]} {HELP_CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  );
}

interface HelpQuickAccessProps {
  onSelectCategory: (category: HelpCategory) => void;
}

export function HelpQuickAccess({ onSelectCategory }: HelpQuickAccessProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {HELP_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelectCategory(cat)}
          className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border border-card-border bg-card p-3 text-center transition active:scale-[0.98] hover:border-accent/40"
        >
          <span className="text-2xl">{HELP_CATEGORY_ICONS[cat]}</span>
          <span className="text-xs font-semibold leading-tight">
            {HELP_CATEGORY_LABELS[cat]}
          </span>
        </button>
      ))}
    </div>
  );
}
