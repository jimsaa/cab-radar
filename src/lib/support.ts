import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { SupportMessage } from "./types/database";

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