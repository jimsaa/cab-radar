import type { SupabaseClient, User } from "@supabase/supabase-js";
import { formatDriverCityLabel } from "./driver-city";
import { isMissingSchemaError } from "./db-errors";
import { fetchCurrentProfile } from "./profile";
import type { Profile, SupportMessage } from "./types/database";

export interface SupportProfileContext {
  userId: string;
  email: string | null;
  displayName: string | null;
  cabradarUserId: string;
  phoneNumber: string | null;
  driverCity: string | null;
  profileExists: boolean;
}

const PROFILE_RETRY_ATTEMPTS = 4;
const PROFILE_RETRY_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportLog(label: string, payload?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (payload !== undefined) {
      console.log(`[SUPPORT] ${label}`, payload);
    } else {
      console.log(`[SUPPORT] ${label}`);
    }
  }
}

function resolveCabradarUserId(
  profile: Pick<Profile, "cabradar_user_id"> | null,
  userId: string
): string {
  const id = profile?.cabradar_user_id?.trim();
  if (id) return id;
  return `PENDING-${userId.slice(0, 8).toUpperCase()}`;
}

function resolveDisplayName(
  profile: Pick<Profile, "display_name"> | null,
  user: User
): string | null {
  if (profile?.display_name?.trim()) return profile.display_name.trim();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.display_name === "string" && meta.display_name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    null;
  if (fromMeta) return fromMeta;
  return user.email?.split("@")[0] ?? null;
}

/** Load profile for support with short retries (handles post-login race). */
export async function loadSupportProfileContext(
  supabase: SupabaseClient,
  user: User
): Promise<SupportProfileContext | null> {
  supportLog("Loading profile context", { userId: user.id });

  let profile: Profile | null = null;

  for (let attempt = 0; attempt < PROFILE_RETRY_ATTEMPTS; attempt++) {
    try {
      profile = await fetchCurrentProfile(supabase, user.id);
    } catch (err) {
      supportLog(`Profile fetch error (attempt ${attempt + 1})`, err);
      if (!isMissingSchemaError(err as { code?: string; message?: string })) {
        throw err;
      }
    }

    if (profile) {
      supportLog("Profile loaded", {
        attempt: attempt + 1,
        cabradarUserId: profile.cabradar_user_id,
      });
      break;
    }

    if (attempt < PROFILE_RETRY_ATTEMPTS - 1) {
      supportLog(`Profile not ready, retry ${attempt + 2}/${PROFILE_RETRY_ATTEMPTS}`);
      await sleep(PROFILE_RETRY_DELAY_MS);
    }
  }

  if (!profile) {
    supportLog("No profile record found after retries", { userId: user.id });
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: resolveDisplayName(profile, user),
    cabradarUserId: resolveCabradarUserId(profile, user.id),
    phoneNumber: profile.phone_number?.trim() || null,
    driverCity: profile.driver_city?.trim() || null,
    profileExists: true,
  };
}

export function buildSupportMessageBody(
  userMessage: string,
  context: SupportProfileContext
): string {
  const lines = [
    userMessage.trim(),
    "",
    "---",
    "Kontaktuppgifter (automatiskt)",
    `Förare: ${context.displayName ?? "Ej angivet"}`,
    `CabRadar ID: ${context.cabradarUserId}`,
    `E-post: ${context.email ?? "Ej angivet"}`,
    `Telefon: ${context.phoneNumber ?? "Ej angivet"}`,
    `Stad: ${formatDriverCityLabel(context.driverCity)}`,
    `Användar-ID: ${context.userId}`,
  ];
  return lines.join("\n");
}

export async function fetchAllSupportMessages(
  supabase: SupabaseClient
): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as SupportMessage[];
}
