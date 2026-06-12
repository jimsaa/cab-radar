import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { BannerSlot } from "./constants";
import type { BannerAd, TaxiDeal } from "./types/database";
import { fetchAllOffersForAdmin, fetchActiveOffersForDrivers } from "./offers";

export async function fetchActiveDeals(
  supabase: Parameters<typeof fetchActiveOffersForDrivers>[0]
): Promise<TaxiDeal[]> {
  const offers = await fetchActiveOffersForDrivers(supabase);
  return offers.map((o) => ({
    id: o.id,
    business_name: o.business_name,
    offer_title: o.offer_title,
    offer_description: "",
    address: "",
    valid_until: o.valid_until,
    image_url: o.banner_a_url,
    is_active: o.is_active,
    monthly_partner_fee: 0,
    start_date: o.start_date,
    banner_a_url: o.banner_a_url,
    banner_b_url: o.banner_b_url,
    redemption_text: o.redemption_text,
    admin_notes: "",
    created_at: "",
    updated_at: "",
  }));
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
  const admin = await fetchAllOffersForAdmin(supabase);
  return admin.map((o) => ({
    id: o.id,
    business_name: o.business_name,
    offer_title: o.offer_title,
    offer_description: o.offer_description,
    address: o.address,
    valid_until: o.valid_until,
    image_url: o.image_url ?? o.banner_a_url,
    is_active: o.is_active,
    monthly_partner_fee: o.monthly_partner_fee,
    start_date: o.start_date,
    banner_a_url: o.banner_a_url,
    banner_b_url: o.banner_b_url,
    redemption_text: o.redemption_text,
    admin_notes: o.admin_notes,
    created_at: o.created_at,
    updated_at: o.updated_at,
  }));
}
