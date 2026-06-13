import { NextResponse } from "next/server";
import { recordDriverHeartbeat } from "@/lib/driver-activity";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";

/** Lightweight presence — app open, page change, no GPS required. */
export async function POST() {
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

  if (!profile || !isVerifiedDriver(profile) || profile.is_admin) {
    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });
  }

  try {
    await recordDriverHeartbeat(supabase, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[HEARTBEAT] failed", err);
    return NextResponse.json({ error: "Kunde inte spara närvaro." }, { status: 500 });
  }
}
