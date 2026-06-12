import { NextResponse } from "next/server";
import { adminRemoveAlert } from "@/lib/alerts";
import { hasEmergencyAdminAccess, isFullAdmin } from "@/lib/admin-access";
import { isEmergencyAlertType } from "@/lib/emergency-rules";
import { createClient } from "@/lib/supabase/server";
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
    .select("is_admin, is_co_admin")
    .eq("id", user.id)
    .single();

  if (!hasEmergencyAdminAccess(profile ?? undefined)) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }
  let body: { alertId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const alertId = body.alertId;
  if (!alertId) {
    return NextResponse.json({ error: "Varning saknas." }, { status: 400 });
  }

  const { data: alert } = await supabase
    .from("driver_alerts")
    .select("id, type, status")
    .eq("id", alertId)
    .single();

  if (!alert) {
    return NextResponse.json({ error: "Varningen hittades inte." }, { status: 404 });
  }

  const isEmergency = isEmergencyAlertType(alert.type);
  if (!isFullAdmin(profile ?? undefined) && !isEmergency) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }

  if (alert.status !== "active" && alert.status !== "pending_review") {    return NextResponse.json(
      { error: "Varningen är redan avslutad." },
      { status: 400 }
    );
  }

  try {
    await adminRemoveAlert(supabase, alertId);
  } catch (error) {
    console.error("[ADMIN REMOVE ALERT] failed", error);
    return NextResponse.json(
      { error: "Kunde inte ta bort varningen." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    emergency: isEmergencyAlertType(alert.type),
  });
}
