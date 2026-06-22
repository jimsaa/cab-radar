import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface DeleteUserBody {
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

  let body: DeleteUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const driverId = body.driverId?.trim();
  if (!driverId) {
    return NextResponse.json({ error: "Användare saknas." }, { status: 400 });
  }

  if (driverId === user.id) {
    return NextResponse.json(
      { error: "Du kan inte radera ditt eget konto här." },
      { status: 403 }
    );
  }

  const service = await createServiceClient();

  const { data: target, error: fetchError } = await service
    .from("profiles")
    .select("id, is_admin, display_name, nickname")
    .eq("id", driverId)
    .maybeSingle();

  if (fetchError) {
    console.error("[ADMIN] delete-user fetch failed:", fetchError);
    return NextResponse.json(
      { error: "Kunde inte hämta användaren." },
      { status: 500 }
    );
  }

  if (!target) {
    return NextResponse.json({ error: "Användaren hittades inte." }, { status: 404 });
  }

  if (target.is_admin) {
    return NextResponse.json(
      { error: "Administratörer kan inte raderas här." },
      { status: 403 }
    );
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(driverId);

  if (deleteError) {
    console.error("[ADMIN] delete-user failed:", deleteError);
    return NextResponse.json(
      { error: "Kunde inte radera användaren." },
      { status: 500 }
    );
  }

  const label =
    target.nickname?.trim() ||
    target.display_name?.trim() ||
    driverId.slice(0, 8);

  return NextResponse.json({
    ok: true,
    message: `✅ ${label} har raderats permanent.`,
  });
}
