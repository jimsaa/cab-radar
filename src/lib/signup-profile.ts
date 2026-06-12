import type { SupabaseClient } from "@supabase/supabase-js";
import { licenceLast4 } from "./licence.shared";

export function isMissingColumnError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("schema cache") || msg.includes("does not exist");
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
  "Databasen saknar registreringskolumner. Kör migration-signup-profile-fix.sql i Supabase SQL Editor.";
