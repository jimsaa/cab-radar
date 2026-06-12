import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";

interface SetBetaBody {
  driverId?: string;
  betaUser?: boolean;
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
      { error: "Endast administratörer kan ändra beta-status." },
      { status: 403 }
    );
  }

  let body: SetBetaBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.driverId) {
    return NextResponse.json({ error: "Förare saknas." }, { status: 400 });
  }

  if (typeof body.betaUser !== "boolean") {
    return NextResponse.json({ error: "Ogiltigt beta-värde." }, { status: 400 });
  }

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, is_admin, beta_user")
    .eq("id", body.driverId)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({ error: "Förare hittades inte." }, { status: 404 });
  }

  if (target.is_admin) {
    return NextResponse.json(
      { error: "Admin-konton behöver inte beta-status." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    beta_user: body.betaUser,
    updated_at: now,
  };

  if (body.betaUser) {
    updates.membership_type = "active_driver";
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", body.driverId);

  if (updateError) {
    console.error("[ADMIN] set-beta-user failed:", updateError);
    return NextResponse.json(
      { error: "Kunde inte uppdatera beta-status." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    betaUser: body.betaUser,
    message: body.betaUser
      ? "🧪 Beta-användare aktiverad."
      : "Beta-status borttagen.",
  });
}
