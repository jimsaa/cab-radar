import { formatSupabaseError } from "@/lib/db-errors";

const ALL_VEHICLE_CHECK_MIGRATION =
  "migration-alert-all-vehicle-check.sql";

export function formatAlertCreateError(
  err: unknown,
  alertType?: string
): string {
  const e =
    err && typeof err === "object"
      ? (err as { code?: string; message?: string })
      : null;

  const code = e?.code ?? "";
  const message = (e?.message ?? "").toLowerCase();

  if (code === "22P02" || message.includes("invalid input value for enum")) {
    if (
      alertType === "all_vehicle_check" ||
      message.includes("all_vehicle_check")
    ) {
      return `Reporttypen «Kontroll av alla fordon» saknas i databasen. Kör ${ALL_VEHICLE_CHECK_MIGRATION} i Supabase SQL Editor, vänta en minut och försök igen.`;
    }
    return `Rapporttypen stöds inte i databasen ännu. Kör senaste Supabase-migration för ${alertType ?? "denna typ"}.`;
  }

  if (code === "PGRST204" || message.includes("schema cache")) {
    return "Databasens API-cache är inte uppdaterad. Kör i Supabase SQL Editor: NOTIFY pgrst, 'reload schema'; och försök igen om en minut.";
  }

  const detail = formatSupabaseError(err);
  if (detail && detail !== "Databasfel." && detail !== "Okänt databasfel.") {
    return `Kunde inte skicka rapport: ${detail}`;
  }

  return "Kunde inte skicka rapport. Försök igen.";
}
