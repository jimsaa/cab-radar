import { NextResponse } from "next/server";
import { isFullAdmin } from "@/lib/admin-access";
import { fetchAnonymizedActivityPoints } from "@/lib/driver-activity";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!isFullAdmin(profile ?? undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const points = await fetchAnonymizedActivityPoints(supabase);
    return NextResponse.json({ points });
  } catch (err) {
    console.error("[ACTIVITY MAP]", err);
    return NextResponse.json(
      { error: "Kunde inte hämta aktivitetskarta." },
      { status: 500 }
    );
  }
}
