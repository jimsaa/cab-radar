import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasEmergencyAdminAccess, isFullAdmin, fetchAdminRoleProfile } from "@/lib/admin-access";
import { fetchAdminBadgeCounts } from "@/lib/admin-notifications";

const EMPTY_COUNTS = {
  emergency: 0,
  alerts: 0,
  users: 0,
  feedback: 0,
  support: 0,
  partner: 0,
  civilkoll: 0,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });
  }

  const profile = await fetchAdminRoleProfile(supabase, user.id);

  if (!hasEmergencyAdminAccess(profile ?? undefined)) {
    return NextResponse.json({ error: "Åtkomst nekad." }, { status: 403 });
  }

  try {
    const counts = await fetchAdminBadgeCounts(supabase);
    if (!isFullAdmin(profile ?? undefined)) {
      return NextResponse.json({
        counts: { ...EMPTY_COUNTS, emergency: counts.emergency },
      });
    }
    return NextResponse.json({ counts });
  } catch (err) {
    console.error("[ADMIN] Badge counts failed:", err);
    return NextResponse.json(
      { error: "Kunde inte ladda notiser." },
      { status: 500 }
    );
  }
}
