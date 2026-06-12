import { DashboardClient } from "@/components/dashboard/DashboardClient";

import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";

import { PendingOnboardingScreen } from "@/components/verification/PendingOnboardingScreen";

import { WelcomeActivationBanner } from "@/components/verification/WelcomeActivationBanner";

import { MembershipGateBanner } from "@/components/membership/MembershipCard";

import { BannerSlot } from "@/components/layout/BannerSlot";

import { PushAutoEnable } from "@/components/notifications/PushAutoEnable";

import { BrandHeader } from "@/components/branding/BrandHeader";

import { BrandPhilosophy } from "@/components/branding/BrandPhilosophy";

import { CommunicationHub } from "@/components/communication/CommunicationHub";

import { fetchActiveAlerts } from "@/lib/alerts";

import { fetchBannerForSlot } from "@/lib/deals";

import { createClient } from "@/lib/supabase/server";

import type { BannerAd, DriverAlert, Profile } from "@/lib/types/database";

import Link from "next/link";

import {

  canContributeToCommunity,

  hasCabRadarAccess,

  isVerifiedDriver,

} from "@/lib/membership";

import type { DriverVerificationStatus } from "@/lib/verification";

import { syncMembershipProfile } from "@/lib/profile";

import { filterAlertsForDriverFeed } from "@/lib/emergency-driver";



export default async function HomePage() {

  let alerts: DriverAlert[] = [];

  let topBanner: BannerAd | null = null;

  let feedBanner: BannerAd | null = null;

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

      [alerts, topBanner, feedBanner] = await Promise.all([

        fetchActiveAlerts(supabase),

        fetchBannerForSlot(supabase, "dashboard_top"),

        fetchBannerForSlot(supabase, "alert_feed"),

      ]);

    } else if (userId) {

      topBanner = await fetchBannerForSlot(supabase, "dashboard_top");

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

  if (userId && profile && !isVerified && profile.verification_status === "pending_verification") {
    return (
      <div className="pb-2">
        <PendingOnboardingScreen />
      </div>
    );
  }

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



        {profile && !isVerified && (

          <div className="mx-4 mt-3">

            <MembershipGateBanner profile={profile} />

          </div>

        )}



        <BannerSlot banner={topBanner} />



        <DashboardClient

          initialAlerts={filteredAlerts}

          feedBanner={feedBanner}

          userId={userId}

          chimeEnabled={chimeEnabled}

          canVote={canContribute}

          canValidate={isVerified && hasAccess}

          canReport={canContribute}

          isVerified={isVerified}

          driverCity={profile?.driver_city ?? null}

          showNationalEmergencies={profile?.show_national_emergencies ?? false}

          isAdmin={profile?.is_admin ?? false}

        />

      </div>

    );

  }



  return (

    <div className="pb-2">

      <section className="border-b border-card-border bg-gradient-to-b from-accent/10 to-background px-4 py-6">

        <div className="mx-auto flex max-w-lg flex-col items-center text-center">

          <BrandHeader logoSize={64} />

          <BrandPhilosophy />

          {!userId && (

            <Link

              href="/login"

              className="mt-6 inline-block text-sm font-semibold text-accent"

            >

              Logga in för att rapportera →

            </Link>

          )}

          <div className="mt-8 w-full border-t border-card-border/60 pt-5">

            <CommunicationHub isLoggedIn={!!userId} />

          </div>

        </div>

      </section>



      {verificationStatus && !isVerified && (

        <div className="mx-4 mt-3">

          <VerificationStatusBanner status={verificationStatus} />

        </div>

      )}



      {profile && (

        <div className="mx-4 mt-3">

          <MembershipGateBanner profile={profile} />

        </div>

      )}



      <BannerSlot banner={topBanner} />



      {userId && !hasAccess && isVerified && (

        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-card-border p-8 text-center">

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

