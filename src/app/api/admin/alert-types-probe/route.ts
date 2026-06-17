import { NextResponse } from "next/server";
import { probeMissingAlertTypes } from "@/lib/alert-schema-probe";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isFullAdmin } from "@/lib/admin-access";

function supabaseProjectRef(): string {
  try {
    return new URL(getSupabaseUrl()).hostname.split(".")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Admin diagnostic — which alert_type enum values are missing in the DB. */
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
    .select("is_admin, is_co_admin")
    .eq("id", user.id)
    .single();

  if (!profile || !isFullAdmin(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = await createServiceClient();
    const missing = await probeMissingAlertTypes(service);

    return NextResponse.json({
      ok: missing.length === 0,
      projectRef: supabaseProjectRef(),
      missing,
      hint:
        missing.includes("all_vehicle_check")
          ? "Run supabase/migration-alert-all-vehicle-check.sql in Supabase SQL Editor."
          : undefined,
    });
  } catch (err) {
    console.error("[ALERT TYPES PROBE]", err);
    return NextResponse.json(
      { ok: false, error: "Probe failed." },
      { status: 500 }
    );
  }
}
