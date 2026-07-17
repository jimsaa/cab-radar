import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "@/lib/db-errors";
import { isNicknameConflictError } from "@/lib/driver-nickname";
import { licenceLast4 } from "./licence.shared";
import {
  logSignupFailure,
  mapSignupProfileError,
  type SignupFailureStep,
} from "./signup-route-errors";

export function isMissingColumnError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  return isMissingSchemaError(error);
}

/** Detect whether profiles.driver_license_hash is available in PostgREST schema. */
export async function profileHasLicenceHashColumn(
  supabase: SupabaseClient
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .select("driver_license_hash")
    .limit(1);

  return !isMissingColumnError(error);
}

export function licenceProfileFields(
  licence: string,
  licenceHash: string,
  useHashColumn: boolean
): Record<string, string | null> {
  if (useHashColumn) {
    return {
      driver_license_hash: licenceHash,
      driver_license_last4: licenceLast4(licence),
      driver_license_number: null,
    };
  }
  return {
    driver_license_number: licence,
  };
}

export async function findDuplicateLicence(
  supabase: SupabaseClient,
  licence: string,
  licenceHash: string,
  useHashColumn: boolean
): Promise<boolean> {
  if (useHashColumn) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("driver_license_hash", licenceHash)
      .maybeSingle();

    if (error && !isMissingColumnError(error)) {
      console.error("[AUTH] duplicate licence check failed", error);
    }
    return Boolean(data);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("driver_license_number", licence)
    .maybeSingle();

  if (error && !isMissingColumnError(error)) {
    console.error("[AUTH] duplicate licence check failed", error);
    return false;
  }
  return Boolean(data);
}

export const PROFILE_SCHEMA_ERROR =
  "Databasen saknar registreringskolumner. Kör migration-signup-unified-trigger.sql i Supabase SQL Editor.";

export interface SignupOnboardingFields {
  phone_number: string;
  driver_city: string;
  taxi_company_name: string;
  nickname: string;
  taxi_number?: string | null;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

async function generateCabradarUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.rpc("generate_cabradar_user_id");
  if (error) {
    console.warn("[AUTH] generate_cabradar_user_id RPC failed:", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

async function updateProfileWithFallbacks(
  supabase: SupabaseClient,
  userId: string,
  payloads: Record<string, unknown>[],
  step: SignupFailureStep
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  let lastError: { code?: string; message?: string; details?: string } | null =
    null;

  for (const payload of payloads) {
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (!error) {
      return { ok: true };
    }

    lastError = error;
    if (isMissingColumnError(error)) {
      continue;
    }

    if (isNicknameConflictError(error) || error.code === "23505") {
      const mapped = mapSignupProfileError(error, step);
      return { ok: false, message: mapped.message, status: mapped.status };
    }

    logSignupFailure(step, error, { userId, payloadKeys: Object.keys(payload) });
  }

  const mapped = mapSignupProfileError(lastError, step);
  return { ok: false, message: mapped.message, status: mapped.status };
}

export async function saveSignupProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
  licenceFields: Record<string, string | null>,
  onboarding: SignupOnboardingFields
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const updatedAt = new Date().toISOString();
  const onboardingPayload = omitUndefined({
    phone_number: onboarding.phone_number,
    driver_city: onboarding.driver_city,
    taxi_company_name: onboarding.taxi_company_name,
    nickname: onboarding.nickname,
    taxi_number: onboarding.taxi_number ?? undefined,
  });

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: profile, error: profileSelectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileSelectError && !isMissingColumnError(profileSelectError)) {
      logSignupFailure("profile_lookup", profileSelectError, { userId, attempt });
    }

    if (profile) {
      const { nickname: _nickname, ...withoutNickname } = onboardingPayload;
      const activation = {
        verification_status: "verified",
        membership_type: "free",
        test_mode_enabled: true,
        verified_at: updatedAt,
        welcome_pending: true,
      };
      return updateProfileWithFallbacks(
        supabase,
        userId,
        [
          {
            ...licenceFields,
            ...onboardingPayload,
            ...activation,
            updated_at: updatedAt,
          },
          {
            ...licenceFields,
            ...withoutNickname,
            ...activation,
            updated_at: updatedAt,
          },
          {
            ...licenceFields,
            phone_number: onboarding.phone_number,
            ...activation,
            updated_at: updatedAt,
          },
          { ...licenceFields, ...activation, updated_at: updatedAt },
          {
            ...licenceFields,
            verification_status: "verified",
            test_mode_enabled: true,
            updated_at: updatedAt,
          },
        ],
        "profile_update"
      );
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  const cabradarUserId = await generateCabradarUserId(supabase);
  const activation = {
    verification_status: "verified",
    membership_type: "free",
    test_mode_enabled: true,
    verified_at: updatedAt,
    welcome_pending: true,
  };

  const insertPayloads: Record<string, unknown>[] = [
    {
      id: userId,
      display_name: displayName,
      cabradar_user_id: cabradarUserId,
      ...onboardingPayload,
      ...licenceFields,
      ...activation,
    },
    {
      id: userId,
      display_name: displayName,
      cabradar_user_id: cabradarUserId,
      nickname: onboarding.nickname,
      phone_number: onboarding.phone_number,
      ...licenceFields,
      ...activation,
    },
    {
      id: userId,
      display_name: displayName,
      cabradar_user_id: cabradarUserId,
      phone_number: onboarding.phone_number,
      ...licenceFields,
      verification_status: "verified",
      membership_type: "free",
      test_mode_enabled: true,
    },
    {
      id: userId,
      display_name: displayName,
      cabradar_user_id: cabradarUserId,
      verification_status: "verified",
      test_mode_enabled: true,
    },
  ];

  let lastInsertError: { code?: string; message?: string; details?: string } | null =
    null;

  for (const payload of insertPayloads) {
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    const { error: insertError } = await supabase.from("profiles").insert(cleaned);

    if (!insertError) {
      return { ok: true };
    }

    lastInsertError = insertError;
    if (isMissingColumnError(insertError)) {
      continue;
    }

    if (insertError.code === "23505") {
      const mapped = mapSignupProfileError(insertError, "profile_insert");
      return { ok: false, message: mapped.message, status: mapped.status };
    }

    logSignupFailure("profile_insert", insertError, {
      userId,
      payloadKeys: Object.keys(cleaned),
    });
  }

  const mapped = mapSignupProfileError(lastInsertError, "profile_insert");
  return { ok: false, message: mapped.message, status: mapped.status };
}
