import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/lib/app-version";
import {
  buildSupportMessageBody,
  loadSupportProfileContext,
} from "@/lib/support";

interface SupportBody {
  subject?: string;
  message?: string;
}

function supportLog(label: string, payload?: unknown) {
  if (process.env.NODE_ENV === "development") {
    if (payload !== undefined) {
      console.log(`[SUPPORT API] ${label}`, payload);
    } else {
      console.log(`[SUPPORT API] ${label}`);
    }
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  supportLog("GET profile check", { userId: user.id });

  const context = await loadSupportProfileContext(supabase, user);

  if (!context) {
    supportLog("GET — no profile record");
    return NextResponse.json({
      authenticated: true,
      profileExists: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    profileExists: true,
    displayName: context.displayName,
    cabradarUserId: context.cabradarUserId,
    email: context.email,
    phoneNumber: context.phoneNumber,
    driverCity: context.driverCity,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  supportLog("POST submit", { userId: user.id });

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

  const context = await loadSupportProfileContext(supabase, user);

  if (!context) {
    supportLog("POST rejected — profile record missing", { userId: user.id });
    return NextResponse.json({ error: "Profil saknas." }, { status: 400 });
  }

  const fullMessage = buildSupportMessageBody(message, context);

  supportLog("Inserting support message", {
    cabradarUserId: context.cabradarUserId,
    displayName: context.displayName,
  });

  const { error } = await supabase.from("support_messages").insert({
    user_id: user.id,
    cabradar_user_id: context.cabradarUserId,
    display_name: context.displayName,
    subject,
    message: fullMessage,
    app_version: APP_VERSION,
    status: "ny",
  });

  if (error) {
    console.error("[SUPPORT] insert failed", error);
    return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
