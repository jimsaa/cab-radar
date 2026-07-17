import { formatSwedishDate } from "./datetime";
import { isTeslaBetaUser } from "./tesla-beta";
import type { DriverVerificationStatus } from "./verification";
import type { MembershipType } from "./types/database";

export const MEMBERSHIP_THRESHOLDS = {
  reports: 5,
  votes: 10,
  points: 50,
} as const;

export const ANNUAL_MEMBERSHIP_PRICE_SEK = 199;

export const MEMBERSHIP_TYPE_LABELS: Record<MembershipType, string> = {
  active_driver: "Aktiv förare",
  annual_member: "Årsmedlemskap",
  inactive: "Medlemskap krävs",
  tesla_beta: "Tesla Beta",
  free: "Gratis",
};

export interface MembershipProfile {
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
  beta_user?: boolean;
  tesla_beta?: boolean;
  membership_type: MembershipType;
  membership_expires_at: string | null;
  monthly_reports_count: number;
  monthly_votes_count: number;
  monthly_points: number;
}

export function isBetaUser(
  profile: { beta_user?: boolean } | null | undefined
): boolean {
  return Boolean(profile?.beta_user);
}

export function isVerifiedDriver(profile: {
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
}): boolean {
  return profile.is_admin || profile.verification_status === "verified";
}

export function hasAnnualMembership(profile: MembershipProfile): boolean {
  if (profile.is_admin) return true;
  if (profile.membership_type !== "annual_member") return false;
  if (!profile.membership_expires_at) return false;
  return new Date(profile.membership_expires_at) > new Date();
}

export function meetsContributionRequirements(profile: MembershipProfile): boolean {
  return (
    profile.monthly_reports_count >= MEMBERSHIP_THRESHOLDS.reports ||
    profile.monthly_votes_count >= MEMBERSHIP_THRESHOLDS.votes ||
    profile.monthly_points >= MEMBERSHIP_THRESHOLDS.points
  );
}

/** Verified + free/active_driver, valid annual, admin, beta tester, or Tesla Beta */
export function hasCabRadarAccess(profile: MembershipProfile): boolean {
  if (profile.is_admin) return true;
  if (!isVerifiedDriver(profile)) return false;
  if (isTeslaBetaUser(profile)) return true;
  if (isBetaUser(profile)) return true;
  if (profile.membership_type === "free") return true;
  if (profile.membership_type === "active_driver") return true;
  if (hasAnnualMembership(profile)) return true;
  return false;
}

/** Submit alerts, vote, earn contribution credit */
export function canContributeToCommunity(profile: MembershipProfile): boolean {
  return isVerifiedDriver(profile) && hasCabRadarAccess(profile);
}

export function canParticipateInRewards(profile: MembershipProfile): boolean {
  return canContributeToCommunity(profile);
}

export function formatMembershipExpiry(iso: string | null): string {
  if (!iso) return "—";
  return formatSwedishDate(iso);
}

export function membershipStatusIcon(profile: MembershipProfile): string {
  if (!isVerifiedDriver(profile)) return "⏳";
  if (hasCabRadarAccess(profile)) {
    return profile.membership_type === "annual_member" ? "✓" : "✓";
  }
  return "⚠";
}

export function membershipStatusLine(profile: MembershipProfile): string {
  if (!isVerifiedDriver(profile)) return "Verifiering krävs";
  if (isTeslaBetaUser(profile)) return "🚕 Tesla Beta — testläge";
  if (isBetaUser(profile)) return "🧪 Betatest — full tillgång";
  if (profile.membership_type === "free") {
    return `✓ ${MEMBERSHIP_TYPE_LABELS.free}`;
  }
  if (profile.membership_type === "annual_member" && hasAnnualMembership(profile)) {
    return `✓ ${MEMBERSHIP_TYPE_LABELS.annual_member}`;
  }
  if (profile.membership_type === "active_driver") {
    return `✓ ${MEMBERSHIP_TYPE_LABELS.active_driver}`;
  }
  return `⚠ ${MEMBERSHIP_TYPE_LABELS.inactive}`;
}
