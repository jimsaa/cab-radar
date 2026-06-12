import { NextResponse } from "next/server";
import { reviewCivilkollSubmission } from "@/lib/civilkoll";
import { formatSupabaseError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }

  let body: {
    submissionId?: string;
    action?: "approve" | "reject";
    adminNotes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const { submissionId, action, adminNotes } = body;
  if (!submissionId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  try {
    await reviewCivilkollSubmission(
      supabase,
      user.id,
      submissionId,
      action,
      adminNotes ?? null
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CIVILKOLL REVIEW]", err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
