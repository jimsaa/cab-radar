import { NextResponse } from "next/server";

import {

  fetchDriverUnreadMessage,

  markDriverMessageRead,

} from "@/lib/admin-messages";

import { isMissingSchemaError } from "@/lib/db-errors";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";



export async function GET() {

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({

      ok: true,

      message: null,

      blockForEmergency: false,

    });

  }



  try {

    const result = await fetchDriverUnreadMessage(supabase, user.id);

    if (result.message || result.blockForEmergency) {
      console.info("[MSG INBOX] poll", {
        userId: user.id,
        hasUnread: Boolean(result.message),
        messageId: result.message?.message_id ?? null,
        blockForEmergency: result.blockForEmergency,
      });
    }

    return NextResponse.json({ ok: true, ...result });

  } catch (err) {

    if (isMissingSchemaError(err as { code?: string; message?: string })) {

      return NextResponse.json({

        ok: true,

        message: null,

        blockForEmergency: false,

      });

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



  let body: { readId?: string; deliveryId?: string };

  try {

    body = await request.json();

  } catch {

    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });

  }



  const readId = (body.readId ?? body.deliveryId)?.trim();

  if (!readId) {

    return NextResponse.json({ error: "Meddelande saknas." }, { status: 400 });

  }



  try {

    await markDriverMessageRead(supabase, user.id, readId);

    return NextResponse.json({ ok: true });

  } catch (err) {

    console.error("[MSG INBOX] mark read failed:", err);

    return NextResponse.json(

      { error: "Kunde inte markera meddelandet som läst." },

      { status: 500 }

    );

  }

}

