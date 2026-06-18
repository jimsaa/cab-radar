import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  ADMIN_PROFILE_COLUMNS,
  normalizeProfileRow,
  PROFILE_MINIMAL_COLUMNS,
} from "@/lib/profile";
import type { AdminUserDetail } from "@/lib/admin-user-editor";
import { normalizeNickname } from "@/lib/driver-nickname";

function nicknameFromAuthMetadata(
  metadata: Record<string, unknown> | undefined
): string | null {
  const raw = metadata?.nickname;
  if (typeof raw !== "string") return null;
  const normalized = normalizeNickname(raw);
  return normalized || null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: driverId } = await context.params;

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

  if (!driverId?.trim()) {
    return NextResponse.json({ error: "Användare saknas." }, { status: 400 });
  }

  const service = await createServiceClient();

  let profileRow: Record<string, unknown> | null = null;

  const full = await service
    .from("profiles")
    .select(ADMIN_PROFILE_COLUMNS)
    .eq("id", driverId)
    .maybeSingle();

  if (!full.error && full.data) {
    profileRow = full.data as Record<string, unknown>;
  } else if (full.error && isMissingSchemaError(full.error)) {
    const minimal = await service
      .from("profiles")
      .select(PROFILE_MINIMAL_COLUMNS)
      .eq("id", driverId)
      .maybeSingle();
    if (minimal.data) {
      profileRow = minimal.data as Record<string, unknown>;
    }
  } else if (full.error) {
    console.error("[ADMIN] user detail fetch failed:", full.error);
    return NextResponse.json(
      { error: "Kunde inte hämta användaren." },
      { status: 500 }
    );
  }

  if (!profileRow) {
    return NextResponse.json({ error: "Användaren hittades inte." }, { status: 404 });
  }

  const { data: authUser, error: authError } =
    await service.auth.admin.getUserById(driverId);

  if (authError) {
    console.error("[ADMIN] auth user fetch failed:", authError);
  }

  const detail: AdminUserDetail = {
    ...normalizeProfileRow(profileRow),
    email: authUser?.user?.email ?? null,
  };

  const recoveredNickname = nicknameFromAuthMetadata(
    authUser?.user?.user_metadata as Record<string, unknown> | undefined
  );
  if (!detail.nickname?.trim() && recoveredNickname) {
    detail.nickname = recoveredNickname;
    const { error: repairError } = await service
      .from("profiles")
      .update({
        nickname: recoveredNickname,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driverId)
      .is("nickname", null);

    if (repairError) {
      console.warn("[ADMIN] nickname backfill from auth metadata failed:", repairError);
    }
  }

  return NextResponse.json({ ok: true, user: detail });
}
