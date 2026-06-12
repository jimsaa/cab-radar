import { NextResponse } from "next/server";
import { lookupCivilkollEntry, normalizeRegistrationNumber, isValidRegistrationNumber } from "@/lib/civilkoll";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";

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
    .select("verification_status, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !isVerifiedDriver(profile)) {
    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });
  }

  let body: { registrationNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const normalized = normalizeRegistrationNumber(body.registrationNumber ?? "");
  if (!isValidRegistrationNumber(normalized)) {
    return NextResponse.json({ error: "Ogiltigt registreringsnummer." }, { status: 400 });
  }

  try {
    const result = await lookupCivilkollEntry(supabase, normalized);
    return NextResponse.json({ found: result.found });
  } catch (err) {
    console.error("[CIVILKOLL LOOKUP]", err);
    return NextResponse.json({ error: "Kunde inte söka." }, { status: 500 });
  }
}
