import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";

interface SetTestModeBody {
  driverId?: string;
  testModeEnabled?: boolean;
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
      { error: "Endast administratörer kan ändra testläge." },
      { status: 403 }
    );
  }

  let body: SetTestModeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.driverId) {
    return NextResponse.json({ error: "Förare saknas." }, { status: 400 });
  }

  if (typeof body.testModeEnabled !== "boolean") {
    return NextResponse.json({ error: "Ogiltigt testlägesvärde." }, { status: 400 });
  }

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", body.driverId)
    .single();

  if (fetchError || !target) {
    return NextResponse.json({ error: "Förare hittades inte." }, { status: 404 });
  }

  if (target.is_admin) {
    return NextResponse.json(
      { error: "Admin-konton använder inte testläge." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      test_mode_enabled: body.testModeEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.driverId);

  if (updateError) {
    console.error("[ADMIN] set-test-mode failed:", updateError);
    return NextResponse.json(
      { error: "Kunde inte uppdatera testläge." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    testModeEnabled: body.testModeEnabled,
    message: body.testModeEnabled
      ? "🧪 Testläge aktiverat för föraren."
      : "Testläge avstängt för föraren.",
  });
}
