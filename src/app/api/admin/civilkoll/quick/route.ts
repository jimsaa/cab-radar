import { NextResponse } from "next/server";
import {
  formatCivilkollObservedDate,
  normalizeRegistrationNumber,
  quickAddCivilRegistryEntry,
} from "@/lib/civilkoll";
import { formatSupabaseError } from "@/lib/db-errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, driver_city")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }

  let body: { registrationNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const rawRegistration = body.registrationNumber?.trim() ?? "";
  console.log("[CIVILKOLL QUICK] request received:", rawRegistration, "admin:", user.id);

  if (!rawRegistration) {
    return NextResponse.json(
      { error: "Registreringsnummer krävs." },
      { status: 400 }
    );
  }

  try {
    const normalized = normalizeRegistrationNumber(rawRegistration);
    const service = await createServiceClient();
    const result = await quickAddCivilRegistryEntry(
      service,
      user.id,
      rawRegistration,
      { city: profile.driver_city }
    );

    if (result.status === "exists") {
      console.log("[CIVILKOLL QUICK] already exists:", normalized);
      return NextResponse.json({
        ok: true,
        status: "exists",
        registrationNumber: normalized,
        message: `${normalized} finns redan i CivilKoll.`,
        lastObservedAt: result.lastObservedAt,
        lastObservedLabel: result.lastObservedAt
          ? formatCivilkollObservedDate(result.lastObservedAt)
          : null,
      });
    }

    console.log("[CIVILKOLL QUICK] created:", normalized);
    return NextResponse.json({
      ok: true,
      status: "created",
      registrationNumber: normalized,
      message: `✅ ${normalized} har lagts till direkt i CivilKoll.`,
    });
  } catch (err) {
    console.error("[CIVILKOLL QUICK] failed:", err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
