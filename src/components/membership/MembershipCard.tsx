"use client";

import { useState } from "react";
import { CreditCard, Crown, Users } from "lucide-react";
import type { Profile } from "@/lib/types/database";
import {
  ANNUAL_MEMBERSHIP_PRICE_SEK,
  MEMBERSHIP_ENABLED,
  MEMBERSHIP_THRESHOLDS,
  formatMembershipExpiry,
  hasAnnualMembership,
  hasCabRadarAccess,
  isBetaUser,
  isVerifiedDriver,
  membershipStatusLine,
  meetsContributionRequirements,
} from "@/lib/membership";
import { cn } from "@/lib/utils";

interface MembershipCardProps {
  profile: Profile;
}

export function MembershipCard({ profile }: MembershipCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verified = isVerifiedDriver(profile);
  const isBeta = isBetaUser(profile);
  const hasAccess = hasCabRadarAccess(profile);
  const isAnnual = hasAnnualMembership(profile);
  const needsPaywall =
    MEMBERSHIP_ENABLED && verified && !hasAccess && !isBeta;

  async function buyMembership() {
    if (!MEMBERSHIP_ENABLED) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kunde inte starta betalning.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Kunde inte starta betalning.");
    } finally {
      setLoading(false);
    }
  }

  // Membership system inactive — show free status only (no paywall / activity).
  if (!MEMBERSHIP_ENABLED) {
    return (
      <section className="rounded-2xl border border-card-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Crown className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">CabRadar</h2>
        </div>
        <p className="text-sm font-semibold text-success">
          ✓ Gratis för alla taxiförare
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Full tillgång till Radar, LIVE, CivilKoll och rapportering. TEST-läge
          styrs separat under Inställningar.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-accent" />
        <h2 className="font-semibold">CabRadar-medlemskap</h2>
      </div>

      {!verified && (
        <p className="text-sm text-muted leading-relaxed">
          Verifiera ditt leg. för att använda CabRadar.
        </p>
      )}

      {verified && (
        <>
          <p
            className={cn(
              "text-sm font-semibold",
              hasAccess ? "text-success" : "text-accent-bright"
            )}
          >
            {membershipStatusLine(profile)}
          </p>

          {isBeta && (
            <p className="mt-2 text-xs text-muted leading-relaxed">
              Tillfällig full åtkomst under betaperioden.
            </p>
          )}

          {hasAccess &&
            !isBeta &&
            profile.membership_type === "active_driver" &&
            meetsContributionRequirements(profile) && (
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Tack för att du hjälper andra förare. Din tillgång har förlängts
                utan kostnad.
              </p>
            )}

          {hasAccess &&
            !isBeta &&
            profile.membership_type === "active_driver" &&
            !meetsContributionRequirements(profile) && (
              <p className="mt-2 text-xs text-muted">
                Hjälp andra förare denna månad för gratis tillgång.
              </p>
            )}

          {isAnnual && (
            <p className="mt-2 text-sm text-muted">
              Giltigt till:{" "}
              <span className="font-medium text-foreground">
                {formatMembershipExpiry(profile.membership_expires_at)}
              </span>
            </p>
          )}

          {verified && !isAnnual && (
            <div className="mt-4 space-y-2 rounded-xl bg-background p-3 text-sm">
              {isBeta && (
                <p className="text-xs text-muted">
                  Statistik spåras även under betaperioden.
                </p>
              )}
              <ProgressRow
                icon={<Users className="h-4 w-4" />}
                label="Rapporter"
                current={profile.monthly_reports_count}
                target={MEMBERSHIP_THRESHOLDS.reports}
              />
              <ProgressRow
                icon={<Users className="h-4 w-4" />}
                label="Röster"
                current={profile.monthly_votes_count}
                target={MEMBERSHIP_THRESHOLDS.votes}
              />
              <ProgressRow
                icon={<Crown className="h-4 w-4" />}
                label="Poäng"
                current={profile.monthly_points}
                target={MEMBERSHIP_THRESHOLDS.points}
              />
            </div>
          )}

          {needsPaywall && (
            <>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                Du har inte uppnått månadens aktivitetskrav.
              </p>
              <button
                type="button"
                onClick={buyMembership}
                disabled={loading}
                className="btn-primary mt-4 w-full !min-h-[52px]"
              >
                <CreditCard className="h-5 w-5" />
                {loading
                  ? "Laddar…"
                  : `Köp årsmedlemskap – ${ANNUAL_MEMBERSHIP_PRICE_SEK} kr`}
              </button>
              {error && (
                <p className="mt-2 text-sm text-danger">{error}</p>
              )}
              <p className="mt-3 text-xs text-muted leading-relaxed">
                Hjälper du andra förare får du CabRadar gratis. Vill du bara ta
                del av informationen kan du köpa årsmedlemskap för{" "}
                {ANNUAL_MEMBERSHIP_PRICE_SEK} kr.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

function ProgressRow({
  icon,
  label,
  current,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
}) {
  const done = current >= target;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted">
        {icon}
        {label}
      </span>
      <span className={cn("font-mono font-semibold", done && "text-success")}>
        {current}/{target}
        {done && " ✓"}
      </span>
    </div>
  );
}

export function MembershipGateBanner({
  profile,
  className,
}: {
  profile: Profile | null;
  className?: string;
}) {
  if (!MEMBERSHIP_ENABLED) return null;
  if (!profile) return null;
  if (!isVerifiedDriver(profile)) return null;
  if (hasCabRadarAccess(profile)) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/40 bg-accent/10 p-4",
        className
      )}
    >
      <p className="font-semibold">⚠ Medlemskap krävs</p>
      <p className="mt-1 text-sm text-muted leading-relaxed">
        Du har inte uppnått månadens aktivitetskrav.
      </p>
      <a href="/settings" className="mt-3 inline-block btn-primary !min-h-[44px] text-sm">
        Gå till medlemskap
      </a>
    </div>
  );
}
