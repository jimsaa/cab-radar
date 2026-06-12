import { NextResponse } from "next/server";
import { formatSupabaseError } from "@/lib/db-errors";
import {
  PROFILE_TAXI_COLUMNS,
  fetchCurrentProfile,
} from "@/lib/profile";
import { resolveTaxiOperator } from "@/lib/profile-taxi-info";
import { createClient } from "@/lib/supabase/server";

function devLog(label: string, payload: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.log(label, payload);
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  try {
    const profile = await fetchCurrentProfile(supabase, user.id);
    devLog("[PROFILE] Reloaded profile:", profile);
    if (!profile) {
      return NextResponse.json({ error: "Profil hittades inte." }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[PROFILE] Reload failed:", err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  let body: {
    taxi_company_name?: string;
    taxi_operator_preset?: string;
    taxi_operator_custom?: string;
    taxi_number?: string;
    taximeter_type?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const payload = {
    taxi_company_name: body.taxi_company_name?.trim() || null,
    taxi_operator: resolveTaxiOperator(
      body.taxi_operator_preset ?? "",
      body.taxi_operator_custom ?? ""
    ),
    taxi_number: body.taxi_number?.trim() || null,
    taximeter_type: body.taximeter_type?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  devLog("[PROFILE] Saving...", { userId: user.id });
  devLog("[PROFILE] Payload:", payload);

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select(PROFILE_TAXI_COLUMNS)
    .maybeSingle();

  devLog("[PROFILE] Supabase response:", { data, error });

  if (error) {
    console.error("[PROFILE] Update failed:", error);
    return NextResponse.json(
      { error: formatSupabaseError(error) },
      { status: 500 }
    );
  }

  if (!data) {
    const message =
      process.env.NODE_ENV === "development"
        ? "Uppdateringen blockerades (RLS) eller ingen rad returnerades."
        : "Det gick inte att spara profilen.";
    console.error("[PROFILE] No row returned after update");
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const profile = await fetchCurrentProfile(supabase, user.id);
  devLog("[PROFILE] Reloaded profile:", profile);

  return NextResponse.json({
    ok: true,
    message: "Profilen har uppdaterats.",
    profile,
  });
}
