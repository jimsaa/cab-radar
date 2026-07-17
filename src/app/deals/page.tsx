import { OfferRevealBanner } from "@/components/deals/OfferRevealBanner";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { fetchBannerForSlot } from "@/lib/deals";
import { fetchActiveOffersForDrivers } from "@/lib/offers";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import { syncMembershipProfile } from "@/lib/profile";
import type { DriverVerificationStatus } from "@/lib/verification";
import { createClient } from "@/lib/supabase/server";
import type { BannerAd, DriverOffer, Profile } from "@/lib/types/database";
import Link from "next/link";
import { NAV } from "@/lib/constants";

export const metadata = { title: "Erbjudanden" };

export default async function DealsPage() {
  let offers: DriverOffer[] = [];
  let banner: BannerAd | null = null;
  let profile: Profile | null = null;
  let verificationStatus: DriverVerificationStatus | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (user) {
      profile = await syncMembershipProfile(supabase, user.id);
      if (profile) {
        verificationStatus =
          profile.verification_status as DriverVerificationStatus;
      }
    }

    const hasAccess = profile ? hasCabRadarAccess(profile) : false;

    if (hasAccess) {
      [offers, banner] = await Promise.all([
        fetchActiveOffersForDrivers(supabase),
        fetchBannerForSlot(supabase, "deals_page"),
      ]);
    } else if (user) {
      banner = await fetchBannerForSlot(supabase, "deals_page");
    }
  } catch {
    // Demo mode
  }

  const isVerified = profile ? isVerifiedDriver(profile) : false;
  const hasAccess = profile ? hasCabRadarAccess(profile) : false;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <section className="py-4">
        <h1 className="text-xl font-bold">{NAV.deals}</h1>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Exklusiva förmåner för CabRadar-förare — förhandlade specifikt för dig.
          Tryck på ett erbjudande för att avslöja din kod eller inlösen.
        </p>
      </section>

      {!userId && (
        <div className="mb-4 rounded-2xl border border-card-border bg-card p-4 text-center">
          <p className="text-sm text-muted">
            <Link href="/login" className="font-semibold text-accent">
              Logga in
            </Link>{" "}
            för erbjudanden.
          </p>
        </div>
      )}

      {verificationStatus && !isVerified && (
        <VerificationStatusBanner status={verificationStatus} className="mb-4" />
      )}

      {userId && hasAccess && (
        <>
          <BannerSlot banner={banner} />
          {offers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-card-border p-8 text-center">
              <p className="text-4xl mb-2">🎁</p>
              <p className="font-medium">Inga erbjudanden just nu</p>
              <p className="mt-1 text-sm text-muted">
                Nya exklusiva förmåner publiceras här löpande.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <OfferRevealBanner offer={offer} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
