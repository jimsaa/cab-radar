import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[PUSH] Subscribe rejected: unauthorized");
    return NextResponse.json(
      { ok: false, step: "auth", error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PUSH] Subscribe invalid JSON:", err);
    return NextResponse.json(
      { ok: false, step: "validation", error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    console.error("[PUSH] Subscribe invalid subscription payload:", body);
    return NextResponse.json(
      { ok: false, step: "validation", error: "Invalid subscription" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("[PUSH] Database save failed:", error);
    return NextResponse.json(
      { ok: false, step: "database", error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
