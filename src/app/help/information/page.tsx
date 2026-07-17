import { CabRadarGuideView } from "@/components/help/CabRadarGuideView";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { CABRADAR_GUIDE_TITLE } from "@/lib/cabradar-guide";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import Link from "next/link";

export const metadata = { title: CABRADAR_GUIDE_TITLE };

export default async function HelpInformationPage() {
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
  } catch {
    // Supabase not configured
  }

  const hasAccess = profile ? hasCabRadarAccess(profile) : false;
  const isVerified = profile ? isVerifiedDriver(profile) : false;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      {!userId && (
        <div className="mb-4 rounded-2xl border border-card-border bg-card p-4 text-center">
          <p className="text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent">
              Logga in
            </Link>{" "}
            för att läsa guiden.
          </p>
        </div>
      )}

      {profile && !isVerified && (
        <VerificationStatusBanner
          status={profile.verification_status}
          className="mb-4"
        />
      )}

      {hasAccess && <CabRadarGuideView />}
    </div>
  );
}
