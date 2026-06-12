import { NextResponse } from "next/server";
import { createManualRegistryEntry } from "@/lib/civilkoll";
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
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }

  let body: { registrationNumber?: string; adminNote?: string };
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
    await createManualRegistryEntry(
      supabase,
      user.id,
      body.registrationNumber,
      body.adminNote ?? null
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CIVILKOLL MANUAL]", err);
    const message =
      err instanceof Error ? err.message : "Kunde inte spara registrering.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
