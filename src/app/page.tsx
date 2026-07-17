import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { WelcomeActivationBanner } from "@/components/verification/WelcomeActivationBanner";
import { AdvertiserBanner } from "@/components/layout/AdvertiserBanner";
import { MarketingLandingPage } from "@/components/marketing/MarketingLandingPage";
import { PushAutoEnable } from "@/components/notifications/PushAutoEnable";
import { fetchActiveAlerts } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/server";
import type { DriverAlert, Profile } from "@/lib/types/database";
import {
  canContributeToCommunity,
  hasCabRadarAccess,
  isVerifiedDriver,
} from "@/lib/membership";
import type { DriverVerificationStatus } from "@/lib/verification";
import { syncMembershipProfile } from "@/lib/profile";
import { CitySelectionGate } from "@/components/profile/CitySelectionGate";
import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";
import { Outfit } from "next/font/google";

const landingDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-landing-display",
  display: "swap",
});

export default async function HomePage() {
  let alerts: DriverAlert[] = [];
  let userId: string | null = null;
  let chimeEnabled = true;
  let profile: Profile | null = null;
  let verificationStatus: DriverVerificationStatus | null = null;

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
      alerts = await fetchActiveAlerts(supabase);
    }
  } catch {
    // Supabase not configured
  }

  const isVerified = profile ? isVerifiedDriver(profile) : false;
  const canContribute = profile ? canContributeToCommunity(profile) : false;
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

  if (userId && hasAccess) {
    return (
      <div className="pb-2">
        <PushAutoEnable
          userId={userId}
          isVerified={isVerified}
          pushEnabled={profile?.push_enabled ?? true}
          pushPrompted={profile?.push_prompted ?? false}
        />

        {profile?.welcome_pending && (
          <WelcomeActivationBanner userId={userId} />
        )}

        {verificationStatus && !isVerified && (
          <div className="mx-4 mt-3">
            <VerificationStatusBanner status={verificationStatus} />
          </div>
        )}

        <AdvertiserBanner />

        {profile && (
          <CitySelectionGate userId={userId} profile={profile}>
            <DashboardClient
              initialAlerts={filteredAlerts}
              userId={userId}
              chimeEnabled={chimeEnabled}
              canValidate={isVerified && hasAccess}
              canReport={canContribute}
              isVerified={isVerified}
              driverCity={profile.driver_city ?? null}
              showNationalEmergencies={profile.show_national_emergencies ?? false}
              isAdmin={profile.is_admin ?? false}
            />
          </CitySelectionGate>
        )}
      </div>
    );
  }

  if (userId && profile && !hasAccess) {
    return (
      <div className="pb-2">
        {verificationStatus && (
          <div className="mx-4 mt-3">
            <VerificationStatusBanner status={verificationStatus} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={landingDisplay.variable}>
      <MarketingLandingPage />
    </div>
  );
}
