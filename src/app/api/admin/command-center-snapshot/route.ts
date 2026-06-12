import { NextResponse } from "next/server";
import {
  canViewEmergencyPhone,
  fetchAdminRoleProfile,
  hasEmergencyAdminAccess,
  isFullAdmin,
  type AdminRoleProfile,
} from "@/lib/admin-access";
import { fetchAdminCommandCenterSnapshot } from "@/lib/admin-command-center";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await fetchAdminRoleProfile<
    AdminRoleProfile & { alert_chime_enabled?: boolean | null }
  >(supabase, user.id, ["alert_chime_enabled"]);

  if (!hasEmergencyAdminAccess(profile ?? undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = await createServiceClient();
    const snapshot = await fetchAdminCommandCenterSnapshot(service, {
      isFullAdmin: isFullAdmin(profile ?? undefined),
      canViewEmergencyPhone: canViewEmergencyPhone(profile ?? undefined),
      alertChimeEnabled: profile?.alert_chime_enabled !== false,
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    console.error("[ADMIN CC] snapshot failed:", err);
    return NextResponse.json(
      { error: "Kunde inte ladda admin-data." },
      { status: 500 }
    );
  }
}
