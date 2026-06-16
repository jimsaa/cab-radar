import { NextResponse } from "next/server";
import {
  dismissDriverInboxMessage,
  fetchDriverInboxMessages,
} from "@/lib/admin-messages";
import { isMissingSchemaError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_admin) {
    return NextResponse.json({ ok: true, messages: [] });
  }

  try {
    const messages = await fetchDriverInboxMessages(supabase, user.id);
    return NextResponse.json({ ok: true, messages });
  } catch (err) {
    if (isMissingSchemaError(err as { code?: string; message?: string })) {
      return NextResponse.json({ ok: true, messages: [] });
    }
    console.error("[MSG INBOX] fetch failed:", err);
    return NextResponse.json(
      { error: "Kunde inte hämta meddelanden." },
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

  let body: { deliveryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const deliveryId = body.deliveryId?.trim();
  if (!deliveryId) {
    return NextResponse.json({ error: "Meddelande saknas." }, { status: 400 });
  }

  try {
    await dismissDriverInboxMessage(supabase, user.id, deliveryId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[MSG INBOX] dismiss failed:", err);
    return NextResponse.json(
      { error: "Kunde inte stänga meddelandet." },
      { status: 500 }
    );
  }
}
