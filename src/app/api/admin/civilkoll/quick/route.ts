import { NextResponse } from "next/server";
import {
  formatCivilkollObservedDate,
  normalizeRegistrationNumber,
  quickAddCivilRegistryEntry,
} from "@/lib/civilkoll";
import { createClient } from "@/lib/supabase/server";

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

  if (!body.registrationNumber?.trim()) {
    return NextResponse.json(
      { error: "Registreringsnummer krävs." },
      { status: 400 }
    );
  }

  try {
    const normalized = normalizeRegistrationNumber(body.registrationNumber);
    const result = await quickAddCivilRegistryEntry(
      supabase,
      user.id,
      body.registrationNumber,
      { city: profile.driver_city }
    );

    if (result.status === "exists") {
      return NextResponse.json({
        ok: true,
        status: "exists",
        registrationNumber: normalized,
        message: "Finns redan i Civilkoll",
        lastObservedAt: result.lastObservedAt,
        lastObservedLabel: result.lastObservedAt
          ? formatCivilkollObservedDate(result.lastObservedAt)
          : null,
      });
    }

    return NextResponse.json({
      ok: true,
      status: "created",
      registrationNumber: normalized,
      message: "Registreringsnummer tillagt",
    });
  } catch (err) {
    console.error("[CIVILKOLL QUICK]", err);
    const message =
      err instanceof Error ? err.message : "Kunde inte spara registrering.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
