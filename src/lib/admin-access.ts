import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";

export interface AdminRoleProfile {
  is_admin: boolean;
  is_co_admin?: boolean | null;
  co_admin_emergency_call?: boolean | null;
}

export function isFullAdmin(
  profile: AdminRoleProfile | null | undefined
): boolean {
  return Boolean(profile?.is_admin);
}

export function isCoAdminOnly(
  profile: AdminRoleProfile | null | undefined
): boolean {
  return Boolean(profile?.is_co_admin) && !profile?.is_admin;
}

/** Full admin or delegated co-admin — emergency operations only for co-admins. */
export function hasEmergencyAdminAccess(
  profile: AdminRoleProfile | null | undefined
): boolean {
  return Boolean(profile?.is_admin || profile?.is_co_admin);
}

/** Admins always; co-admins only with explicit Ring förare permission. */
export function canViewEmergencyPhone(
  profile: AdminRoleProfile | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.is_admin) return true;
  return Boolean(profile.is_co_admin && profile.co_admin_emergency_call);
}

/** Fetch role fields; falls back when is_co_admin column is missing. */
export async function fetchAdminRoleProfile<
  T extends AdminRoleProfile = AdminRoleProfile,
>(
  supabase: SupabaseClient,
  userId: string,
  extraColumns: string[] = []
): Promise<T | null> {
  const fullSelect = ["is_admin", "is_co_admin", "co_admin_emergency_call", ...extraColumns].join(", ");
  const full = await supabase
    .from("profiles")
    .select(fullSelect)
    .eq("id", userId)
    .single();

  if (!full.error && full.data) {
    return full.data as unknown as T;
  }

  if (full.error && !isMissingSchemaError(full.error)) {
    console.error("[ADMIN] role profile fetch failed", full.error);
    return null;
  }

  const minimalSelect = ["is_admin", ...extraColumns].join(", ");
  const minimal = await supabase
    .from("profiles")
    .select(minimalSelect)
    .eq("id", userId)
    .single();

  if (!minimal.error && minimal.data) {
    const row = minimal.data as unknown as Record<string, unknown>;
    return {
      ...row,
      is_admin: Boolean(row.is_admin),
      is_co_admin: false,
      co_admin_emergency_call: false,
    } as unknown as T;
  }

  return null;
}

/** Layout header — tolerates databases without is_co_admin migration yet. */
export async function fetchLayoutAdminRole(
  supabase: SupabaseClient,
  userId: string
): Promise<{ isAdmin: boolean; isEmergencyAdmin: boolean }> {
  const profile = await fetchAdminRoleProfile(supabase, userId);
  if (!profile) {
    return { isAdmin: false, isEmergencyAdmin: false };
  }
  return {
    isAdmin: isFullAdmin(profile),
    isEmergencyAdmin: hasEmergencyAdminAccess(profile),
  };
}
