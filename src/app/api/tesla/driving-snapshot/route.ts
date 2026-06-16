import { NextResponse } from "next/server";
import { fetchTeslaDrivingSnapshot } from "@/lib/admin-command-center";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status, is_admin, alert_chime_enabled")
    .eq("id", user.id)
    .single();

  if (!profile || !isVerifiedDriver(profile)) {
    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });
  }

  try {
    const service = await createServiceClient();
    const snapshot = await fetchTeslaDrivingSnapshot(service, {
      alertChimeEnabled: profile.alert_chime_enabled !== false,
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    console.error("[TESLA DRIVING] snapshot failed:", err);
    return NextResponse.json(
      { error: "Kunde inte ladda Tesla View." },
      { status: 500 }
    );
  }
}
