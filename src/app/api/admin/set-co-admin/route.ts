import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";

interface SetCoAdminBody {
  driverId?: string;
  coAdmin?: boolean;
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
      { error: "Endast administratörer kan ändra Co-admin-behörighet." },
      { status: 403 }
    );
  }

  let body: SetCoAdminBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.driverId) {
    return NextResponse.json({ error: "Förare saknas." }, { status: 400 });
  }

  if (typeof body.coAdmin !== "boolean") {
    return NextResponse.json({ error: "Ogiltigt Co-admin-värde." }, { status: 400 });
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
      { error: "Admin-konton behöver inte Co-admin-status." },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    is_co_admin: body.coAdmin,
    updated_at: new Date().toISOString(),
  };

  if (!body.coAdmin) {
    updates.co_admin_emergency_call = false;
    updates.co_admin_manage_offers = false;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", body.driverId);

  if (updateError) {
    console.error("[ADMIN] set-co-admin failed:", updateError);
    return NextResponse.json(
      { error: "Kunde inte uppdatera Co-admin-status." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    coAdmin: body.coAdmin,
    coAdminEmergencyCall: body.coAdmin ? undefined : false,
    message: body.coAdmin
      ? "Co-admin aktiverad."
      : "Co-admin borttagen.",
  });
}
