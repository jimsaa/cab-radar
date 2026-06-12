export type DriverVerificationStatus =
  | "pending_verification"
  | "verified"
  | "rejected";

export const VERIFICATION_STATUS_LABELS: Record<
  DriverVerificationStatus,
  string
> = {
  pending_verification: "Väntar på verifiering",
  verified: "Verifierad",
  rejected: "Nekad",
};

export const LICENCE_PRIVACY_MESSAGE =
  "Endast för taxiförare. Ditt taxiförarleg. används endast för verifiering.";

export function isVerifiedDriver(profile: {
  verification_status: DriverVerificationStatus;
  is_admin: boolean;
}): boolean {
  return profile.is_admin || profile.verification_status === "verified";
}

export { canParticipateInRewards } from "./membership";
