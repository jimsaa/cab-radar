import type { Profile } from "./types/database";

export function isTeslaBetaUser(
  profile:
    | Pick<Profile, "membership_type"> & { tesla_beta?: boolean }
    | null
    | undefined
): boolean {
  if (!profile) return false;
  return Boolean(profile.tesla_beta) || profile.membership_type === "tesla_beta";
}

export const TESLA_BETA_ALLOWED_PATH_PREFIXES = [
  "/tesla",
  "/tesla-beta",
  "/api/",
  "/auth/",
] as const;

export function isTeslaBetaAllowedPath(path: string): boolean {
  return TESLA_BETA_ALLOWED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

/** Tesla Beta drivers land in Tesla View after login. */
export function teslaBetaLoginRedirect(
  profile:
    | (Pick<Profile, "membership_type"> & {
        tesla_beta?: boolean;
        is_admin?: boolean;
      })
    | null
    | undefined
): string | null {
  if (!profile || profile.is_admin) return null;
  if (!isTeslaBetaUser(profile)) return null;
  return "/tesla";
}
