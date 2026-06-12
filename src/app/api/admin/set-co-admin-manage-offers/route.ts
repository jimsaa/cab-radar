import { NextResponse } from "next/server";
import { isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

interface Body {
  driverId?: string;
  manageOffers?: boolean;
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
    return NextResponse.json({ error: "Endast administratörer." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.driverId || typeof body.manageOffers !== "boolean") {
    return NextResponse.json({ error: "Ogiltiga parametrar." }, { status: 400 });
  }

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, is_admin, is_co_admin")
    .eq("id", body.driverId)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({ error: "Användare hittades inte." }, { status: 404 });
  }

  if (target.is_admin) {
    return NextResponse.json({ error: "Admin har redan full åtkomst." }, { status: 400 });
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
      co_admin_manage_offers: body.manageOffers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.driverId);

  if (updateError) {
    return NextResponse.json({ error: "Kunde inte uppdatera." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    manageOffers: body.manageOffers,
    message: body.manageOffers
      ? "Behörighet att hantera erbjudanden aktiverad."
      : "Behörighet borttagen.",
  });
}
