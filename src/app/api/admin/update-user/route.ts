import { NextResponse } from "next/server";
import { editorFormToProfileUpdate } from "@/lib/admin-user-editor";
import type { AdminUserEditorSavePayload } from "@/lib/admin-user-editor";
import { isMissingSchemaError } from "@/lib/db-errors";
import { normalizeProfileRow } from "@/lib/profile";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  let body: AdminUserEditorSavePayload;
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

  const { data: existing, error: fetchError } = await service
    .from("profiles")
    .select("id, verification_status, is_admin")
    .eq("id", driverId)
    .maybeSingle();

  if (fetchError) {
    console.error("[ADMIN] update-user fetch failed:", fetchError);
    return NextResponse.json(
      { error: "Kunde inte hämta användaren." },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: "Användaren hittades inte." }, { status: 404 });
  }

  if (existing.is_admin && driverId !== user.id) {
    return NextResponse.json(
      { error: "Kan inte redigera andra administratörer här." },
      { status: 403 }
    );
  }

  const updatePayload = editorFormToProfileUpdate(body, {
    verification_status: existing.verification_status,
  });

  const { data: updated, error: updateError } = await service
    .from("profiles")
    .update(updatePayload)
    .eq("id", driverId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[ADMIN] update-user failed:", updateError);
    const message = isMissingSchemaError(updateError)
      ? "Databasen saknar nya användarkolumner. Kör migration-admin-user-editor.sql i Supabase."
      : "Det gick inte att spara användaren.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const email = body.email?.trim().toLowerCase();
  if (email) {
    const { error: emailError } = await service.auth.admin.updateUserById(
      driverId,
      { email }
    );
    if (emailError) {
      console.error("[ADMIN] update-user email failed:", emailError);
      return NextResponse.json(
        {
          error: `Profilen sparades men e-post kunde inte uppdateras: ${emailError.message}`,
        },
        { status: 500 }
      );
    }
  }

  const profile = normalizeProfileRow(
    (updated ?? {}) as Record<string, unknown>
  );

  const { data: authUser } = await service.auth.admin.getUserById(driverId);

  return NextResponse.json({
    ok: true,
    message: "✅ Användaren uppdaterades.",
    user: { ...profile, email: authUser?.user?.email ?? email ?? null },
  });
}
