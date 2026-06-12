export function isMissingSchemaError(error: {
  code?: string | number;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  if (["PGRST204", "PGRST205", "42703", "42P01"].includes(code)) {
    return true;
  }
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the column")
  );
}

/** Human-readable Supabase/Postgres error — includes code in development. */
export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Okänt fel.";
  }
  if (!error || typeof error !== "object") {
    return "Okänt databasfel.";
  }
  const e = error as {
    code?: string | number;
    message?: string;
    details?: string;
    hint?: string;
  };
  const code = e.code ? String(e.code) : "";
  const detail = [e.message, e.details, e.hint].filter(Boolean).join(" — ");
  if (process.env.NODE_ENV === "development") {
    return code ? `[${code}] ${detail}` : detail || "Databasfel.";
  }
  return e.message ?? "Databasfel.";
}
