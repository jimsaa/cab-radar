import { NextResponse } from "next/server";
import { extendAlertTtl } from "@/lib/alerts";
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
    return NextResponse.json(
      { error: "Endast verifierade förare kan bekräfta." },
      { status: 403 }
    );
  }

  let body: { alertId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const alertId = body.alertId;
  if (!alertId) {
    return NextResponse.json({ error: "Saknar varnings-id." }, { status: 400 });
  }

  try {
    const alert = await extendAlertTtl(supabase, alertId);
    return NextResponse.json({ ok: true, alert });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Kunde inte förlänga varningen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
