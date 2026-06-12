import { NextResponse } from "next/server";
import {
  isValidActivityCoordinate,
  recordDriverActivityPoint,
} from "@/lib/driver-activity";
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

  if (!profile || !isVerifiedDriver(profile) || profile.is_admin) {
    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });
  }

  let body: { latitude?: number; longitude?: number; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const { latitude, longitude, source } = body;
  if (
    latitude == null ||
    longitude == null ||
    !isValidActivityCoordinate(latitude, longitude)
  ) {
    return NextResponse.json({ error: "Ogiltig plats." }, { status: 400 });
  }

  try {
    await recordDriverActivityPoint(supabase, user.id, latitude, longitude);
  } catch (err) {
    console.error("[ACTIVITY] record failed", { source, err });
    return NextResponse.json({ error: "Kunde inte spara aktivitet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
