import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shouldPushNotify } from "@/lib/alerts";
import type { DriverAlert } from "@/lib/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alert = (await request.json()) as DriverAlert;

  if (!shouldPushNotify(alert)) {
    return NextResponse.json({ skipped: true });
  }

  const origin = new URL(request.url).origin;
  await fetch(`${origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      alertId: alert.id,
      type: alert.type,
      title: alert.title,
      is_major: alert.is_major,
      created_by: alert.created_by,
      latitude: alert.latitude,
      longitude: alert.longitude,
      emergency_last_latitude: alert.emergency_last_latitude,
      emergency_last_longitude: alert.emergency_last_longitude,
    }),
  });

  return NextResponse.json({ ok: true });
}
