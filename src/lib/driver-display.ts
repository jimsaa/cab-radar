import { maskLicenceLast4 } from "./licence.shared";

export interface DriverIdentity {
  nickname?: string | null;
  display_name?: string | null;
  cabradar_user_id?: string | null;
  driver_license_last4?: string | null;
}

/** Public label — never exposes real name. */
export function publicDriverLabel(identity: DriverIdentity): string {
  const nickname = identity.nickname?.trim();
  if (nickname) return nickname;

  const last4 = identity.driver_license_last4?.trim();
  if (last4) return `Taxi ${maskLicenceLast4(last4)}`;

  const cabradarId = identity.cabradar_user_id?.trim();
  if (cabradarId) return cabradarId;

  return "Okänd förare";
}

/** Real/legal name — admin visibility only. */
export function adminDriverRealName(
  identity: Pick<DriverIdentity, "display_name">
): string | null {
  const real = identity.display_name?.trim();
  return real || null;
}
