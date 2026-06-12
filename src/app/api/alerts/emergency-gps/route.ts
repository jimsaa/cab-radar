import { NextResponse } from "next/server";
import { hasEmergencyMoved } from "@/lib/emergency";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";

/** Updates emergency GPS for admin tracking — never closes the alert. */
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

  let body: {
    alertId?: string;
    latitude?: number;
    longitude?: number;
    speedMps?: number | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const { alertId, latitude, longitude, speedMps } = body;

  if (
    !alertId ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return NextResponse.json({ error: "Ogiltiga koordinater." }, { status: 400 });
  }

  const { data: alert } = await supabase
    .from("driver_alerts")
    .select(
      "id, type, status, created_by, emergency_last_latitude, emergency_last_longitude"
    )
    .eq("id", alertId)
    .single();

  if (
    !alert ||
    alert.type !== "taxi_emergency" ||
    alert.status !== "active" ||
    alert.created_by !== user.id
  ) {
    return NextResponse.json({ error: "Ogiltigt nödläge." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const moved = hasEmergencyMoved(
    alert.emergency_last_latitude,
    alert.emergency_last_longitude,
    latitude,
    longitude
  );

  const update: Record<string, unknown> = {
    latitude,
    longitude,
    emergency_last_latitude: latitude,
    emergency_last_longitude: longitude,
    emergency_last_gps_at: now,
    emergency_last_speed_mps: speedMps ?? null,
    updated_at: now,
  };

  if (moved || alert.emergency_last_latitude == null) {
    update.emergency_last_movement_at = now;
  }

  const { error } = await supabase.from("driver_alerts").update(update).eq("id", alertId);

  if (error) {
    console.error("[EMERGENCY GPS] update failed", error);
    return NextResponse.json({ error: "Kunde inte uppdatera GPS." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
