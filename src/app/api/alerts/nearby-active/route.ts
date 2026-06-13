import { NextResponse } from "next/server";
import { alertTypeHasDuplicateCheck } from "@/lib/alert-ttl";
import { findNearbyActiveAlert } from "@/lib/alerts";
import { isCurrentAlertType, type AlertType } from "@/lib/constants";
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
      { error: "Endast verifierade förare kan rapportera." },
      { status: 403 }
    );
  }

  let body: { type?: string; latitude?: number; longitude?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const { type, latitude, longitude } = body;

  if (
    !type ||
    !isCurrentAlertType(type) ||
    !alertTypeHasDuplicateCheck(type) ||
    latitude == null ||
    longitude == null
  ) {
    return NextResponse.json({ error: "Ogiltiga parametrar." }, { status: 400 });
  }

  const nearby = await findNearbyActiveAlert(
    supabase,
    type as AlertType,
    latitude,
    longitude
  );

  return NextResponse.json({ nearby });
}
