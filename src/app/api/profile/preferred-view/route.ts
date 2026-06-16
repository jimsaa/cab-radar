import { NextResponse } from "next/server";
import {
  isPreferredView,
  normalizePreferredView,
} from "@/lib/preferred-view";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_view")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[PREFERRED VIEW] get failed:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta vy." },
      { status: 500 }
    );
  }

  const view = normalizePreferredView(data?.preferred_view as string | undefined);
  return NextResponse.json({ ok: true, view });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  let body: { view?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const view = body.view?.trim();
  if (!isPreferredView(view)) {
    return NextResponse.json({ error: "Ogiltig vy." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, tesla_view_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (
    (view === "tesla" || view === "tab") &&
    !profile?.is_admin &&
    profile?.tesla_view_enabled === false
  ) {
    return NextResponse.json(
      { error: "Tesla/Tab-vy är inte aktiverad för ditt konto." },
      { status: 403 }
    );
  }

  try {
    const service = await createServiceClient();
    const { error } = await service
      .from("profiles")
      .update({
        preferred_view: view,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, view });
  } catch (err) {
    console.error("[PREFERRED VIEW] save failed:", err);
    return NextResponse.json(
      { error: "Kunde inte spara vy." },
      { status: 500 }
    );
  }
}
