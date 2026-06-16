import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizePreferredView,
  preferredViewHomePath,
  type PreferredView,
} from "./preferred-view";

export async function fetchPreferredView(
  supabase: SupabaseClient,
  userId: string
): Promise<PreferredView> {
  const { data } = await supabase
    .from("profiles")
    .select("preferred_view")
    .eq("id", userId)
    .maybeSingle();

  return normalizePreferredView(data?.preferred_view as string | undefined);
}

/** First visit to /tesla bumps default app → tesla (legacy Tesla users). */
export async function ensureTeslaPreferenceOnFirstVisit(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("preferred_view")
    .eq("id", userId)
    .maybeSingle();

  const current = normalizePreferredView(data?.preferred_view as string | undefined);
  if (current !== "app") return;

  await supabase
    .from("profiles")
    .update({
      preferred_view: "tesla",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export function redirectPathForPreferredView(
  view: PreferredView,
  requestedPath: string
): string | null {
  if (requestedPath !== "/" && requestedPath !== "/login") return null;

  const home = preferredViewHomePath(view);
  return home === "/" ? null : home;
}
