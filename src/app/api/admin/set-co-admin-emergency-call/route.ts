import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";

interface SetEmergencyCallBody {
  driverId?: string;
  emergencyCall?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  const adminProfile = await fetchAdminRoleProfile(supabase, user.id);

  if (!isFullAdmin(adminProfile)) {
    return NextResponse.json(
      { error: "Endast administratörer kan ändra nödlägesbehörigheter." },
      { status: 403 }
    );
  }

  let body: SetEmergencyCallBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.driverId) {
    return NextResponse.json({ error: "Förare saknas." }, { status: 400 });
  }

  if (typeof body.emergencyCall !== "boolean") {
    return NextResponse.json(
      { error: "Ogiltigt behörighetsvärde." },
      { status: 400 }
    );
  }

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, is_admin, is_co_admin")
    .eq("id", body.driverId)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({ error: "Förare hittades inte." }, { status: 404 });
  }

  if (target.is_admin) {
    return NextResponse.json(
      { error: "Admin-konton har redan full åtkomst." },
      { status: 400 }
    );
  }

  if (!target.is_co_admin) {
    return NextResponse.json(
      { error: "Användaren måste vara Co-admin först." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      co_admin_emergency_call: body.emergencyCall,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.driverId);

  if (updateError) {
    console.error("[ADMIN] set-co-admin-emergency-call failed:", updateError);
    return NextResponse.json(
      { error: "Kunde inte uppdatera behörigheten." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    coAdminEmergencyCall: body.emergencyCall,
    message: body.emergencyCall
      ? "Behörighet att ringa förare vid nödläge aktiverad."
      : "Behörighet att ringa förare vid nödläge borttagen.",
  });
}
