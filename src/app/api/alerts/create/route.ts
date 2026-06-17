import { NextResponse } from "next/server";
import { formatAlertCreateError } from "@/lib/alert-create-errors";
import { createAlert } from "@/lib/alerts";
import { isCurrentAlertType } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";
import type { CreateAlertInput } from "@/lib/types/database";

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
    return NextResponse.json(
      { error: "Endast verifierade förare kan rapportera." },
      { status: 403 }
    );
  }

  let body: CreateAlertInput;
  try {
    body = (await request.json()) as CreateAlertInput;
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.type || !isCurrentAlertType(body.type)) {
    return NextResponse.json({ error: "Ogiltig rapporttyp." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Titel saknas." }, { status: 400 });
  }

  const isTest =
    body.is_test ?? Boolean(profile.test_mode_enabled);

  try {
    const alert = await createAlert(supabase, user.id, {
      ...body,
      is_test: isTest,
    });
    return NextResponse.json({ ok: true, alert });
  } catch (err) {
    console.error("[ALERT CREATE]", err);
    return NextResponse.json(
      {
        ok: false,
        error: formatAlertCreateError(err, body.type),
      },
      { status: 400 }
    );
  }
}
