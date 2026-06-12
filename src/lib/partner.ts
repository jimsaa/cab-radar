import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { PartnerLead } from "./types/database";

export async function fetchAllPartnerLeads(
  supabase: SupabaseClient
): Promise<PartnerLead[]> {
  const { data, error } = await supabase
    .from("partner_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as PartnerLead[];
}