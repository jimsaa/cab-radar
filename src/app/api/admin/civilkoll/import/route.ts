import { NextResponse } from "next/server";
import { importBulkCivilRegistry } from "@/lib/civilkoll";
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

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: "Ingen importdata — klistra in registreringsnummer (en per rad)." },
      { status: 400 }
    );
  }

  try {
    const result = await importBulkCivilRegistry(
      supabase,
      user.id,
      body.text
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[CIVILKOLL IMPORT]", err);
    return NextResponse.json(
      { error: "Importen misslyckades." },
      { status: 500 }
    );
  }
}
