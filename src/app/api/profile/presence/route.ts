import { NextResponse } from "next/server";
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

  let body: { latitude?: number; longitude?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const { latitude, longitude } = body;
  if (
    latitude == null ||
    longitude == null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "Ogiltig plats." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      last_known_latitude: latitude,
      last_known_longitude: longitude,
      last_known_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[PRESENCE] update failed", error);
    return NextResponse.json({ error: "Kunde inte spara plats." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
