"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { HelpArticleCard } from "./HelpArticleCard";
import {
  HelpCategoryFilters,
  HelpQuickAccess,
} from "./HelpCategoryFilters";
import { filterHelpArticles } from "@/lib/help";
import type { HelpCategory } from "@/lib/constants";
import type { HelpArticle } from "@/lib/types/database";

interface HelpPageClientProps {
  articles: HelpArticle[];
  mostViewed: HelpArticle[];
}

export function HelpPageClient({ articles, mostViewed }: HelpPageClientProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | null>(null);

  const filtered = useMemo(
    () => filterHelpArticles(articles, query, category),
    [articles, query, category]
  );

  const showBrowseSections = !query && !category;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="field pl-10"
          placeholder="Sök…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Sök hjälp"
        />
      </div>

      <HelpCategoryFilters selected={category} onSelect={setCategory} />

      {showBrowseSections && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Snabbval
            </h2>
            <HelpQuickAccess onSelectCategory={setCategory} />
          </section>

          {mostViewed.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                Mest lästa
              </h2>
              <ul className="flex flex-col gap-2">
                {mostViewed.map((article) => (
                  <li key={article.id}>
                    <HelpArticleCard article={article} compact />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          {query || category ? "Träffar" : "Alla artiklar"}
          {filtered.length > 0 && (
            <span className="ml-1 font-normal normal-case text-muted">
              ({filtered.length})
            </span>
          )}
        </h2>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
            <p className="text-3xl mb-2">📚</p>
            <p className="font-medium">Inget hittades</p>
            <p className="mt-1 text-sm text-muted">Prova annat sökord.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((article) => (
              <li key={article.id}>
                <HelpArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
