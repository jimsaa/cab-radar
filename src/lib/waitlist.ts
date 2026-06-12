import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";

export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
  source: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidWaitlistEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  return trimmed.length >= 5 && trimmed.length <= 320 && EMAIL_PATTERN.test(trimmed);
}

export async function addToWaitlist(
  supabase: SupabaseClient,
  email: string,
  source = "coming_soon"
): Promise<{ ok: true; duplicate: boolean }> {
  const normalized = email.trim().toLowerCase();

  const { error } = await supabase.from("waitlist").insert({
    email: normalized,
    source,
  });

  if (!error) {
    return { ok: true, duplicate: false };
  }

  if (error.code === "23505") {
    return { ok: true, duplicate: true };
  }

  if (isMissingSchemaError(error)) {
    throw new Error("Waitlist-tabellen saknas. Kör migration-waitlist.sql.");
  }

  throw error;
}

export async function fetchWaitlist(
  supabase: SupabaseClient
): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("id, email, created_at, source")
    .eq("source", "coming_soon")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return (data ?? []) as WaitlistEntry[];
}

export function waitlistToCsv(entries: WaitlistEntry[]): string {
  const lines = ["email,datum,källa"];
  for (const entry of entries) {
    const date = entry.created_at.slice(0, 10);
    const email = entry.email.includes(",")
      ? `"${entry.email.replace(/"/g, '""')}"`
      : entry.email;
    lines.push(`${email},${date},${entry.source}`);
  }
  return lines.join("\n");
}
