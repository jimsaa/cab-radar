import { formatSupabaseError } from "@/lib/db-errors";
import {
  LICENCE_DUPLICATE_MESSAGE,
} from "@/lib/licence.shared";
import { isNicknameConflictError } from "@/lib/driver-nickname";
import { PROFILE_SCHEMA_ERROR } from "@/lib/signup-profile";
import { SIGNUP_ERROR_GENERIC } from "@/lib/signup-errors";

export type SignupFailureStep =
  | "validation"
  | "nickname_check"
  | "auth_create"
  | "profile_lookup"
  | "profile_update"
  | "profile_insert"
  | "profile_retry"
  | "unexpected";

export function logSignupFailure(
  step: SignupFailureStep,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const payload =
    error && typeof error === "object"
      ? {
          code: (error as { code?: string }).code,
          message: (error as { message?: string }).message,
          details: (error as { details?: string }).details,
          hint: (error as { hint?: string }).hint,
          ...context,
        }
      : { error: String(error), ...context };

  console.error(`[AUTH] Signup failed at ${step}:`, payload);
}

export function mapSignupProfileError(
  error: {
    code?: string;
    message?: string;
    details?: string;
  } | null,
  step: SignupFailureStep
): { message: string; status: number } {
  if (!error) {
    return { message: SIGNUP_ERROR_GENERIC, status: 500 };
  }

  if (isNicknameConflictError(error)) {
    return {
      message: "Detta smeknamn används redan.",
      status: 409,
    };
  }

  if (error.code === "23505") {
    const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("nickname")) {
      return {
        message: "Detta smeknamn används redan.",
        status: 409,
      };
    }
    return { message: LICENCE_DUPLICATE_MESSAGE, status: 409 };
  }

  if (error.code === "23502") {
    const text = `${error.message ?? ""}`.toLowerCase();
    if (text.includes("cabradar_user_id")) {
      return { message: PROFILE_SCHEMA_ERROR, status: 503 };
    }
  }

  return {
    message: formatSignupPublicError(error, step),
    status: 500,
  };
}

export function formatSignupPublicError(
  error: unknown,
  step?: SignupFailureStep
): string {
  const detail = formatSupabaseError(error);
  const stepLabel = step ? ` (${step})` : "";

  if (process.env.NODE_ENV === "development") {
    return `${SIGNUP_ERROR_GENERIC}${stepLabel}: ${detail}`;
  }

  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("nickname") &&
    (lower.includes("unique") || lower.includes("duplicate"))
  ) {
    return "Detta smeknamn används redan.";
  }

  if (lower.includes("driver_license") || lower.includes("licence")) {
    return LICENCE_DUPLICATE_MESSAGE;
  }

  if (
    lower.includes("schema cache") ||
    lower.includes("does not exist") ||
    lower.includes("cabradar_user_id")
  ) {
    return PROFILE_SCHEMA_ERROR;
  }

  return SIGNUP_ERROR_GENERIC;
}

export function formatSignupAuthError(message: string): string {
  const lower = message.toLowerCase();

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

  if (process.env.NODE_ENV === "development") {
    return `${SIGNUP_ERROR_GENERIC} (auth_create): ${message}`;
  }

  if (
    lower.includes("database error") ||
    lower.includes("does not exist") ||
    lower.includes("cabradar_user_id") ||
    lower.includes("nickname")
  ) {
    return PROFILE_SCHEMA_ERROR;
  }

  return SIGNUP_ERROR_GENERIC;
}
