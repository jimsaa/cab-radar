import { HelpArticleDetail } from "@/components/help/HelpArticleDetail";
import {
  fetchHelpArticleById,
  incrementHelpArticleViews,
} from "@/lib/help";
import {
  canContributeToCommunity,
  hasCabRadarAccess,
} from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const article = await fetchHelpArticleById(supabase, id);
    if (article?.published && article.admin_verified) {
      return { title: article.title };
    }
  } catch {
    // ignore
  }
  return { title: "Hjälpartikel" };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    profile = await syncMembershipProfile(supabase, user.id);
  }

  const hasAccess = profile ? hasCabRadarAccess(profile) : false;

  if (!user || !hasAccess) {
    return (
      <div className="safe-bottom mx-auto max-w-lg px-4 py-8">
        <div className="text-center">
          <p className="text-muted">Logga in för att läsa artikeln.</p>
          <Link href="/login" className="mt-4 inline-block btn-primary">
            Logga in
          </Link>
        </div>
      </div>
    );
  }

  const article = await fetchHelpArticleById(supabase, id);

  if (!article || !article.published || !article.admin_verified) {
    notFound();
  }

  await incrementHelpArticleViews(supabase, id);

  const canVote = profile ? canContributeToCommunity(profile) : false;

  return (
    <HelpArticleDetail
      article={article}
      userId={user.id}
      canVote={canVote}
    />
  );
}
