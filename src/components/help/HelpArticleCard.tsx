import Link from "next/link";
import {
  HELP_CATEGORY_ICONS,
  HELP_CATEGORY_LABELS,
  type HelpCategory,
} from "@/lib/constants";
import type { HelpArticle } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

export function HelpCategoryBadge({ category }: { category: HelpCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-bright">
      {HELP_CATEGORY_ICONS[category]} {HELP_CATEGORY_LABELS[category]}
    </span>
  );
}

interface HelpArticleCardProps {
  article: HelpArticle;
  compact?: boolean;
}

export function HelpArticleCard({ article, compact }: HelpArticleCardProps) {
  return (
    <Link
      href={`/help/${article.id}`}
      className={cn(
        "block rounded-2xl border border-card-border bg-card p-4 transition active:scale-[0.99] hover:border-accent/40",
        compact && "p-3"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <HelpCategoryBadge category={article.category} />
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
          <Eye className="h-3.5 w-3.5" />
          {article.view_count}
        </span>
      </div>
      <h3 className={cn("font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
        {article.title}
      </h3>
      {!compact && article.short_summary && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{article.short_summary}</p>
      )}
      {article.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-background px-1.5 py-0.5 text-[10px] text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
