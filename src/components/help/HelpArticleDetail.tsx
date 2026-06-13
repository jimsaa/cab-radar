"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { HelpCategoryBadge } from "./HelpArticleCard";
import { useAppToast } from "@/components/ui/AppToast";
import { voteOnHelpArticle } from "@/lib/help";
import { createClient } from "@/lib/supabase/client";
import type { HelpArticle } from "@/lib/types/database";

function embedVideoUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    return url;
  } catch {
    return null;
  }
}

interface HelpArticleDetailProps {
  article: HelpArticle;
  userId: string | null;
  canVote: boolean;
}

export function HelpArticleDetail({
  article,
  userId,
  canVote,
}: HelpArticleDetailProps) {
  const router = useRouter();
  const showToast = useAppToast();
  const embedUrl = article.video_url ? embedVideoUrl(article.video_url) : null;

  async function handleVote(vote: 1 | -1) {
    if (!userId) {
      showToast("Logga in för att rösta.", { variant: "info" });
      router.push("/login");
      return;
    }
    if (!canVote) {
      showToast("Kräver verifierad förare.", { variant: "info" });
      return;
    }
    const supabase = createClient();
    await voteOnHelpArticle(supabase, userId, article.id, vote);
    router.refresh();
  }

  return (
    <article className="safe-bottom mx-auto max-w-lg px-4 pb-6">
      <Link
        href="/help"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-bright"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka
      </Link>

      <div className="mb-3">
        <HelpCategoryBadge category={article.category} />
      </div>

      <h1 className="text-xl font-bold leading-snug">{article.title}</h1>

      {article.short_summary && (
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {article.short_summary}
        </p>
      )}

      {article.body_content && (
        <div className="mt-4 rounded-2xl border border-card-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {article.body_content}
          </p>
        </div>
      )}

      {article.step_by_step_instructions.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Steg för steg
          </h2>
          <ol className="space-y-3">
            {article.step_by_step_instructions.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-card-border bg-card p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {article.image_urls.length > 0 && (
        <section className="mt-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Bilder
          </h2>
          {article.image_urls.map((url, i) => (
            <div
              key={i}
              className="relative aspect-video overflow-hidden rounded-xl border border-card-border"
            >
              <Image
                src={url}
                alt={`${article.title} — bild ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </section>
      )}

      {embedUrl && (
        <section className="mt-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Video
          </h2>
          <div className="aspect-video overflow-hidden rounded-xl border border-card-border">
            <iframe
              src={embedUrl}
              title={`Video: ${article.title}`}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {article.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-card border border-card-border px-2.5 py-1 text-xs text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-card-border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Hjälpte detta?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleVote(1)}
            className="btn-secondary flex-1 !min-h-[48px] !py-2"
          >
            <ThumbsUp className="h-5 w-5 text-success" />
            Ja ({article.useful_votes})
          </button>
          <button
            type="button"
            onClick={() => handleVote(-1)}
            className="btn-secondary flex-1 !min-h-[48px] !py-2"
          >
            <ThumbsDown className="h-5 w-5 text-danger" />
            Nej ({article.not_useful_votes})
          </button>
        </div>
      </section>
    </article>
  );
}
