import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { BannerSlot } from "./constants";
import type { BannerAd, TaxiDeal } from "./types/database";

export async function fetchActiveDeals(
  supabase: SupabaseClient
): Promise<TaxiDeal[]> {
  const { data, error } = await supabase
    .from("taxi_deals")
    .select("*")
    .eq("is_active", true)
    .gte("valid_until", new Date().toISOString().slice(0, 10))
    .order("valid_until", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TaxiDeal[];
}

export async function fetchBannerForSlot(
  supabase: SupabaseClient,
  slot: BannerSlot
): Promise<BannerAd | null> {
  const { data, error } = await supabase
    .from("banner_ads")
    .select("*")
    .eq("slot", slot)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as BannerAd | null) ?? null;
}

export async function fetchAllBanners(
  supabase: SupabaseClient
): Promise<BannerAd[]> {
  const { data, error } = await supabase
    .from("banner_ads")
    .select("*")
    .order("slot")
    .order("sort_order");

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as BannerAd[];
}

export async function fetchAllDeals(
  supabase: SupabaseClient
): Promise<TaxiDeal[]> {
  const { data, error } = await supabase
    .from("taxi_deals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as TaxiDeal[];
}
