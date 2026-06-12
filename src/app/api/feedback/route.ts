import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/app-version";

interface FeedbackBody {
  subject?: string;
  message?: string;
}

export async function POST(request: Request) {
  let body: FeedbackBody;
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

  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("user_feedback").insert({
      user_id: null,
      cabradar_user_id: null,
      display_name: null,
      subject,
      message,
      app_version: APP_VERSION,
      status: "ny",
    });

    if (error) {
      console.error("[FEEDBACK] insert failed", error);
      return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FEEDBACK] error", err);
    return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
  }
}
