import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface ResetPasswordBody {
  driverId?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du saknar behörighet." }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Du saknar behörighet." }, { status: 403 });
  }

  let body: ResetPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const driverId = body.driverId?.trim();
  if (!driverId) {
    return NextResponse.json({ error: "Användare saknas." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: authUser, error: authError } =
    await service.auth.admin.getUserById(driverId);

  if (authError || !authUser?.user?.email) {
    console.error("[ADMIN] reset-password auth lookup failed:", authError);
    return NextResponse.json(
      { error: "Kunde inte hitta användarens e-post." },
      { status: 404 }
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://cabradar.se";

  const { error: resetError } = await service.auth.resetPasswordForEmail(
    authUser.user.email,
    { redirectTo: `${siteUrl}/login` }
  );

  if (resetError) {
    console.error("[ADMIN] reset-password failed:", resetError);
    return NextResponse.json(
      { error: "Kunde inte skicka återställningslänk." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `✅ Återställningslänk skickad till ${authUser.user.email}.`,
  });
}
