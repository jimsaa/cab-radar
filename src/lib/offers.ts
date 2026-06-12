import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { DriverOffer, DriverOfferAdmin, TaxiDeal } from "./types/database";

/** Columns safe for driver reads — excludes admin_notes and partner fees. */
export const DRIVER_OFFER_COLUMNS =
  "id, business_name, offer_title, banner_a_url, banner_b_url, redemption_text, start_date, valid_until, is_active";

export const ADMIN_OFFER_COLUMNS =
  "id, business_name, offer_title, offer_description, address, start_date, valid_until, banner_a_url, banner_b_url, redemption_text, admin_notes, image_url, is_active, monthly_partner_fee, created_at, updated_at";

export const OFFER_BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const OFFER_BANNER_ACCEPT = "image/jpeg,image/png,image/webp";
export const OFFER_BANNER_RECOMMENDED = "320×100 px";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Active for drivers: enabled + within optional start/end window + has Banner A. */
export function isOfferVisibleToDrivers(
  offer: Pick<
    DriverOffer,
    "is_active" | "start_date" | "valid_until" | "banner_a_url"
  >
): boolean {
  if (!offer.is_active || !offer.banner_a_url?.trim()) return false;

  const today = todayIsoDate();
  if (offer.start_date && offer.start_date > today) return false;
  if (offer.valid_until && offer.valid_until < today) return false;

  return true;
}

export function mapRowToDriverOffer(row: Record<string, unknown>): DriverOffer {
  return {
    id: row.id as string,
    business_name: row.business_name as string,
    offer_title: row.offer_title as string,
    banner_a_url: (row.banner_a_url as string | null) ?? null,
    banner_b_url: (row.banner_b_url as string | null) ?? null,
    redemption_text: (row.redemption_text as string) ?? "",
    start_date: (row.start_date as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
    is_active: Boolean(row.is_active),
  };
}

export function mapRowToAdminOffer(row: Record<string, unknown>): DriverOfferAdmin {
  return {
    ...mapRowToDriverOffer(row),
    offer_description: (row.offer_description as string) ?? "",
    address: (row.address as string) ?? "",
    admin_notes: (row.admin_notes as string) ?? "",
    image_url: (row.image_url as string | null) ?? null,
    monthly_partner_fee: Number(row.monthly_partner_fee ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchActiveOffersForDrivers(
  supabase: SupabaseClient
): Promise<DriverOffer[]> {
  const today = todayIsoDate();

  const { data, error } = await supabase
    .from("taxi_deals")
    .select(DRIVER_OFFER_COLUMNS)
    .eq("is_active", true)
    .not("banner_a_url", "is", null)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => mapRowToDriverOffer(row as Record<string, unknown>))
    .filter(isOfferVisibleToDrivers);
}

export async function fetchAllOffersForAdmin(
  supabase: SupabaseClient
): Promise<DriverOfferAdmin[]> {
  const { data, error } = await supabase
    .from("taxi_deals")
    .select(ADMIN_OFFER_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []).map((row) =>
    mapRowToAdminOffer(row as Record<string, unknown>)
  );
}

/** Legacy alias */
export async function fetchActiveDeals(
  supabase: SupabaseClient
): Promise<TaxiDeal[]> {
  const offers = await fetchActiveOffersForDrivers(supabase);
  return offers.map((o) => ({
    id: o.id,
    business_name: o.business_name,
    offer_title: o.offer_title,
    offer_description: "",
    address: "",
    valid_until: o.valid_until ?? todayIsoDate(),
    image_url: o.banner_a_url,
    is_active: o.is_active,
    monthly_partner_fee: 0,
    created_at: "",
    updated_at: "",
    start_date: o.start_date,
    banner_a_url: o.banner_a_url,
    banner_b_url: o.banner_b_url,
    redemption_text: o.redemption_text,
    admin_notes: "",
  }));
}

export function offerStoragePath(
  offerId: string,
  slot: "banner-a" | "banner-b",
  ext: string
): string {
  return `${offerId}/${slot}.${ext}`;
}

export function extensionForMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

export function publicStorageUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/offers/${path}`;
}
