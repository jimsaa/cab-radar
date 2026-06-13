import { NextResponse } from "next/server";
import {
  adminLookupCivilkollEntry,
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
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
    .select("is_admin")
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

  const normalized = normalizeRegistrationNumber(body.registrationNumber ?? "");
  if (!isValidRegistrationNumber(normalized)) {
    return NextResponse.json(
      { error: "Ogiltigt registreringsnummer." },
      { status: 400 }
    );
  }

  try {
    const result = await adminLookupCivilkollEntry(supabase, normalized);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ADMIN CIVILKOLL LOOKUP]", err);
    return NextResponse.json({ error: "Kunde inte söka." }, { status: 500 });
  }
}
