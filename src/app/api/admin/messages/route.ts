import { NextResponse } from "next/server";
import {
  fetchActiveDriverOptions,
  fetchAdminMessageHistory,
} from "@/lib/admin-messages";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du saknar behörighet." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Du saknar behörighet." }, { status: 403 });
  }

  try {
    const service = await createServiceClient();
    const [history, activeDrivers] = await Promise.all([
      fetchAdminMessageHistory(service),
      fetchActiveDriverOptions(service),
    ]);

    return NextResponse.json({
      ok: true,
      history,
      activeDrivers,
      activeDriverCount: activeDrivers.length,
    });
  } catch (err) {
    console.error("[ADMIN MSG] list failed:", err);
    return NextResponse.json(
      { error: "Kunde inte hämta meddelanden." },
      { status: 500 }
    );
  }
}
