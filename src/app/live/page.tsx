import { LiveFeedClient } from "@/components/live/LiveFeedClient";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { MembershipGateBanner } from "@/components/membership/MembershipCard";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { fetchActiveAlerts } from "@/lib/alerts";
import { fetchBannerForSlot } from "@/lib/deals";
import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { BannerAd, DriverAlert, Profile } from "@/lib/types/database";
import type { DriverVerificationStatus } from "@/lib/verification";
import Link from "next/link";

export const metadata = { title: "LIVE" };

export default async function LivePage() {
  let alerts: DriverAlert[] = [];
  let feedBanner: BannerAd | null = null;
  let userId: string | null = null;
  let profile: Profile | null = null;
  let verificationStatus: DriverVerificationStatus | null = null;
  let chimeEnabled = true;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;

    if (user) {
      profile = await syncMembershipProfile(supabase, user.id);
      chimeEnabled = profile?.alert_chime_enabled ?? true;
      verificationStatus =
        (profile?.verification_status as DriverVerificationStatus) ??
        "pending_verification";
    }

    const hasAccess = profile ? hasCabRadarAccess(profile) : false;

    if (hasAccess) {
      [alerts, feedBanner] = await Promise.all([
        fetchActiveAlerts(supabase),
        fetchBannerForSlot(supabase, "alert_feed"),
      ]);
    }
  } catch {
    // Supabase not configured
  }

  const isVerified = profile ? isVerifiedDriver(profile) : false;
  const hasAccess = profile ? hasCabRadarAccess(profile) : false;
  const cityFilterOptions = profile
    ? {
        driverCity: profile.driver_city,
        showNationalEmergencies: profile.show_national_emergencies,
        isAdmin: profile.is_admin,
      }
    : undefined;

  const filteredAlerts =
    userId && alerts.length > 0
      ? filterAlertsForDriverFeed(alerts, userId, cityFilterOptions)
      : alerts;

  if (!userId) {
    return (
      <div className="safe-bottom mx-auto max-w-lg px-4 py-8 text-center">
        <h1 className="text-xl font-bold">LIVE</h1>
        <p className="mt-2 text-sm text-muted">
          <Link href="/login" className="font-semibold text-accent">
            Logga in
          </Link>{" "}
          för att följa nätverket.
        </p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
        <h1 className="py-4 text-xl font-bold">LIVE</h1>
        {verificationStatus && !isVerified && (
          <VerificationStatusBanner status={verificationStatus} className="mb-4" />
        )}
        {profile && <MembershipGateBanner profile={profile} className="mb-4" />}
        {isVerified && (
          <div className="rounded-2xl border border-dashed border-card-border p-8 text-center">
            <p className="text-3xl mb-2">🔒</p>
            <p className="font-medium">Medlemskap krävs</p>
            <Link href="/settings" className="mt-3 inline-block btn-primary text-sm">
              Se medlemskap
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <BannerSlot banner={feedBanner} />
      <LiveFeedClient
        initialAlerts={filteredAlerts}
        userId={userId}
        chimeEnabled={chimeEnabled}
        driverCity={profile?.driver_city ?? null}
        showNationalEmergencies={profile?.show_national_emergencies ?? false}
        isAdmin={profile?.is_admin ?? false}
      />
    </>
  );
}
