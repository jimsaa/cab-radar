import Link from "next/link";
import { CivilkollCard } from "@/components/civilkoll/CivilkollCard";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { NAV } from "@/lib/constants";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: NAV.civilkoll };

export default async function CivilkollPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    try {
      profile = await syncMembershipProfile(supabase, user.id);
    } catch (err) {
      console.error("[CIVILKOLL] profile load failed", err);
    }
  }
  const hasAccess = profile ? hasCabRadarAccess(profile) : false;
  const isVerified = profile ? isVerifiedDriver(profile) : false;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4 pt-4">
      <h1 className="text-xl font-bold">{NAV.civilkoll}</h1>

      {!user && (
        <div className="mt-4 rounded-2xl border border-card-border bg-card p-4 text-center">
          <p className="text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent">
              Logga in
            </Link>{" "}
            för att använda Civilkoll.
          </p>
        </div>
      )}

      {profile && !isVerified && (
        <VerificationStatusBanner
          status={profile.verification_status}
          className="mt-4"
        />
      )}

      {user && hasAccess && isVerified && (
        <div className="mt-4">
          <CivilkollCard />
        </div>
      )}
    </div>
  );
}
