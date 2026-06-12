export type DriverVerificationStatus =
  | "pending_verification"
  | "verified"
  | "rejected";

export const VERIFICATION_STATUS_LABELS: Record<
  DriverVerificationStatus,
  string
> = {
  pending_verification: "Väntar onboarding",
  verified: "Aktiv",
  rejected: "Avvisad",
};

export const ONBOARDING_PENDING_MESSAGE =
  "Tack för din registrering. En administratör kommer kontakta dig från ett nummer som börjar med 0735 för onboarding och verifiering.";

export const LICENCE_PRIVACY_MESSAGE =
  "Endast för taxiförare. Ditt taxiförarleg. används endast för verifiering.";

export function isVerifiedDriver(profile: {
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
}): boolean {
  return profile.is_admin || profile.verification_status === "verified";
}

export { canParticipateInRewards } from "./membership";
