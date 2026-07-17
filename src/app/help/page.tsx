import { HelpPageClient } from "@/components/help/HelpPageClient";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import {
  fetchMostViewedHelpArticles,
  fetchPublishedHelpArticles,
} from "@/lib/help";
import { CABRADAR_GUIDE_TITLE } from "@/lib/cabradar-guide";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { HelpArticle, Profile } from "@/lib/types/database";
import Link from "next/link";
import { NAV } from "@/lib/constants";

export const metadata = { title: "Hjälp" };

export default async function HelpPage() {
  let articles: HelpArticle[] = [];
  let mostViewed: HelpArticle[] = [];
  let profile: Profile | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (user) {
      profile = await syncMembershipProfile(supabase, user.id);
    }

    const hasAccess = profile ? hasCabRadarAccess(profile) : false;

    if (hasAccess) {
      [articles, mostViewed] = await Promise.all([
        fetchPublishedHelpArticles(supabase),
        fetchMostViewedHelpArticles(supabase),
      ]);
    }
  } catch {
    // Supabase not configured
  }

  const hasAccess = profile ? hasCabRadarAccess(profile) : false;
  const isVerified = profile ? isVerifiedDriver(profile) : false;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <section className="border-b border-card-border bg-gradient-to-b from-accent/10 to-background py-4 -mx-4 px-4 mb-4">
        <h1 className="text-xl font-bold">{NAV.help}</h1>
        <p className="mt-1 text-sm text-muted">
          Guider, radar-funktioner och information om CabRadar.
        </p>
      </section>

      {hasAccess && (
        <Link
          href="/help/information"
          className="mb-4 block rounded-2xl border border-accent/30 bg-accent/10 p-4 transition hover:border-accent/50"
        >
          <p className="font-semibold">📖 {CABRADAR_GUIDE_TITLE}</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Radar, Taxi i nöd, Civilkoll, medlemskap och mer — komplett guide
            för taxiförare.
          </p>
        </Link>
      )}

      {!userId && (
        <div className="mb-4 rounded-2xl border border-card-border bg-card p-4 text-center">
          <p className="text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent">
              Logga in
            </Link>{" "}
            för hjälpartiklar.
          </p>
        </div>
      )}

      {profile && !isVerified && (
        <VerificationStatusBanner
          status={profile.verification_status}
          className="mb-4"
        />
      )}

      {hasAccess && (
        <HelpPageClient articles={articles} mostViewed={mostViewed} />
      )}
    </div>
  );
}
