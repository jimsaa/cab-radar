import {
  LICENCE_DUPLICATE_MESSAGE,
  LICENCE_INVALID_MESSAGE,
} from "@/lib/licence.shared";

export const SIGNUP_ERROR_GENERIC =
  "Det gick inte att skapa kontot. Försök igen.";
export const SIGNUP_ERROR_NETWORK =
  "Det gick inte att ansluta till servern.";
export const SIGNUP_ERROR_UNEXPECTED =
  "Ett oväntat fel uppstod.";

export function isSupabaseConnectionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("getaddrinfo")
  );
}

export function translateSignupError(
  message: string | undefined,
  status?: number
): string {
  if (!message) {
    if (status === 503) {
      return SIGNUP_ERROR_UNEXPECTED;
    }
    return SIGNUP_ERROR_GENERIC;
  }

  if (
    message === LICENCE_INVALID_MESSAGE ||
    message === LICENCE_DUPLICATE_MESSAGE ||
    message === SIGNUP_ERROR_NETWORK
  ) {
    return message;
  }

  const lower = message.toLowerCase();

  if (isSupabaseConnectionError(lower)) {
    return SIGNUP_ERROR_NETWORK;
  }

  if (lower.includes("already") || lower.includes("registered")) {
    return "E-postadressen är redan registrerad.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "Lösenordet måste vara minst 6 tecken.";
  }
  if (lower.includes("invalid email")) {
    return "Ange en giltig e-postadress.";
  }
  if (lower.includes("rate limit")) {
    return "För många försök. Vänta en stund och försök igen.";
  }
  if (
    lower.includes("servern är inte konfigurerad") ||
    lower.includes("slutföra registreringen")
  ) {
    return SIGNUP_ERROR_UNEXPECTED;
  }

  return SIGNUP_ERROR_GENERIC;
}

export function signupErrorFromException(err: unknown): string {
  if (err instanceof TypeError) {
    return SIGNUP_ERROR_NETWORK;
  }
  return SIGNUP_ERROR_UNEXPECTED;
}
