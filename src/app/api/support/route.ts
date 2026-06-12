import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/app-version";

interface SupportBody {
  subject?: string;
  message?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  let body: SupportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const subject = body.subject?.trim();
  const message = body.message?.trim();

  if (!subject || subject.length < 2) {
    return NextResponse.json({ error: "Ämne krävs." }, { status: 400 });
  }
  if (!message || message.length < 5) {
    return NextResponse.json({ error: "Meddelande krävs." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("cabradar_user_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.cabradar_user_id) {
    return NextResponse.json({ error: "Profil saknas." }, { status: 400 });
  }

  const { error } = await supabase.from("support_messages").insert({
    user_id: user.id,
    cabradar_user_id: profile.cabradar_user_id,
    display_name: profile.display_name,
    subject,
    message,
    app_version: APP_VERSION,
    status: "ny",
  });

  if (error) {
    console.error("[SUPPORT] insert failed", error);
    return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
