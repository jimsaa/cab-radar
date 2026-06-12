import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";
import type { UserFeedback } from "./types/database";
export async function fetchAllFeedback(
  supabase: SupabaseClient
): Promise<UserFeedback[]> {
  const { data, error } = await supabase
    .from("user_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }
  return (data ?? []) as UserFeedback[];
}
export async function updateFeedbackStatus(
  supabase: SupabaseClient,
  id: string,
  status: UserFeedback["status"],
  adminNotes?: string
) {
  const { error } = await supabase
    .from("user_feedback")
    .update({
      status,
      ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
    })
    .eq("id", id);

  if (error) throw error;
}
