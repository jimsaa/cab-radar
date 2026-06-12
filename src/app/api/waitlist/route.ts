import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addToWaitlist, isValidWaitlistEmail } from "@/lib/waitlist";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!isValidWaitlistEmail(email)) {
    return NextResponse.json(
      { error: "Ange en giltig e-postadress." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    await addToWaitlist(supabase, email, "coming_soon");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WAITLIST]", err);
    return NextResponse.json(
      { error: "Kunde inte spara e-postadressen." },
      { status: 500 }
    );
  }
}
