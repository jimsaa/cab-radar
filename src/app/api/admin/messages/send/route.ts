import { NextResponse } from "next/server";
import {
  ADMIN_MESSAGE_MAX_LENGTH,
  sendAdminMessage,
  type AdminMessageRecipientType,
} from "@/lib/admin-messages";
import { isMissingSchemaError } from "@/lib/db-errors";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface SendBody {
  message?: string;
  recipientType?: AdminMessageRecipientType;
  recipientUserId?: string | null;
  important?: boolean;
}

export async function POST(request: Request) {
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

  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  const recipientType = body.recipientType ?? "all";

  if (!message || message.length > ADMIN_MESSAGE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Meddelandet måste vara 1–${ADMIN_MESSAGE_MAX_LENGTH} tecken.` },
      { status: 400 }
    );
  }

  if (recipientType !== "all" && recipientType !== "user") {
    return NextResponse.json({ error: "Ogiltig mottagare." }, { status: 400 });
  }

  try {
    const service = await createServiceClient();
    const result = await sendAdminMessage(service, {
      message,
      recipientType,
      recipientUserId: body.recipientUserId,
      important: Boolean(body.important),
      senderAdminId: user.id,
    });

    return NextResponse.json({
      ok: true,
      message: "✅ Meddelandet skickades.",
      messageId: result.messageId,
      recipientCount: result.recipientCount,
    });
  } catch (err) {
    console.error("[ADMIN MSG] send failed:", err);
    const messageText =
      err instanceof Error ? err.message : "Kunde inte skicka meddelandet.";
    const status =
      err instanceof Error &&
      (messageText.includes("Välj") ||
        messageText.includes("Inga aktiva") ||
        messageText.includes("1–"))
        ? 400
        : 500;

    if (isMissingSchemaError(err as { code?: string; message?: string })) {
      return NextResponse.json(
        {
          error:
            "Meddelandetabeller saknas. Kör migration-admin-messages.sql i Supabase.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: messageText }, { status });
  }
}
