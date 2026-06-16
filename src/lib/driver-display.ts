import { maskLicenceLast4 } from "./licence.shared";

export interface DriverIdentity {
  nickname?: string | null;
  display_name?: string | null;
  cabradar_user_id?: string | null;
  driver_license_last4?: string | null;
}

/** Public label — never exposes real name to other drivers. */
export function publicDriverLabel(identity: DriverIdentity): string {
  const nickname = identity.nickname?.trim();
  if (nickname) return nickname;

  const last4 = identity.driver_license_last4?.trim();
  if (last4) return `Taxi ${maskLicenceLast4(last4)}`;

  const cabradarId = identity.cabradar_user_id?.trim();
  if (cabradarId) return cabradarId;

  return "Okänd förare";
}

/**
 * Own-profile header — nickname first, then real name (display_name), for the
 * logged-in user only. Never use this for other users' public UI.
 */
export function ownProfileDisplayLabel(identity: DriverIdentity): string {
  const nickname = identity.nickname?.trim();
  if (nickname) return nickname;

  const realName = identity.display_name?.trim();
  if (realName) return realName;

  return "Okänd förare";
}

/** Tesla View — nickname only; never leg, ID, or real name. */
export function teslaDrivingDriverLabel(
  identity: Pick<DriverIdentity, "nickname">
): string {
  const nickname = identity.nickname?.trim();
  if (nickname) return nickname;
  return "Okänd förare";
}

/** Real/legal name — admin visibility only. */
export function adminDriverRealName(
  identity: Pick<DriverIdentity, "display_name">
): string | null {
  const real = identity.display_name?.trim();
  return real || null;
}
