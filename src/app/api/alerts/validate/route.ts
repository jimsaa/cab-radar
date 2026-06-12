import { NextResponse } from "next/server";
import { isValidationEligibleType } from "@/lib/alert-validation";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedDriver } from "@/lib/verification";

const VALID_RESPONSES = new Set(["yes", "no", "unknown"]);

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
      { error: "Endast verifierade förare kan validera." },
      { status: 403 }
    );
  }

  let body: { alertId?: string; response?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const alertId = body.alertId;
  const response = body.response;

  if (!alertId || !response || !VALID_RESPONSES.has(response)) {
    return NextResponse.json({ error: "Ogiltigt svar." }, { status: 400 });
  }

  const { data: alert } = await supabase
    .from("driver_alerts")
    .select("id, status, type")
    .eq("id", alertId)
    .single();

  if (!alert || alert.status !== "active") {
    return NextResponse.json(
      { error: "Varningen är inte längre aktiv." },
      { status: 400 }
    );
  }

  if (!isValidationEligibleType(alert.type)) {
    return NextResponse.json(
      { error: "Denna varningstyp kan inte valideras." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("alert_validations").insert({
    alert_id: alertId,
    user_id: user.id,
    response,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Du har redan svarat på denna varning." },
        { status: 409 }
      );
    }
    console.error("[VALIDATION] insert failed", error);
    return NextResponse.json({ error: "Kunde inte spara svar." }, { status: 500 });
  }

  const { data: updated } = await supabase
    .from("driver_alerts")
    .select("*")
    .eq("id", alertId)
    .single();

  return NextResponse.json({ ok: true, alert: updated });
}
