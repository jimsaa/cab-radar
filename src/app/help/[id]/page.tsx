import { HelpArticleDetail } from "@/components/help/HelpArticleDetail";
import { MembershipGateBanner } from "@/components/membership/MembershipCard";
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
        {!user ? (
          <div className="text-center">
            <p className="text-muted">Logga in för att läsa artikeln.</p>
            <Link href="/login" className="mt-4 inline-block btn-primary">
              Logga in
            </Link>
          </div>
        ) : (
          <>
            {profile && <MembershipGateBanner profile={profile} />}
            <div className="mt-4 rounded-2xl border border-dashed border-card-border p-8 text-center">
              <p className="text-3xl mb-2">🔒</p>
              <p className="font-medium">Medlemskap krävs</p>
              <Link href="/settings" className="mt-3 inline-block btn-primary text-sm">
                Se medlemskap
              </Link>
            </div>
          </>
        )}
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
