import { NextResponse } from "next/server";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
  submitCivilkollReport,
} from "@/lib/civilkoll";
import { formatSupabaseError } from "@/lib/db-errors";
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
    .select("verification_status, is_admin, test_mode_enabled")
    .eq("id", user.id)
    .single();

  if (!profile || !isVerifiedDriver(profile)) {
    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });
  }

  const isTest = Boolean(profile.test_mode_enabled);

  let body: { registrationNumber?: string; comment?: string };
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
    await submitCivilkollReport(
      supabase,
      user.id,
      normalized,
      body.comment ?? null,
      { isTest }
    );
    return NextResponse.json({
      ok: true,
      isTest,
      message: isTest
        ? "Testanmälan skickad — inget riktigt Civilkoll-flöde påverkas."
        : undefined,
    });
  } catch (err) {
    console.error("[CIVILKOLL SUBMIT]", err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
