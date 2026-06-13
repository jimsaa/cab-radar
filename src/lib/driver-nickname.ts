export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;

export const NICKNAME_TAKEN_MESSAGE = "Detta smeknamn används redan.";
export const NICKNAME_INVALID_MESSAGE =
  "Smeknamn: 3–20 tecken, endast bokstäver, siffror och mellanslag.";
export const NICKNAME_PRIVACY_EXPLANATION =
  "För att skydda förares integritet visas ditt smeknamn i nätverket istället för ditt riktiga namn. Administratörer kan fortfarande se vem du är.";

const NICKNAME_PATTERN = /^[\p{L}\p{N} ]+$/u;

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidNickname(raw: string): boolean {
  const normalized = normalizeNickname(raw);
  if (normalized.length < NICKNAME_MIN_LENGTH) return false;
  if (normalized.length > NICKNAME_MAX_LENGTH) return false;
  return NICKNAME_PATTERN.test(normalized);
}

export function validateNickname(raw: string): string | null {
  const normalized = normalizeNickname(raw);
  if (!normalized) return "Smeknamn krävs.";
  if (normalized.length < NICKNAME_MIN_LENGTH) {
    return `Smeknamn måste vara minst ${NICKNAME_MIN_LENGTH} tecken.`;
  }
  if (normalized.length > NICKNAME_MAX_LENGTH) {
    return `Smeknamn får vara högst ${NICKNAME_MAX_LENGTH} tecken.`;
  }
  if (!NICKNAME_PATTERN.test(normalized)) {
    return NICKNAME_INVALID_MESSAGE;
  }
  return null;
}

export function nicknameLookupKey(raw: string): string {
  return normalizeNickname(raw).toLowerCase();
}

/** Initial nickname for migrated users without one. */
export function generateInitialNickname(
  driverLicenseLast4: string | null | undefined,
  userId?: string
): string {
  const last4 = driverLicenseLast4?.trim();
  if (last4) {
    const base = `Taxi ${last4}`;
    return base.length <= NICKNAME_MAX_LENGTH
      ? base
      : base.slice(0, NICKNAME_MAX_LENGTH).trim();
  }

  const suffix = (userId ?? "000000").replace(/-/g, "").slice(0, 6).toUpperCase();
  return `Förare ${suffix}`.slice(0, NICKNAME_MAX_LENGTH);
}

export function isNicknameConflictError(error: {
  code?: string;
  message?: string;
}): boolean {
  return error.code === "23505";
}
